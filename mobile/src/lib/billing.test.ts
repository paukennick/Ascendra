// REQ-122: the app's paid-plan helpers, and the API client's hook that hands
// plan refusals to the billing provider.
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  allowanceLine,
  billingSignal,
  billingSignalOf,
  DISABLED_CONFIG,
  manageUrl,
  parseConfig,
  perMonthText,
  planSummary,
  plansFor,
  priceText,
  resetPhrase,
  savingsPercent,
  shouldInitPurchases,
  signalCopy,
  type BillingConfig,
  type BillingPlan,
} from "./billing.ts";
import { regenerateErrorMessage, REGENERATE_RATE_LIMITED } from "./regenerateError.ts";

(globalThis as Record<string, unknown>).__DEV__ = false;
const { api, registerBillingHook } = await import("../api/client.ts");

const plan = (id: string, tier: "plus" | "pro", period: "monthly" | "quarterly" | "yearly", months: number, usd: number): BillingPlan => ({
  id, tier, period, months, usd, appStoreProductId: `ascendra.${tier}.${period}`, playProductId: `ascendra_${tier}:${period}`, revenueCatPackage: "$rc", web: true,
});
const CONFIG: BillingConfig = {
  ...DISABLED_CONFIG,
  enabled: true,
  tiers: [{ id: "free", name: "Free", summary: "", points: [], features: [] }],
  plans: [plan("plus_yearly", "plus", "yearly", 12, 34.99), plan("plus_monthly", "plus", "monthly", 1, 5.99), plan("plus_quarterly", "plus", "quarterly", 3, 13.99), plan("pro_monthly", "pro", "monthly", 1, 9.99)],
};

describe("the switch, from the app's side", () => {
  test("anything but a well-formed enabled config is off", () => {
    assert.equal(parseConfig(null).enabled, false);
    assert.equal(parseConfig({ enabled: false, tiers: [], plans: [] }).enabled, false);
    assert.equal(parseConfig({ enabled: "true", tiers: [], plans: [] }).enabled, false);
    assert.equal(parseConfig({ enabled: true }).enabled, false, "missing lists");
    assert.equal(parseConfig({ enabled: true, tiers: [], plans: [] }).enabled, true);
  });
  test("the purchases SDK starts only with plans on, on a phone, with a key", () => {
    const keys = { ios: "appl_x", android: "goog_x" };
    assert.equal(shouldInitPurchases(DISABLED_CONFIG, "ios", keys), null);
    assert.equal(shouldInitPurchases(CONFIG, "web", keys), null);
    assert.equal(shouldInitPurchases(CONFIG, "android", {}), null);
    assert.equal(shouldInitPurchases(CONFIG, "android", { android: " " }), null);
    assert.equal(shouldInitPurchases(CONFIG, "ios", keys), "appl_x");
  });
});

describe("refusals", () => {
  test("402 upgrade, 429 allowance and AI pause are recognised; other errors are not", () => {
    const up = billingSignal(402, { error: "Explain-it-back comes with Plus.", upgrade: { feature: "explain_back", requiredTier: "plus" } });
    assert.equal(up?.kind, "upgrade");
    const al = billingSignal(429, { error: "used", allowance: { kind: "coach_message", window: "day", limit: 20, used: 20, remaining: 0, resetsAt: "2026-11-08T10:00:00Z" } });
    assert.equal(al?.kind, "allowance");
    assert.equal(billingSignal(429, { error: "paused", aiPaused: { resetsAt: "2026-12-01T00:00:00Z" } })?.kind, "aiPaused");
    assert.equal(billingSignal(429, { error: "Too many requests" }), null);
    assert.equal(billingSignal(402, { error: "x" }), null);
    assert.equal(billingSignal(500, { upgrade: { requiredTier: "plus" } }), null);
    assert.equal(billingSignalOf(Object.assign(new Error("x"), { status: 402, data: { error: "e", upgrade: { feature: "pbq", requiredTier: "pro" } } }))?.kind, "upgrade");
    assert.equal(billingSignalOf(new Error("plain")), null);
  });
  test("the sheet uses the server's words and adds the local time", () => {
    const now = new Date(2026, 10, 7, 9, 0);
    const later = new Date(2026, 10, 7, 15, 30).toISOString();
    const c = signalCopy({ kind: "allowance", message: "You've used today's 20 coach messages.", allowance: { kind: "coach_message", window: "day", limit: 20, used: 20, remaining: 0, resetsAt: later } }, now);
    assert.match(c.body, /^You've used today's 20 coach messages\. \(at 3:30/);
    const u = signalCopy({ kind: "upgrade", message: "Free includes one course at a time.", feature: "all_courses", requiredTier: "plus", freeCourse: null });
    assert.equal(u.title, "One course on Free");
    assert.equal(signalCopy({ kind: "aiPaused", message: "Paused.", resetsAt: later }, now).showPlans, false);
  });
  test("a regenerate refused for the plan shows the server's message, not the 'few minutes' one", () => {
    const err = Object.assign(new Error("x"), { status: 429, data: { error: "You've made this week's 5 new lesson versions.", allowance: { kind: "regeneration" } } });
    assert.equal(regenerateErrorMessage(err), "You've made this week's 5 new lesson versions.");
    assert.equal(regenerateErrorMessage(Object.assign(new Error("x"), { status: 429, data: { error: "Too many" } })), REGENERATE_RATE_LIMITED);
  });
});

describe("words", () => {
  test("reset times in the phone's own time", () => {
    const now = new Date(2026, 10, 7, 9, 0);
    assert.equal(resetPhrase(null, now), "soon");
    assert.equal(resetPhrase(new Date(2026, 10, 7, 8, 0).toISOString(), now), "now");
    assert.match(resetPhrase(new Date(2026, 10, 7, 16, 5).toISOString(), now, "en-US"), /^at 4:05\sPM$/);
    assert.match(resetPhrase(new Date(2026, 10, 8, 9, 0).toISOString(), now, "en-US"), /^tomorrow at 9:00\sAM$/);
    assert.match(resetPhrase(new Date(2026, 11, 1, 0, 0).toISOString(), now, "en-US"), /^on Tue, Dec 1$/);
  });
  test("allowances read as counts, never money", () => {
    assert.equal(allowanceLine({ kind: "coach_message", window: "day", limit: 20, used: 8, remaining: 12, resetsAt: null }), "Coach messages: 12 of 20 left today");
    assert.equal(allowanceLine({ kind: "mock_exam", window: "month", limit: null, used: 0, remaining: null, resetsAt: null }), "Mock exams: no daily count");
    assert.match(allowanceLine({ kind: "graded_answer", window: "day", limit: 3, used: 3, remaining: 0, resetsAt: null }), /all 3 used today, more soon/);
  });
  test("plans sorted by length; store price preferred; savings and per-month", () => {
    const list = plansFor(CONFIG, "plus");
    assert.deepEqual(list.map((p) => p.period), ["monthly", "quarterly", "yearly"]);
    assert.equal(priceText(list[0]), "US$5.99/month");
    assert.equal(priceText(list[2], "₹1,499.00"), "₹1,499.00/year");
    assert.equal(perMonthText(list[2]), "about US$2.92 a month");
    assert.equal(perMonthText(list[0]), null);
    assert.equal(savingsPercent(list[2], list[0]), 51);
    assert.equal(savingsPercent(list[0], list[0]), null);
  });
  test("manage links and the plan summary", () => {
    assert.equal(manageUrl("app_store"), "https://apps.apple.com/account/subscriptions");
    assert.match(manageUrl("play_store")!, /package=com\.hel1x\.ascendra$/);
    assert.equal(manageUrl("grant"), null);
    assert.equal(planSummary(null), "");
    assert.equal(planSummary({ enabled: false, tier: "pro" }), "");
    assert.equal(planSummary({ enabled: true, tier: "free" }), "Free");
    assert.equal(planSummary({ enabled: true, tier: "plus", entitlement: { source: "revenuecat", status: "active", plan: "yearly", productId: null, periodEnd: null, willRenew: true, manage: "app_store" } }), "Plus, yearly");
    assert.equal(planSummary({ enabled: true, tier: "pro", entitlement: { source: "stripe", status: "billing_issue", plan: "monthly", productId: null, periodEnd: null, willRenew: false, manage: "stripe" } }), "Pro, payment needs attention");
  });
});

describe("API client hook", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    registerBillingHook(null);
  });
  test("a 402 or plan 429 is handed to the hook and still thrown to the screen", async () => {
    const seen: Array<[number, unknown]> = [];
    registerBillingHook((s, d) => seen.push([s, d]));
    const body = { error: "The AI coach comes with Plus.", upgrade: { feature: "coach", requiredTier: "plus" } };
    globalThis.fetch = (async () => new Response(JSON.stringify(body), { status: 402 })) as typeof fetch;
    await assert.rejects(api.post("/api/chat", {}), (err: any) => err.status === 402 && err.message === body.error);
    assert.deepEqual(seen, [[402, body]]);
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "nope" }), { status: 400 })) as typeof fetch;
    await assert.rejects(api.post("/api/chat", {}));
    assert.equal(seen.length, 1, "other errors are not");
  });
  test("a hook that throws doesn't change the error the screen gets", async () => {
    registerBillingHook(() => {
      throw new Error("boom");
    });
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "Paused." , aiPaused: { resetsAt: "x" } }), { status: 429 })) as typeof fetch;
    await assert.rejects(api.post("/api/chat", {}), (err: any) => err.status === 429 && err.message === "Paused.");
  });
});
