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
// REQ-170: category plans.
export type PlanScope = "it_cloud" | "pm" | "fitness" | "all_access" | "clinical";

export interface BillingPlan {
  id: string;
  family: string;
  scope: PlanScope;
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
  // REQ-170
  scopes: Array<{ id: PlanScope; name: string; summary: string; families: string[] }>;
  families: Record<string, BillingFamily>;
  samePriceNote: string;
  founding: { percent: number; playOffer: string } | null;
}

export interface BillingFamily {
  scope: PlanScope;
  tier: "plus" | "pro";
  name: string;
  requires: PlanScope | null;
  storeGroup: "main" | "clinical";
  rank: number;
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
    // REQ-170: the category plan (null for a grant: every course)
    family?: string | null;
    scope?: PlanScope | null;
    willRenew: boolean;
    manage: "app_store" | "play_store" | "stripe" | "grant" | "store" | null;
    // REQ-124: the plan was kept to the end of its paid period after a
    // downgrade; this tier applies from `from`.
    next?: { tier: Tier; from: string } | null;
  } | null;
  freeCourse?: FreeCourse | null;
  // REQ-170: every plan held, whether they cover every course, founding seat.
  plans?: Array<{ family: string | null; scope: PlanScope | null; tier: Tier; status: string; periodEnd: string | null }>;
  coversEverything?: boolean;
  founding?: { percent: number; state: "member" | "held" | "open" | "full" } | null;
  allowances?: AllowanceStatus[];
  aiPaused?: { paused: boolean; resetsAt: string | null };
  // REQ-144: set for owner and unrestricted accounts instead of a plan.
  unrestricted?: { level: "owner" | "unrestricted"; grantedBy: string | null; expiresAt: string | null } | null;
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
  scopes: [],
  families: {},
  samePriceNote: "",
  founding: null,
};

// Anything that isn't a well-formed config with enabled === true is "off".
export function parseConfig(data: unknown): BillingConfig {
  if (!data || typeof data !== "object") return DISABLED_CONFIG;
  const d = data as Partial<BillingConfig>;
  if (d.enabled !== true || !Array.isArray(d.tiers) || !Array.isArray(d.plans)) return { ...DISABLED_CONFIG };
  return { ...DISABLED_CONFIG, ...d, enabled: true } as BillingConfig;
}

export const TIER_NAME: Record<Tier, string> = { free: "Free", plus: "Plus", pro: "Pro" };
export const SCOPE_IDS: readonly string[] = ["it_cloud", "pm", "fitness", "all_access", "clinical"];
export const SCOPE_NAME: Record<PlanScope, string> = {
  it_cloud: "IT and cloud",
  pm: "Project management",
  fitness: "Fitness",
  all_access: "All access",
  clinical: "Clinical",
};
export function isScope(v: unknown): v is PlanScope {
  return typeof v === "string" && SCOPE_IDS.includes(v);
}
export const PERIOD_NAME: Record<PlanPeriod, string> = { monthly: "Monthly", quarterly: "3 months", yearly: "Yearly" };

// ---------------------------------------------------------------------------
// What a refused request means for billing
// ---------------------------------------------------------------------------

export type BillingSignal =
  | { kind: "upgrade"; message: string; feature: string; requiredTier: "plus" | "pro"; scope: PlanScope | null; freeCourse: FreeCourse | null }
  | { kind: "allowance"; message: string; allowance: AllowanceStatus }
  | { kind: "aiPaused"; message: string; resetsAt: string };

// From an API error body (ApiError.data) and status. null when the refusal
// isn't about the plan.
export function billingSignal(status: number, data: unknown): BillingSignal | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, any>;
  const message = typeof d.error === "string" ? d.error : "";
  if (status === 402 && d.upgrade && (d.upgrade.requiredTier === "plus" || d.upgrade.requiredTier === "pro")) {
    const scope = SCOPE_IDS.includes(d.upgrade.scope) ? (d.upgrade.scope as PlanScope) : null;
    return { kind: "upgrade", message, feature: String(d.upgrade.feature ?? ""), requiredTier: d.upgrade.requiredTier, scope, freeCourse: d.freeCourse ?? null };
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
    const plan = s.scope ? scopePlanName(s.scope, s.requiredTier) : TIER_NAME[s.requiredTier];
    const title = s.feature === "all_courses" ? "One course on Free" : `Part of ${plan}`;
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

// "IT and cloud Plus", "All access", "Clinical Pro".
export function scopePlanName(scope: PlanScope, tier: "plus" | "pro"): string {
  if (scope === "all_access") return "All access";
  if (scope === "clinical") return "Clinical Pro";
  return `${SCOPE_NAME[scope]} ${TIER_NAME[tier]}`;
}

// REQ-170: the lengths of one plan family, shortest first.
export function plansFor(config: BillingConfig, family: string): BillingPlan[] {
  const order: PlanPeriod[] = ["monthly", "quarterly", "yearly"];
  return config.plans.filter((p) => p.family === family).sort((a, b) => order.indexOf(a.period) - order.indexOf(b.period));
}

// The families to choose between on a scope (Plus first), leaving out the
// clinical add-on unless the learner has all-access, and Clinical Pro when
// they do (the add-on is the cheaper way in for them).
export function familiesFor(config: BillingConfig, scope: PlanScope, me: BillingMe | null): string[] {
  const all = config.scopes.find((s) => s.id === scope)?.families ?? [];
  const hasAllAccess = (me?.plans ?? []).some((p) => p.scope === "all_access");
  return all.filter((f) => {
    const info = config.families[f];
    if (!info) return false;
    if (info.requires) return (me?.plans ?? []).some((p) => p.scope === info.requires);
    if (scope === "clinical" && hasAllAccess) return false;
    return true;
  });
}

// The family a plan screen opens on for a scope and (optional) tier.
export function defaultFamily(config: BillingConfig, scope: PlanScope, me: BillingMe | null, tier?: "plus" | "pro" | null): string | null {
  const list = familiesFor(config, scope, me);
  return list.find((f) => config.families[f]?.tier === tier) ?? list[0] ?? null;
}

// "Founding member: 40% off, for as long as you stay subscribed." Only
// while a seat is open or held for this learner; a published discount, the
// same for every founding member.
export function foundingLine(me: BillingMe | null): string | null {
  const f = me?.founding;
  if (!f) return null;
  if (f.state === "member") return `You're a founding member: ${f.percent}% off for as long as you stay subscribed.`;
  if (f.state === "full") return null;
  return `Founding members: ${f.percent}% off for the first subscribers, kept for as long as they stay subscribed. The same discount for every founding member.`;
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
  const e = me.entitlement;
  const name = e?.scope ? scopePlanName(e.scope, me.tier === "plus" ? "plus" : "pro") : TIER_NAME[me.tier];
  if (!e) return name;
  // REQ-124 (decision 6): "Pro until Dec 1, then Plus" after a downgrade.
  if (e.next && e.next.tier !== me.tier) {
    return `${name} until ${resetPhrase(e.next.from, now).replace(/^on |^at /, "")}, then ${TIER_NAME[e.next.tier]}`;
  }
  if (e.source === "grant") return e.periodEnd ? `${name}, given to you until ${new Date(e.periodEnd).toLocaleDateString()}` : `${name}, given to you`;
  if (e.status === "canceled" && e.periodEnd) return `${name}, ends ${resetPhrase(e.periodEnd, now).replace(/^on |^at /, "")}`;
  if (e.status === "billing_issue") return `${name}, payment needs attention`;
  return e.plan ? `${name}, ${PERIOD_NAME[e.plan].toLowerCase()}` : name;
}

// REQ-124: what the course screen says where a Free learner's readiness
// number would be -- the server's own line (Nick's wording), with the same
// words as a fallback for a server that sends none.
export const READINESS_LOCKED_FALLBACK = "Readiness: unconfirmed \u2014 prove it with typed answers in Plus";
export function readinessLockedLine(lock: { message?: unknown } | null | undefined): string {
  return typeof lock?.message === "string" && lock.message.trim() ? lock.message : READINESS_LOCKED_FALLBACK;
}

// REQ-124 (decision 6): on Google Play, changing plan replaces the current
// subscription. An upgrade applies at once (time-prorated); a downgrade or a
// same-tier change is DEFERRED to the end of the paid period, so the learner
// keeps what they paid for -- the App Store does this by itself. null when
// there is nothing to replace (no Play subscription, or the same product).
// REQ-170: plans are replaced only within one store group (one non-clinical
// plan at a time; clinical is separate, as on the App Store), and "upgrade"
// is the plan's rank (all-access over a category's Pro over its Plus).
export function googlePlanChange(
  current: { tier: Tier; manage?: string | null; productId?: string | null; status?: string } | null | undefined,
  target: Pick<BillingPlan, "tier" | "playProductId"> & { family?: string },
  families: Record<string, Pick<BillingFamily, "storeGroup" | "rank">> = {}
): { oldProductIdentifier: string; mode: "immediate" | "deferred" } | null {
  if (!current || current.manage !== "play_store" || !current.productId) return null;
  if (current.status && !["active", "canceled", "billing_issue"].includes(current.status)) return null;
  const oldSub = current.productId.split(":")[0];
  if (current.productId === target.playProductId) return null;
  const oldFamily = families[oldSub.replace(/^ascendra_/, "")];
  const newFamily = target.family ? families[target.family] : undefined;
  if (oldFamily && newFamily) {
    if (oldFamily.storeGroup !== newFamily.storeGroup) return null; // held side by side
    return { oldProductIdentifier: oldSub, mode: newFamily.rank > oldFamily.rank ? "immediate" : "deferred" };
  }
  const rank: Record<Tier, number> = { free: 0, plus: 1, pro: 2 };
  return { oldProductIdentifier: oldSub, mode: rank[target.tier] > rank[current.tier] ? "immediate" : "deferred" };
}

// REQ-170: the one discount on Google Play -- the verified group offer or
// the founding offer, whichever is larger (never both; a tie goes to the
// verified one, which doesn't use a founding seat). App Store: founding is
// not offered in the app (offer codes can't keep a price for life).
export function playDiscountChoice(
  config: Pick<BillingConfig, "founding">,
  me: Pick<BillingMe, "founding"> | null,
  verified: { percent: number; playOfferId: string } | null
): { offerId: string; founding: boolean } | null {
  const f = config.founding && me?.founding && me.founding.state !== "full" ? me.founding : null;
  if (verified && (!f || verified.percent >= f.percent)) return { offerId: verified.playOfferId, founding: false };
  if (f && config.founding) return { offerId: config.founding.playOffer, founding: true };
  return null;
}
