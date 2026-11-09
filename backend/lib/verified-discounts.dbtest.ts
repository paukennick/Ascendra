// REQ-166: verified group discounts against a real Postgres with every
// migration applied (058 included). The verification provider is a mock --
// no credentials, no network. Stripe is a fake fetch.
//
//   1. Off by default: no provider registered -> { available: false },
//      checkout carries no coupon, starting a verification is 404.
//   2. The round trip with a mock provider: only the result is stored; a
//      second account can't reuse the same identity; declined, unverified,
//      forged and expired states record nothing.
//   3. One discount, the largest (no stacking); expired verifications don't
//      count; the Stripe coupon reaches checkout in place of promo codes.
//   4. App Store offer codes from the pool: one per learner and product,
//      idempotent, expired codes skipped, empty pool 409, no verification 403.
//   5. Removing verifications, the account export, and account deletion.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setProvidersForTest, readState, signState, type VerificationProvider } from "./discount-providers";
import { activeDiscount, finishVerification, importCodes, recordVerification, stripeCouponForUser } from "./verified-discounts";
import { buildAccountExport } from "./account-export";
import { runCodesCli } from "./discount-codes-cli";
import { GET as statusGet } from "../app/api/discounts/route";
import { POST as verifyPost } from "../app/api/discounts/verify/route";
import { DELETE as verificationsDelete } from "../app/api/discounts/verifications/route";
import { POST as offerCodePost } from "../app/api/discounts/offer-code/route";
import { POST as checkoutPost } from "../app/api/billing/checkout/route";
import { DELETE as accountDelete } from "../app/api/account/route";

const run = Date.now().toString(36);
const users: string[] = [];
const ENV_KEYS = [
  "BILLING_ENABLED", "VERIFIED_DISCOUNTS_ENABLED", "VERIFIED_DISCOUNT_GROUPS", "MOCK_PROVIDER_KEY",
  "DISCOUNT_PERCENT_MILITARY", "DISCOUNT_PERCENT_NURSE", "DISCOUNT_PERCENT_STUDENT", "DISCOUNT_PERCENT_RESPONDER", "DISCOUNT_PERCENT_TEACHER",
  "STRIPE_COUPON_MILITARY", "STRIPE_COUPON_NURSE", "STRIPE_SECRET_KEY", "STRIPE_PRICE_PLUS_MONTHLY", "APP_URL", "SUPPORT_EMAIL",
  "APP_STORE_OFFER_REDEEM_URL",
];
const saved: Record<string, string | undefined> = {};

// What the mock provider will say next.
let nextOutcome: { subject: string; verifiedGroups: string[]; expiresAt?: Date | null } | Error = { subject: "s", verifiedGroups: [] };
const seen: { codeVerifier: string; group: string }[] = [];
const mock: VerificationProvider = {
  id: "mockid",
  label: "Mock ID",
  configured: (env) => Boolean(env.MOCK_PROVIDER_KEY),
  groups: () => ["military", "responder", "nurse", "student", "teacher"],
  authorizationUrl: ({ group, state, codeChallenge }) =>
    `https://verify.example.test/authorize?scope=${group}&state=${encodeURIComponent(state)}&code_challenge=${codeChallenge}`,
  complete: async ({ codeVerifier, group }) => {
    seen.push({ codeVerifier, group });
    if (nextOutcome instanceof Error) throw nextOutcome;
    return nextOutcome;
  },
};

function turnOn() {
  Object.assign(process.env, {
    BILLING_ENABLED: "true",
    VERIFIED_DISCOUNTS_ENABLED: "true",
    MOCK_PROVIDER_KEY: "k",
    DISCOUNT_PERCENT_MILITARY: "20",
    DISCOUNT_PERCENT_NURSE: "25",
    DISCOUNT_PERCENT_STUDENT: "15",
    DISCOUNT_PERCENT_RESPONDER: "20",
    STRIPE_COUPON_MILITARY: "co_mil20",
    STRIPE_COUPON_NURSE: "co_nurse25",
    STRIPE_SECRET_KEY: "sk_test_fake",
    STRIPE_PRICE_PLUS_MONTHLY: "price_plus_m",
    APP_URL: "https://www.example.test",
    SUPPORT_EMAIL: "help@example.test",
    APP_STORE_OFFER_REDEEM_URL: "https://apps.apple.com/redeem?ctx=offercodes&id=1&code=",
  });
  __setProvidersForTest([mock]);
}

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const call = (fn: any, url: string, u: string, method = "GET", body?: unknown) =>
  fn(new Request(`http://t${url}`, { method, headers: auth(u), body: body === undefined ? undefined : JSON.stringify(body) })) as Promise<Response>;
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email, email_verified_at) values ($1, $2, now())`, [u, `disc-${run}-${users.length}@example.test`]);
  return u;
}
// Start a verification through the route and follow the provider back.
async function verifyVia(u: string, group: string, outcome: typeof nextOutcome, client = "app", extra: Record<string, string> = {}) {
  const { url } = await json(await call(verifyPost, "/api/discounts/verify", u, "POST", { group, client }));
  const state = new URL(url).searchParams.get("state")!;
  nextOutcome = outcome;
  return finishVerification("mockid", new URLSearchParams({ code: "c", state, ...extra }));
}
const subj = (s: string) => `${run}-${s}`;

before(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});
beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  __setProvidersForTest(null);
});
afterEach(() => __setProvidersForTest(null));
after(async () => {
  for (const k of ENV_KEYS) (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]));
  await query("delete from discount_offer_codes where code like $1", [`T${run.toUpperCase()}%`]);
  if (users.length) await query("delete from app_users where id = any($1)", [users]);
  await closePool();
});

describe("REQ-166 off by default", () => {
  test("no provider registered: status says unavailable, verify 404, checkout has no coupon", async () => {
    const u = await newUser();
    Object.assign(process.env, { BILLING_ENABLED: "true", VERIFIED_DISCOUNTS_ENABLED: "true", DISCOUNT_PERCENT_MILITARY: "20", STRIPE_COUPON_MILITARY: "co_mil20" });
    // Even a stored verification gives nothing while no provider is live.
    await recordVerification({ userId: u, group: "military", provider: "mockid", subject: subj("off"), providerExpiresAt: null });
    assert.deepEqual(await json(await call(statusGet, "/api/discounts", u)), { available: false });
    await json(await call(verifyPost, "/api/discounts/verify", u, "POST", { group: "military" }), 404);
    assert.equal(await stripeCouponForUser(u), null);
    await json(await call(offerCodePost, "/api/discounts/offer-code", u, "POST", { planId: "plus_monthly" }), 404);
  });

  test("billing off: unavailable even with a provider", async () => {
    const u = await newUser();
    turnOn();
    process.env.BILLING_ENABLED = "";
    assert.deepEqual(await json(await call(statusGet, "/api/discounts", u)), { available: false });
  });
});

describe("REQ-166 the verification round trip (mock provider)", () => {
  test("status lists approved groups (teacher off) with what is checked and stored", async () => {
    const u = await newUser();
    turnOn();
    const s = await json(await call(statusGet, "/api/discounts", u));
    assert.equal(s.available, true);
    assert.deepEqual(s.groups.map((g: any) => g.id), ["military", "responder", "nurse", "student"]);
    assert.equal(s.groups[0].provider, "Mock ID");
    assert.match(s.whatWeStore, /only the result/);
    assert.equal(s.classContact, null);
    assert.equal(s.active, null);
    // Teacher switched on: the personal-use note and the class contact line.
    process.env.VERIFIED_DISCOUNT_GROUPS = "military,teacher";
    process.env.DISCOUNT_PERCENT_TEACHER = "20";
    const t = await json(await call(statusGet, "/api/discounts", u));
    assert.ok(t.terms.some((x: string) => /personal plan for your own study/.test(x)));
    assert.deepEqual(t.classContact, { line: "Using Ascendra with a class? Contact us", email: "help@example.test" });
  });

  test("verified: only the result is stored, with a year's expiry, and the PKCE verifier matches", async () => {
    const u = await newUser();
    turnOn();
    const r = await verifyVia(u, "military", { subject: subj("a"), verifiedGroups: ["military"] });
    assert.deepEqual(r, { result: "verified", redirect: "preplms://settings/discount?verify=verified" });
    const row = await queryOne<any>("select * from verified_discounts where user_id = $1", [u]);
    assert.deepEqual(Object.keys(row).sort(), ["expires_at", "group_id", "id", "provider", "provider_subject", "updated_at", "user_id", "verified_at"]);
    assert.equal(row.group_id, "military");
    assert.equal(row.provider, "mockid");
    assert.equal(row.provider_subject, subj("a"));
    const days = (row.expires_at - row.verified_at) / 86400000;
    assert.ok(Math.abs(days - 365) < 0.01, String(days));
    assert.match(seen.at(-1)!.codeVerifier, /^[A-Za-z0-9_-]{43}$/);
    // Verifying again refreshes the same row.
    await verifyVia(u, "military", { subject: subj("a"), verifiedGroups: ["military"] }, "web");
    assert.equal((await query("select 1 from verified_discounts where user_id = $1", [u])).length, 1);
  });

  test("a provider expiry earlier than a year is kept", async () => {
    const u = await newUser();
    turnOn();
    const soon = new Date(Date.now() + 30 * 86400000);
    await verifyVia(u, "student", { subject: subj("st"), verifiedGroups: ["student"], expiresAt: soon });
    const row = await queryOne<any>("select expires_at from verified_discounts where user_id = $1", [u]);
    assert.equal(row.expires_at.toISOString(), soon.toISOString());
  });

  test("one provider identity, one account", async () => {
    const a = await newUser(), b = await newUser();
    turnOn();
    assert.equal((await verifyVia(a, "nurse", { subject: subj("n"), verifiedGroups: ["nurse"] })).result, "verified");
    const r = await verifyVia(b, "nurse", { subject: subj("n"), verifiedGroups: ["nurse"] });
    assert.equal(r.result, "taken");
    assert.equal((await query("select 1 from verified_discounts where user_id = $1", [b])).length, 0);
  });

  test("not verified, declined, provider error, forged or expired state: nothing stored", async () => {
    const u = await newUser();
    turnOn();
    assert.equal((await verifyVia(u, "military", { subject: subj("x"), verifiedGroups: ["student"] })).result, "not_verified");
    assert.equal((await verifyVia(u, "military", { subject: "", verifiedGroups: ["military"] })).result, "not_verified");
    assert.equal((await verifyVia(u, "military", { subject: subj("x"), verifiedGroups: ["military"] }, "app", { error: "access_denied" })).result, "not_verified");
    assert.equal((await verifyVia(u, "military", new Error("provider down"))).result, "failed");
    const forged = signState({ userId: u, group: "military", provider: "mockid", returnTo: "web" }, { AUTH_JWT_SECRET: "attacker" });
    nextOutcome = { subject: subj("x"), verifiedGroups: ["military"] };
    assert.equal((await finishVerification("mockid", new URLSearchParams({ code: "c", state: forged }))).result, "expired");
    const old = signState({ userId: u, group: "military", provider: "mockid", returnTo: "web" }, process.env, Date.now() - 3600_000);
    assert.equal(readState(old), null);
    assert.equal((await finishVerification("mockid", new URLSearchParams({ code: "c", state: old }))).result, "expired");
    // A state for another provider is refused by this provider's callback.
    const other = signState({ userId: u, group: "military", provider: "other", returnTo: "app" });
    assert.equal((await finishVerification("mockid", new URLSearchParams({ code: "c", state: other }))).result, "expired");
    assert.equal((await query("select 1 from verified_discounts where user_id = $1", [u])).length, 0);
  });
});

describe("REQ-166 applying the discount", () => {
  test("one discount, the largest; expired ones don't count", async () => {
    const u = await newUser();
    turnOn();
    await recordVerification({ userId: u, group: "military", provider: "mockid", subject: subj("m2"), providerExpiresAt: null });
    await recordVerification({ userId: u, group: "nurse", provider: "mockid", subject: subj("n2"), providerExpiresAt: null });
    let d = await activeDiscount(u);
    assert.equal(d?.group, "nurse");
    assert.equal(d?.percent, 25);
    assert.equal(d?.playOfferId, "verified-nurse");
    // The nurse verification lapses: military (20%) applies, never both.
    await query("update verified_discounts set verified_at = now() - interval '400 days', expires_at = now() - interval '1 day' where user_id = $1 and group_id = 'nurse'", [u]);
    d = await activeDiscount(u);
    assert.equal(d?.group, "military");
    const s = await json(await call(statusGet, "/api/discounts", u));
    assert.deepEqual(s.verifications.map((v: any) => [v.group, v.live]), [["nurse", false], ["military", true]]);
    // A group switched off stops counting.
    process.env.VERIFIED_DISCOUNT_GROUPS = "nurse,student";
    assert.equal(await activeDiscount(u), null);
  });

  test("Stripe checkout carries the group's coupon instead of the promo-code box", async () => {
    const u = await newUser(), plain = await newUser();
    turnOn();
    await recordVerification({ userId: u, group: "military", provider: "mockid", subject: subj("m3"), providerExpiresAt: null });
    const bodies: string[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (_u: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return new Response(JSON.stringify({ url: "https://checkout.stripe.test/x" }), { status: 200 });
    }) as typeof fetch;
    try {
      await json(await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "plus_monthly" }));
      await json(await call(checkoutPost, "/api/billing/checkout", plain, "POST", { planId: "plus_monthly" }));
    } finally {
      globalThis.fetch = real;
    }
    const a = new URLSearchParams(bodies[0]), b = new URLSearchParams(bodies[1]);
    assert.equal(a.get("discounts[0][coupon]"), "co_mil20");
    assert.equal(a.get("allow_promotion_codes"), null);
    assert.equal(b.get("discounts[0][coupon]"), null);
    assert.equal(b.get("allow_promotion_codes"), "true");
  });

  test("App Store offer codes: per product, idempotent, expired skipped, empty pool 409, unverified 403", async () => {
    const u = await newUser(), v = await newUser(), w = await newUser(), none = await newUser();
    turnOn();
    const code = (n: number) => `T${run.toUpperCase()}${n}`;
    // One code about to expire (never handed out), two good ones.
    await importCodes({ group: "military", productId: "ascendra.plus.monthly", expiresAt: new Date(Date.now() + 3600_000), codes: [code(0)] });
    const r = await importCodes({ group: "military", productId: "ascendra.plus.monthly", expiresAt: new Date(Date.now() + 90 * 86400000), codes: [code(1), code(2), code(1)] });
    assert.deepEqual(r, { added: 2, skipped: 1 });
    for (const x of [u, v, w]) await recordVerification({ userId: x, group: "military", provider: "mockid", subject: subj(`c-${x}`), providerExpiresAt: null });

    const a1 = await json(await call(offerCodePost, "/api/discounts/offer-code", u, "POST", { planId: "plus_monthly" }));
    const a2 = await json(await call(offerCodePost, "/api/discounts/offer-code", u, "POST", { planId: "plus_monthly" }));
    assert.equal(a1.code, a2.code);
    assert.notEqual(a1.code, code(0));
    assert.equal(a1.productId, "ascendra.plus.monthly");
    assert.equal(a1.redeemUrl, `https://apps.apple.com/redeem?ctx=offercodes&id=1&code=${a1.code}`);
    const b1 = await json(await call(offerCodePost, "/api/discounts/offer-code", v, "POST", { planId: "plus_monthly" }));
    assert.notEqual(b1.code, a1.code);
    await json(await call(offerCodePost, "/api/discounts/offer-code", w, "POST", { planId: "plus_monthly" }), 409);
    await json(await call(offerCodePost, "/api/discounts/offer-code", u, "POST", { planId: "pro_yearly" }), 409);
    await json(await call(offerCodePost, "/api/discounts/offer-code", none, "POST", { planId: "plus_monthly" }), 403);
    await json(await call(offerCodePost, "/api/discounts/offer-code", u, "POST", { planId: "nope" }), 400);
    const lines = await runCodesCli({ kind: "status" });
    assert.ok(lines.some((l) => l.startsWith("military ascendra.plus.monthly:")), lines.join("\n"));
  });
});

describe("REQ-166 the learner's data", () => {
  test("remove, export and account deletion", async () => {
    const u = await newUser();
    turnOn();
    await recordVerification({ userId: u, group: "student", provider: "mockid", subject: subj("d"), providerExpiresAt: null });
    const c = `T${run.toUpperCase()}D`;
    await importCodes({ group: "student", productId: "ascendra.pro.yearly", expiresAt: new Date(Date.now() + 90 * 86400000), codes: [c] });
    process.env.DISCOUNT_PERCENT_STUDENT = "15";
    const issued = await json(await call(offerCodePost, "/api/discounts/offer-code", u, "POST", { planId: "pro_yearly" }));
    assert.equal(issued.code, c);

    const data = (await buildAccountExport(u, (sql, p) => query(sql, p))) as any;
    assert.equal(data.verifiedDiscounts.length, 1);
    assert.equal(data.verifiedDiscounts[0].group_id, "student");
    assert.deepEqual(data.discountOfferCodes.map((r: any) => r.code), [c]);

    // Removing works even with the feature off.
    process.env.VERIFIED_DISCOUNTS_ENABLED = "";
    assert.deepEqual(await json(await call(verificationsDelete, "/api/discounts/verifications", u, "DELETE")), { removed: 1 });
    await recordVerification({ userId: u, group: "student", provider: "mockid", subject: subj("d"), providerExpiresAt: null });

    // Deleting the account (no password on this account) removes the
    // verification and unlinks the code, which stays spent.
    await json(await call(accountDelete, "/api/account", u, "DELETE"));
    assert.equal((await query("select 1 from verified_discounts where user_id = $1", [u])).length, 0);
    const code = await queryOne<any>("select issued_to, issued_at from discount_offer_codes where code = $1", [c]);
    assert.equal(code.issued_to, null);
    assert.ok(code.issued_at);
    // And a freed identity can verify on a new account.
    const fresh = await newUser();
    assert.equal(await recordVerification({ userId: fresh, group: "student", provider: "mockid", subject: subj("d"), providerExpiresAt: null }), "verified");
  });
});
