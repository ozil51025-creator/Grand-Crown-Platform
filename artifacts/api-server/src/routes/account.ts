import { type IRouter, type Request, type Response } from "express";
import {
  ChangeAccountPasswordBody,
  ChangeAccountPasswordResponse,
  CreateAdminGiftCodeBody,
  CreateAdminGiftCodeResponse,
  GetAccountTransactionsResponse,
  GetAdminGiftCodesResponse,
  RedeemGiftCodeBody,
  RedeemGiftCodeResponse,
  UpdateAdminGiftCodeBody,
  UpdateAdminGiftCodeResponse,
} from "@workspace/api-zod";
import type { Data, User } from "./grand-crown";

// Internal persistence only. Member identifiers must never appear in admin responses.
export type StoredGiftCode = {
  id: string;
  code: string;
  amount: number;
  maxRedemptions: number;
  enabled: boolean;
  createdAt: string;
  expiresAt: string | null;
  redeemedUserIds: string[];
};

type Dependencies = {
  readData: () => Promise<Data>;
  writeData: (data: Data) => Promise<void>;
  requireUser: (req: Request, res: Response, data: Data) => User | undefined;
  requireAdmin: (req: Request, res: Response) => Promise<boolean>;
  hashPassword: (password: string) => { salt: string; hash: string };
  verifyPassword: (password: string, user: User) => boolean;
  revokeOtherSessions: (data: Data, req: Request, userId: string) => void;
  addTransaction: (data: Data, userId: string, type: string, amount: number) => void;
  id: (prefix: string) => string;
  now: () => string;
};

function normalizeCodeBody(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const input = body as Record<string, unknown>;
  return {
    ...input,
    code: typeof input.code === "string" ? input.code.trim().toUpperCase() : input.code,
  };
}

function publicGiftCode(gift: StoredGiftCode) {
  return {
    id: gift.id,
    code: gift.code,
    amount: gift.amount,
    maxRedemptions: gift.maxRedemptions,
    redemptionCount: gift.redeemedUserIds.length,
    enabled: gift.enabled,
    createdAt: gift.createdAt,
    expiresAt: gift.expiresAt,
  };
}

function validFutureIso(value: unknown) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) {
    return false;
  }
  // Date.parse accepts impossible calendar dates (e.g. February 30); reject those too.
  const calendarDay = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(calendarDay.getTime()) &&
    calendarDay.toISOString().slice(0, 10) === value.slice(0, 10) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now();
}

export function registerAccountRoutes(router: IRouter, deps: Dependencies) {
  const attempts = new Map<string, number[]>();
  function rateLimited(userId: string, scope: string, max: number) {
    const key = `${scope}:${userId}`;
    const time = Date.now();
    const recent = (attempts.get(key) ?? []).filter((at) => at > time - 15 * 60 * 1000);
    attempts.set(key, recent);
    if (recent.length >= max) return true;
    recent.push(time);
    return false;
  }

  router.get("/account/transactions", async (req, res) => {
    const data = await deps.readData();
    const user = deps.requireUser(req, res, data);
    if (!user) return;
    const transactions = data.transactions
      .filter((transaction) => transaction.userId === user.id)
      .reverse()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    GetAccountTransactionsResponse.parse(transactions);
    // Keep all existing transaction metadata, not just the required schema fields.
    res.json(transactions);
  });

  router.post("/account/password", async (req, res) => {
    const data = await deps.readData();
    const user = deps.requireUser(req, res, data);
    if (!user) return;
    if (rateLimited(user.id, "password", 5)) {
      res.status(429).json({ error: "Too many password change attempts. Try again later." });
      return;
    }
    const parsed = ChangeAccountPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter the current password and a new password of 8–128 characters." });
      return;
    }
    const { currentPassword, newPassword } = parsed.data;
    if (!deps.verifyPassword(currentPassword, user)) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    if (newPassword === currentPassword || deps.verifyPassword(newPassword, user)) {
      res.status(400).json({ error: "New password must differ from the current password" });
      return;
    }
    const password = deps.hashPassword(newPassword);
    user.passwordSalt = password.salt;
    user.passwordHash = password.hash;
    user.passwordFormat = "raw";
    deps.revokeOtherSessions(data, req, user.id);
    await deps.writeData(data);
    res.json(ChangeAccountPasswordResponse.parse({ ok: true }));
  });

  router.post("/account/gift-codes/redeem", async (req, res) => {
    // The API's request lock covers this complete read/validate/write sequence.
    const data = await deps.readData();
    const user = deps.requireUser(req, res, data);
    if (!user) return;
    if (rateLimited(user.id, "gift", 20)) {
      res.status(429).json({ error: "Too many gift code attempts. Try again later." });
      return;
    }
    const parsed = RedeemGiftCodeBody.safeParse(normalizeCodeBody(req.body));
    if (!parsed.success || !/^[A-Z0-9-]+$/.test(parsed.data.code)) {
      res.status(400).json({ error: "Enter a valid gift code (3–40 letters, numbers or hyphens)." });
      return;
    }
    const gift = data.giftCodes.find((item) => item.code.toUpperCase() === parsed.data.code);
    if (!gift) {
      res.status(404).json({ error: "Gift code not found" });
      return;
    }
    if (!gift.enabled) {
      res.status(400).json({ error: "Gift code is disabled" });
      return;
    }
    if (gift.expiresAt !== null &&
        (!Number.isFinite(Date.parse(gift.expiresAt)) || Date.parse(gift.expiresAt) <= Date.now())) {
      res.status(400).json({ error: "Gift code has expired" });
      return;
    }
    if (gift.redeemedUserIds.includes(user.id)) {
      res.status(409).json({ error: "You have already redeemed this gift code" });
      return;
    }
    if (gift.redeemedUserIds.length >= gift.maxRedemptions) {
      res.status(409).json({ error: "Gift code redemption limit reached" });
      return;
    }
    if (!Number.isSafeInteger(gift.amount) || gift.amount < 1 || gift.amount > 100000000 ||
        !Number.isSafeInteger(gift.maxRedemptions) || gift.maxRedemptions < 1 || gift.maxRedemptions > 100000 ||
        !Number.isFinite(user.wallet + gift.amount) || !Number.isFinite(user.totalEarned + gift.amount)) {
      res.status(400).json({ error: "Gift code or account balance is invalid" });
      return;
    }
    gift.redeemedUserIds.push(user.id);
    user.wallet += gift.amount;
    user.totalEarned += gift.amount;
    deps.addTransaction(data, user.id, "gift_code", gift.amount);
    data.activity.push({ id: deps.id("ACT"), userId: user.id, type: "gift_code", createdAt: deps.now() });
    await deps.writeData(data);
    res.json(RedeemGiftCodeResponse.parse({ ok: true, amount: gift.amount, wallet: user.wallet }));
  });

  router.get("/admin/gift-codes", async (req, res) => {
    if (!(await deps.requireAdmin(req, res))) return;
    const gifts = (await deps.readData()).giftCodes.slice().reverse().map(publicGiftCode);
    res.json(GetAdminGiftCodesResponse.parse(gifts));
  });

  router.post("/admin/gift-codes", async (req, res) => {
    if (!(await deps.requireAdmin(req, res))) return;
    const body = normalizeCodeBody(req.body);
    const expiresAt = body && typeof body === "object" ? (body as Record<string, unknown>).expiresAt : undefined;
    if (expiresAt !== undefined && expiresAt !== null && !validFutureIso(expiresAt)) {
      res.status(400).json({ error: "Expiry must be a valid future ISO date-time or null" });
      return;
    }
    const parsed = CreateAdminGiftCodeBody.safeParse(body);
    if (!parsed.success || !Number.isSafeInteger(parsed.data.amount) ||
        !Number.isSafeInteger(parsed.data.maxRedemptions)) {
      res.status(400).json({ error: "Enter a valid code, integer amount (1–100000000) and redemption limit (1–100000)." });
      return;
    }
    const data = await deps.readData();
    if (data.giftCodes.some((gift) => gift.code.toUpperCase() === parsed.data.code)) {
      res.status(409).json({ error: "A gift code with that code already exists" });
      return;
    }
    const gift: StoredGiftCode = {
      id: deps.id("GIFT"),
      code: parsed.data.code,
      amount: parsed.data.amount,
      maxRedemptions: parsed.data.maxRedemptions,
      enabled: true,
      createdAt: deps.now(),
      expiresAt: parsed.data.expiresAt?.toISOString() ?? null,
      redeemedUserIds: [],
    };
    data.giftCodes.push(gift);
    await deps.writeData(data);
    res.status(201).json(CreateAdminGiftCodeResponse.parse(publicGiftCode(gift)));
  });

  router.patch("/admin/gift-codes/:id", async (req, res) => {
    if (!(await deps.requireAdmin(req, res))) return;
    const parsed = UpdateAdminGiftCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enabled must be true or false" });
      return;
    }
    const data = await deps.readData();
    const gift = data.giftCodes.find((item) => item.id === req.params.id);
    if (!gift) {
      res.status(404).json({ error: "Gift code not found" });
      return;
    }
    gift.enabled = parsed.data.enabled;
    await deps.writeData(data);
    res.json(UpdateAdminGiftCodeResponse.parse(publicGiftCode(gift)));
  });
}