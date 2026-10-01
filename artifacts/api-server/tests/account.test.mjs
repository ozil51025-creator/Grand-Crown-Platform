import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import express from "express";

const filename = fileURLToPath(import.meta.url);
const bundle = process.argv[2];

if (!bundle) {
  // Bundle only the router, not the running app. The subprocess can access only
  // a newly created temporary JSON store; never use the runtime data.json.
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "grand-crown-account-tests-"));
  try {
    const output = path.join(temporary, "router.cjs");
    await build({
      entryPoints: [path.resolve(path.dirname(filename), "../src/routes/grand-crown.ts")],
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: output,
      logLevel: "silent",
    });
    const result = spawnSync(process.execPath, [filename, output], {
      env: { ...process.env, GRAND_CROWN_DATA_FILE: path.join(temporary, "store.json") },
      stdio: "inherit",
    });
    process.exitCode = result.status ?? 1;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
} else {
  const require = createRequire(import.meta.url);
  const router = require(bundle).default;
  const storeFile = process.env.GRAND_CROWN_DATA_FILE;
  assert.ok(storeFile && storeFile.startsWith(os.tmpdir()) && !storeFile.endsWith("data.json"));
  let server;
  let origin;
  let adminCookie;
  let testIndex = 0;
  const initial = () => ({
    settings: {
      brand: "Test brand",
      currency: "UGX",
      supportHandle: "@test-support",
      telegramUrl: "https://example.test/support",
      airtelNumber: "0700000011",
      mtnNumber: "0700000012",
      payeeName: "Test payee",
    },
    products: [{ id: "TEST-PRODUCT", name: "Existing product", price: 10000, daily: 100, total: 1000, days: 10 }],
    users: [],
    purchases: [{ id: "EXISTING-PURCHASE", userId: "historic-user", productId: "TEST-PRODUCT", status: "active", purchasedAt: new Date().toISOString(), earningsCredited: 0, amount: 10000, productName: "Existing product", paymentId: "EXISTING-PAYMENT" }],
    payments: [{ id: "EXISTING-PAYMENT", userId: "historic-user", productId: "TEST-PRODUCT", status: "approved", amount: 10000 }],
    withdrawals: [{ id: "EXISTING-WITHDRAWAL", userId: "historic-user", status: "paid", amount: 7000 }],
    transactions: [],
    activity: [],
  });
  function readStore() {
    return JSON.parse(fs.readFileSync(storeFile, "utf8"));
  }
  function saveStore(data) {
    fs.writeFileSync(storeFile, JSON.stringify(data));
  }
  async function request(url, { method = "GET", body, cookie } = {}) {
    const response = await fetch(`${origin}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": `192.0.2.${testIndex}`,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  async function register(phone = "0700000001", password = "initial-password", referralCode) {
    const result = await request("/auth/register", {
      method: "POST",
      body: { phone, password, ...(referralCode ? { referralCode } : {}) },
    });
    assert.equal(result.status, 201);
    assert.ok(result.cookie);
    return { cookie: result.cookie, user: result.body.user, phone };
  }
  async function login(phone, password) {
    return request("/auth/login", { method: "POST", body: { phone, password } });
  }
  async function createGift(code, extra = {}) {
    const result = await request("/admin/gift-codes", {
      method: "POST",
      cookie: adminCookie,
      body: { code, amount: 4000, maxRedemptions: 5, ...extra },
    });
    assert.equal(result.status, 201);
    return result.body;
  }
  async function redeem(cookie, code) {
    return request("/account/gift-codes/redeem", { method: "POST", cookie, body: { code } });
  }
  async function changePassword(cookie, currentPassword, newPassword) {
    return request("/account/password", { method: "POST", cookie, body: { currentPassword, newPassword } });
  }

  before(async () => {
    const app = express();
    app.set("trust proxy", true);
    app.use(express.json());
    app.use(router);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  beforeEach(async () => {
    testIndex += 1;
    saveStore(initial());
    const result = await request("/admin/auth/login", {
      method: "POST",
      body: {
        username: process.env.ADMIN_USER ?? "admin",
        password: process.env.ADMIN_PASS ?? "change-me-now",
      },
    });
    assert.equal(result.status, 200);
    adminCookie = result.cookie;
  });
  after(async () => {
    server.close();
    server.closeAllConnections();
    await once(server, "close");
  });

  test("registration automatically creates unique referral codes and accepts a member referral", async () => {
    const first = await register();
    const second = await register("0700000002", "initial-password", first.user.referralCode);

    assert.match(first.user.referralCode, /^[A-F0-9]{8}$/);
    assert.match(second.user.referralCode, /^[A-F0-9]{8}$/);
    assert.notEqual(first.user.referralCode, second.user.referralCode);

    const storedUsers = readStore().users;
    assert.equal(storedUsers.find((user) => user.id === first.user.id)?.referralCode, first.user.referralCode);
    const storedSecond = storedUsers.find((user) => user.id === second.user.id);
    assert.equal(storedSecond?.referralCode, second.user.referralCode);
    assert.equal(storedSecond?.referredBy, first.user.id);
  });

  test("account and admin options require their respective authentication", async () => {
    const member = await register();
    const cases = [
      ["/account/transactions", "GET", undefined],
      ["/account/password", "POST", { currentPassword: "initial-password", newPassword: "different-password" }],
      ["/account/gift-codes/redeem", "POST", { code: "TEST-GIFT" }],
      ["/admin/gift-codes", "GET", undefined],
      ["/admin/gift-codes", "POST", { code: "TEST-GIFT", amount: 1, maxRedemptions: 1 }],
      ["/admin/gift-codes/missing", "PATCH", { enabled: false }],
      ["/admin/settings", "PUT", { termsText: "Test terms" }],
    ];
    for (const [url, method, body] of cases) {
      assert.equal((await request(url, { method, body })).status, 401);
    }
    assert.equal((await request("/account/transactions", { cookie: adminCookie })).status, 401);
    assert.equal((await request("/admin/gift-codes", { cookie: member.cookie })).status, 401);
  });

  test("wrong current password, same password and invalid bounds do not change credentials", async () => {
    const member = await register();
    const before = readStore().users[0];
    assert.equal((await changePassword(member.cookie, "incorrect", "different-password")).status, 401);
    assert.equal((await changePassword(member.cookie, "initial-password", "initial-password")).status, 400);
    assert.equal((await changePassword(member.cookie, "initial-password", "1234567")).status, 400);
    assert.equal((await changePassword(member.cookie, "initial-password", "x".repeat(129))).status, 400);
    const after = readStore().users[0];
    // Do not place passwords/hashes in assertion output.
    assert.ok(before.passwordHash === after.passwordHash);
    assert.ok(before.passwordSalt === after.passwordSalt);
    assert.equal((await login(member.phone, "initial-password")).status, 200);
  });

  test("password changes preserve current and other users' sessions, revoke other own sessions and support exact whitespace", async () => {
    const member = await register();
    const otherSession = await login(member.phone, "initial-password");
    const otherUser = await register("0700000002");
    const before = readStore().users.find((user) => user.id === member.user.id);
    const changed = await changePassword(member.cookie, "initial-password", "  new exact password  ");
    assert.equal(changed.status, 200);
    assert.deepEqual(changed.body, { ok: true });
    const after = readStore().users.find((user) => user.id === member.user.id);
    assert.ok(before.passwordHash !== after.passwordHash);
    assert.ok(before.passwordSalt !== after.passwordSalt);
    assert.equal(after.passwordFormat, "raw");
    assert.equal((await request("/account/transactions", { cookie: member.cookie })).status, 200);
    assert.equal((await request("/account/transactions", { cookie: otherSession.cookie })).status, 401);
    assert.equal((await request("/account/transactions", { cookie: otherUser.cookie })).status, 200);
    assert.equal((await login(member.phone, "initial-password")).status, 401);
    assert.equal((await login(member.phone, "new exact password")).status, 401);
    assert.equal((await login(member.phone, "  new exact password  ")).status, 200);
  });

  test("registration preserves outer whitespace; legacy-only login fallback is not available after a change", async () => {
    const member = await register("0700000001", " boundary password ");
    assert.equal((await login(member.phone, "boundary password")).status, 401);
    assert.equal((await login(member.phone, " boundary password ")).status, 200);
    const data = readStore();
    delete data.users[0].passwordFormat;
    saveStore(data);
    // This legacy record still has its exact raw hash; raw verification comes first.
    assert.equal((await login(member.phone, " boundary password ")).status, 200);
    const legacy = await register("0700000002");
    const legacyData = readStore();
    delete legacyData.users.find((user) => user.id === legacy.user.id).passwordFormat;
    saveStore(legacyData);
    assert.equal((await login(legacy.phone, " initial-password ")).status, 200);
    assert.equal((await changePassword(legacy.cookie, " initial-password ", "replacement-password")).status, 200);
    assert.equal((await login(legacy.phone, " replacement-password ")).status, 401);
    assert.equal((await login(legacy.phone, "replacement-password")).status, 200);
  });

  test("new passwords accept the exact 8 and 128 character boundaries without trimming", async () => {
    const member = await register();
    assert.equal((await changePassword(member.cookie, "initial-password", " ".repeat(8))).status, 200);
    assert.equal((await login(member.phone, " ".repeat(8))).status, 200);
    assert.equal((await login(member.phone, "")).status, 401);
    assert.equal((await changePassword(member.cookie, " ".repeat(8), "x".repeat(128))).status, 200);
    assert.equal((await login(member.phone, "x".repeat(128))).status, 200);
    assert.equal((await changePassword(member.cookie, "x".repeat(128), "different-password")).status, 200);
  });

  test("gift creation normalizes codes, prevents case-insensitive duplicates and validates strict inputs", async () => {
    assert.deepEqual((await request("/admin/gift-codes", { cookie: adminCookie })).body, []);
    const created = await createGift("  mixed-code  ", { expiresAt: new Date(Date.now() + 86400000).toISOString() });
    assert.equal(created.code, "MIXED-CODE");
    assert.equal(created.enabled, true);
    assert.equal(created.redemptionCount, 0);
    assert.equal(typeof created.createdAt, "string");
    assert.ok(!("redeemedUserIds" in created));
    assert.equal((await request("/admin/gift-codes", {
      method: "POST", cookie: adminCookie, body: { code: "mixed-code", amount: 1, maxRedemptions: 1 },
    })).status, 409);
    const bad = [
      { amount: 0 }, { amount: -1 }, { amount: 1.5 }, { amount: 100000001 }, { amount: "1" },
      { amount: Number.MAX_SAFE_INTEGER }, { amount: null },
      { maxRedemptions: 0 }, { maxRedemptions: 100001 }, { maxRedemptions: 1.5 },
      { maxRedemptions: "1" }, { code: "!!?" }, { code: "ab" }, { code: "x".repeat(41) },
      { expiresAt: "2099-02-30T00:00:00Z" }, { expiresAt: "2099-01-01" },
      { expiresAt: "not-a-date" }, { expiresAt: 9999999999999 },
      { expiresAt: "2000-01-01T00:00:00Z" },
    ];
    for (const extra of bad) {
      const result = await request("/admin/gift-codes", {
        method: "POST", cookie: adminCookie, body: { code: "INVALID-TEST", amount: 1, maxRedemptions: 1, ...extra },
      });
      assert.equal(result.status, 400);
    }
    assert.equal(readStore().giftCodes.length, 1);
    const noExpiry = await createGift("NO-EXPIRY");
    assert.equal(noExpiry.expiresAt, null);
    const list = await request("/admin/gift-codes", { cookie: adminCookie });
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 2);
    assert.ok(list.body.every((gift) => !("redeemedUserIds" in gift)));
  });

  test("gift code, amount and cap accept their defined integer and length boundaries", async () => {
    const small = await createGift("MIN", { amount: 1, maxRedemptions: 1, expiresAt: null });
    assert.equal(small.amount, 1);
    assert.equal(small.maxRedemptions, 1);
    const large = await createGift("X".repeat(40), { amount: 100000000, maxRedemptions: 100000 });
    assert.equal(large.amount, 100000000);
    assert.equal(large.maxRedemptions, 100000);
    const member = await register();
    assert.equal((await redeem(member.cookie, "x".repeat(40))).status, 200);
    assert.equal(readStore().users[0].wallet, member.user.wallet + 100000000);
  });

  test("redemption credits wallet and total earned exactly once with one transaction and activity", async () => {
    const member = await register();
    const otherUser = await register("0700000002");
    const otherBefore = readStore().users.find((user) => user.id === otherUser.user.id);
    await createGift("WELCOME");
    const result = await redeem(member.cookie, " welcome ");
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { ok: true, amount: 4000, wallet: member.user.wallet + 4000 });
    const persisted = readStore();
    assert.equal(persisted.users[0].totalEarned, member.user.totalEarned + 4000);
    assert.equal(persisted.transactions.filter((tx) => tx.type === "gift_code").length, 1);
    assert.equal(persisted.activity.filter((event) => event.type === "gift_code").length, 1);
    assert.deepEqual(persisted.giftCodes[0].redeemedUserIds, [member.user.id]);
    assert.ok(JSON.stringify(persisted.users.find((user) => user.id === otherUser.user.id)) === JSON.stringify(otherBefore));
    assert.equal((await redeem(member.cookie, "WELCOME")).status, 409);
    assert.ok(JSON.stringify(readStore()) === JSON.stringify(persisted));
    const list = await request("/admin/gift-codes", { cookie: adminCookie });
    assert.equal(list.body[0].redemptionCount, 1);
    assert.ok(!("redeemedUserIds" in list.body[0]));
  });

  test("concurrent repeated requests credit a member at most once and enforce a global cap", async () => {
    const member = await register();
    const otherUser = await register("0700000002");
    await createGift("ONCE", { maxRedemptions: 1 });
    const results = await Promise.all(Array.from({ length: 12 }, () => redeem(member.cookie, "ONCE")));
    assert.equal(results.filter((result) => result.status === 200).length, 1);
    assert.equal(results.filter((result) => result.status === 409).length, 11);
    const after = readStore();
    assert.equal(after.users[0].wallet, member.user.wallet + 4000);
    assert.equal(after.transactions.filter((tx) => tx.type === "gift_code").length, 1);
    assert.equal((await redeem(otherUser.cookie, "ONCE")).status, 409);
    assert.ok(JSON.stringify(readStore()) === JSON.stringify(after));
    await createGift("RACE", { maxRedemptions: 1 });
    const race = await Promise.all([redeem(member.cookie, "RACE"), redeem(otherUser.cookie, "RACE")]);
    assert.equal(race.filter((result) => result.status === 200).length, 1);
    assert.equal(readStore().giftCodes.find((gift) => gift.code === "RACE").redeemedUserIds.length, 1);
  });

  test("disabled, expired, unknown and invalid gifts leave balances and history untouched", async () => {
    const member = await register();
    const gift = await createGift("DISABLED");
    const disabled = await request(`/admin/gift-codes/${gift.id}`, {
      method: "PATCH", cookie: adminCookie, body: { enabled: false },
    });
    assert.equal(disabled.status, 200);
    assert.equal(disabled.body.enabled, false);
    await createGift("EXPIRED", { expiresAt: new Date(Date.now() + 86400000).toISOString() });
    const data = readStore();
    data.giftCodes.find((item) => item.code === "EXPIRED").expiresAt = "2000-01-01T00:00:00Z";
    saveStore(data);
    assert.equal((await redeem(member.cookie, "DISABLED")).status, 400);
    assert.equal((await redeem(member.cookie, "EXPIRED")).status, 400);
    assert.equal((await redeem(member.cookie, "UNKNOWN")).status, 404);
    assert.equal((await redeem(member.cookie, "   ")).status, 400);
    assert.equal((await redeem(member.cookie, "INVALID!")).status, 400);
    assert.ok(JSON.stringify(readStore()) === JSON.stringify(data));
    assert.equal((await request(`/admin/gift-codes/${gift.id}`, {
      method: "PATCH", cookie: adminCookie, body: { enabled: "false" },
    })).status, 400);
    assert.equal((await request("/admin/gift-codes/missing", {
      method: "PATCH", cookie: adminCookie, body: { enabled: true },
    })).status, 404);
    assert.equal((await request(`/admin/gift-codes/${gift.id}`, {
      method: "PATCH", cookie: adminCookie, body: { enabled: true },
    })).status, 200);
    assert.equal((await redeem(member.cookie, "DISABLED")).status, 200);
  });

  test("transactions are full, newest-first, keep metadata and never expose another member's history", async () => {
    const member = await register();
    const otherUser = await register("0700000002");
    const data = readStore();
    data.transactions = Array.from({ length: 125 }, (_, index) => ({
      id: `TEST-TX-${index}`,
      userId: member.user.id,
      type: "daily_earning",
      amount: 1,
      createdAt: new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
      purchaseId: "EXISTING-PURCHASE",
      day: index + 1,
    })).reverse();
    data.transactions.push({ id: "OTHER-TX", userId: otherUser.user.id, type: "checkin", amount: 500, createdAt: "2099-01-01T00:00:00Z" });
    saveStore(data);
    const result = await request("/account/transactions", { cookie: member.cookie });
    assert.equal(result.status, 200);
    assert.equal(result.body.length, 125);
    assert.equal(result.body[0].id, "TEST-TX-124");
    assert.equal(result.body[0].day, 125);
    assert.equal(result.body[0].purchaseId, "EXISTING-PURCHASE");
    assert.ok(result.body.every((tx) => tx.userId === member.user.id));
    assert.deepEqual((await request("/account/transactions", { cookie: otherUser.cookie })).body.map((tx) => tx.id), ["OTHER-TX"]);
  });

  test("banned users cannot log in, redeem or change password", async () => {
    const member = await register();
    await createGift("BANNED");
    const banned = await request(`/admin/users/${member.user.id}/ban`, {
      method: "PUT", cookie: adminCookie, body: { banned: true },
    });
    assert.equal(banned.status, 200);
    const before = readStore();
    assert.equal((await login(member.phone, "initial-password")).status, 401);
    assert.equal((await redeem(member.cookie, "BANNED")).status, 401);
    assert.equal((await changePassword(member.cookie, "initial-password", "different-password")).status, 401);
    assert.equal((await request("/account/transactions", { cookie: member.cookie })).status, 401);
    assert.ok(JSON.stringify(readStore()) === JSON.stringify(before));
  });

  test("password and gift rate limits are per member, not shared by another member", async () => {
    const member = await register();
    const otherUser = await register("0700000002");
    for (let index = 0; index < 5; index += 1) {
      assert.equal((await changePassword(member.cookie, "incorrect", "different-password")).status, 401);
    }
    assert.equal((await changePassword(member.cookie, "initial-password", "different-password")).status, 429);
    assert.equal((await changePassword(otherUser.cookie, "initial-password", "different-password")).status, 200);
    for (let index = 0; index < 20; index += 1) assert.equal((await redeem(member.cookie, "UNKNOWN")).status, 404);
    assert.equal((await redeem(member.cookie, "UNKNOWN")).status, 429);
    await createGift("OTHER-USER");
    assert.equal((await redeem(otherUser.cookie, "OTHER-USER")).status, 200);
  });

  test("terms default empty, persist full text up to 20000 characters and preserve settings, records and gift codes", async () => {
    assert.equal((await request("/settings")).body.termsText, "");
    const member = await register();
    await createGift("PRESERVE");
    const before = readStore();
    const terms = `  Terms\n${"x".repeat(19990)}  `;
    assert.equal(terms.length, 20000);
    const updated = await request("/admin/settings", { method: "PUT", cookie: adminCookie, body: { termsText: terms } });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.termsText, terms);
    assert.equal(updated.body.brand, before.settings.brand);
    for (const key of ["users", "products", "purchases", "payments", "withdrawals", "transactions", "activity", "giftCodes"]) {
      // Credential-bearing records are compared without printing their contents.
      assert.ok(JSON.stringify(readStore()[key]) === JSON.stringify(before[key]), `${key} preserved`);
    }
    const unchanged = readStore();
    assert.equal((await request("/admin/settings", {
      method: "PUT", cookie: adminCookie, body: { termsText: "x".repeat(20001) },
    })).status, 400);
    assert.equal((await request("/admin/settings", {
      method: "PUT", cookie: adminCookie, body: { termsText: null },
    })).status, 400);
    assert.ok(JSON.stringify(readStore()) === JSON.stringify(unchanged));
    const brand = await request("/admin/settings", { method: "PUT", cookie: adminCookie, body: { brand: "Updated brand" } });
    assert.equal(brand.status, 200);
    assert.equal(brand.body.termsText, terms);
    assert.equal(brand.body.supportHandle, before.settings.supportHandle);
    const fullSettings = await request("/admin/settings", {
      method: "PUT", cookie: adminCookie, body: { currency: "UGX", supportHandle: "@updated", payeeName: "Updated payee" },
    });
    assert.equal(fullSettings.status, 200);
    assert.equal(fullSettings.body.supportHandle, "@updated");
    assert.equal(fullSettings.body.payeeName, "Updated payee");
    assert.equal((await redeem(member.cookie, "PRESERVE")).status, 200);
    const cleared = await request("/admin/settings", { method: "PUT", cookie: adminCookie, body: { termsText: "" } });
    assert.equal(cleared.status, 200);
    assert.equal((await request("/settings")).body.termsText, "");
  });
}