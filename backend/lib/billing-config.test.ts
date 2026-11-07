// REQ-122: the pure parts of paid tiers -- the switch, the feature matrix,
// allowances, the cap rule, product ids, webhook authentication and the
// grant CLI's arguments. No database, no network.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  allowanceLimit,
  billingEnabled,
  capFromYearlyPrice,
  DEFAULT_MONTHLY_CAP_USD,
  FEATURES,
  featuresFor,
  monthlyAiCapUsd,
  planById,
  planForStoreProduct,
  planForStripePrice,
  plans,
  publicConfig,
  tierHas,
  freeCourseSwitchDays,
} from "./billing-config";
import { revenueCatAuthorized, safeEqual, stripeSignatureHeader, verifyStripeSignature } from "./billing-webhooks";
import { allowanceMessage, aiPausedMessage, nextMonthStartUtc, upgradeMessage, whenPhrase } from "./entitlements";
import { parseGrantArgs } from "./billing-grant";

describe("the switch", () => {
  test("off unless set to something other than an off word", () => {
    for (const v of [undefined, "", " ", "0", "false", "FALSE", "off", "no"]) assert.equal(billingEnabled({ BILLING_ENABLED: v }), false, String(v));
    for (const v of ["1", "true", "on", "yes", "TRUE"]) assert.equal(billingEnabled({ BILLING_ENABLED: v }), true, v);
    assert.equal(billingEnabled({}), false);
  });
  test("publicConfig says enabled:false by default and lists six plans with store ids and no secrets", () => {
    const c = publicConfig({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_PLUS_MONTHLY: "price_1" });
    assert.equal(c.enabled, false);
    assert.equal(c.plans.length, 6);
    assert.equal(c.webCheckout, true);
    assert.equal(c.plans.find((p) => p.id === "plus_monthly")!.web, true);
    assert.equal(c.plans.find((p) => p.id === "pro_yearly")!.web, false);
    const text = JSON.stringify(c);
    assert.ok(!text.includes("sk_test_x") && !text.includes("price_1") && !text.includes("stripePriceEnv"));
    assert.deepEqual(c.tiers.map((t) => t.id), ["free", "plus", "pro"]);
  });
});

describe("tiers and features", () => {
  test("Free has no AI extras; Plus has the agreed set; Pro has everything", () => {
    assert.deepEqual(featuresFor("free"), []);
    assert.deepEqual(featuresFor("plus").sort(), ["ai_grading", "all_courses", "coach", "comparison", "explain_back", "mock_exam", "quiz_me", "regenerate", "unit_check"]);
    assert.deepEqual(featuresFor("pro").sort(), (Object.keys(FEATURES) as string[]).sort());
    assert.equal(tierHas("plus", "pbq"), false);
    assert.equal(tierHas("plus", "lab"), false);
    assert.equal(tierHas("plus", "readiness"), false);
  });
  test("upgrade messages name the plan and reassure", () => {
    assert.match(upgradeMessage("pbq"), /^Scenario questions comes with Pro\. Everything you've done so far is kept/);
  });
});

describe("allowances", () => {
  test("defaults: Free 3 graded answers a day, Plus 20 coach messages a day, 5 regenerations a week, 1 mock a month; Pro mocks uncounted", () => {
    assert.equal(allowanceLimit("graded_answer", "free", {}), 3);
    assert.equal(allowanceLimit("graded_answer", "plus", {}), null);
    assert.equal(allowanceLimit("coach_message", "free", {}), 0);
    assert.equal(allowanceLimit("coach_message", "plus", {}), 20);
    assert.equal(allowanceLimit("coach_message", "pro", {}), null);
    assert.equal(allowanceLimit("regeneration", "plus", {}), 5);
    assert.equal(allowanceLimit("mock_exam", "plus", {}), 1);
    assert.equal(allowanceLimit("mock_exam", "pro", {}), null);
  });
  test("env overrides; bad values fall back", () => {
    assert.equal(allowanceLimit("coach_message", "plus", { BILLING_ALLOWANCE_COACH_MESSAGE_PLUS: "25" }), 25);
    assert.equal(allowanceLimit("coach_message", "plus", { BILLING_ALLOWANCE_COACH_MESSAGE_PLUS: "none" }), null);
    assert.equal(allowanceLimit("coach_message", "plus", { BILLING_ALLOWANCE_COACH_MESSAGE_PLUS: "-1" }), 20);
    assert.equal(allowanceLimit("coach_message", "plus", { BILLING_ALLOWANCE_COACH_MESSAGE_PLUS: "2.5" }), 20);
    assert.equal(freeCourseSwitchDays({}), 7);
    assert.equal(freeCourseSwitchDays({ BILLING_FREE_COURSE_SWITCH_DAYS: "0" }), 0);
    assert.equal(freeCourseSwitchDays({ BILLING_FREE_COURSE_SWITCH_DAYS: "x" }), 7);
  });
  test("messages are kind, relative and never mention money", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    assert.equal(whenPhrase(new Date(now.getTime() + 5 * 60_000), now), "in a few minutes");
    assert.equal(whenPhrase(new Date(now.getTime() + 60 * 60_000), now), "in about an hour");
    assert.equal(whenPhrase(new Date(now.getTime() + 5 * 3600_000), now), "in about 5 hours");
    assert.equal(whenPhrase(new Date(now.getTime() + 3 * 86400_000), now), "in 3 days");
    const m = allowanceMessage("coach_message", 20, new Date(now.getTime() + 3 * 3600_000), "plus", now);
    assert.equal(m, "You've used today's 20 coach messages. More open up in about 3 hours. Lessons, practice, grading and review all keep working in the meantime.");
    for (const k of ["coach_message", "regeneration", "mock_exam", "graded_answer"] as const) {
      assert.ok(!/\$|dollar|cost/i.test(allowanceMessage(k, 1, now, "plus", now)));
    }
    assert.equal(nextMonthStartUtc(new Date("2026-12-31T23:59:00Z")).toISOString(), "2027-01-01T00:00:00.000Z");
    assert.match(aiPausedMessage(new Date("2026-12-01T00:00:00Z")), /open again on December 1\. Grading, practice and review keep working/);
  });
});

describe("the monthly AI cap", () => {
  test("defaults follow the agreed rule: half the yearly plan's monthly take after fees", () => {
    const plusYear = planById("plus_yearly", {})!.usd;
    const proYear = planById("pro_yearly", {})!.usd;
    assert.ok(Math.abs(capFromYearlyPrice(plusYear) - DEFAULT_MONTHLY_CAP_USD.plus) < 0.01);
    assert.ok(Math.abs(capFromYearlyPrice(proYear) - DEFAULT_MONTHLY_CAP_USD.pro) < 0.01);
    assert.ok(DEFAULT_MONTHLY_CAP_USD.pro > DEFAULT_MONTHLY_CAP_USD.plus);
  });
  test("no plan loses money on a learner at the cap, at any length", () => {
    for (const p of plans({})) {
      const take = (0.7 * p.usd * 0.85 + 0.3 * (p.usd * 0.971 - 0.3)) / p.months;
      assert.ok(take - monthlyAiCapUsd(p.tier, {})! > 0, p.id);
    }
  });
  test("configurable; off removes it; Free has none", () => {
    assert.equal(monthlyAiCapUsd("plus", { AI_MONTHLY_CAP_PLUS_USD: "2" }), 2);
    assert.equal(monthlyAiCapUsd("plus", { AI_MONTHLY_CAP_PLUS_USD: "off" }), null);
    assert.equal(monthlyAiCapUsd("pro", { AI_MONTHLY_CAP_PRO_USD: "bad" }), 2.21);
    assert.equal(monthlyAiCapUsd("free", {}), null);
  });
});

describe("plans and product ids", () => {
  test("the agreed prices; overridable", () => {
    assert.deepEqual(plans({}).map((p) => [p.id, p.usd]), [
      ["plus_monthly", 5.99], ["plus_quarterly", 13.99], ["plus_yearly", 34.99],
      ["pro_monthly", 9.99], ["pro_quarterly", 22.99], ["pro_yearly", 59.99],
    ]);
    assert.equal(planById("plus_monthly", { BILLING_PRICE_PLUS_MONTHLY_USD: "4.99" })!.usd, 4.99);
  });
  test("store products and Stripe prices map to tiers", () => {
    assert.deepEqual(planForStoreProduct("ascendra.pro.quarterly"), { tier: "pro", period: "quarterly" });
    assert.deepEqual(planForStoreProduct("ascendra_plus:three-month"), { tier: "plus", period: "quarterly" });
    assert.deepEqual(planForStoreProduct("ascendra_plus"), { tier: "plus", period: null });
    assert.equal(planForStoreProduct("other.app.monthly"), null);
    assert.equal(planForStripePrice("price_x", { STRIPE_PRICE_PRO_YEARLY: "price_x" })!.id, "pro_yearly");
    assert.equal(planForStripePrice("price_x", {}), null);
  });
});

describe("webhook authentication", () => {
  test("RevenueCat: exact shared secret, with or without Bearer; nothing when unset", () => {
    assert.equal(revenueCatAuthorized("s3cret", "s3cret"), true);
    assert.equal(revenueCatAuthorized("Bearer s3cret", "s3cret"), true);
    assert.equal(revenueCatAuthorized("s3cre", "s3cret"), false);
    assert.equal(revenueCatAuthorized("s3crett", "s3cret"), false);
    assert.equal(revenueCatAuthorized(null, "s3cret"), false);
    assert.equal(revenueCatAuthorized("", ""), false);
    assert.equal(safeEqual("a", "a"), true);
    assert.equal(safeEqual("a", "b"), false);
  });
  test("Stripe: Stripe's documented scheme, any matching v1, tolerance, tamper", () => {
    // A made-up signing value, built at run time (not a credential).
    const secret = ["whsec", "unit", "test"].join("_");
    const body = '{"id":"evt_1","type":"x"}';
    const t = 1_800_000_000;
    const header = stripeSignatureHeader(body, secret, t);
    assert.deepEqual(verifyStripeSignature(body, header, secret, t), { ok: true, timestamp: t });
    // A rotated secret: Stripe sends one v1 per active secret.
    assert.equal(verifyStripeSignature(body, `t=${t},v1=${"0".repeat(64)},${header.split(",")[1]}`, secret, t).ok, true);
    assert.equal(verifyStripeSignature(body + " ", header, secret, t).ok, false);
    assert.equal(verifyStripeSignature(body, header, "whsec_other", t).ok, false);
    assert.deepEqual(verifyStripeSignature(body, header, secret, t + 301), { ok: false, reason: "timestamp outside tolerance" });
    assert.equal(verifyStripeSignature(body, `v1=abc`, secret, t).ok, false);
    assert.equal(verifyStripeSignature(body, `t=${t},v0=${header.split("v1=")[1]}`, secret, t).ok, false);
    assert.equal(verifyStripeSignature(body, null, secret, t).ok, false);
  });
});

describe("grant CLI arguments", () => {
  test("one target, a valid tier and a future date", () => {
    const a = parseGrantArgs(["--email", "A@B.test", "--tier", "plus", "--until", "2099-01-31", "--note", "founder"]);
    assert.equal(a.email, "a@b.test");
    assert.equal(a.tier, "plus");
    assert.equal(a.until!.toISOString(), "2099-01-31T23:59:59.999Z");
    assert.equal(parseGrantArgs(["--all-existing"]).tier, "pro");
    assert.throws(() => parseGrantArgs([]), /exactly one/);
    assert.throws(() => parseGrantArgs(["--email", "a@b", "--all-existing"]), /exactly one/);
    assert.throws(() => parseGrantArgs(["--email", "a@b", "--tier", "gold"]), /plus or pro/);
    assert.throws(() => parseGrantArgs(["--email", "a@b", "--until", "2001-01-01"]), /past/);
    assert.throws(() => parseGrantArgs(["--email", "a@b", "--until", "next week"]), /YYYY-MM-DD/);
    assert.throws(() => parseGrantArgs(["--all-existing", "--revoke"]), /one account/);
    assert.throws(() => parseGrantArgs(["--email"]), /needs a value/);
  });
});
