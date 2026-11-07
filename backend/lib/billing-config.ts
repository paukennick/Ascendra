// REQ-122: paid tiers -- the one switch, the tiers, what each includes, the
// metered allowances, the per-tier monthly AI cap and the plans. Pure (no
// database, no network): every value is read from the environment per call,
// with the agreed defaults, so it can be tuned in Vercel without a deploy of
// new code and tested without one.
//
// THE SWITCH. BILLING_ENABLED unset, empty, "0", "false" or "off" = off.
// While off every learner is treated as Pro for access (lib/entitlements.ts
// returns before touching the database), the app shows no plan or price,
// and nothing behaves differently from before REQ-122 -- the existing $0.50
// daily AI budget (lib/ai-budget.ts) still applies to everyone.
//
// Pricing model and the cap rule: the pricing page agreed on 2026-11-07
// (Plus $5.99/mo, $13.99/3 mo, $34.99/yr; Pro $9.99, $22.99, $59.99). Each
// tier has ONE monthly AI cap, whatever the billing length, set at half of
// what the tier's yearly plan brings in per month after store/card fees
// (70% store at 15%, 30% web at 2.9% + $0.30): Plus ~$1.29, Pro ~$2.21.
// Learners never see dollars, only allowances.

export type Tier = "free" | "plus" | "pro";
export const TIERS: readonly Tier[] = ["free", "plus", "pro"];
export const TIER_RANK: Record<Tier, number> = { free: 0, plus: 1, pro: 2 };
export const PAID_TIERS = ["plus", "pro"] as const;
export type PaidTier = (typeof PAID_TIERS)[number];

type Env = Record<string, string | undefined>;

const OFF = new Set(["", "0", "false", "off", "no"]);

export function billingEnabled(env: Env = process.env): boolean {
  const raw = env.BILLING_ENABLED?.trim().toLowerCase();
  if (raw === undefined) return false;
  return !OFF.has(raw);
}

export function isTier(v: unknown): v is Tier {
  return v === "free" || v === "plus" || v === "pro";
}

export function tierAtLeast(have: Tier, need: Tier): boolean {
  return TIER_RANK[have] >= TIER_RANK[need];
}

// ---------------------------------------------------------------------------
// Features: which tier first includes each one.
// ---------------------------------------------------------------------------

export type Feature =
  | "all_courses"
  | "ai_grading"
  | "explain_back"
  | "unit_check"
  | "comparison"
  | "quiz_me"
  | "coach"
  | "regenerate"
  | "mock_exam"
  | "pbq"
  | "labs"
  | "readiness";

export interface FeatureInfo {
  minTier: PaidTier;
  // What the learner reads, e.g. "Explain-it-back".
  label: string;
}

export const FEATURES: Record<Feature, FeatureInfo> = {
  all_courses: { minTier: "plus", label: "Every course" },
  ai_grading: { minTier: "plus", label: "Grading for your typed answers" },
  explain_back: { minTier: "plus", label: "Explain-it-back" },
  unit_check: { minTier: "plus", label: "Unit checks" },
  comparison: { minTier: "plus", label: "Comparison cards" },
  quiz_me: { minTier: "plus", label: "Quiz me" },
  coach: { minTier: "plus", label: "The AI coach" },
  regenerate: { minTier: "plus", label: "New lesson versions" },
  mock_exam: { minTier: "plus", label: "Mock exams" },
  pbq: { minTier: "pro", label: "Scenario questions" },
  // One key for every kind of lab: the self-reported CompTIA labs (REQ-106)
  // and the build and case labs (REQ-123, LABS_FEATURE in lib/labs.ts). Free
  // and Plus get one sample build or case lab per course (lib/labs.ts
  // labAccess); everything else about labs is Pro.
  labs: { minTier: "pro", label: "Hands-on labs" },
  // Nick, 2026-11-07: the readiness score is on Plus and Pro. Free sees
  // READINESS_LOCKED_TEXT instead of a number.
  readiness: { minTier: "plus", label: "Your readiness score" },
  // There is no exam-day plan yet, so it has no key (Nick, 2026-11-07): a
  // feature is added here when it exists, not reserved ahead of it.
};

// What a Free learner sees where the readiness number would be (Nick's words).
export const READINESS_LOCKED_TEXT = "Readiness: unconfirmed \u2014 prove it with typed answers in Plus";

export function isFeature(v: unknown): v is Feature {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(FEATURES, v);
}

export function tierHas(tier: Tier, feature: Feature): boolean {
  return tierAtLeast(tier, FEATURES[feature].minTier);
}

export function featuresFor(tier: Tier): Feature[] {
  return (Object.keys(FEATURES) as Feature[]).filter((f) => tierHas(tier, f));
}

// ---------------------------------------------------------------------------
// Allowances: counted uses over a rolling window. null = no count limit
// (the monthly AI cap and the daily budget still apply); 0 = not included.
// Env override: BILLING_ALLOWANCE_<KIND>_<TIER>, e.g.
// BILLING_ALLOWANCE_COACH_MESSAGE_PLUS=25, or "none" for no count limit.
// ---------------------------------------------------------------------------

export type AllowanceKind = "coach_message" | "regeneration" | "mock_exam" | "graded_answer";
export const ALLOWANCE_KINDS: readonly AllowanceKind[] = ["coach_message", "regeneration", "mock_exam", "graded_answer"];
export type AllowanceWindow = "day" | "week" | "month";

export const WINDOW_SECONDS: Record<AllowanceWindow, number> = {
  day: 24 * 3600,
  week: 7 * 24 * 3600,
  month: 30 * 24 * 3600,
};

interface AllowanceDefault {
  window: AllowanceWindow;
  limits: Record<Tier, number | null>;
  // "coach messages", for "You've used today's 20 coach messages."
  noun: string;
}

export const ALLOWANCE_DEFAULTS: Record<AllowanceKind, AllowanceDefault> = {
  // Nick, 2026-11-07: Pro's coach is "about 60 messages a day" -- a real daily
  // count, still under the monthly AI cap; Plus stays about 20.
  coach_message: { window: "day", noun: "coach messages", limits: { free: 0, plus: 20, pro: 60 } },
  regeneration: { window: "week", noun: "new lesson versions", limits: { free: 0, plus: 5, pro: 15 } },
  mock_exam: { window: "month", noun: "mock exams", limits: { free: 0, plus: 1, pro: null } },
  // Free's "taste" of AI grading. Plus and Pro grade every typed answer.
  graded_answer: { window: "day", noun: "graded typed answers", limits: { free: 3, plus: null, pro: null } },
};

export function isAllowanceKind(v: unknown): v is AllowanceKind {
  return typeof v === "string" && (ALLOWANCE_KINDS as readonly string[]).includes(v);
}

export function allowanceLimit(kind: AllowanceKind, tier: Tier, env: Env = process.env): number | null {
  const raw = env[`BILLING_ALLOWANCE_${kind.toUpperCase()}_${tier.toUpperCase()}`]?.trim().toLowerCase();
  const fallback = ALLOWANCE_DEFAULTS[kind].limits[tier];
  if (raw === undefined || raw === "") return fallback;
  if (raw === "none" || raw === "unlimited") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export function allowanceTable(env: Env = process.env) {
  const out: Record<string, { window: AllowanceWindow; noun: string; free: number | null; plus: number | null; pro: number | null }> = {};
  for (const k of ALLOWANCE_KINDS) {
    out[k] = {
      window: ALLOWANCE_DEFAULTS[k].window,
      noun: ALLOWANCE_DEFAULTS[k].noun,
      free: allowanceLimit(k, "free", env),
      plus: allowanceLimit(k, "plus", env),
      pro: allowanceLimit(k, "pro", env),
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Monthly AI cap per tier (USD of model spend, calendar month UTC).
// AI_MONTHLY_CAP_PLUS_USD / AI_MONTHLY_CAP_PRO_USD; "off" removes it.
// At the cap only coach chat and lesson regenerate pause. Grading and
// review never stop.
// ---------------------------------------------------------------------------

export const DEFAULT_MONTHLY_CAP_USD: Record<PaidTier, number> = { plus: 1.29, pro: 2.21 };

export function monthlyAiCapUsd(tier: Tier, env: Env = process.env): number | null {
  if (tier === "free") return null; // Free has no chat or regenerate to pause
  const raw = env[`AI_MONTHLY_CAP_${tier.toUpperCase()}_USD`]?.trim().toLowerCase();
  if (raw === "off") return null;
  if (raw === undefined || raw === "") return DEFAULT_MONTHLY_CAP_USD[tier];
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MONTHLY_CAP_USD[tier];
  return n === 0 ? null : n;
}

// The cap rule from the pricing page, so a price change can be checked
// against it (billing-config.test.ts): half of the yearly plan's monthly
// take after fees, 70% bought in the stores (15%), 30% on the web
// (2.9% + $0.30).
export function capFromYearlyPrice(yearlyUsd: number, storeShare = 0.7, capShare = 0.5): number {
  const store = yearlyUsd * 0.85;
  const web = yearlyUsd * (1 - 0.029) - 0.3;
  return (capShare * (storeShare * store + (1 - storeShare) * web)) / 12;
}

// ---------------------------------------------------------------------------
// Free course
// ---------------------------------------------------------------------------

export function freeCourseSwitchDays(env: Env = process.env): number {
  const n = Number(env.BILLING_FREE_COURSE_SWITCH_DAYS);
  return Number.isFinite(n) && n >= 0 && env.BILLING_FREE_COURSE_SWITCH_DAYS?.trim() ? n : 7;
}

// ---------------------------------------------------------------------------
// Plans and product ids. Prices here are the US list prices for the app to
// show only when the store gives none (the stores set regional prices).
// Store product ids are fixed here and documented in docs/billing.md --
// create them with exactly these ids. Stripe price ids come from the env.
// ---------------------------------------------------------------------------

export type PlanPeriod = "monthly" | "quarterly" | "yearly";
export const PLAN_PERIODS: readonly PlanPeriod[] = ["monthly", "quarterly", "yearly"];

export interface PlanInfo {
  id: string; // "plus_monthly"
  tier: PaidTier;
  period: PlanPeriod;
  months: number;
  usd: number;
  appStoreProductId: string;
  playProductId: string; // subscription id:base plan id
  // The custom package identifier to use in the RevenueCat offering (the
  // app matches packages by store product id; this is for the dashboard).
  revenueCatPackage: string;
  stripePriceEnv: string;
}

const PRICE_DEFAULTS: Record<string, number> = {
  plus_monthly: 5.99,
  plus_quarterly: 13.99,
  plus_yearly: 34.99,
  pro_monthly: 9.99,
  pro_quarterly: 22.99,
  pro_yearly: 59.99,
};
const MONTHS: Record<PlanPeriod, number> = { monthly: 1, quarterly: 3, yearly: 12 };
const PLAY_BASE: Record<PlanPeriod, string> = { monthly: "monthly", quarterly: "three-month", yearly: "yearly" };

export function plans(env: Env = process.env): PlanInfo[] {
  const out: PlanInfo[] = [];
  for (const tier of PAID_TIERS) {
    for (const period of PLAN_PERIODS) {
      const id = `${tier}_${period}`;
      const override = Number(env[`BILLING_PRICE_${id.toUpperCase()}_USD`]);
      out.push({
        id,
        tier,
        period,
        months: MONTHS[period],
        usd: Number.isFinite(override) && override > 0 ? override : PRICE_DEFAULTS[id],
        appStoreProductId: `ascendra.${tier}.${period}`,
        playProductId: `ascendra_${tier}:${PLAY_BASE[period]}`,
        revenueCatPackage: id,
        stripePriceEnv: `STRIPE_PRICE_${tier.toUpperCase()}_${period.toUpperCase()}`,
      });
    }
  }
  return out;
}

export function planById(id: string, env: Env = process.env): PlanInfo | null {
  return plans(env).find((p) => p.id === id) ?? null;
}

// The RevenueCat entitlement identifiers (create these in RevenueCat).
export const REVENUECAT_ENTITLEMENTS: Record<PaidTier, string> = { plus: "plus", pro: "pro" };
export const REVENUECAT_OFFERING = "default";

// Tier and plan of a store product id: "ascendra.pro.yearly" (App Store),
// "ascendra_pro:yearly" or "ascendra_pro" (Google Play; RevenueCat sends
// "subscription:baseplan"). null for a product this app does not sell.
export function planForStoreProduct(productId: string | null | undefined): { tier: PaidTier; period: PlanPeriod | null } | null {
  if (!productId) return null;
  const apple = /^ascendra\.(plus|pro)\.(monthly|quarterly|yearly)$/.exec(productId);
  if (apple) return { tier: apple[1] as PaidTier, period: apple[2] as PlanPeriod };
  const play = /^ascendra_(plus|pro)(?::([a-z-]+))?$/.exec(productId);
  if (play) {
    const base = play[2];
    const period = (Object.keys(PLAY_BASE) as PlanPeriod[]).find((p) => PLAY_BASE[p] === base) ?? null;
    return { tier: play[1] as PaidTier, period };
  }
  return null;
}

// Tier and plan of a Stripe price id, from the STRIPE_PRICE_* env.
export function planForStripePrice(priceId: string | null | undefined, env: Env = process.env): PlanInfo | null {
  if (!priceId) return null;
  return plans(env).find((p) => env[p.stripePriceEnv] === priceId) ?? null;
}

// ---------------------------------------------------------------------------
// GET /api/billing/config
// ---------------------------------------------------------------------------

export const TIER_COPY: Record<Tier, { name: string; summary: string; points: string[] }> = {
  free: {
    name: "Free",
    summary: "One course of your choice, free.",
    points: [
      "Every lesson in one course (switch once a week)",
      "Multiple-choice checks, spaced review, placement and progress",
      "A few graded typed answers a day",
      "Levels go up to Guided; prove more with typed answers in Plus",
    ],
  },
  plus: {
    name: "Plus",
    summary: "Every course, with AI grading.",
    points: [
      "Every course",
      "Grading for your typed answers, explain-it-back, unit checks and comparison cards",
      "Quiz me, and the coach (about 20 messages a day)",
      "One mock exam a month, and your readiness score",
      "A sample hands-on lab in every course",
    ],
  },
  pro: {
    name: "Pro",
    summary: "Everything, for exam prep.",
    points: [
      "Everything in Plus, and the coach for about 60 messages a day",
      "Unlimited mock exams, scenario questions and every hands-on lab",
    ],
  },
};

// Nick, 2026-11-07: while the switch is off the public route says only
// { enabled: false } -- no tiers, prices or product ids before launch.
// Operators inspect the full config with `npm run billing:config`
// (operatorConfig below).
export function publicConfig(env: Env = process.env) {
  if (!billingEnabled(env)) return { enabled: false as const };
  return fullConfig(env);
}

// What the app gets with the switch on (publicConfig only serves it then;
// operatorConfig shows it whatever the switch says).
function fullConfig(env: Env) {
  return {
    enabled: true as const,
    tiers: TIERS.map((t) => ({ id: t, ...TIER_COPY[t], features: featuresFor(t) })),
    features: FEATURES,
    allowances: allowanceTable(env),
    plans: plans(env).map(({ stripePriceEnv, ...p }) => ({ ...p, web: Boolean(env[stripePriceEnv]) })),
    revenueCat: { entitlements: REVENUECAT_ENTITLEMENTS, offering: REVENUECAT_OFFERING },
    freeCourseSwitchDays: freeCourseSwitchDays(env),
    webCheckout: Boolean(env.STRIPE_SECRET_KEY),
  };
}

// `npm run billing:config`: the config the app WOULD get with the switch on,
// whatever the switch says now, plus which settings are present (never their
// values -- a secret is reported as set or missing). For pre-launch checks.
export function operatorConfig(env: Env = process.env) {
  const set = (k: string) => Boolean(env[k]?.trim());
  return {
    switchOn: billingEnabled(env),
    wouldServe: fullConfig(env),
    caps: { plus: monthlyAiCapUsd("plus", env), pro: monthlyAiCapUsd("pro", env) },
    settings: {
      REVENUECAT_WEBHOOK_AUTH: set("REVENUECAT_WEBHOOK_AUTH") ? "set" : "missing",
      STRIPE_WEBHOOK_SECRET: set("STRIPE_WEBHOOK_SECRET") ? "set" : "missing",
      STRIPE_SECRET_KEY: set("STRIPE_SECRET_KEY") ? "set" : "missing",
      stripePrices: Object.fromEntries(plans(env).map((p) => [p.stripePriceEnv, set(p.stripePriceEnv) ? "set" : "missing"])),
      BILLING_WEB_RETURN_URL: set("BILLING_WEB_RETURN_URL") || set("APP_URL") ? "set" : "missing",
    },
  };
}
