import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ResetUserPasswordBody, ReviewPaymentBody, SubmitPaymentBody, UpdateAdminSettingsBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { registerAccountRoutes, type StoredGiftCode } from "./account";

type Product = {
  id: string;
  name: string;
  price: number;
  daily: number;
  total: number;
  days: number;
};

export type User = {
  id: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
  passwordFormat?: "raw";
  referralCode: string;
  referredBy: string | null;
  wallet: number;
  depositBalance: number;
  totalEarned: number;
  createdAt: string;
  lastCheckin: string | null;
  banned: boolean;
};

type AdminAccount = {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type UserSession = {
  kind: "user";
  tokenHash: string;
  userId: string;
  expiresAt: number;
};

type AdminSession = {
  kind: "admin";
  tokenHash: string;
  expiresAt: number;
  accountId: string | null;
  isOwner: boolean;
};

type StoredSession = UserSession | AdminSession;

type Purchase = {
  id: string;
  paymentId?: string;
  userId: string;
  productId: string;
  productName: string;
  amount: number;
  status: "active";
  purchasedAt: string;
  earningsCredited: number;
};

type Payment = {
  id: string;
  userId: string;
  amount: number;
  method: string;
  payerPhone: string;
  payerReference?: string;
  transactionId: string;
  providerTransactionId?: string;
  providerRequestStartedAt?: string;
  status: "pending" | "completed" | "failed" | "expired" | "approved" | "rejected";
  createdAt: string;
  settledAt?: string;
  reviewedAt?: string;
};

type Withdrawal = {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  phone: string;
  status: "pending" | "paid" | "rejected";
  createdAt: string;
  reviewedAt?: string;
};

type Transaction = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  createdAt: string;
  purchaseId?: string;
  paymentId?: string;
  withdrawalId?: string;
  level?: number;
  day?: number;
  netAmount?: number;
};

type Activity = {
  id: string;
  userId?: string;
  type: string;
  createdAt: string;
};

type Settings = {
  brand: string;
  currency: string;
  supportHandle: string;
  telegramUrl: string;
  airtelNumber: string;
  mtnNumber: string;
  payeeName: string;
  termsText: string;
  minDeposit: number;
  minWithdrawal: number;
  withdrawalMultiple: number;
  welcomeBonus: number;
  checkinBonus: number;
  withdrawalFeePercent: number;
  l1CommissionPercent: number;
  returnMultiple: number;
  cycleDays: number;
  maxWithdrawalsPerUserPerDay: number;
  requirePlanBeforeWithdraw: boolean;
  restrictWithdrawalsToHours: boolean;
  withdrawalStartTime: string;
  withdrawalEndTime: string;
  requireReferralCode: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  openingCountdown: boolean;
  openingAt: string | null;
  allowedDomains: string[];
  announcementEnabled: boolean;
  announcementTitle: string;
  announcementMessage: string;
};

export type Data = {
  settings: Settings;
  products: Product[];
  users: User[];
  adminAccounts: AdminAccount[];
  purchases: Purchase[];
  transactions: Transaction[];
  activity: Activity[];
  payments: Payment[];
  withdrawals: Withdrawal[];
  giftCodes: StoredGiftCode[];
  sessions: StoredSession[];
};

const defaultProducts: Product[] = [
  { id: "PLAN-GARDEN", name: "Garden View", price: 19000, daily: 912, total: 34656, days: 38 },
  { id: "PLAN-MOUNTAIN", name: "Mountain View", price: 30000, daily: 2400, total: 72000, days: 30 },
  { id: "PLAN-OCEAN", name: "Ocean View", price: 50000, daily: 4000, total: 120000, days: 30 },
  { id: "PLAN-EXECUTIVE", name: "Executive Room", price: 115000, daily: 9200, total: 294400, days: 32 },
  { id: "PLAN-DELUXE", name: "Deluxe Room", price: 250000, daily: 32500, total: 650000, days: 20 },
  { id: "PLAN-SUNSET", name: "Sunset View", price: 370000, daily: 55500, total: 999000, days: 18 },
  { id: "PLAN-FAMILY", name: "Family Suite", price: 550000, daily: 82500, total: 1650000, days: 20 },
  { id: "PLAN-SILVER", name: "Silver Suite", price: 775000, daily: 116250, total: 2325000, days: 20 },
  { id: "PLAN-HONEYMOON", name: "Honeymoon Suite", price: 1650000, daily: 247500, total: 4950000, days: 20 },
  { id: "PLAN-GOLDEN", name: "Golden Suite", price: 3000000, daily: 540000, total: 9180000, days: 17 },
  { id: "PLAN-DIAMOND", name: "Diamond Suite", price: 5000000, daily: 1000000, total: 10000000, days: 10 },
  { id: "PLAN-ROYAL", name: "Royal Suite", price: 8000000, daily: 1600000, total: 16000000, days: 10 },
  { id: "PLAN-PRESIDENTIAL", name: "Presidential Suite", price: 12000000, daily: 3000000, total: 45000000, days: 15 },
];

const defaultSettings: Settings = {
  brand: "Grand Crown",
  currency: "UGX",
  supportHandle: "@grandcrown01",
  telegramUrl: "https://t.me/+zNDnaz_xKfdiMTlk",
  airtelNumber: "0743240195",
  mtnNumber: "0764312328",
  payeeName: "Nakaliiba Martha",
  termsText: "",
  minDeposit: 19000,
  minWithdrawal: 3000,
  withdrawalMultiple: 0,
  welcomeBonus: 1000,
  checkinBonus: 50,
  withdrawalFeePercent: 15,
  l1CommissionPercent: 10,
  // Four keeps current plan payouts unchanged (the largest existing plan is 3.75x).
  returnMultiple: 4,
  cycleDays: 1,
  maxWithdrawalsPerUserPerDay: 0,
  requirePlanBeforeWithdraw: true,
  restrictWithdrawalsToHours: true,
  withdrawalStartTime: "10:00",
  withdrawalEndTime: "17:00",
  requireReferralCode: false,
  maintenanceMode: false,
  maintenanceMessage: "We’re performing maintenance. Please check back shortly.",
  openingCountdown: false,
  openingAt: null,
  allowedDomains: [],
  announcementEnabled: false,
  announcementTitle: "Grand Crown update",
  announcementMessage: "",
};

const dataFile = path.resolve(
  process.env["GRAND_CROWN_DATA_FILE"] ??
    path.join(process.cwd(), "artifacts/api-server/data.json"),
);
const fileStorageEnabled = Boolean(process.env["GRAND_CROWN_DATA_FILE"]);
const loginAttempts = new Map<string, number[]>();
const sessionTtl = 12 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;
type DatabaseModule = typeof import("@workspace/db");
let databaseModule: DatabaseModule | undefined;

async function getDatabase(): Promise<DatabaseModule> {
  databaseModule ??= await import("@workspace/db");
  return databaseModule;
}

function now() {
  return new Date().toISOString();
}

function money(value: number, currency: string) {
  return `${currency} ${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomBytes(7).toString("hex").toUpperCase()}`;
}

function normalizeData(raw: Partial<Data>): Data {
  const rawSettings = (raw.settings ?? {}) as Settings & {
    l2CommissionPercent?: number;
    l3CommissionPercent?: number;
  };
  const hasLegacyReferralLevels =
    rawSettings.l2CommissionPercent !== undefined ||
    rawSettings.l3CommissionPercent !== undefined;
  const {
    l2CommissionPercent: _legacyLevelTwo,
    l3CommissionPercent: _legacyLevelThree,
    ...savedSettings
  } = rawSettings;
  return {
    settings: {
      ...defaultSettings,
      ...savedSettings,
      ...(hasLegacyReferralLevels ? { l1CommissionPercent: defaultSettings.l1CommissionPercent } : {}),
      ...(rawSettings.minDeposit === 500 ? { minDeposit: defaultSettings.minDeposit } : {}),
      ...(rawSettings.minWithdrawal === 7000 ? { minWithdrawal: defaultSettings.minWithdrawal } : {}),
      ...(rawSettings.withdrawalFeePercent === 12 ? { withdrawalFeePercent: defaultSettings.withdrawalFeePercent } : {}),
      ...(rawSettings.withdrawalStartTime === "06:00"
        ? { withdrawalStartTime: defaultSettings.withdrawalStartTime, restrictWithdrawalsToHours: true }
        : {}),
    },
    products: Array.isArray(raw.products) ? raw.products : defaultProducts,
    users: Array.isArray(raw.users)
      ? raw.users.map((user) => ({
          ...user,
          depositBalance: Number.isFinite(user.depositBalance) ? user.depositBalance : 0,
          banned: Boolean(user.banned),
        }))
      : [],
    adminAccounts: Array.isArray(raw.adminAccounts) ? raw.adminAccounts : [],
    purchases: Array.isArray(raw.purchases) ? raw.purchases : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    activity: Array.isArray(raw.activity) ? raw.activity : [],
    payments: Array.isArray(raw.payments) ? raw.payments : [],
    withdrawals: Array.isArray(raw.withdrawals) ? raw.withdrawals : [],
    giftCodes: Array.isArray(raw.giftCodes) ? raw.giftCodes : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
  };
}

async function readData(): Promise<Data> {
  if (fileStorageEnabled) {
    const raw = JSON.parse(fs.readFileSync(dataFile, "utf8")) as Partial<Data>;
    return normalizeData(raw);
  }
  const { db, grandCrownStateTable } = await getDatabase();
  const [row] = await db
    .select({ payload: grandCrownStateTable.payload })
    .from(grandCrownStateTable)
    .where(eq(grandCrownStateTable.id, 1))
    .limit(1);
  if (!row) {
    throw new Error("Grand Crown PostgreSQL state is not initialized; import the existing JSON data before starting the API.");
  }
  return normalizeData(row.payload as Partial<Data>);
}

export async function ensureDataStoreReady() {
  await readData();
}

function publicSettings(settings: Settings) {
  const { allowedDomains: _allowedDomains, ...visible } = settings;
  return visible;
}

function getAccessStatus(settings: Settings) {
  if (settings.maintenanceMode) {
    return {
      mode: "maintenance" as const,
      message: settings.maintenanceMessage || "We’re performing maintenance. Please check back shortly.",
      openingAt: settings.openingAt,
    };
  }
  const openingAt = settings.openingAt;
  if (settings.openingCountdown && openingAt && Date.parse(openingAt) > Date.now()) {
    return {
      mode: "opening" as const,
      message: "Grand Crown is getting ready to open.",
      openingAt,
    };
  }
  return { mode: "available" as const, message: "", openingAt: null };
}

function normalizeAllowedDomain(value: string): string | undefined {
  const input = value.trim();
  if (!input || input.includes("*")) return undefined;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`);
    if (url.username || url.password || (url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) {
      return undefined;
    }
    return url.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function ugandaDateKey(value: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value instanceof Date ? value : new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function withinWithdrawalWindow(settings: Settings, date = new Date()) {
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const currentParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kampala",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const currentMinutes =
    Number(currentParts.find((item) => item.type === "hour")?.value ?? 0) * 60 +
    Number(currentParts.find((item) => item.type === "minute")?.value ?? 0);
  const start = toMinutes(settings.withdrawalStartTime);
  const end = toMinutes(settings.withdrawalEndTime);
  if (start === end) return true;
  return start < end
    ? currentMinutes >= start && currentMinutes < end
    : currentMinutes >= start || currentMinutes < end;
}

async function writeData(data: Data) {
  if (fileStorageEnabled) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const tempFile = `${dataFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, dataFile);
    return;
  }
  const { db, grandCrownStateTable } = await getDatabase();
  await db
    .insert(grandCrownStateTable)
    .values({ id: 1, payload: data as unknown as Record<string, unknown> })
    .onConflictDoUpdate({
      target: grandCrownStateTable.id,
      set: { payload: data as unknown as Record<string, unknown>, updatedAt: new Date() },
    });
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}

function verifyPassword(password: string, user: User) {
  try {
    const expected = Buffer.from(user.passwordHash, "hex");
    const actual = crypto.scryptSync(password, user.passwordSalt, 64);
    if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) return true;
    // Old registrations trimmed passwords. New/changed passwords are always
    // exact strings, and must never be accepted through the legacy fallback.
    if (user.passwordFormat !== "raw" && password !== password.trim()) {
      const legacy = crypto.scryptSync(password.trim(), user.passwordSalt, 64);
      return expected.length === legacy.length && crypto.timingSafeEqual(expected, legacy);
    }
    return false;
  } catch {
    return false;
  }
}

function verifyAdminPassword(password: string, admin: AdminAccount) {
  try {
    const expected = Buffer.from(admin.passwordHash, "hex");
    const actual = crypto.scryptSync(password, admin.passwordSalt, 64);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function publicUser(user: User) {
  return {
    id: user.id,
    phone: user.phone,
    referralCode: user.referralCode,
    wallet: user.wallet,
    depositBalance: user.depositBalance,
    totalEarned: user.totalEarned,
    createdAt: user.createdAt,
    lastCheckin: user.lastCheckin,
    banned: user.banned,
  };
}

function bodyString(req: Request, key: string) {
  const value = (req.body as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function bodyPassword(req: Request) {
  const value = (req.body as Record<string, unknown> | undefined)?.password;
  return typeof value === "string" ? value : "";
}

function bodyNumber(req: Request, key: string) {
  const value = (req.body as Record<string, unknown> | undefined)?.[key];
  return typeof value === "number" ? value : Number(value);
}

function cookieValue(req: Request, name: string) {
  const cookieHeader = req.headers.cookie ?? "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function setCookie(res: Response, name: string, value: string, maxAge: number) {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`,
  );
}

function sessionTokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function currentUser(req: Request, data: Data) {
  const token = cookieValue(req, "gc_user");
  if (!token) return undefined;
  const session = data.sessions.find(
    (item): item is UserSession =>
      item.kind === "user" &&
      item.tokenHash === sessionTokenHash(token) &&
      item.expiresAt > Date.now(),
  );
  if (!session) return undefined;
  const user = data.users.find((item) => item.id === session.userId);
  return user?.banned ? undefined : user;
}

function currentAdminSession(req: Request, data: Data) {
  const token = cookieValue(req, "gc_admin");
  if (!token) return undefined;
  return data.sessions.find(
    (item): item is AdminSession =>
      item.kind === "admin" &&
      item.tokenHash === sessionTokenHash(token) &&
      item.expiresAt > Date.now(),
  );
}

function isAdmin(req: Request, data: Data) {
  return Boolean(currentAdminSession(req, data));
}

function requireUser(req: Request, res: Response, data: Data) {
  const access = getAccessStatus(data.settings);
  if (access.mode !== "available") {
    res.status(503).json({ error: access.message, accessMode: access.mode, openingAt: access.openingAt });
    return undefined;
  }
  const user = currentUser(req, data);
  if (!user) {
    res.status(401).json({ error: "Login required" });
    return undefined;
  }
  return user;
}

async function requireAdmin(req: Request, res: Response) {
  const data = await readData();
  if (!isAdmin(req, data)) {
    res.status(401).json({ error: "Administrator login required" });
    return false;
  }
  return true;
}

async function requireOwnerAdmin(req: Request, res: Response) {
  const data = await readData();
  const session = currentAdminSession(req, data);
  if (!session) {
    res.status(401).json({ error: "Administrator login required" });
    return false;
  }
  if (!session.isOwner) {
    res.status(403).json({ error: "Owner administrator access required" });
    return false;
  }
  return true;
}

function rateLimited(req: Request, scope: string, max: number) {
  const key = `${scope}:${req.ip}`;
  const cutoff = Date.now() - 15 * 60 * 1000;
  const recent = (loginAttempts.get(key) ?? []).filter((time) => time > cutoff);
  if (recent.length >= max) {
    loginAttempts.set(key, recent);
    return true;
  }
  recent.push(Date.now());
  loginAttempts.set(key, recent);
  return false;
}

function activePurchases(data: Data, userId: string) {
  return data.purchases.filter(
    (purchase) => purchase.userId === userId && purchase.status === "active",
  );
}

function addTransaction(
  data: Data,
  userId: string,
  type: string,
  amount: number,
  extra: Partial<Transaction> = {},
) {
  data.transactions.push({
    id: id("TX"),
    userId,
    type,
    amount,
    createdAt: now(),
    ...extra,
  });
}

async function processEarnings(data: Data) {
  let changed = false;
  const cycleMs = dayMs * Math.max(1, data.settings.cycleDays || 1);
  for (const purchase of data.purchases) {
    const product = data.products.find((item) => item.id === purchase.productId);
    const user = data.users.find((item) => item.id === purchase.userId);
    if (!product || !user || purchase.status !== "active" || !product.daily) continue;
    const started = new Date(purchase.purchasedAt).getTime();
    if (!Number.isFinite(started)) continue;
    const target = Math.min(
      Math.max(0, Math.floor((Date.now() - started) / cycleMs)),
      product.days,
    );
    const maxReturn = Math.max(0, purchase.amount * data.settings.returnMultiple);
    let creditedAmount = data.transactions
      .filter((transaction) => transaction.type === "daily_earning" && transaction.purchaseId === purchase.id)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    while (purchase.earningsCredited < target) {
      const day = purchase.earningsCredited + 1;
      const exists = data.transactions.some(
        (transaction) =>
          transaction.type === "daily_earning" &&
          transaction.purchaseId === purchase.id &&
          transaction.day === day,
      );
      if (!exists) {
        const amount = Math.min(product.daily, Math.max(0, maxReturn - creditedAmount));
        if (amount > 0) {
          user.wallet += amount;
          user.totalEarned += amount;
          creditedAmount += amount;
          addTransaction(data, user.id, "daily_earning", amount, { purchaseId: purchase.id, day });
        }
      }
      purchase.earningsCredited = day;
      changed = true;
    }
  }
  if (changed) await writeData(data);
}

function applyReferralCommissions(data: Data, buyer: User, purchase: Purchase) {
  const referrer = data.users.find((user) => user.id === buyer.referredBy);
  if (!referrer) return;
  const exists = data.transactions.some(
    (transaction) =>
      transaction.type === "referral_commission" &&
      transaction.purchaseId === purchase.id &&
      transaction.userId === referrer.id &&
      transaction.level === 1,
  );
  if (exists) return;
  const commission = Math.round(purchase.amount * (data.settings.l1CommissionPercent / 100));
  referrer.wallet += commission;
  referrer.totalEarned += commission;
  addTransaction(data, referrer.id, "referral_commission", commission, {
    purchaseId: purchase.id,
    level: 1,
  });
}

function normalizeUgandaPhone(value: string) {
  const digits = value.replace(/[\s()-]/g, "");
  const international = digits.startsWith("0")
    ? `+256${digits.slice(1)}`
    : digits.startsWith("256")
      ? `+${digits}`
      : digits;
  return /^\+256[0-9]{9}$/.test(international) ? international : undefined;
}

const router: IRouter = Router();

let localRequestQueue: Promise<void> = Promise.resolve();

async function acquireLocalRequestTurn() {
  let release!: () => void;
  const turn = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = localRequestQueue;
  localRequestQueue = previous.then(() => turn);
  await previous;
  return release;
}

router.use(async (_req, res, next) => {
  const releaseLocal = await acquireLocalRequestTurn();
  if (fileStorageEnabled) {
    res.once("finish", releaseLocal);
    res.once("close", releaseLocal);
    return next();
  }
  let client: import("pg").PoolClient | undefined;
  try {
    const { pool } = await getDatabase();
    client = await pool.connect();
    await client.query("SELECT pg_advisory_lock(381049882211337::bigint)");
  } catch {
    client?.release(true);
    releaseLocal();
    return res.status(503).json({ error: "Persistent storage is temporarily unavailable." });
  }
  let released = false;
  const releaseRequest = () => {
    if (released) return;
    released = true;
    void (async () => {
      try {
        await client!.query("SELECT pg_advisory_unlock(381049882211337::bigint)");
        client!.release();
      } catch {
        client!.release(true);
      } finally {
        releaseLocal();
      }
    })();
  };
  res.once("finish", releaseRequest);
  res.once("close", releaseRequest);
  return next();
});

router.use(async (req, res, next) => {
  const origin = req.get("origin");
  if (!origin) return next();
  let originHost: string;
  let requestHost: string;
  try {
    originHost = new URL(origin).hostname.toLowerCase();
    requestHost = new URL(`${req.protocol}://${req.get("host")}`).hostname.toLowerCase();
  } catch {
    return res.status(403).json({ error: "This website is not allowed to access Grand Crown." });
  }
  const allowed = (await readData()).settings.allowedDomains
    .map((domain) => normalizeAllowedDomain(domain))
    .filter((domain): domain is string => Boolean(domain));
  if (originHost === requestHost || allowed.includes(originHost)) return next();
  return res.status(403).json({ error: "This website is not allowed to access Grand Crown." });
});

registerAccountRoutes(router, {
  readData,
  writeData,
  requireUser,
  requireAdmin,
  hashPassword,
  verifyPassword,
  addTransaction,
  id,
  now,
  revokeOtherSessions(data, req, userId) {
    const currentToken = cookieValue(req, "gc_user");
    const currentHash = currentToken ? sessionTokenHash(currentToken) : undefined;
    data.sessions = data.sessions.filter(
      (session) =>
        session.kind !== "user" ||
        session.userId !== userId ||
        session.tokenHash === currentHash,
    );
  },
});

router.get("/settings", async (_req, res) => res.json(publicSettings((await readData()).settings)));
router.get("/products", async (_req, res) => res.json((await readData()).products));

function generateReferralCode(users: User[]): string | undefined {
  const existingCodes = new Set(users.map((user) => user.referralCode.toUpperCase()));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    if (!existingCodes.has(code)) return code;
  }
  return undefined;
}

router.post("/auth/register", async (req, res) => {
  const data = await readData();
  const access = getAccessStatus(data.settings);
  if (access.mode !== "available") {
    return res.status(503).json({ error: access.message, accessMode: access.mode, openingAt: access.openingAt });
  }
  const phone = bodyString(req, "phone");
  const password = bodyPassword(req);
  const sponsorCode = bodyString(req, "referralCode").toUpperCase();
  if (!/^\+?[0-9]{7,15}$/.test(phone) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Use a valid phone number and a password of 8–128 characters" });
  }
  if (data.users.some((user) => user.phone === phone)) {
    return res.status(409).json({ error: "An account with that phone already exists" });
  }
  if (data.settings.requireReferralCode && !sponsorCode) {
    return res.status(400).json({ error: "Enter an invitation referral code to create an account" });
  }
  const parent = sponsorCode
    ? data.users.find((user) => user.referralCode === sponsorCode)
    : undefined;
  if (sponsorCode && !parent) return res.status(400).json({ error: "Invalid referral code" });
  const memberReferralCode = generateReferralCode(data.users);
  if (!memberReferralCode) {
    return res.status(503).json({ error: "Unable to assign a referral code. Please try again." });
  }
  const passwordParts = hashPassword(password);
  const user: User = {
    id: id("USR"),
    phone,
    passwordHash: passwordParts.hash,
    passwordSalt: passwordParts.salt,
    passwordFormat: "raw",
    referralCode: memberReferralCode,
    referredBy: parent?.id ?? null,
    wallet: data.settings.welcomeBonus,
    depositBalance: 0,
    totalEarned: data.settings.welcomeBonus,
    createdAt: now(),
    lastCheckin: null,
    banned: false,
  };
  data.users.push(user);
  addTransaction(data, user.id, "signup_bonus", data.settings.welcomeBonus);
  data.activity.push({ id: id("ACT"), userId: user.id, type: "signup", createdAt: now() });
  const token = crypto.randomBytes(32).toString("hex");
  data.sessions.push({
    kind: "user",
    tokenHash: sessionTokenHash(token),
    userId: user.id,
    expiresAt: Date.now() + sessionTtl,
  });
  await writeData(data);
  setCookie(res, "gc_user", token, sessionTtl / 1000);
  return res.status(201).json({ ok: true, user: publicUser(user) });
});

router.post("/auth/login", async (req, res) => {
  if (rateLimited(req, "user-login", 8)) {
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }
  const data = await readData();
  const access = getAccessStatus(data.settings);
  if (access.mode !== "available") {
    return res.status(503).json({ error: access.message, accessMode: access.mode, openingAt: access.openingAt });
  }
  const user = data.users.find((item) => item.phone === bodyString(req, "phone"));
  if (!user || user.banned || !verifyPassword(bodyPassword(req), user)) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }
  const token = crypto.randomBytes(32).toString("hex");
  data.sessions.push({
    kind: "user",
    tokenHash: sessionTokenHash(token),
    userId: user.id,
    expiresAt: Date.now() + sessionTtl,
  });
  await writeData(data);
  setCookie(res, "gc_user", token, sessionTtl / 1000);
  return res.json({ ok: true, user: publicUser(user) });
});

router.post("/auth/logout", async (req, res) => {
  const token = cookieValue(req, "gc_user");
  if (token) {
    const data = await readData();
    const tokenHash = sessionTokenHash(token);
    data.sessions = data.sessions.filter((session) => session.tokenHash !== tokenHash);
    await writeData(data);
  }
  setCookie(res, "gc_user", "", 0);
  return res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const data = await readData();
  const access = getAccessStatus(data.settings);
  if (access.mode !== "available") {
    return res.json({
      loggedIn: false,
      user: null,
      accessMode: access.mode,
      accessMessage: access.message,
      openingAt: access.openingAt,
    });
  }
  const user = currentUser(req, data);
  return res.json({
    loggedIn: Boolean(user),
    user: user ? publicUser(user) : null,
    accessMode: "available",
    accessMessage: "",
    openingAt: null,
  });
});

router.get("/dashboard", async (req, res) => {
  const data = await readData();
  await processEarnings(data);
  const user = requireUser(req, res, data);
  if (!user) return;
  const purchases = activePurchases(data, user.id);
  return res.json({
    user: publicUser(user),
    purchases,
    transactions: data.transactions
      .filter((transaction) => transaction.userId === user.id)
      .slice(-100)
      .reverse(),
    canWithdraw: purchases.length > 0,
  });
});

router.post("/checkin", async (req, res) => {
  const data = await readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  const today = ugandaDateKey();
  if (user.lastCheckin === today) return res.status(409).json({ error: "Daily check-in already claimed" });
  user.lastCheckin = today;
  const reward = data.settings.checkinBonus;
  user.wallet += reward;
  user.totalEarned += reward;
  addTransaction(data, user.id, "checkin", reward);
  await writeData(data);
  return res.json({ ok: true, reward, user: publicUser(user) });
});

router.get("/referral", async (req, res) => {
  const data = await readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  const direct = data.users.filter((item) => item.referredBy === user.id);
  const members = direct.map((item) => ({
    id: item.id,
    phone: item.phone,
    level: 1,
    createdAt: item.createdAt,
  }));
  const commissions = data.transactions
    .filter((transaction) => transaction.userId === user.id && transaction.type === "referral_commission")
    .map((transaction) => ({
      id: transaction.id,
      level: transaction.level ?? 1,
      amount: transaction.amount,
      createdAt: transaction.createdAt,
    }));
  return res.json({
    code: user.referralCode,
    link: `${req.protocol}://${req.get("host")}/?ref=${user.referralCode}`,
    directReferrals: direct.length,
    teamSize: members.length,
    members,
    commissions,
  });
});

router.get("/payments", async (req, res) => {
  const data = await readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  return res.json(data.payments.filter((payment) => payment.userId === user.id).slice().reverse());
});

router.get("/payments/:id", async (req, res) => {
  const data = await readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  const payment = data.payments.find((item) => item.id === req.params.id && item.userId === user.id);
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  res.json(payment);
});

router.post("/payments", async (req, res) => {
  const data = await readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  const parsed = SubmitPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { amount, method, payerPhone, payerReference } = parsed.data;
  if (!["MTN Mobile Money", "Airtel Money"].includes(method)) {
    res.status(400).json({ error: "Choose MTN Mobile Money or Airtel Money" });
    return;
  }
  if (!normalizeUgandaPhone(payerPhone)) {
    res.status(400).json({ error: "Enter a valid Ugandan mobile number" });
    return;
  }
  if (!Number.isSafeInteger(amount) || amount < data.settings.minDeposit) {
    res.status(400).json({ error: `Minimum deposit is ${money(data.settings.minDeposit, data.settings.currency)}` });
    return;
  }
  const normalizedReference = payerReference.replace(/\s+/g, "").toUpperCase();
  const referenceUsed = data.payments.some(
    (item) => item.payerReference?.replace(/\s+/g, "").toUpperCase() === normalizedReference,
  );
  if (referenceUsed) {
    res.status(409).json({ error: "That transaction reference has already been submitted" });
    return;
  }
  const transactionId = `GC-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
  const payment: Payment = {
    id: id("PAY"),
    userId: user.id,
    amount,
    method,
    payerPhone,
    payerReference,
    transactionId,
    status: "pending",
    createdAt: now(),
  };
  data.payments.push(payment);
  data.activity.push({ id: id("ACT"), userId: user.id, type: "deposit_initiated", createdAt: now() });
  await writeData(data);
  res.status(201).json({ ok: true, paymentId: payment.id, status: payment.status, payment });
});

router.get("/purchases", async (req, res) => {
  const data = await readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  return res.json(data.purchases.filter((purchase) => purchase.userId === user.id));
});

router.post("/purchases", async (req, res) => {
  const data = await readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  const productId = bodyString(req, "productId");
  const product = data.products.find((item) => item.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (user.depositBalance < product.price) {
    return res.status(400).json({
      error: `Not enough product funds. Deposit ${money(product.price - user.depositBalance, data.settings.currency)} more.`,
    });
  }

  user.depositBalance -= product.price;
  const purchase: Purchase = {
    id: id("PUR"),
    userId: user.id,
    productId: product.id,
    productName: product.name,
    amount: product.price,
    status: "active",
    purchasedAt: now(),
    earningsCredited: 0,
  };
  data.purchases.push(purchase);
  addTransaction(data, user.id, "product_purchase", -product.price, { purchaseId: purchase.id });
  applyReferralCommissions(data, user, purchase);
  data.activity.push({ id: id("ACT"), userId: user.id, type: "product_purchased", createdAt: now() });
  await writeData(data);
  return res.status(201).json(purchase);
});

router.get("/withdrawals", async (req, res) => {
  const data = await readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  return res.json(data.withdrawals.filter((withdrawal) => withdrawal.userId === user.id));
});

router.post("/withdrawals", async (req, res) => {
  const data = await readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  const amount = bodyNumber(req, "amount");
  const method = bodyString(req, "method");
  const phone = bodyString(req, "phone");
  if (data.settings.requirePlanBeforeWithdraw && activePurchases(data, user.id).length === 0) {
    return res.status(403).json({ error: "Approve at least one product before withdrawing" });
  }
  if (data.withdrawals.some((item) => item.userId === user.id && ["pending", "processing", "sending"].includes(item.status))) {
    return res.status(409).json({ error: "You already have a withdrawal awaiting review" });
  }
  const minimum = data.settings.minWithdrawal;
  if (!Number.isFinite(amount) || amount < minimum) {
    return res.status(400).json({ error: `Minimum withdrawal is ${money(minimum, data.settings.currency)}` });
  }
  if (data.settings.withdrawalMultiple > 0 && amount % data.settings.withdrawalMultiple !== 0) {
    return res.status(400).json({ error: `Withdrawal amount must be a multiple of ${money(data.settings.withdrawalMultiple, data.settings.currency)}` });
  }
  if (amount > user.wallet) return res.status(400).json({ error: "Insufficient wallet balance" });
  if (data.settings.maxWithdrawalsPerUserPerDay > 0) {
    const withdrawalsToday = data.withdrawals.filter((item) =>
      item.userId === user.id && ugandaDateKey(item.createdAt) === ugandaDateKey(),
    ).length;
    if (withdrawalsToday >= data.settings.maxWithdrawalsPerUserPerDay) {
      return res.status(429).json({ error: "You have reached the daily withdrawal limit" });
    }
  }
  if (data.settings.restrictWithdrawalsToHours && !withinWithdrawalWindow(data.settings)) {
    return res.status(403).json({
      error: `Withdrawals are available between ${data.settings.withdrawalStartTime} and ${data.settings.withdrawalEndTime} Uganda time`,
    });
  }
  if (!["Airtel Money", "MTN Mobile Money"].includes(method) || !/^\+?[0-9]{7,15}$/.test(phone)) {
    return res.status(400).json({ error: "Enter valid withdrawal details" });
  }
  const fee = Math.round(amount * data.settings.withdrawalFeePercent / 100);
  const withdrawal: Withdrawal = {
    id: id("WD"),
    userId: user.id,
    amount,
    fee,
    netAmount: amount - fee,
    method,
    phone,
    status: "pending",
    createdAt: now(),
  };
  user.wallet -= amount;
  data.withdrawals.push(withdrawal);
  addTransaction(data, user.id, "withdrawal_hold", -amount, { withdrawalId: withdrawal.id });
  await writeData(data);
  return res.status(201).json({ ok: true, withdrawal });
});

router.post("/admin/auth/login", async (req, res) => {
  if (rateLimited(req, "admin-login", 5)) return res.status(429).json({ error: "Too many admin login attempts. Try again later." });
  const username = bodyString(req, "username");
  const password = bodyPassword(req);
  const ownerUsername = process.env["ADMIN_USER"] ?? "admin";
  const ownerPassword = process.env["ADMIN_PASS"] ?? (process.env["NODE_ENV"] === "production" ? "" : "change-me-now");
  if (process.env["NODE_ENV"] === "production" && (!ownerPassword || ownerPassword === "change-me-now")) {
    return res.status(503).json({ error: "Owner administrator credentials have not been configured." });
  }
  const data = await readData();
  const isOwner = username.toLowerCase() === ownerUsername.toLowerCase() && password === ownerPassword;
  const account = isOwner
    ? undefined
    : data.adminAccounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
  if (!isOwner && (!account || !verifyAdminPassword(password, account))) {
    return res.status(401).json({ error: "Invalid administrator login" });
  }
  if (account) account.lastLoginAt = now();
  const token = crypto.randomBytes(32).toString("hex");
  data.sessions.push({
    kind: "admin",
    tokenHash: sessionTokenHash(token),
    expiresAt: Date.now() + sessionTtl,
    accountId: account?.id ?? null,
    isOwner,
  });
  await writeData(data);
  setCookie(res, "gc_admin", token, sessionTtl / 1000);
  return res.json({ ok: true });
});

router.post("/admin/auth/logout", async (req, res) => {
  const token = cookieValue(req, "gc_admin");
  if (token) {
    const data = await readData();
    const tokenHash = sessionTokenHash(token);
    data.sessions = data.sessions.filter((session) => session.tokenHash !== tokenHash);
    await writeData(data);
  }
  setCookie(res, "gc_admin", "", 0);
  return res.json({ ok: true });
});

router.get("/admin/admins", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const data = await readData();
  const session = currentAdminSession(req, data)!;
  const ownerUsername = process.env["ADMIN_USER"] ?? "admin";
  return res.json({
    canManage: session.isOwner,
    admins: [
      {
        id: "owner",
        username: ownerUsername,
        role: "Owner",
        createdAt: null,
        lastLoginAt: null,
        isCurrent: session.isOwner,
      },
      ...data.adminAccounts.map((account) => ({
        id: account.id,
        username: account.username,
        role: "Admin",
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt,
        isCurrent: session.accountId === account.id,
      })),
    ],
  });
});

router.post("/admin/admins", async (req, res) => {
  if (!(await requireOwnerAdmin(req, res))) return;
  const username = bodyString(req, "username");
  const password = bodyPassword(req);
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(username) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Use a 3–32 character username and a password of 8–128 characters" });
  }
  const data = await readData();
  const ownerUsername = process.env["ADMIN_USER"] ?? "admin";
  if (
    username.toLowerCase() === ownerUsername.toLowerCase() ||
    data.adminAccounts.some((account) => account.username.toLowerCase() === username.toLowerCase())
  ) {
    return res.status(409).json({ error: "That administrator username is already in use" });
  }
  const passwordParts = hashPassword(password);
  const account: AdminAccount = {
    id: id("ADM"),
    username,
    passwordHash: passwordParts.hash,
    passwordSalt: passwordParts.salt,
    createdAt: now(),
    lastLoginAt: null,
  };
  data.adminAccounts.push(account);
  data.activity.push({ id: id("ACT"), type: "admin_created", createdAt: now() });
  await writeData(data);
  return res.status(201).json({
    id: account.id,
    username: account.username,
    role: "Admin",
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt,
    isCurrent: false,
  });
});

router.delete("/admin/admins/:id", async (req, res) => {
  if (!(await requireOwnerAdmin(req, res))) return;
  const data = await readData();
  const index = data.adminAccounts.findIndex((account) => account.id === req.params.id);
  if (index < 0) {
    res.status(404).json({ error: "Administrator account not found" });
    return;
  }
  const [account] = data.adminAccounts.splice(index, 1);
  data.sessions = data.sessions.filter(
    (session) => session.kind !== "admin" || session.accountId !== account.id,
  );
  data.activity.push({ id: id("ACT"), type: "admin_deleted", createdAt: now() });
  await writeData(data);
  return res.json({ ok: true });
});

router.get("/admin/dashboard", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const data = await readData();
  return res.json({
    users: data.users.length,
    products: data.products.length,
    purchases: data.purchases.length,
    payments: data.payments.filter((item) => item.status === "pending").length,
    withdrawals: data.withdrawals.filter((item) => item.status === "pending").length,
    transactions: data.transactions.length,
    walletBalances: data.users.reduce((sum, user) => sum + user.wallet, 0),
    productFundBalances: data.users.reduce((sum, user) => sum + user.depositBalance, 0),
    totalDeposited: data.payments
      .filter((item) => item.status === "completed" || item.status === "approved")
      .reduce((sum, item) => sum + item.amount, 0),
    totalWithdrawn: data.withdrawals.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
    totalInvested: data.purchases.reduce((sum, item) => sum + item.amount, 0),
  });
});

router.get("/admin/users", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  return res.json((await readData()).users.map(publicUser));
});

router.post("/admin/users/:id/credit", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const data = await readData();
  const user = data.users.find((item) => item.id === req.params.id);
  const amount = bodyNumber(req, "amount");
  const note = bodyString(req, "note");
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!Number.isFinite(amount) || amount < 1) return res.status(400).json({ error: "Credit amount must be at least UGX 1" });
  user.wallet += amount;
  user.totalEarned += amount;
  addTransaction(data, user.id, "admin_credit", amount);
  data.activity.push({ id: id("ACT"), userId: user.id, type: note ? `admin_credit:${note.slice(0, 80)}` : "admin_credit", createdAt: now() });
  await writeData(data);
  return res.json({ ok: true, user: publicUser(user) });
});

router.post("/admin/users/:id/debit", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const data = await readData();
  const user = data.users.find((item) => item.id === req.params.id);
  const amount = bodyNumber(req, "amount");
  const note = bodyString(req, "note");
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!Number.isFinite(amount) || amount < 1) return res.status(400).json({ error: "Debit amount must be at least UGX 1" });
  if (amount > user.wallet) return res.status(400).json({ error: "Debit amount cannot exceed the user's balance" });
  user.wallet -= amount;
  addTransaction(data, user.id, "admin_debit", -amount);
  data.activity.push({ id: id("ACT"), userId: user.id, type: note ? `admin_debit:${note.slice(0, 80)}` : "admin_debit", createdAt: now() });
  await writeData(data);
  return res.json({ ok: true, user: publicUser(user) });
});

router.put("/admin/users/:id/ban", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const data = await readData();
  const user = data.users.find((item) => item.id === req.params.id);
  const banned = (req.body as Record<string, unknown> | undefined)?.banned;
  if (!user) return res.status(404).json({ error: "User not found" });
  if (typeof banned !== "boolean") return res.status(400).json({ error: "Banned must be true or false" });
  user.banned = banned;
  if (banned) {
    data.sessions = data.sessions.filter(
      (session) => session.kind !== "user" || session.userId !== user.id,
    );
  }
  data.activity.push({ id: id("ACT"), userId: user.id, type: banned ? "user_banned" : "user_unbanned", createdAt: now() });
  await writeData(data);
  return res.json({ ok: true, user: publicUser(user) });
});

router.post("/admin/users/:id/password", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const rawId = req.params.id;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;
  const data = await readData();
  const user = data.users.find((item) => item.id === userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const parsed = ResetUserPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a temporary password of 8–128 characters." });
    return;
  }
  const password = hashPassword(parsed.data.password);
  user.passwordHash = password.hash;
  user.passwordSalt = password.salt;
  user.passwordFormat = "raw";
  data.sessions = data.sessions.filter(
    (session) => session.kind !== "user" || session.userId !== user.id,
  );
  data.activity.push({ id: id("ACT"), userId: user.id, type: "admin_password_reset", createdAt: now() });
  await writeData(data);
  res.json({ ok: true });
});

router.delete("/admin/users/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const data = await readData();
  const userIndex = data.users.findIndex((item) => item.id === req.params.id);
  if (userIndex < 0) return res.status(404).json({ error: "User not found" });
  const userId = req.params.id;
  data.users.splice(userIndex, 1);
  for (const user of data.users) {
    if (user.referredBy === userId) user.referredBy = null;
  }
  data.purchases = data.purchases.filter((item) => item.userId !== userId);
  data.payments = data.payments.filter((item) => item.userId !== userId);
  data.withdrawals = data.withdrawals.filter((item) => item.userId !== userId);
  data.transactions = data.transactions.filter((item) => item.userId !== userId);
  data.activity = data.activity.filter((item) => item.userId !== userId);
  data.sessions = data.sessions.filter(
    (session) => session.kind !== "user" || session.userId !== userId,
  );
  await writeData(data);
  return res.json({ ok: true });
});
router.get("/admin/payments", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  return res.json((await readData()).payments);
});
router.put("/admin/payments/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const data = await readData();
  const rawId = req.params.id;
  const paymentId = Array.isArray(rawId) ? rawId[0] : rawId;
  const payment = data.payments.find((item) => item.id === paymentId);
  const parsed = ReviewPaymentBody.safeParse(req.body);
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const action = parsed.data.action;
  if (payment.status !== "pending") {
    res.status(409).json({ error: "Deposit already reviewed" });
    return;
  }
  if (action === "approve" && !payment.payerReference) {
    res.status(400).json({ error: "This deposit has no transfer reference and cannot be approved" });
    return;
  }
  if (action === "approve") {
    const user = data.users.find((item) => item.id === payment.userId);
    if (!user) {
      res.status(404).json({ error: "Member account no longer exists" });
      return;
    }
    payment.reviewedAt = now();
    payment.status = "approved";
    payment.settledAt = payment.reviewedAt;
    user.depositBalance += payment.amount;
    addTransaction(data, payment.userId, "deposit_credit", payment.amount, { paymentId: payment.id });
    data.activity.push({ id: id("ACT"), userId: payment.userId, type: "deposit_approved", createdAt: payment.reviewedAt });
  } else {
    payment.reviewedAt = now();
    payment.status = "rejected";
    data.activity.push({ id: id("ACT"), userId: payment.userId, type: "deposit_rejected", createdAt: payment.reviewedAt });
  }
  await writeData(data);
  res.json({ ok: true, paymentId: payment.id, status: payment.status, payment });
});
router.get("/admin/withdrawals", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  return res.json((await readData()).withdrawals);
});
router.get("/admin/products", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  return res.json((await readData()).products);
});
router.get("/admin/transactions", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  return res.json((await readData()).transactions.slice().reverse());
});
router.get("/admin/activity", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  return res.json((await readData()).activity.slice().reverse());
});
router.get("/admin/referrals", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const data = await readData();
  const commissions = data.transactions.filter((item) => item.type === "referral_commission");
  return res.json({ commissions: commissions.length, total: commissions.reduce((sum, item) => sum + item.amount, 0) });
});
router.get("/admin/settings", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  return res.json((await readData()).settings);
});

router.put("/admin/withdrawals/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const data = await readData();
  const withdrawal = data.withdrawals.find((item) => item.id === req.params.id);
  const action = bodyString(req, "action");
  if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });
  if (withdrawal.status !== "pending") return res.status(409).json({ error: "Withdrawal already reviewed" });
  if (action !== "approve" && action !== "reject") return res.status(400).json({ error: "Invalid review action" });
  withdrawal.status = action === "approve" ? "paid" : "rejected";
  withdrawal.reviewedAt = now();
  if (action === "reject") {
    const user = data.users.find((item) => item.id === withdrawal.userId);
    if (user) {
      user.wallet += withdrawal.amount;
      addTransaction(data, user.id, "withdrawal_refund", withdrawal.amount, { withdrawalId: withdrawal.id });
    }
  } else {
    addTransaction(data, withdrawal.userId, "withdrawal_paid", -withdrawal.amount, {
      withdrawalId: withdrawal.id,
      netAmount: withdrawal.netAmount,
    });
  }
  data.activity.push({ id: id("ACT"), userId: withdrawal.userId, type: `withdrawal_${action}d`, createdAt: now() });
  writeData(data);
  return res.json({ ok: true, withdrawal });
});

router.post("/admin/products", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
  const name = bodyString(req, "name");
  const price = bodyNumber(req, "price");
  const daily = bodyNumber(req, "daily");
  const total = bodyNumber(req, "total");
  const days = bodyNumber(req, "days");
  if (!name || ![price, daily, total, days].every(Number.isFinite) || price <= 0 || days < 1) {
    return res.status(400).json({ error: "Enter valid product details" });
  }
  const product: Product = { id: id("PROD"), name, price, daily, total, days };
  data.products.push(product);
  writeData(data);
  return res.status(201).json(product);
});

router.delete("/admin/products/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
  const index = data.products.findIndex((item) => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "Product not found" });
  data.products.splice(index, 1);
  writeData(data);
  return res.json({ ok: true });
});

router.put("/admin/settings", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = UpdateAdminSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter valid settings; terms text must be at most 20000 characters." });
  }
  const data = readData();
  if (!parsed.data.brand.trim()) {
    return res.status(400).json({ error: "Brand cannot be blank" });
  }
  const allowedDomains = parsed.data.allowedDomains.map(normalizeAllowedDomain);
  if (allowedDomains.some((domain) => !domain)) {
    return res.status(400).json({ error: "Enter valid website hostnames without paths or wildcards." });
  }
  if (parsed.data.openingAt && !Number.isFinite(parsed.data.openingAt.getTime())) {
    return res.status(400).json({ error: "Enter a valid opening date and time." });
  }
  data.settings = {
    ...data.settings,
    ...parsed.data,
    openingAt: parsed.data.openingAt?.toISOString() ?? null,
    brand: parsed.data.brand.trim().slice(0, 80),
    allowedDomains: allowedDomains.filter((domain): domain is string => Boolean(domain)),
  };
  writeData(data);
  return res.json(data.settings);
});

export default router;