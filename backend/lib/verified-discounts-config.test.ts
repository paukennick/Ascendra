// REQ-166: verified group discounts -- the pure parts. No database, no
// network, no provider credentials: the provider is a mock.
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  DISCOUNT_GROUPS,
  GROUP_INFO,
  TEACHER_NOTE,
  discountPercent,
  discountsConfigured,
  enabledGroups,
  expiryFor,
  offeredGroups,
  playOfferFor,
  stripeCouponFor,
  supportEmail,
  MAX_DISCOUNT_PERCENT,
  rejectedPercents,
} from "./verified-discounts-config";
import {
  APP_RETURN_URL,
  STATE_TTL_MS,
  __setProvidersForTest,
  allProviders,
  configuredProviders,
  pkceChallenge,
  pkceVerifier,
  readState,
  returnUrl,
  signState,
  type VerificationProvider,
} from "./discount-providers";
import { availableGroups, discountOperatorConfig, discountStatus, discountsAvailable, parseCodeFile, startVerification } from "./verified-discounts";
import { parseCodesArgs } from "./discount-codes-cli";
import { familyCapUsd, monthlyAiCapUsd, PLAN_FAMILY_IDS } from "./billing-config";
import { createCheckoutSession } from "./stripe-checkout";

const SECRET = { AUTH_JWT_SECRET: "unit-test-secret" };
const ON = {
  ...SECRET,
  BILLING_ENABLED: "true",
  VERIFIED_DISCOUNTS_ENABLED: "true",
  DISCOUNT_PERCENT_MILITARY: "20",
  DISCOUNT_PERCENT_NURSE: "20",
  DISCOUNT_PERCENT_RESPONDER: "20",
  DISCOUNT_PERCENT_STUDENT: "20",
  DISCOUNT_PERCENT_TEACHER: "20",
  MOCK_PROVIDER_KEY: "k",
};

const mock: VerificationProvider = {
  id: "mockid",
  label: "Mock ID",
  configured: (env) => Boolean(env.MOCK_PROVIDER_KEY),
  groups: () => ["military", "responder", "nurse", "student", "teacher"],
  authorizationUrl: ({ group, state, codeChallenge }) =>
    `https://verify.example.test/authorize?scope=${group}&state=${encodeURIComponent(state)}&code_challenge=${codeChallenge}`,
  complete: async () => ({ subject: "s", verifiedGroups: ["military"] }),
};

afterEach(() => __setProvidersForTest(null));

describe("REQ-166 groups and percentages", () => {
  test("approved groups are on by default; teachers are off by default", () => {
    assert.deepEqual(enabledGroups({}), ["military", "responder", "nurse", "student"]);
    assert.equal(GROUP_INFO.teacher.defaultEnabled, false);
    assert.ok(DISCOUNT_GROUPS.includes("teacher"));
  });

  test("VERIFIED_DISCOUNT_GROUPS overrides the set (teachers can be switched on)", () => {
    assert.deepEqual(enabledGroups({ VERIFIED_DISCOUNT_GROUPS: "teacher, military ,bogus" }), ["military", "teacher"]);
  });

  test("teacher copy says personal plan for own study, not a class", () => {
    assert.match(TEACHER_NOTE, /personal plan for your own study/);
    assert.match(TEACHER_NOTE, /doesn't cover using Ascendra with a class/);
  });

  // REQ-170 (Nick, 2026-11-09): capped at 25% (was 1-90). Above it the group
  // isn't offered, and the operator report names it.
  test("percentages come only from config; no default; 1-25 whole numbers", () => {
    assert.equal(discountPercent("military", {}), null);
    assert.equal(discountPercent("military", { DISCOUNT_PERCENT_MILITARY: "20" }), 20);
    for (const bad of ["0", "26", "40", "90", "91", "12.5", "x", "-5"]) assert.equal(discountPercent("military", { DISCOUNT_PERCENT_MILITARY: bad }), null, bad);
    assert.equal(discountPercent("military", { DISCOUNT_PERCENT_MILITARY: "25" }), 25);
    assert.equal(MAX_DISCOUNT_PERCENT, 25);
    assert.deepEqual(offeredGroups({ DISCOUNT_PERCENT_MILITARY: "30", DISCOUNT_PERCENT_NURSE: "20" }).map((g) => g.id), ["nurse"], "a group over 25% is not offered");
    assert.deepEqual(rejectedPercents({ DISCOUNT_PERCENT_MILITARY: "30", DISCOUNT_PERCENT_NURSE: "20" }), [{ group: "military", value: "30" }]);
    assert.deepEqual(discountOperatorConfig({ DISCOUNT_PERCENT_STUDENT: "50" }).rejectedPercents, ["student: 50 (allowed 1-25)"]);
    // A group without a percentage is not offered.
    assert.deepEqual(offeredGroups({ DISCOUNT_PERCENT_NURSE: "15" }).map((g) => g.id), ["nurse"]);
  });

  test("published: the same percentage for every member of a group (no per-person input)", () => {
    // offeredGroups takes only the environment -- no user -- and
    // activeDiscount reads the percentage from it alone.
    const g = offeredGroups(ON).find((x) => x.id === "student");
    assert.equal(g?.percent, 20);
  });

  test("Stripe coupon and Play offer ids", () => {
    assert.equal(stripeCouponFor("nurse", {}), null);
    assert.equal(stripeCouponFor("nurse", { STRIPE_COUPON_NURSE: " co_1 " }), "co_1");
    assert.equal(playOfferFor("nurse", {}), "verified-nurse");
    assert.equal(playOfferFor("nurse", { PLAY_OFFER_NURSE: "nurse-20" }), "nurse-20");
    assert.equal(playOfferFor("nurse", { PLAY_OFFER_NURSE: "Bad Id!" }), "verified-nurse");
  });

  test("expiry: a year unless the provider says sooner", () => {
    const now = new Date("2026-11-09T00:00:00Z");
    assert.equal(expiryFor(now, null, {}).toISOString(), "2027-11-09T00:00:00.000Z");
    const sooner = new Date("2027-03-01T00:00:00Z");
    assert.equal(expiryFor(now, sooner, {}).toISOString(), sooner.toISOString());
    assert.equal(expiryFor(now, new Date("2030-01-01T00:00:00Z"), {}).toISOString(), "2027-11-09T00:00:00.000Z");
    assert.equal(expiryFor(now, null, { VERIFIED_DISCOUNT_VALID_DAYS: "30" }).toISOString(), "2026-12-09T00:00:00.000Z");
  });

  test("support email for the class line", () => {
    assert.equal(supportEmail({}), null);
    assert.equal(supportEmail({ SUPPORT_EMAIL: "help@ascendra.test" }), "help@ascendra.test");
  });
});

describe("REQ-166 off unless everything is set", () => {
  test("no live provider is registered in the framework", () => {
    assert.equal(allProviders().length, 0);
    assert.deepEqual(configuredProviders(ON), []);
    assert.equal(discountsAvailable(ON), false);
  });

  test("each switch on its own keeps it off", async () => {
    __setProvidersForTest([mock]);
    assert.equal(discountsAvailable(ON), true);
    assert.equal(discountsAvailable({ ...ON, BILLING_ENABLED: "" }), false);
    assert.equal(discountsAvailable({ ...ON, VERIFIED_DISCOUNTS_ENABLED: "off" }), false);
    assert.equal(discountsAvailable({ ...ON, MOCK_PROVIDER_KEY: "" }), false);
    const noPercent = Object.fromEntries(Object.entries(ON).filter(([k]) => !k.startsWith("DISCOUNT_PERCENT_")));
    assert.equal(discountsAvailable(noPercent), false);
    assert.equal(discountsConfigured(noPercent), false);
    // Off: the status route answers only { available: false } (no DB read --
    // there is no database in this test).
    assert.deepEqual(await discountStatus("u", { ...ON, MOCK_PROVIDER_KEY: "" }), { available: false });
  });

  test("teachers are offered only when switched on", () => {
    __setProvidersForTest([mock]);
    assert.deepEqual(availableGroups(ON).map((g) => g.id), ["military", "responder", "nurse", "student"]);
    const t = availableGroups({ ...ON, VERIFIED_DISCOUNT_GROUPS: "military,teacher" });
    assert.deepEqual(t.map((g) => g.id), ["military", "teacher"]);
    assert.equal(t[1].note, TEACHER_NOTE);
  });

  test("starting a verification: off = 404, unknown group = 400, else the provider URL with state and S256 challenge", () => {
    assert.throws(() => startVerification("u", "military", "app", ON), /aren't available/);
    __setProvidersForTest([mock]);
    assert.throws(() => startVerification("u", "teacher", "app", ON), /isn't offered/);
    const { url, provider } = startVerification("u1", "military", "web", ON);
    assert.equal(provider, "mockid");
    const u = new URL(url);
    const st = readState(u.searchParams.get("state"), ON)!;
    assert.equal(st.userId, "u1");
    assert.equal(st.group, "military");
    assert.equal(st.returnTo, "web");
    assert.equal(u.searchParams.get("code_challenge"), pkceChallenge(pkceVerifier(st, ON)));
  });

  test("operator config reports settings as set or missing, never values", () => {
    __setProvidersForTest([mock]);
    const c = discountOperatorConfig({ ...ON, STRIPE_COUPON_MILITARY: "co_secretish" });
    assert.ok(!JSON.stringify(c).includes("co_secretish"));
    assert.equal(c.available, true);
  });
});

describe("REQ-166 signed state", () => {
  test("round trip, tamper, wrong key, expiry", () => {
    const now = 1_000_000;
    const s = signState({ userId: "u", group: "nurse", provider: "mockid", returnTo: "app" }, SECRET, now);
    assert.equal(readState(s, SECRET, now)?.userId, "u");
    const [body, sig] = s.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), userId: "attacker" })).toString("base64url");
    assert.equal(readState(`${forged}.${sig}`, SECRET, now), null);
    assert.equal(readState(s, { AUTH_JWT_SECRET: "other" }, now), null);
    assert.equal(readState(s, SECRET, now + STATE_TTL_MS + 1), null);
    for (const bad of [null, "", "a", "a.b.c", 5, "x".repeat(3000)]) assert.equal(readState(bad, SECRET, now), null);
  });

  test("PKCE verifier differs per state; challenge is S256 base64url", () => {
    const a = readState(signState({ userId: "u", group: "nurse", provider: "p", returnTo: "app" }, SECRET), SECRET)!;
    const b = readState(signState({ userId: "u", group: "nurse", provider: "p", returnTo: "app" }, SECRET), SECRET)!;
    assert.notEqual(pkceVerifier(a, SECRET), pkceVerifier(b, SECRET));
    assert.match(pkceVerifier(a, SECRET), /^[A-Za-z0-9_-]{43}$/);
    assert.match(pkceChallenge("x"), /^[A-Za-z0-9_-]{43}$/);
  });

  test("return URLs are fixed per client (no open redirect)", () => {
    assert.equal(returnUrl("app", "verified"), `${APP_RETURN_URL}?verify=verified`);
    assert.equal(returnUrl("web", "taken", { BILLING_WEB_RETURN_URL: "https://www.example.test/" }), "https://www.example.test/settings/discount?verify=taken");
  });
});

describe("REQ-166 offer-code pool parsing", () => {
  test("Apple CSV or one per line; header and junk skipped; duplicates once", () => {
    assert.deepEqual(parseCodeFile("Code,Offer\nABC123,x\n\"DEF456\",y\nABC123,x\n\nbad code!\n"), ["ABC123", "DEF456"]);
  });

  test("CLI arguments", () => {
    const now = new Date("2026-11-09T00:00:00Z");
    assert.deepEqual(parseCodesArgs(["--status"], now), { kind: "status" });
    assert.match(String(parseCodesArgs(["--import", "f"], now)), /--group/);
    assert.match(String(parseCodesArgs(["--import", "f", "--group", "military", "--product", "nope"], now)), /--product/);
    assert.match(String(parseCodesArgs(["--import", "f", "--group", "military", "--product", "ascendra.it_cloud_pro.yearly", "--expires", "2020-01-01"], now)), /future/);
    const ok = parseCodesArgs(["--import", "f", "--group", "military", "--product", "ascendra.it_cloud_pro.yearly", "--expires", "2027-05-01", "--dry-run"], now);
    assert.equal(typeof ok, "object");
    assert.equal((ok as any).dryRun, true);
  });
});

describe("REQ-166 Nick's rules: full AI cap, no stacking", () => {
  test("the monthly AI cap ignores every discount setting (list price, not discounted)", () => {
    for (const tier of ["plus", "pro"] as const) {
      assert.equal(monthlyAiCapUsd(tier, ON), monthlyAiCapUsd(tier, {}));
      assert.equal(monthlyAiCapUsd(tier, { ...ON, DISCOUNT_PERCENT_MILITARY: "25" }), monthlyAiCapUsd(tier, {}));
    }
    // REQ-170: every category plan's cap too (FAIL-232: updated, not deleted).
    for (const f of PLAN_FAMILY_IDS) assert.equal(familyCapUsd(f, { ...ON, DISCOUNT_PERCENT_MILITARY: "25" }), familyCapUsd(f, {}), f);
  });

  test("Stripe checkout: a verified coupon replaces the promotion-code box (never both)", async () => {
    const env = { BILLING_ENABLED: "true", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_IT_CLOUD_PLUS_MONTHLY: "price_1", APP_URL: "https://a.test" } as unknown as NodeJS.ProcessEnv;
    const sent: string[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      sent.push(String(init.body));
      return new Response(JSON.stringify({ url: "https://checkout.stripe.test/s" }), { status: 200 });
    }) as typeof fetch;
    try {
      await createCheckoutSession({ userId: "u", email: "u@x.test", planId: "it_cloud_plus_monthly", coupon: "co_mil20" }, env);
      await createCheckoutSession({ userId: "u", email: "u@x.test", planId: "it_cloud_plus_monthly" }, env);
    } finally {
      globalThis.fetch = real;
    }
    const withCoupon = new URLSearchParams(sent[0]);
    assert.equal(withCoupon.get("discounts[0][coupon]"), "co_mil20");
    assert.equal(withCoupon.get("allow_promotion_codes"), null);
    const without = new URLSearchParams(sent[1]);
    assert.equal(without.get("discounts[0][coupon]"), null);
    assert.equal(without.get("allow_promotion_codes"), "true");
    // The price is the published list price id either way.
    assert.equal(withCoupon.get("line_items[0][price]"), "price_1");
  });
});
