import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type Product = {
  id: string;
  name: string;
  price: number;
  daily: number;
  total: number;
  days: number;
};

type User = {
  id: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
  referralCode: string;
  referredBy: string | null;
  wallet: number;
  totalEarned: number;
  createdAt: string;
  lastCheckin: string | null;
  banned: boolean;
};

type Purchase = {
  id: string;
  paymentId: string;
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
  productId: string;
  productName: string;
  amount: number;
  method: string;
  payerPhone: string;
  transactionId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
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
};

type Data = {
  settings: Settings;
  products: Product[];
  users: User[];
  purchases: Purchase[];
  transactions: Transaction[];
  activity: Activity[];
  payments: Payment[];
  withdrawals: Withdrawal[];
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
  supportHandle: "@phio333",
  telegramUrl: "https://t.me/+zNDnaz_xKfdiMTlk",
  airtelNumber: "0743240195",
  mtnNumber: "0764312328",
  payeeName: "Nakaliiba Martha",
};

const dataFile = path.resolve(
  process.env["GRAND_CROWN_DATA_FILE"] ??
    path.join(process.cwd(), "artifacts/api-server/data.json"),
);
const userSessions = new Map<string, { userId: string; expiresAt: number }>();
const adminSessions = new Map<string, number>();
const loginAttempts = new Map<string, number[]>();
const sessionTtl = 12 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomBytes(7).toString("hex").toUpperCase()}`;
}

function readData(): Data {
  try {
    const raw = JSON.parse(fs.readFileSync(dataFile, "utf8")) as Partial<Data>;
    return {
      settings: { ...defaultSettings, ...(raw.settings ?? {}) },
      products: Array.isArray(raw.products) ? raw.products : defaultProducts,
      users: Array.isArray(raw.users)
        ? raw.users.map((user) => ({ ...user, banned: Boolean(user.banned) }))
        : [],
      purchases: Array.isArray(raw.purchases) ? raw.purchases : [],
      transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
      activity: Array.isArray(raw.activity) ? raw.activity : [],
      payments: Array.isArray(raw.payments) ? raw.payments : [],
      withdrawals: Array.isArray(raw.withdrawals) ? raw.withdrawals : [],
    };
  } catch {
    return {
      settings: defaultSettings,
      products: defaultProducts,
      users: [],
      purchases: [],
      transactions: [],
      activity: [],
      payments: [],
      withdrawals: [],
    };
  }
}

function writeData(data: Data) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const tempFile = `${dataFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, dataFile);
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}

function verifyPassword(password: string, user: User) {
  try {
    const expected = Buffer.from(user.passwordHash, "hex");
    const actual = crypto.scryptSync(password, user.passwordSalt, 64);
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

function currentUser(req: Request, data: Data) {
  const token = cookieValue(req, "gc_user");
  const session = token ? userSessions.get(token) : undefined;
  if (!session || session.expiresAt < Date.now()) {
    if (token) userSessions.delete(token);
    return undefined;
  }
  const user = data.users.find((item) => item.id === session.userId);
  return user?.banned ? undefined : user;
}

function isAdmin(req: Request) {
  const token = cookieValue(req, "gc_admin");
  const expiresAt = token ? adminSessions.get(token) : undefined;
  if (!expiresAt || expiresAt < Date.now()) {
    if (token) adminSessions.delete(token);
    return false;
  }
  return true;
}

function requireUser(req: Request, res: Response, data: Data) {
  const user = currentUser(req, data);
  if (!user) {
    res.status(401).json({ error: "Login required" });
    return undefined;
  }
  return user;
}

function requireAdmin(req: Request, res: Response) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Administrator login required" });
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

function processEarnings(data: Data) {
  let changed = false;
  for (const purchase of data.purchases) {
    const product = data.products.find((item) => item.id === purchase.productId);
    const user = data.users.find((item) => item.id === purchase.userId);
    if (!product || !user || purchase.status !== "active" || !product.daily) continue;
    const started = new Date(purchase.purchasedAt).getTime();
    if (!Number.isFinite(started)) continue;
    const target = Math.min(
      Math.max(0, Math.floor((Date.now() - started) / dayMs)),
      product.days,
    );
    while (purchase.earningsCredited < target) {
      const day = purchase.earningsCredited + 1;
      const exists = data.transactions.some(
        (transaction) =>
          transaction.type === "daily_earning" &&
          transaction.purchaseId === purchase.id &&
          transaction.day === day,
      );
      if (!exists) {
        user.wallet += product.daily;
        user.totalEarned += product.daily;
        addTransaction(data, user.id, "daily_earning", product.daily, {
          purchaseId: purchase.id,
          day,
        });
      }
      purchase.earningsCredited = day;
      changed = true;
    }
  }
  if (changed) writeData(data);
}

function applyReferralCommissions(data: Data, buyer: User, purchase: Purchase) {
  const rates = [0.25, 0.02, 0.01];
  const seen = new Set([buyer.id]);
  let referrerId = buyer.referredBy;
  for (let index = 0; index < rates.length && referrerId; index += 1) {
    if (seen.has(referrerId)) break;
    seen.add(referrerId);
    const referrer = data.users.find((user) => user.id === referrerId);
    if (!referrer) break;
    const level = index + 1;
    const exists = data.transactions.some(
      (transaction) =>
        transaction.type === "referral_commission" &&
        transaction.purchaseId === purchase.id &&
        transaction.userId === referrer.id &&
        transaction.level === level,
    );
    if (!exists) {
      const commission = Math.round(purchase.amount * rates[index]);
      referrer.wallet += commission;
      referrer.totalEarned += commission;
      addTransaction(data, referrer.id, "referral_commission", commission, {
        purchaseId: purchase.id,
        level,
      });
    }
    referrerId = referrer.referredBy;
  }
}

const router: IRouter = Router();

router.get("/settings", (_req, res) => res.json(readData().settings));
router.get("/products", (_req, res) => res.json(readData().products));

router.post("/auth/register", (req, res) => {
  const data = readData();
  const phone = bodyString(req, "phone");
  const password = bodyString(req, "password");
  const referralCode = bodyString(req, "referralCode").toUpperCase();
  if (!/^\+?[0-9]{7,15}$/.test(phone) || password.length < 8) {
    return res.status(400).json({ error: "Use a valid phone number and a password of at least 8 characters" });
  }
  if (data.users.some((user) => user.phone === phone)) {
    return res.status(409).json({ error: "An account with that phone already exists" });
  }
  const parent = referralCode
    ? data.users.find((user) => user.referralCode === referralCode)
    : undefined;
  if (referralCode && !parent) return res.status(400).json({ error: "Invalid referral code" });
  const passwordParts = hashPassword(password);
  const user: User = {
    id: id("USR"),
    phone,
    passwordHash: passwordParts.hash,
    passwordSalt: passwordParts.salt,
    referralCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
    referredBy: parent?.id ?? null,
    wallet: 2100,
    totalEarned: 2100,
    createdAt: now(),
    lastCheckin: null,
    banned: false,
  };
  data.users.push(user);
  addTransaction(data, user.id, "signup_bonus", 2100);
  data.activity.push({ id: id("ACT"), userId: user.id, type: "signup", createdAt: now() });
  writeData(data);
  const token = crypto.randomBytes(32).toString("hex");
  userSessions.set(token, { userId: user.id, expiresAt: Date.now() + sessionTtl });
  setCookie(res, "gc_user", token, sessionTtl / 1000);
  return res.status(201).json({ ok: true, user: publicUser(user) });
});

router.post("/auth/login", (req, res) => {
  if (rateLimited(req, "user-login", 8)) {
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }
  const data = readData();
  const user = data.users.find((item) => item.phone === bodyString(req, "phone"));
  if (!user || !verifyPassword(bodyString(req, "password"), user)) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }
  const token = crypto.randomBytes(32).toString("hex");
  userSessions.set(token, { userId: user.id, expiresAt: Date.now() + sessionTtl });
  setCookie(res, "gc_user", token, sessionTtl / 1000);
  return res.json({ ok: true, user: publicUser(user) });
});

router.post("/auth/logout", (req, res) => {
  const token = cookieValue(req, "gc_user");
  if (token) userSessions.delete(token);
  setCookie(res, "gc_user", "", 0);
  return res.json({ ok: true });
});

router.get("/auth/me", (req, res) => {
  const data = readData();
  const user = currentUser(req, data);
  return res.json({ loggedIn: Boolean(user), user: user ? publicUser(user) : null });
});

router.get("/dashboard", (req, res) => {
  const data = readData();
  processEarnings(data);
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

router.post("/checkin", (req, res) => {
  const data = readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  const today = new Date().toISOString().slice(0, 10);
  if (user.lastCheckin === today) return res.status(409).json({ error: "Daily check-in already claimed" });
  user.lastCheckin = today;
  user.wallet += 500;
  user.totalEarned += 500;
  addTransaction(data, user.id, "checkin", 500);
  writeData(data);
  return res.json({ ok: true, reward: 500, user: publicUser(user) });
});

router.get("/referral", (req, res) => {
  const data = readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  const direct = data.users.filter((item) => item.referredBy === user.id);
  const levelOne = new Set(direct.map((item) => item.id));
  const levelTwo = new Set(data.users.filter((item) => item.referredBy && levelOne.has(item.referredBy)).map((item) => item.id));
  const levelThree = new Set(data.users.filter((item) => item.referredBy && levelTwo.has(item.referredBy)).map((item) => item.id));
  const members = data.users
    .filter((item) => levelOne.has(item.id) || levelTwo.has(item.id) || levelThree.has(item.id))
    .map((item) => ({
      id: item.id,
      phone: item.phone,
      level: levelOne.has(item.id) ? 1 : levelTwo.has(item.id) ? 2 : 3,
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

router.post("/payments", (req, res) => {
  const data = readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  const productId = bodyString(req, "productId");
  const method = bodyString(req, "method");
  const amount = bodyNumber(req, "amount");
  const payerPhone = bodyString(req, "payerPhone");
  const transactionId = bodyString(req, "transactionId");
  const product = data.products.find((item) => item.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (!["Airtel Money", "MTN Mobile Money"].includes(method)) return res.status(400).json({ error: "Choose a valid payment method" });
  if (!/^\+?[0-9]{7,15}$/.test(payerPhone) || !/^[A-Za-z0-9._-]{4,80}$/.test(transactionId)) {
    return res.status(400).json({ error: "Enter a valid payer phone and transaction reference" });
  }
  if (amount !== product.price) return res.status(400).json({ error: "Amount must match the selected product price" });
  if (data.payments.some((payment) => payment.transactionId.toLowerCase() === transactionId.toLowerCase())) {
    return res.status(409).json({ error: "That transaction reference has already been submitted" });
  }
  const payment: Payment = {
    id: id("PAY"),
    userId: user.id,
    productId,
    productName: product.name,
    amount,
    method,
    payerPhone,
    transactionId,
    status: "pending",
    createdAt: now(),
  };
  data.payments.push(payment);
  data.activity.push({ id: id("ACT"), userId: user.id, type: "payment_submitted", createdAt: now() });
  writeData(data);
  return res.status(201).json({ ok: true, paymentId: payment.id, status: payment.status, payment });
});

router.get("/purchases", (req, res) => {
  const data = readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  return res.json(data.purchases.filter((purchase) => purchase.userId === user.id));
});

router.get("/withdrawals", (req, res) => {
  const data = readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  return res.json(data.withdrawals.filter((withdrawal) => withdrawal.userId === user.id));
});

router.post("/withdrawals", (req, res) => {
  const data = readData();
  const user = requireUser(req, res, data);
  if (!user) return;
  if (activePurchases(data, user.id).length === 0) return res.status(403).json({ error: "Approve at least one product before withdrawing" });
  const amount = bodyNumber(req, "amount");
  const method = bodyString(req, "method");
  const phone = bodyString(req, "phone");
  if (!Number.isFinite(amount) || amount < 7000) return res.status(400).json({ error: "Minimum withdrawal is UGX 7,000" });
  if (amount > user.wallet) return res.status(400).json({ error: "Insufficient wallet balance" });
  if (!["Airtel Money", "MTN Mobile Money"].includes(method) || !/^\+?[0-9]{7,15}$/.test(phone)) {
    return res.status(400).json({ error: "Enter valid withdrawal details" });
  }
  const fee = Math.round(amount * 0.12);
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
  writeData(data);
  return res.status(201).json({ ok: true, withdrawal });
});

router.post("/admin/auth/login", (req, res) => {
  if (rateLimited(req, "admin-login", 5)) return res.status(429).json({ error: "Too many admin login attempts. Try again later." });
  const username = process.env["ADMIN_USER"] ?? "admin";
  const password = process.env["ADMIN_PASS"] ?? "change-me-now";
  if (bodyString(req, "username") !== username || bodyString(req, "password") !== password) {
    return res.status(401).json({ error: "Invalid administrator login" });
  }
  const token = crypto.randomBytes(32).toString("hex");
  adminSessions.set(token, Date.now() + sessionTtl);
  setCookie(res, "gc_admin", token, sessionTtl / 1000);
  return res.json({ ok: true });
});

router.post("/admin/auth/logout", (req, res) => {
  const token = cookieValue(req, "gc_admin");
  if (token) adminSessions.delete(token);
  setCookie(res, "gc_admin", "", 0);
  return res.json({ ok: true });
});

router.get("/admin/dashboard", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
  return res.json({
    users: data.users.length,
    products: data.products.length,
    purchases: data.purchases.length,
    payments: data.payments.filter((item) => item.status === "pending").length,
    withdrawals: data.withdrawals.filter((item) => item.status === "pending").length,
    transactions: data.transactions.length,
    walletBalances: data.users.reduce((sum, user) => sum + user.wallet, 0),
    totalDeposited: data.payments.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0),
    totalWithdrawn: data.withdrawals.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
    totalInvested: data.purchases.reduce((sum, item) => sum + item.amount, 0),
  });
});

router.get("/admin/users", (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json(readData().users.map(publicUser));
});

router.post("/admin/users/:id/credit", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
  const user = data.users.find((item) => item.id === req.params.id);
  const amount = bodyNumber(req, "amount");
  const note = bodyString(req, "note");
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!Number.isFinite(amount) || amount < 1) return res.status(400).json({ error: "Credit amount must be at least UGX 1" });
  user.wallet += amount;
  user.totalEarned += amount;
  addTransaction(data, user.id, "admin_credit", amount);
  data.activity.push({ id: id("ACT"), userId: user.id, type: note ? `admin_credit:${note.slice(0, 80)}` : "admin_credit", createdAt: now() });
  writeData(data);
  return res.json({ ok: true, user: publicUser(user) });
});

router.post("/admin/users/:id/debit", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
  const user = data.users.find((item) => item.id === req.params.id);
  const amount = bodyNumber(req, "amount");
  const note = bodyString(req, "note");
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!Number.isFinite(amount) || amount < 1) return res.status(400).json({ error: "Debit amount must be at least UGX 1" });
  if (amount > user.wallet) return res.status(400).json({ error: "Debit amount cannot exceed the user's balance" });
  user.wallet -= amount;
  addTransaction(data, user.id, "admin_debit", -amount);
  data.activity.push({ id: id("ACT"), userId: user.id, type: note ? `admin_debit:${note.slice(0, 80)}` : "admin_debit", createdAt: now() });
  writeData(data);
  return res.json({ ok: true, user: publicUser(user) });
});

router.put("/admin/users/:id/ban", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
  const user = data.users.find((item) => item.id === req.params.id);
  const banned = (req.body as Record<string, unknown> | undefined)?.banned;
  if (!user) return res.status(404).json({ error: "User not found" });
  if (typeof banned !== "boolean") return res.status(400).json({ error: "Banned must be true or false" });
  user.banned = banned;
  if (banned) {
    for (const [token, session] of userSessions) {
      if (session.userId === user.id) userSessions.delete(token);
    }
  }
  data.activity.push({ id: id("ACT"), userId: user.id, type: banned ? "user_banned" : "user_unbanned", createdAt: now() });
  writeData(data);
  return res.json({ ok: true, user: publicUser(user) });
});

router.delete("/admin/users/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
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
  for (const [token, session] of userSessions) {
    if (session.userId === userId) userSessions.delete(token);
  }
  writeData(data);
  return res.json({ ok: true });
});
router.get("/admin/payments", (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json(readData().payments);
});
router.get("/admin/withdrawals", (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json(readData().withdrawals);
});
router.get("/admin/products", (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json(readData().products);
});
router.get("/admin/transactions", (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json(readData().transactions.slice().reverse());
});
router.get("/admin/activity", (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json(readData().activity.slice().reverse());
});
router.get("/admin/referrals", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
  const commissions = data.transactions.filter((item) => item.type === "referral_commission");
  return res.json({ commissions: commissions.length, total: commissions.reduce((sum, item) => sum + item.amount, 0) });
});
router.get("/admin/settings", (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json(readData().settings);
});

router.put("/admin/payments/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
  const payment = data.payments.find((item) => item.id === req.params.id);
  const action = bodyString(req, "action");
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  if (payment.status !== "pending") return res.status(409).json({ error: "Payment already reviewed" });
  if (action !== "approve" && action !== "reject") return res.status(400).json({ error: "Invalid review action" });
  payment.status = action === "approve" ? "approved" : "rejected";
  payment.reviewedAt = now();
  if (action === "approve") {
    const purchase: Purchase = {
      id: id("PUR"),
      paymentId: payment.id,
      userId: payment.userId,
      productId: payment.productId,
      productName: payment.productName,
      amount: payment.amount,
      status: "active",
      purchasedAt: now(),
      earningsCredited: 0,
    };
    data.purchases.push(purchase);
    addTransaction(data, payment.userId, "purchase", payment.amount, { paymentId: payment.id, purchaseId: purchase.id });
    const buyer = data.users.find((user) => user.id === payment.userId);
    if (buyer) applyReferralCommissions(data, buyer, purchase);
  }
  data.activity.push({ id: id("ACT"), userId: payment.userId, type: `payment_${action}d`, createdAt: now() });
  writeData(data);
  return res.json({ ok: true, payment });
});

router.put("/admin/withdrawals/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const data = readData();
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
  const data = readData();
  const brand = bodyString(req, "brand");
  if (brand) data.settings.brand = brand.slice(0, 80);
  writeData(data);
  return res.json(data.settings);
});

export default router;