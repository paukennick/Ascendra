// REQ-122: the pure parts of paid tiers -- the switch, the feature matrix,
// allowances, the cap rule, product ids, webhook authentication and the
// grant CLI's arguments. No database, no network.
import { test, describe } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {
  allowanceLimit,
  billingEnabled,
  capFromYearlyPrice,
  courseCategoryOf,
  familyCapUsd,
  familyPrice,
  FEATURES,
  unrestrictedCapUsd,
  learnerCapUsd,
  netAfterFees,
  PLAN_FAMILIES,
  PLAN_FAMILY_IDS,
  planRank,
  scopeCovers,
  featuresFor,
  monthlyAiCapUsd,
  planById,
  planForStoreProduct,
  planForStripePrice,
  plans,
  publicConfig,
  operatorConfig,
  isFeature,
  READINESS_LOCKED_TEXT,
  tierHas,
  freeCourseSwitchDays,
} from "./billing-config";
import { revenueCatAuthorized, safeEqual, stripeSignatureHeader, verifyStripeSignature } from "./billing-webhooks";
import { allowanceMessage, aiPausedMessage, nextMonthStartUtc, upgradeMessage, whenPhrase } from "./entitlements";
import { parseGrantArgs } from "./billing-grant";
import { LABS_FEATURE } from "./labs";

describe("the switch", () => {
  test("off unless set to something other than an off word", () => {
    for (const v of [undefined, "", " ", "0", "false", "FALSE", "off", "no"]) assert.equal(billingEnabled({ BILLING_ENABLED: v }), false, String(v));
    for (const v of ["1", "true", "on", "yes", "TRUE"]) assert.equal(billingEnabled({ BILLING_ENABLED: v }), true, v);
    assert.equal(billingEnabled({}), false);
  });
  test("publicConfig while off says only { enabled: false }: no tiers, prices or product ids before launch (REQ-124)", () => {
    // Before REQ-124 the off config listed every tier, price and store id.
    const off = publicConfig({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_PLUS_MONTHLY: "price_1" });
    assert.deepEqual(off, { enabled: false });
  });
  // REQ-170: was six plans (Plus and Pro); now the category plans.
  test("publicConfig when on lists the category plans with store ids and no secrets", () => {
    const c = publicConfig({ BILLING_ENABLED: "true", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_IT_CLOUD_PLUS_MONTHLY: "price_1" });
    assert.ok(c.enabled === true && "plans" in c);
    assert.equal(c.plans.length, 24);
    assert.equal(c.webCheckout, true);
    assert.equal(c.plans.find((p) => p.id === "it_cloud_plus_monthly")!.web, true);
    assert.equal(c.plans.find((p) => p.id === "it_cloud_pro_yearly")!.web, false);
    assert.deepEqual(c.scopes.map((x) => x.id), ["it_cloud", "pm", "fitness", "all_access", "clinical"]);
    assert.match(c.samePriceNote, /same for everyone/);
    assert.equal("founding" in c, false, "no founding offer (Nick, 2026-11-09: removed on every platform)");
    const text = JSON.stringify(c);
    assert.ok(!text.includes("sk_test_x") && !text.includes("price_1") && !text.includes("stripePriceEnv"));
    assert.deepEqual(c.tiers.map((t) => t.id), ["free", "plus", "pro"]);
  });
  test("operatorConfig shows what would be served, whatever the switch, and reports secrets only as set or missing", () => {
    const o = operatorConfig({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_IT_CLOUD_PLUS_MONTHLY: "price_1", REVENUECAT_WEBHOOK_AUTH: "rc-secret" });
    assert.equal(o.switchOn, false);
    assert.equal(o.wouldServe.enabled, true, "what the app would get once switched on");
    assert.equal(o.wouldServe.plans.length, 24);
    assert.equal(o.settings.STRIPE_SECRET_KEY, "set");
    assert.equal(o.settings.STRIPE_WEBHOOK_SECRET, "missing");
    assert.equal(o.settings.stripePrices.STRIPE_PRICE_IT_CLOUD_PLUS_MONTHLY, "set");
    assert.equal(o.settings.stripePrices.STRIPE_PRICE_IT_CLOUD_PRO_YEARLY, "missing");
    const text = JSON.stringify(o);
    assert.ok(!text.includes("sk_test_x") && !text.includes("price_1") && !text.includes("rc-secret"));
  });
});

describe("tiers and features", () => {
  test("Free has no AI extras; Plus has the agreed set; Pro has everything", () => {
    assert.deepEqual(featuresFor("free"), []);
    // REQ-124: readiness is in Plus (was Pro-only).
    assert.deepEqual(featuresFor("plus").sort(), ["ai_grading", "all_courses", "coach", "comparison", "explain_back", "mock_exam", "quiz_me", "readiness", "regenerate", "unit_check"]);
    assert.deepEqual(featuresFor("pro").sort(), (Object.keys(FEATURES) as string[]).sort());
    assert.equal(tierHas("plus", "pbq"), false);
    assert.equal(tierHas("plus", "labs"), false);
    assert.equal(tierHas("free", "readiness"), false);
  });
  test("readiness is Plus and Pro, Free sees Nick's one line; there is no exam-day plan key (REQ-124)", () => {
    assert.equal(tierHas("plus", "readiness"), true);
    assert.equal(tierHas("pro", "readiness"), true);
    assert.equal(READINESS_LOCKED_TEXT, "Readiness: unconfirmed \u2014 prove it with typed answers in Plus");
    assert.equal(isFeature("exam_day_plan"), false, "a feature that doesn't exist has no key");
  });
  test("the labs key is one billing feature shared by every kind of lab (FAIL-510)", () => {
    // Before the merge fix lib/labs.ts named "labs" and the billing config "lab".
    assert.equal(isFeature(LABS_FEATURE), true);
    assert.equal(isFeature("lab"), false);
    assert.equal(FEATURES[LABS_FEATURE].minTier, "pro");
  });
  test("upgrade messages name the plan and reassure", () => {
    assert.match(upgradeMessage("pbq"), /^Scenario questions comes with Pro\. Everything you've done so far is kept/);
  });
});

describe("allowances", () => {
  test("defaults: Free 3 graded answers a day, Plus 20 / Pro 60 coach messages a day, 5 / 10 regenerations a week, 1 mock a month; Pro mocks uncounted", () => {
    assert.equal(allowanceLimit("graded_answer", "free", {}), 3);
    assert.equal(allowanceLimit("graded_answer", "plus", {}), null);
    assert.equal(allowanceLimit("coach_message", "free", {}), 0);
    assert.equal(allowanceLimit("coach_message", "plus", {}), 20);
    // REQ-124: Pro is "about 60 messages a day" -- was uncounted.
    assert.equal(allowanceLimit("coach_message", "pro", {}), 60);
    assert.equal(allowanceLimit("coach_message", "pro", { BILLING_ALLOWANCE_COACH_MESSAGE_PRO: "80" }), 80);
    assert.equal(allowanceLimit("regeneration", "free", {}), 0);
    assert.equal(allowanceLimit("regeneration", "pro", {}), 10);
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
  // REQ-170: was one cap per tier from the first prices; now one per plan.
  test("defaults follow the agreed rule: half the yearly plan's monthly take after fees", () => {
    for (const f of PLAN_FAMILY_IDS) {
      const yearly = familyPrice(f, "yearly", {});
      if (yearly !== null) assert.ok(Math.abs(capFromYearlyPrice(yearly) - familyCapUsd(f, {})!) < 0.01, f);
    }
    assert.equal(familyCapUsd("it_cloud_plus", {}), 2.95);
    assert.equal(familyCapUsd("it_cloud_pro", {}), 4.8);
    assert.equal(familyCapUsd("all_access", {}), 7.35);
    // No yearly length: the cheapest month (3 months at $99 = $33 a month).
    assert.equal(familyCapUsd("clinical_pro", {}), 14.61);
    assert.equal(familyCapUsd("clinical_addon", {}), 12.81);
  });
  test("no plan loses money on a learner at the cap, at any length", () => {
    for (const p of plans({})) assert.ok(netAfterFees(p.usd) / p.months - familyCapUsd(p.family, {})! > 0, p.id);
  });
  test("discounts never lower the cap, and the largest allowed one (25%, verified) still leaves every plan above water at the cap", () => {
    for (const p of plans({})) {
      for (const pct of [20, 25]) {
        const margin = netAfterFees(p.usd * (1 - pct / 100)) / p.months - familyCapUsd(p.family, {})!;
        assert.ok(margin > 0, `${p.id} at ${pct}% off: ${margin.toFixed(2)}`);
      }
    }
  });
  test("configurable; off removes it; Free has none; grants are capped like the plan they stand in for", () => {
    assert.equal(familyCapUsd("pm_plus", { AI_MONTHLY_CAP_PM_PLUS_USD: "2" }), 2);
    assert.equal(familyCapUsd("pm_plus", { AI_MONTHLY_CAP_PM_PLUS_USD: "off" }), null);
    assert.equal(familyCapUsd("pm_plus", { AI_MONTHLY_CAP_PM_PLUS_USD: "bad" }), 2.95);
    assert.equal(monthlyAiCapUsd("plus", { AI_MONTHLY_CAP_PLUS_USD: "2" }), 2);
    assert.equal(monthlyAiCapUsd("plus", { AI_MONTHLY_CAP_PLUS_USD: "off" }), null);
    assert.equal(monthlyAiCapUsd("plus", {}), familyCapUsd("it_cloud_plus", {}));
    assert.equal(monthlyAiCapUsd("pro", { AI_MONTHLY_CAP_PRO_USD: "bad" }), familyCapUsd("all_access", {}));
    assert.equal(monthlyAiCapUsd("free", {}), null);
  });
  test("a learner's cap is the sum over the plans they hold; a held period and its new plan count once", () => {
    assert.equal(learnerCapUsd([{ family: "all_access", tier: "pro", scope: "all_access" }, { family: "clinical_addon", tier: "pro", scope: "clinical" }], {}), 20.16);
    assert.equal(learnerCapUsd([{ family: "it_cloud_pro", tier: "pro", scope: "it_cloud" }, { family: "it_cloud_plus", tier: "plus", scope: "it_cloud" }], {}), 4.8);
    assert.equal(learnerCapUsd([], {}), null);
  });
  test("unrestricted access (REQ-144) is capped like the most a paying learner can hold: all-access plus the clinical add-on", () => {
    assert.equal(unrestrictedCapUsd({}), 20.16);
    assert.equal(unrestrictedCapUsd({}), learnerCapUsd([{ family: "all_access", tier: "pro", scope: "all_access" }, { family: "clinical_addon", tier: "pro", scope: "clinical" }], {}));
    const caps = plans({}).map((p) => familyCapUsd(p.family, {})!);
    assert.ok(unrestrictedCapUsd({})! >= Math.max(...caps), "never below any single plan");
    assert.equal(unrestrictedCapUsd({ AI_MONTHLY_CAP_ALL_ACCESS_USD: "10" }), 22.81, "follows the plan caps");
    assert.equal(unrestrictedCapUsd({ AI_MONTHLY_CAP_UNRESTRICTED_USD: "30" }), 30);
    assert.equal(unrestrictedCapUsd({ AI_MONTHLY_CAP_UNRESTRICTED_USD: "off" }), null);
  });
});

describe("REQ-170 category plans", () => {
  test("Nick's proposed prices are the defaults; every one is overridable, and a length can be added", () => {
    const usd = (id: string) => planById(id, {})!.usd;
    for (const c of ["it_cloud", "pm", "fitness"]) {
      assert.deepEqual([usd(`${c}_plus_monthly`), usd(`${c}_plus_quarterly`), usd(`${c}_plus_yearly`)], [12.99, 29.99, 79.99]);
      assert.deepEqual([usd(`${c}_pro_monthly`), usd(`${c}_pro_quarterly`), usd(`${c}_pro_yearly`)], [19.99, 44.99, 129.99]);
    }
    assert.deepEqual([usd("all_access_monthly"), usd("all_access_quarterly"), usd("all_access_yearly")], [29.99, 69.99, 199]);
    assert.deepEqual([usd("clinical_pro_monthly"), usd("clinical_pro_quarterly")], [49, 99]);
    assert.equal(planById("clinical_pro_yearly", {}), null);
    assert.equal(usd("clinical_addon_monthly"), 29);
    assert.equal(planById("pm_plus_monthly", { BILLING_PRICE_PM_PLUS_MONTHLY_USD: "9.99" })!.usd, 9.99);
    assert.equal(planById("clinical_pro_yearly", { BILLING_PRICE_CLINICAL_PRO_YEARLY_USD: "299" })!.usd, 299);
  });
  test("one price per plan: nothing but the environment changes it (no per-learner input exists)", () => {
    // plans() takes only the environment; the same env gives the same list.
    assert.deepEqual(plans({}), plans({}));
    assert.ok(plans.length <= 1, "plans() takes at most the environment");
  });
  test("catalog categories map to plans; all-access covers every non-clinical category", () => {
    assert.equal(courseCategoryOf("aws-certifications"), "it_cloud");
    assert.equal(courseCategoryOf("cloud-native-certifications"), "it_cloud");
    assert.equal(courseCategoryOf("development"), "it_cloud");
    assert.equal(courseCategoryOf("project-management-certifications"), "pm");
    assert.equal(courseCategoryOf("business", "project-management"), "pm");
    assert.equal(courseCategoryOf("health-fitness"), "fitness");
    assert.equal(courseCategoryOf("healthcare-nursing", "physical-therapy"), "clinical");
    assert.equal(courseCategoryOf("teaching-academics"), "other");
    assert.equal(courseCategoryOf(null), "other");
    assert.equal(scopeCovers("all_access", "pm"), true);
    assert.equal(scopeCovers("all_access", "other"), true);
    assert.equal(scopeCovers("all_access", "clinical"), false);
    assert.equal(scopeCovers("clinical", "clinical"), true);
    assert.equal(scopeCovers("it_cloud", "pm"), false);
    assert.equal(scopeCovers(null, "clinical"), true, "a grant covers every course");
  });
  test("ranks: all-access over a category's Pro over its Plus; a crossgrade is equal", () => {
    assert.ok(planRank("all_access", "pro") > planRank("pm_pro", "pro"));
    assert.ok(planRank("pm_pro", "pro") > planRank("pm_plus", "plus"));
    assert.equal(planRank("pm_plus", "plus"), planRank("fitness_plus", "plus"));
    assert.equal(PLAN_FAMILIES.clinical_addon.requires, "all_access");
  });
});

describe("plans and product ids", () => {
  test("store products and Stripe prices map to category plans", () => {
    assert.deepEqual(planForStoreProduct("ascendra.it_cloud_pro.quarterly"), { family: "it_cloud_pro", scope: "it_cloud", tier: "pro", period: "quarterly" });
    assert.deepEqual(planForStoreProduct("ascendra_pm_plus:three-month"), { family: "pm_plus", scope: "pm", tier: "plus", period: "quarterly" });
    assert.deepEqual(planForStoreProduct("ascendra_all_access"), { family: "all_access", scope: "all_access", tier: "pro", period: null });
    assert.deepEqual(planForStoreProduct("ascendra.clinical_addon.monthly"), { family: "clinical_addon", scope: "clinical", tier: "pro", period: "monthly" });
    // REQ-170: the first pricing page's ids were never created and are not sold.
    assert.equal(planForStoreProduct("ascendra.pro.monthly"), null);
    assert.equal(planForStoreProduct("other.app.monthly"), null);
    assert.equal(planForStripePrice("price_x", { STRIPE_PRICE_FITNESS_PRO_YEARLY: "price_x" })!.id, "fitness_pro_yearly");
    assert.equal(planForStripePrice("price_x", {}), null);
    for (const p of plans({})) {
      assert.match(p.appStoreProductId, /^ascendra\.[a-z_]+\.(monthly|quarterly|yearly)$/);
      assert.match(p.playProductId, /^ascendra_[a-z_]+:(monthly|three-month|yearly)$/);
      assert.deepEqual(planForStoreProduct(p.appStoreProductId)!.family, p.family);
      assert.deepEqual(planForStoreProduct(p.playProductId)!.family, p.family);
    }
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
  test("--launch-comp: every account, Pro, a dry run unless --apply, and nothing else may change it (REQ-124)", () => {
    const dry = parseGrantArgs(["--launch-comp"]);
    assert.equal(dry.launchComp, true);
    assert.equal(dry.dryRun, true);
    assert.equal(dry.allExisting, true);
    assert.equal(dry.tier, "pro");
    assert.equal(parseGrantArgs(["--launch-comp", "--apply"]).dryRun, false);
    assert.equal(parseGrantArgs(["--launch-comp", "--apply", "--dry-run"]).dryRun, true);
    assert.throws(() => parseGrantArgs(["--launch-comp", "--tier", "plus"]), /only --apply/);
    assert.throws(() => parseGrantArgs(["--email", "a@b", "--apply"]), /only for --launch-comp/);
  });
});

describe("REQ-124 decision 6: an attempt in progress may be finished", () => {
  test("a mock exam is gated only when it starts: answering and submitting a started session never check the plan", () => {
    const root = path.resolve(__dirname, "../app/api/exam/sessions");
    const start = readFileSync(path.join(root, "route.ts"), "utf8");
    assert.match(start, /requireFeature\(user\.id, "mock_exam", trackId\)/, "starting a mock is gated (REQ-170: on its course)");
    for (const f of ["[id]/route.ts", "[id]/items/[position]/route.ts", "[id]/submit/route.ts"]) {
      const src = readFileSync(path.join(root, f), "utf8");
      assert.doesNotMatch(src, /requireFeature|featureLock|consumeAllowance|requireCourseAccess/, f);
    }
  });
});
