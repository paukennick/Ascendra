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
// Pricing model and the cap rule. REQ-170 (Nick, 2026-11-09) replaced the
// first pricing page (one Plus and one Pro for every course) with category
// plans: IT and cloud, project management and fitness (each Plus or Pro),
// all-access (every non-clinical course, Pro features), and clinical (Pro,
// with an add-on for all-access). One published price per plan for
// everyone, every price overridable from the environment. Each plan has ONE
// monthly AI cap, whatever the billing length: half of what its yearly plan
// brings in per month after store/card fees (70% store at 15%, 30% web at
// 2.9% + $0.30). Learners never see dollars, only allowances.

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
// REQ-170: category plans.
//
// Nick, 2026-11-09: pricing is by category -- IT and cloud, project
// management, fitness, and clinical -- plus an all-access plan that covers
// every non-clinical category. Clinical stays a separate plan, with an
// add-on to all-access. ONE published price per plan for everyone: nothing
// about the learner (the intake form included, lib/intake.ts) ever changes a
// price. Prices are not final, so every one is read from the environment
// with the proposed numbers as defaults.
//
// A plan gives its tier (Plus or Pro) on the courses its scope covers. A
// course outside every plan the learner has is on Free terms (the one free
// course). Which plan covers a course comes from the catalog's education
// category (courseCategoryOf below).
// ---------------------------------------------------------------------------

// What a course belongs to, for plans. "other" is everything that is not in
// one of the four priced categories (academic and other catalog areas): only
// all-access covers it.
export type CourseCategory = "it_cloud" | "pm" | "fitness" | "clinical" | "other";
export const COURSE_CATEGORIES: readonly CourseCategory[] = ["it_cloud", "pm", "fitness", "clinical", "other"];

// What an entitlement covers. A grant (or any row without a scope) covers
// every course, as before REQ-170.
export type PlanScope = "it_cloud" | "pm" | "fitness" | "all_access" | "clinical";
export const PLAN_SCOPES: readonly PlanScope[] = ["it_cloud", "pm", "fitness", "all_access", "clinical"];

export const SCOPE_NAME: Record<PlanScope, string> = {
  it_cloud: "IT and cloud",
  pm: "Project management",
  fitness: "Fitness",
  all_access: "All access",
  clinical: "Clinical",
};

export function isPlanScope(v: unknown): v is PlanScope {
  return typeof v === "string" && (PLAN_SCOPES as readonly string[]).includes(v);
}

// education_categories.slug -> plan category. A catalog category not listed
// here is "other" (all-access only). Subcategory overrides come first.
export const EDUCATION_CATEGORY_PLAN: Record<string, CourseCategory> = {
  "aws-certifications": "it_cloud",
  "azure-certifications": "it_cloud",
  "gcp-certifications": "it_cloud",
  "comptia-certifications": "it_cloud",
  "cloud-native-certifications": "it_cloud",
  "it-software": "it_cloud",
  development: "it_cloud",
  "project-management-certifications": "pm",
  "health-fitness": "fitness",
  "healthcare-nursing": "clinical",
};
export const EDUCATION_SUBCATEGORY_PLAN: Record<string, CourseCategory> = {
  // The older PMI subcategory under Business (migration 019 left it in place).
  "business/project-management": "pm",
};

export function courseCategoryOf(categorySlug: string | null | undefined, subcategorySlug?: string | null): CourseCategory {
  if (categorySlug && subcategorySlug) {
    const sub = EDUCATION_SUBCATEGORY_PLAN[`${categorySlug}/${subcategorySlug}`];
    if (sub) return sub;
  }
  return (categorySlug && EDUCATION_CATEGORY_PLAN[categorySlug]) || "other";
}

// Does an entitlement with this scope cover a course in this category?
// null scope (a grant, or a row written before REQ-170) covers everything.
export function scopeCovers(scope: PlanScope | null, category: CourseCategory): boolean {
  if (scope === null) return true;
  if (scope === "all_access") return category !== "clinical";
  return scope === category;
}

// The plan to suggest for a course in this category (the upgrade sheet and
// the intake suggestion).
export function scopeForCategory(category: CourseCategory): PlanScope {
  return category === "other" ? "all_access" : category;
}

// ---------------------------------------------------------------------------
// Plan families: one per scope and tier. Each has a price for some lengths.
// ---------------------------------------------------------------------------

export type PlanPeriod = "monthly" | "quarterly" | "yearly";
export const PLAN_PERIODS: readonly PlanPeriod[] = ["monthly", "quarterly", "yearly"];
const MONTHS: Record<PlanPeriod, number> = { monthly: 1, quarterly: 3, yearly: 12 };
const PLAY_BASE: Record<PlanPeriod, string> = { monthly: "monthly", quarterly: "three-month", yearly: "yearly" };

export type PlanFamily =
  | "it_cloud_plus"
  | "it_cloud_pro"
  | "pm_plus"
  | "pm_pro"
  | "fitness_plus"
  | "fitness_pro"
  | "all_access"
  | "clinical_pro"
  | "clinical_addon";

export interface FamilyInfo {
  scope: PlanScope;
  tier: PaidTier;
  name: string;
  // Proposed US list prices (Nick, 2026-11-09). Each is overridable with
  // BILLING_PRICE_<FAMILY>_<PERIOD>_USD, which can also add a length that
  // has no default (e.g. BILLING_PRICE_CLINICAL_PRO_YEARLY_USD).
  prices: Partial<Record<PlanPeriod, number>>;
  // App Store subscription group. A learner holds one plan per group at a
  // time: one non-clinical plan (a category or all-access), and clinical.
  storeGroup: "main" | "clinical";
  // Order within the group (higher = upgrade). Equal = a crossgrade.
  rank: number;
  // The clinical add-on is sold only to a learner with all-access.
  requires?: PlanScope;
}

export const PLAN_FAMILIES: Record<PlanFamily, FamilyInfo> = {
  it_cloud_plus: { scope: "it_cloud", tier: "plus", name: "IT and cloud Plus", prices: { monthly: 12.99, quarterly: 29.99, yearly: 79.99 }, storeGroup: "main", rank: 1 },
  it_cloud_pro: { scope: "it_cloud", tier: "pro", name: "IT and cloud Pro", prices: { monthly: 19.99, quarterly: 44.99, yearly: 129.99 }, storeGroup: "main", rank: 2 },
  pm_plus: { scope: "pm", tier: "plus", name: "Project management Plus", prices: { monthly: 12.99, quarterly: 29.99, yearly: 79.99 }, storeGroup: "main", rank: 1 },
  pm_pro: { scope: "pm", tier: "pro", name: "Project management Pro", prices: { monthly: 19.99, quarterly: 44.99, yearly: 129.99 }, storeGroup: "main", rank: 2 },
  fitness_plus: { scope: "fitness", tier: "plus", name: "Fitness Plus", prices: { monthly: 12.99, quarterly: 29.99, yearly: 79.99 }, storeGroup: "main", rank: 1 },
  fitness_pro: { scope: "fitness", tier: "pro", name: "Fitness Pro", prices: { monthly: 19.99, quarterly: 44.99, yearly: 129.99 }, storeGroup: "main", rank: 2 },
  // Every non-clinical category, with Pro's features.
  all_access: { scope: "all_access", tier: "pro", name: "All access", prices: { monthly: 29.99, quarterly: 69.99, yearly: 199 }, storeGroup: "main", rank: 3 },
  clinical_pro: { scope: "clinical", tier: "pro", name: "Clinical Pro", prices: { monthly: 49, quarterly: 99 }, storeGroup: "clinical", rank: 1 },
  clinical_addon: { scope: "clinical", tier: "pro", name: "Clinical add-on", prices: { monthly: 29 }, storeGroup: "clinical", rank: 1, requires: "all_access" },
};
export const PLAN_FAMILY_IDS = Object.keys(PLAN_FAMILIES) as PlanFamily[];

export function isPlanFamily(v: unknown): v is PlanFamily {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PLAN_FAMILIES, v);
}

// The families shown for a scope, Plus first.
export function familiesForScope(scope: PlanScope): PlanFamily[] {
  return PLAN_FAMILY_IDS.filter((f) => PLAN_FAMILIES[f].scope === scope);
}

function priceOverride(id: string, env: Env): number | null {
  const n = Number(env[`BILLING_PRICE_${id.toUpperCase()}_USD`]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function familyPrice(family: PlanFamily, period: PlanPeriod, env: Env = process.env): number | null {
  return priceOverride(`${family}_${period}`, env) ?? PLAN_FAMILIES[family].prices[period] ?? null;
}

// ---------------------------------------------------------------------------
// Fees and the AI cap rule.
//
// The rule (REQ-122, unchanged): a plan's monthly AI spending cap is half of
// what its yearly plan brings in per month after store and card fees (70%
// bought in the stores at 15%, 30% on the web at 2.9% + $0.30). A plan with
// no yearly length (clinical) uses its cheapest month instead -- the same
// thing the yearly price is for the others -- so the cap is never above half
// of the smallest monthly take it can bring in.
//
// Discounts never lower the cap (REQ-166, Nick 2026-11-09) and don't stack:
// a learner gets one discount, the largest.
// ---------------------------------------------------------------------------

export function netAfterFees(usd: number, storeShare = 0.7): number {
  return storeShare * usd * 0.85 + (1 - storeShare) * (usd * (1 - 0.029) - 0.3);
}

export function capFromYearlyPrice(yearlyUsd: number, storeShare = 0.7, capShare = 0.5): number {
  return (capShare * netAfterFees(yearlyUsd, storeShare)) / 12;
}

// The family's lowest per-month take after fees, over the lengths it sells.
export function cheapestMonthlyNet(family: PlanFamily, env: Env = process.env): number {
  let best = Infinity;
  for (const p of PLAN_PERIODS) {
    const usd = familyPrice(family, p, env);
    if (usd !== null) best = Math.min(best, netAfterFees(usd) / MONTHS[p]);
  }
  return best;
}

export function defaultFamilyCapUsd(family: PlanFamily, env: Env = process.env): number {
  return Math.round(0.5 * cheapestMonthlyNet(family, env) * 100) / 100;
}

function capOverride(key: string, env: Env): number | null | undefined {
  const raw = env[key]?.trim().toLowerCase();
  if (raw === "off") return null;
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n === 0 ? null : n;
}

// AI_MONTHLY_CAP_<FAMILY>_USD overrides (e.g. AI_MONTHLY_CAP_ALL_ACCESS_USD);
// "off" removes it. null = no cap.
export function familyCapUsd(family: PlanFamily, env: Env = process.env): number | null {
  const o = capOverride(`AI_MONTHLY_CAP_${family.toUpperCase()}_USD`, env);
  return o === undefined ? defaultFamilyCapUsd(family, env) : o;
}

// The cap of an entitlement with no plan family -- a grant (comps, the
// launch comp) or a row from before REQ-170: Plus is capped like IT and
// cloud Plus, Pro like all-access (AI_MONTHLY_CAP_PLUS_USD /
// AI_MONTHLY_CAP_PRO_USD still override). Free has no chat or regenerate.
export const GRANT_CAP_FAMILY: Record<PaidTier, PlanFamily> = { plus: "it_cloud_plus", pro: "all_access" };

export function monthlyAiCapUsd(tier: Tier, env: Env = process.env): number | null {
  if (tier === "free") return null;
  const o = capOverride(`AI_MONTHLY_CAP_${tier.toUpperCase()}_USD`, env);
  return o === undefined ? familyCapUsd(GRANT_CAP_FAMILY[tier], env) : o;
}

// One learner's cap: the plans they hold each bring their own cap, so a
// learner who pays for two (a category and clinical) has both. Rows of the
// same scope (a downgrade's held period beside the new plan) count once, at
// the larger. null when nothing they hold is capped.
export function learnerCapUsd(rows: Array<{ family: PlanFamily | null; tier: PaidTier; scope: PlanScope | null }>, env: Env = process.env): number | null {
  const byScope = new Map<string, number | null>();
  for (const r of rows) {
    const cap = r.family ? familyCapUsd(r.family, env) : monthlyAiCapUsd(r.tier, env);
    const key = r.scope ?? "all";
    if (!byScope.has(key)) byScope.set(key, cap);
    else {
      const prev = byScope.get(key)!;
      byScope.set(key, prev === null || cap === null ? null : Math.max(prev, cap));
    }
  }
  if (!byScope.size) return null;
  let total = 0;
  for (const v of byScope.values()) {
    if (v === null) return null;
    total += v;
  }
  return Math.round(total * 100) / 100;
}

// ---------------------------------------------------------------------------
// Founding members (REQ-170): 40% off for the first 100 paying learners,
// kept for as long as they stay subscribed. OFF unless
// FOUNDING_MEMBERS_ENABLED is on (and plans are on). It is one more
// published discount: the same percentage for every founding member, and it
// doesn't stack with a verified discount (the larger applies). It never
// changes the AI cap.
// ---------------------------------------------------------------------------

export interface FoundingConfig {
  enabled: boolean;
  percent: number;
  limit: number;
  // Seats held at checkout expire after this many hours unless paid.
  holdHours: number;
}

export function foundingConfig(env: Env = process.env): FoundingConfig {
  const raw = env.FOUNDING_MEMBERS_ENABLED?.trim().toLowerCase();
  const on = billingEnabled(env) && raw !== undefined && !OFF.has(raw);
  const pct = Number(env.FOUNDING_MEMBERS_PERCENT);
  const lim = Number(env.FOUNDING_MEMBERS_LIMIT);
  const hold = Number(env.FOUNDING_MEMBERS_HOLD_HOURS);
  return {
    enabled: on,
    percent: Number.isInteger(pct) && pct >= 1 && pct <= 90 ? pct : 40,
    limit: Number.isInteger(lim) && lim >= 1 ? lim : 100,
    holdHours: Number.isFinite(hold) && hold > 0 && hold <= 168 ? hold : 48,
  };
}

export function stripeFoundingCoupon(env: Env = process.env): string | null {
  return env.STRIPE_COUPON_FOUNDING?.trim() || null;
}

export function playFoundingOffer(env: Env = process.env): string {
  const raw = env.PLAY_OFFER_FOUNDING?.trim();
  return raw && /^[a-z0-9][a-z0-9-]{0,62}$/.test(raw) ? raw : "founding";
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

export interface PlanInfo {
  id: string; // "it_cloud_plus_monthly"
  family: PlanFamily;
  scope: PlanScope;
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

export function plans(env: Env = process.env): PlanInfo[] {
  const out: PlanInfo[] = [];
  for (const family of PLAN_FAMILY_IDS) {
    const f = PLAN_FAMILIES[family];
    for (const period of PLAN_PERIODS) {
      const usd = familyPrice(family, period, env);
      if (usd === null) continue;
      const id = `${family}_${period}`;
      out.push({
        id,
        family,
        scope: f.scope,
        tier: f.tier,
        period,
        months: MONTHS[period],
        usd,
        appStoreProductId: `ascendra.${family}.${period}`,
        playProductId: `ascendra_${family}:${PLAY_BASE[period]}`,
        revenueCatPackage: id,
        stripePriceEnv: `STRIPE_PRICE_${id.toUpperCase()}`,
      });
    }
  }
  return out;
}

export function planById(id: string, env: Env = process.env): PlanInfo | null {
  return plans(env).find((p) => p.id === id) ?? null;
}

// The RevenueCat entitlement identifiers (create these in RevenueCat): one
// per plan family. The server reads the product id first; these are the
// fallback and what the app's SDK reports.
export const REVENUECAT_ENTITLEMENTS: Record<PlanFamily, string> = Object.fromEntries(PLAN_FAMILY_IDS.map((f) => [f, f])) as Record<PlanFamily, string>;
export const REVENUECAT_OFFERING = "default";

export interface StoreProductPlan {
  family: PlanFamily;
  scope: PlanScope;
  tier: PaidTier;
  period: PlanPeriod | null;
}

function familyPlan(family: PlanFamily, period: PlanPeriod | null): StoreProductPlan {
  return { family, scope: PLAN_FAMILIES[family].scope, tier: PLAN_FAMILIES[family].tier, period };
}

// Plan of a store product id: "ascendra.it_cloud_pro.yearly" (App Store),
// "ascendra_it_cloud_pro:yearly" or "ascendra_it_cloud_pro" (Google Play;
// RevenueCat sends "subscription:baseplan"). null for a product this app
// does not sell.
export function planForStoreProduct(productId: string | null | undefined): StoreProductPlan | null {
  if (!productId) return null;
  const apple = /^ascendra\.([a-z_]+)\.(monthly|quarterly|yearly)$/.exec(productId);
  if (apple && isPlanFamily(apple[1])) return familyPlan(apple[1], apple[2] as PlanPeriod);
  const play = /^ascendra_([a-z_]+?)(?::([a-z-]+))?$/.exec(productId);
  if (play && isPlanFamily(play[1])) {
    const base = play[2];
    const period = (Object.keys(PLAY_BASE) as PlanPeriod[]).find((p) => PLAY_BASE[p] === base) ?? null;
    return familyPlan(play[1], period);
  }
  return null;
}

// The plan of a RevenueCat entitlement id (the fallback when the product id
// is unknown).
export function planForEntitlementId(id: string): StoreProductPlan | null {
  return isPlanFamily(id) ? familyPlan(id, null) : null;
}

// Plan of a Stripe price id, from the STRIPE_PRICE_* env.
export function planForStripePrice(priceId: string | null | undefined, env: Env = process.env): PlanInfo | null {
  if (!priceId) return null;
  return plans(env).find((p) => env[p.stripePriceEnv] === priceId) ?? null;
}

// Upgrade, downgrade or crossgrade between two plans (REQ-124 decision 6
// holds a higher plan's paid period to its end). A row with no family (a
// grant) ranks by tier.
export function planRank(family: PlanFamily | null, tier: PaidTier): number {
  return family ? PLAN_FAMILIES[family].rank : TIER_RANK[tier];
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
    summary: "Every course in the plan, with AI grading.",
    points: [
      "Every course in the plan's category",
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

export const SCOPE_COPY: Record<PlanScope, { summary: string }> = {
  it_cloud: { summary: "AWS, Azure, Google Cloud, CompTIA, Kubernetes and programming courses." },
  pm: { summary: "PMP, CAPM, PMI-ACP and the other project management courses." },
  fitness: { summary: "Personal trainer and strength and conditioning courses." },
  all_access: { summary: "Every course except clinical, with everything in Pro." },
  clinical: { summary: "Nursing and physical therapy courses, with everything in Pro. Holders of All access can add it for less." },
};

// Shown wherever prices are (Nick, 2026-11-09: no personalised pricing).
export const SAME_PRICE_NOTE = "Every plan has one published price, the same for everyone. Your answers to the study questions never change it.";

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
  const founding = foundingConfig(env);
  return {
    enabled: true as const,
    tiers: TIERS.map((t) => ({ id: t, ...TIER_COPY[t], features: featuresFor(t) })),
    features: FEATURES,
    allowances: allowanceTable(env),
    scopes: PLAN_SCOPES.map((s) => ({ id: s, name: SCOPE_NAME[s], ...SCOPE_COPY[s], families: familiesForScope(s) })),
    families: Object.fromEntries(
      PLAN_FAMILY_IDS.map((f) => {
        const i = PLAN_FAMILIES[f];
        return [f, { scope: i.scope, tier: i.tier, name: i.name, requires: i.requires ?? null, storeGroup: i.storeGroup, rank: i.rank }];
      })
    ),
    plans: plans(env).map(({ stripePriceEnv, ...p }) => ({ ...p, web: Boolean(env[stripePriceEnv]) })),
    revenueCat: { entitlements: REVENUECAT_ENTITLEMENTS, offering: REVENUECAT_OFFERING },
    freeCourseSwitchDays: freeCourseSwitchDays(env),
    webCheckout: Boolean(env.STRIPE_SECRET_KEY),
    samePriceNote: SAME_PRICE_NOTE,
    // Whether the founding offer exists at all; seats left are per request
    // (GET /api/billing/me), never part of the price.
    founding: founding.enabled ? { percent: founding.percent, playOffer: playFoundingOffer(env) } : null,
  };
}

// `npm run billing:config`: the config the app WOULD get with the switch on,
// whatever the switch says now, plus which settings are present (never their
// values -- a secret is reported as set or missing). For pre-launch checks.
export function operatorConfig(env: Env = process.env) {
  const set = (k: string) => Boolean(env[k]?.trim());
  const founding = foundingConfig({ ...env, BILLING_ENABLED: "true" });
  return {
    switchOn: billingEnabled(env),
    wouldServe: fullConfig(env),
    caps: Object.fromEntries([
      ...PLAN_FAMILY_IDS.map((f) => [f, familyCapUsd(f, env)]),
      ["grant_plus", monthlyAiCapUsd("plus", env)],
      ["grant_pro", monthlyAiCapUsd("pro", env)],
    ]),
    founding: {
      switchOn: (env.FOUNDING_MEMBERS_ENABLED?.trim() ?? "") !== "" && !OFF.has(env.FOUNDING_MEMBERS_ENABLED!.trim().toLowerCase()),
      percent: founding.percent,
      limit: founding.limit,
      STRIPE_COUPON_FOUNDING: set("STRIPE_COUPON_FOUNDING") ? "set" : "missing",
    },
    settings: {
      REVENUECAT_WEBHOOK_AUTH: set("REVENUECAT_WEBHOOK_AUTH") ? "set" : "missing",
      STRIPE_WEBHOOK_SECRET: set("STRIPE_WEBHOOK_SECRET") ? "set" : "missing",
      STRIPE_SECRET_KEY: set("STRIPE_SECRET_KEY") ? "set" : "missing",
      stripePrices: Object.fromEntries(plans(env).map((p) => [p.stripePriceEnv, set(p.stripePriceEnv) ? "set" : "missing"])),
      BILLING_WEB_RETURN_URL: set("BILLING_WEB_RETURN_URL") || set("APP_URL") ? "set" : "missing",
    },
  };
}
