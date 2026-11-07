// REQ-122: paid plans on the phone -- the pure parts (no React Native), so
// they run under node --test.
//
// The server decides everything (GET /api/billing/config, /api/billing/me).
// While config.enabled is false -- the default, and what the app assumes
// when it can't reach the server -- the app shows no plan, price or upgrade
// prompt anywhere and never starts the purchases SDK.

export type Tier = "free" | "plus" | "pro";
export type PlanPeriod = "monthly" | "quarterly" | "yearly";
export type AllowanceKind = "coach_message" | "regeneration" | "mock_exam" | "graded_answer";

export interface BillingPlan {
  id: string;
  tier: "plus" | "pro";
  period: PlanPeriod;
  months: number;
  usd: number;
  appStoreProductId: string;
  playProductId: string;
  revenueCatPackage: string;
  web: boolean;
}

export interface BillingConfig {
  enabled: boolean;
  tiers: Array<{ id: Tier; name: string; summary: string; points: string[]; features: string[] }>;
  features: Record<string, { minTier: "plus" | "pro"; label: string }>;
  allowances: Record<string, { window: "day" | "week" | "month"; noun: string; free: number | null; plus: number | null; pro: number | null }>;
  plans: BillingPlan[];
  revenueCat: { entitlements: Record<string, string>; offering: string };
  freeCourseSwitchDays: number;
  webCheckout: boolean;
}

export interface AllowanceStatus {
  kind: AllowanceKind;
  window: "day" | "week" | "month";
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string | null;
}

export interface FreeCourse {
  trackId: string;
  title: string;
  chosenBy: "auto" | "learner";
  chosenAt: string;
  canSwitchAt: string | null;
}

export interface BillingMe {
  enabled: boolean;
  tier: Tier;
  entitlement?: {
    source: "revenuecat" | "stripe" | "grant";
    status: string;
    plan: PlanPeriod | null;
    productId: string | null;
    periodEnd: string | null;
    willRenew: boolean;
    manage: "app_store" | "play_store" | "stripe" | "grant" | "store" | null;
  } | null;
  freeCourse?: FreeCourse | null;
  allowances?: AllowanceStatus[];
  aiPaused?: { paused: boolean; resetsAt: string | null };
}

export const DISABLED_CONFIG: BillingConfig = {
  enabled: false,
  tiers: [],
  features: {},
  allowances: {},
  plans: [],
  revenueCat: { entitlements: {}, offering: "default" },
  freeCourseSwitchDays: 7,
  webCheckout: false,
};

// Anything that isn't a well-formed config with enabled === true is "off".
export function parseConfig(data: unknown): BillingConfig {
  if (!data || typeof data !== "object") return DISABLED_CONFIG;
  const d = data as Partial<BillingConfig>;
  if (d.enabled !== true || !Array.isArray(d.tiers) || !Array.isArray(d.plans)) return { ...DISABLED_CONFIG };
  return { ...DISABLED_CONFIG, ...d, enabled: true } as BillingConfig;
}

export const TIER_NAME: Record<Tier, string> = { free: "Free", plus: "Plus", pro: "Pro" };
export const PERIOD_NAME: Record<PlanPeriod, string> = { monthly: "Monthly", quarterly: "3 months", yearly: "Yearly" };

// ---------------------------------------------------------------------------
// What a refused request means for billing
// ---------------------------------------------------------------------------

export type BillingSignal =
  | { kind: "upgrade"; message: string; feature: string; requiredTier: "plus" | "pro"; freeCourse: FreeCourse | null }
  | { kind: "allowance"; message: string; allowance: AllowanceStatus }
  | { kind: "aiPaused"; message: string; resetsAt: string };

// From an API error body (ApiError.data) and status. null when the refusal
// isn't about the plan.
export function billingSignal(status: number, data: unknown): BillingSignal | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, any>;
  const message = typeof d.error === "string" ? d.error : "";
  if (status === 402 && d.upgrade && (d.upgrade.requiredTier === "plus" || d.upgrade.requiredTier === "pro")) {
    return { kind: "upgrade", message, feature: String(d.upgrade.feature ?? ""), requiredTier: d.upgrade.requiredTier, freeCourse: d.freeCourse ?? null };
  }
  if (status === 429 && d.allowance && typeof d.allowance.kind === "string") {
    return { kind: "allowance", message, allowance: d.allowance as AllowanceStatus };
  }
  if (status === 429 && d.aiPaused && typeof d.aiPaused.resetsAt === "string") {
    return { kind: "aiPaused", message, resetsAt: d.aiPaused.resetsAt };
  }
  return null;
}

// The same, from a thrown error (ApiError carries status and data).
export function billingSignalOf(err: unknown): BillingSignal | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { status?: unknown; data?: unknown };
  return typeof e.status === "number" ? billingSignal(e.status, e.data) : null;
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "at 4:30 PM", "tomorrow at 9:00 AM", "on Tue, Dec 1" -- in the phone's own
// time zone and locale.
export function resetPhrase(iso: string | null | undefined, now = new Date(), locale?: string): string {
  if (!iso) return "soon";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "soon";
  if (at.getTime() <= now.getTime()) return "now";
  const time = at.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  if (sameDay(at, now)) return `at ${time}`;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(at, tomorrow)) return `tomorrow at ${time}`;
  return `on ${at.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })}`;
}

const WINDOW_WORD: Record<string, string> = { day: "today", week: "this week", month: "this month" };
const KIND_NOUN: Record<AllowanceKind, string> = {
  coach_message: "Coach messages",
  regeneration: "New lesson versions",
  mock_exam: "Mock exams",
  graded_answer: "Graded typed answers",
};

// "Coach messages: 12 of 20 left today" / "Mock exams: no limit".
export function allowanceLine(a: AllowanceStatus, now = new Date()): string {
  const noun = KIND_NOUN[a.kind] ?? a.kind;
  if (a.limit === null) return `${noun}: no daily count`;
  const left = a.remaining ?? Math.max(0, a.limit - a.used);
  if (left === 0) return `${noun}: all ${a.limit} used ${WINDOW_WORD[a.window]}, more ${resetPhrase(a.resetsAt, now)}`;
  return `${noun}: ${left} of ${a.limit} left ${WINDOW_WORD[a.window]}`;
}

// The sheet's text for a signal. The server's own message is used as the
// body when there is one (it already says what still works); the app adds
// the exact local time when it knows it.
export function signalCopy(s: BillingSignal, now = new Date()): { title: string; body: string; showPlans: boolean } {
  if (s.kind === "upgrade") {
    const title = s.feature === "all_courses" ? "One course on Free" : `Part of ${TIER_NAME[s.requiredTier]}`;
    return { title, body: s.message, showPlans: true };
  }
  if (s.kind === "allowance") {
    const when = resetPhrase(s.allowance.resetsAt, now);
    const extra = when === "soon" ? "" : ` (${when})`;
    return { title: "You've used this one up for now", body: `${s.message}${extra}`, showPlans: true };
  }
  return { title: "AI coaching resumes soon", body: `${s.message} (${resetPhrase(s.resetsAt, now)})`, showPlans: false };
}

// Free learners' honest ceiling, shown on the plans screen and the course
// screen: never a padlock, just what typed answers add.
export const FREE_MASTERY_NOTE =
  "On Free, levels go up to Guided. Showing you can do it without choices takes typed answers, which Plus grades every time.";

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export function plansFor(config: BillingConfig, tier: "plus" | "pro"): BillingPlan[] {
  const order: PlanPeriod[] = ["monthly", "quarterly", "yearly"];
  return config.plans.filter((p) => p.tier === tier).sort((a, b) => order.indexOf(a.period) - order.indexOf(b.period));
}

// The price to show: the store's localised string when the store gave one,
// else the US list price marked as such.
export function priceText(plan: BillingPlan, storePrice?: string | null): string {
  const per = plan.period === "monthly" ? "/month" : plan.period === "quarterly" ? " for 3 months" : "/year";
  if (storePrice) return `${storePrice}${per}`;
  return `US$${plan.usd.toFixed(2)}${per}`;
}

// "US$2.92 a month" for the yearly plan, to compare lengths.
export function perMonthText(plan: BillingPlan): string | null {
  if (plan.months <= 1) return null;
  return `about US$${(plan.usd / plan.months).toFixed(2)} a month`;
}

export function savingsPercent(plan: BillingPlan, monthly: BillingPlan | undefined): number | null {
  if (!monthly || plan.months <= 1) return null;
  const full = monthly.usd * plan.months;
  const pct = Math.round((1 - plan.usd / full) * 100);
  return pct > 0 ? pct : null;
}

// Where "Manage subscription" goes.
export function manageUrl(manage: string | null | undefined, packageName = "com.hel1x.ascendra"): string | null {
  if (manage === "app_store") return "https://apps.apple.com/account/subscriptions";
  if (manage === "play_store") return `https://play.google.com/store/account/subscriptions?package=${packageName}`;
  return null; // stripe: the billing portal (a server call); grant: nothing to manage
}

// Whether to start the purchases SDK: only with paid plans on, on a phone,
// with a public SDK key in the build.
export function shouldInitPurchases(config: BillingConfig, platform: string, keys: { ios?: string; android?: string }): string | null {
  if (!config.enabled) return null;
  if (platform === "ios") return keys.ios?.trim() || null;
  if (platform === "android") return keys.android?.trim() || null;
  return null;
}

export function planSummary(me: BillingMe | null, now = new Date()): string {
  if (!me || !me.enabled) return "";
  const name = TIER_NAME[me.tier];
  const e = me.entitlement;
  if (!e) return name;
  if (e.source === "grant") return e.periodEnd ? `${name}, given to you until ${new Date(e.periodEnd).toLocaleDateString()}` : `${name}, given to you`;
  if (e.status === "canceled" && e.periodEnd) return `${name}, ends ${resetPhrase(e.periodEnd, now).replace(/^on |^at /, "")}`;
  if (e.status === "billing_issue") return `${name}, payment needs attention`;
  return e.plan ? `${name}, ${PERIOD_NAME[e.plan].toLowerCase()}` : name;
}
