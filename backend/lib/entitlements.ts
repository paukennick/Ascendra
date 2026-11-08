import { randomUUID } from "node:crypto";
import { query, queryOne, withTransaction } from "@/lib/db";
import { UserFacingError } from "@/lib/http";
import { spendSinceUsd } from "@/lib/ai-budget";
import {
  ALLOWANCE_DEFAULTS,
  ALLOWANCE_KINDS,
  FEATURES,
  TIER_COPY,
  WINDOW_SECONDS,
  allowanceLimit,
  billingEnabled,
  freeCourseSwitchDays,
  isTier,
  monthlyAiCapUsd,
  tierHas,
  type AllowanceKind,
  type Feature,
  type PaidTier,
  type Tier,
} from "@/lib/billing-config";

// REQ-122: who may use what, checked on the server.
//
// Every export here starts with billingEnabled(): while the switch is off it
// returns at once -- 'pro', allowed, unlimited -- without a database read, so
// nothing changes for anyone and the 049 tables are never touched (the code
// even runs before migration 049 is applied). The existing daily AI budget
// (lib/ai-budget.ts) is separate and still applies either way, as the abuse
// guard.
//
// With the switch on:
//   - tierFor: the highest tier among the learner's entitlements that still
//     give access (active, canceled-but-paid-up, or in a billing retry, until
//     period_end plus a grace window), else 'free'. A grant is an entitlement
//     with source 'grant' and an optional end.
//   - requireFeature: a 402 with a kind "comes with Plus/Pro" message and
//     { upgrade: { feature, requiredTier, currentTier } } for the app's sheet.
//   - consumeAllowance: counts one use against a rolling window (coach
//     messages a day, regenerations a week, mock exams a month, a Free
//     learner's graded typed answers a day); at the limit a 429 that says
//     when the next one opens, with { allowance: {...resetsAt} }. Count and
//     record are one step under a lock, so parallel requests can't overrun.
//   - requireAiAllowance: the tier's monthly AI cap (calendar month, UTC),
//     from ai_calls. Only coach chat and lesson regenerate call it; grading
//     and review never stop.
//   - requireCourseAccess: Free studies one course. The first course a Free
//     learner opens becomes it; they can switch (lib: chooseFreeCourse).

// Hours past period_end that a paid entitlement still counts, in case a
// renewal's webhook arrives late. An EXPIRATION, refund or deletion event
// ends access at once regardless.
const GRACE_HOURS = 24;

export class UpgradeRequiredError extends UserFacingError {
  constructor(message: string, readonly feature: Feature, readonly requiredTier: PaidTier, currentTier: Tier, extra: Record<string, unknown> = {}) {
    super(message, 402, { upgrade: { feature, requiredTier, currentTier }, ...extra });
    this.name = "UpgradeRequiredError";
  }
}

export class AllowanceReachedError extends UserFacingError {
  constructor(message: string, info: AllowanceStatus) {
    super(message, 429, { allowance: info });
    this.name = "AllowanceReachedError";
  }
}

export class AiAllowancePausedError extends UserFacingError {
  constructor(message: string, resetsAt: string) {
    super(message, 429, { aiPaused: { resetsAt } });
    this.name = "AiAllowancePausedError";
  }
}

// ---------------------------------------------------------------------------
// Tier
// ---------------------------------------------------------------------------

export interface EntitlementRow {
  id: string;
  external_id: string;
  tier: PaidTier;
  source: "revenuecat" | "stripe" | "grant";
  product_id: string | null;
  plan: string | null;
  status: string;
  period_end: string | null;
  store: string | null;
  customer_ref: string | null;
}

const GIVES_ACCESS = `status in ('active', 'canceled', 'billing_issue')
       and (period_end is null or period_end + make_interval(hours => ${GRACE_HOURS}) > now())`;

// The entitlement that sets this learner's tier (highest tier, then latest end).
export async function currentEntitlement(userId: string): Promise<EntitlementRow | null> {
  return queryOne<EntitlementRow>(
    `select id, external_id, tier, source, product_id, plan, status, period_end, store, customer_ref
       from entitlements
      where user_id = $1 and ${GIVES_ACCESS}
      order by case tier when 'pro' then 2 else 1 end desc, period_end desc nulls first
      limit 1`,
    [userId]
  );
}

export async function tierFor(userId: string, env: NodeJS.ProcessEnv = process.env): Promise<Tier> {
  if (!billingEnabled(env)) return "pro";
  const row = await currentEntitlement(userId);
  return row && isTier(row.tier) ? row.tier : "free";
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

// Nick, 2026-11-07 (decision 6): an attempt already in progress when the
// paid period ends may be finished. A mock exam session is never gated after
// it starts; a lab run is finished through its open run (lib/lab-routes.ts);
// a PBQ is on screen with no server record of it, so its ANSWER (not a new
// scenario) is accepted for this long after the plan that had the feature
// stopped giving access -- for a period that ended, not for a refund or a
// revocation.
export const FINISH_IN_PROGRESS_HOURS = 24;

export async function hadFeatureRecently(userId: string, feature: Feature, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  if (!billingEnabled(env)) return true;
  const tiers = (["plus", "pro"] as const).filter((t) => tierHas(t, feature));
  const row = await queryOne(
    `select 1 from entitlements
      where user_id = $1 and tier = any($2::text[]) and status in ('active', 'canceled', 'billing_issue', 'expired')
        and period_end is not null
        -- when access ended: an expiry ends it when it was applied, anything
        -- else at the period end plus the grace window
        and (case when status = 'expired' then least(period_end, updated_at)
                  else period_end + make_interval(hours => ${GRACE_HOURS}) end)
            + make_interval(hours => ${FINISH_IN_PROGRESS_HOURS}) > now()
      limit 1`,
    [userId, tiers]
  );
  return row !== null;
}

// requireFeature for finishing something already on screen: also passes
// within FINISH_IN_PROGRESS_HOURS of the period that had it ending.
export async function requireFeatureToFinish(userId: string, feature: Feature, env: NodeJS.ProcessEnv = process.env): Promise<Tier> {
  if (!billingEnabled(env)) return "pro";
  const tier = await tierFor(userId, env);
  if (tierHas(tier, feature) || (await hadFeatureRecently(userId, feature, env))) return tier;
  throw new UpgradeRequiredError(upgradeMessage(feature), feature, FEATURES[feature].minTier, tier);
}

export function upgradeMessage(feature: Feature): string {
  const f = FEATURES[feature];
  const tierName = TIER_COPY[f.minTier].name;
  return `${f.label} comes with ${tierName}. Everything you've done so far is kept, and your lessons, practice and review keep working.`;
}

export async function hasFeature(userId: string, feature: Feature, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  if (!billingEnabled(env)) return true;
  return tierHas(await tierFor(userId, env), feature);
}

// For read-only screens (a lesson's lab card, the unit check status): null
// when allowed, else what the app needs to say so gently instead of
// erroring. No database read with the switch off.
export async function featureLock(
  userId: string,
  feature: Feature,
  env: NodeJS.ProcessEnv = process.env
): Promise<{ feature: Feature; requiredTier: PaidTier; message: string } | null> {
  if (await hasFeature(userId, feature, env)) return null;
  return { feature, requiredTier: FEATURES[feature].minTier, message: upgradeMessage(feature) };
}

// Throws UpgradeRequiredError (402) when the learner's tier lacks the
// feature; returns the tier otherwise.
export async function requireFeature(userId: string, feature: Feature, env: NodeJS.ProcessEnv = process.env): Promise<Tier> {
  if (!billingEnabled(env)) return "pro";
  const tier = await tierFor(userId, env);
  if (!tierHas(tier, feature)) {
    throw new UpgradeRequiredError(upgradeMessage(feature), feature, FEATURES[feature].minTier, tier);
  }
  return tier;
}

// ---------------------------------------------------------------------------
// Allowances
// ---------------------------------------------------------------------------

export interface AllowanceStatus {
  kind: AllowanceKind;
  window: "day" | "week" | "month";
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string | null; // when the next use opens, when at the limit
}

const KIND_FEATURE: Record<AllowanceKind, Feature> = {
  coach_message: "coach",
  regeneration: "regenerate",
  mock_exam: "mock_exam",
  graded_answer: "ai_grading",
};

// "in about 3 hours", "in 2 days" -- relative, so no time zone is assumed.
export function whenPhrase(resetsAt: Date, now = new Date()): string {
  const secs = Math.max(0, (resetsAt.getTime() - now.getTime()) / 1000);
  if (secs < 15 * 60) return "in a few minutes";
  if (secs < 90 * 60) return "in about an hour";
  const hours = Math.round(secs / 3600);
  if (hours < 36) return `in about ${hours} hours`;
  const days = Math.round(secs / 86400);
  return `in ${days} days`;
}

export function allowanceMessage(kind: AllowanceKind, limit: number, resetsAt: Date, tier: Tier, now = new Date()): string {
  const when = whenPhrase(resetsAt, now);
  switch (kind) {
    case "coach_message":
      return `You've used today's ${limit} coach messages. More open up ${when}. Lessons, practice, grading and review all keep working in the meantime.`;
    case "regeneration":
      return `You've made this week's ${limit} new lesson versions. Another opens up ${when}. The lesson you have still works, and so does everything else.`;
    case "mock_exam":
      return (
        `You've taken this month's ${limit === 1 ? "mock exam" : `${limit} mock exams`}. The next one opens ${when}. ` +
        (tier === "plus" ? "Sprints and review keep working, and Pro has unlimited mock exams." : "Sprints and review keep working.")
      );
    case "graded_answer":
      return (
        `You've used today's ${limit} graded typed answers. More open up ${when}. ` +
        "You can keep going with the multiple-choice checks, and Plus grades every typed answer."
      );
  }
}

async function countUses(
  run: (sql: string, params: unknown[]) => Promise<Array<Record<string, unknown>>>,
  userId: string,
  kind: AllowanceKind,
  limit: number | null
): Promise<{ used: number; resetsAt: string | null }> {
  const windowSecs = WINDOW_SECONDS[ALLOWANCE_DEFAULTS[kind].window];
  const rows = await run(
    `select count(*)::int as used,
            -- the use whose expiry opens the next slot when at the limit
            (select used_at + make_interval(secs => $3)
               from allowance_uses
              where user_id = $1 and kind = $2 and used_at > now() - make_interval(secs => $3)
              order by used_at asc
              offset greatest(0, (select count(*) from allowance_uses
                                   where user_id = $1 and kind = $2 and used_at > now() - make_interval(secs => $3)) - $4)
              limit 1) as resets_at
       from allowance_uses
      where user_id = $1 and kind = $2 and used_at > now() - make_interval(secs => $3)`,
    [userId, kind, windowSecs, limit ?? 0]
  );
  const r = rows[0] ?? {};
  const resets = r.resets_at instanceof Date ? r.resets_at.toISOString() : (r.resets_at as string | null) ?? null;
  return { used: Number(r.used ?? 0), resetsAt: resets };
}

export async function allowanceStatus(
  userId: string,
  kind: AllowanceKind,
  tier?: Tier,
  env: NodeJS.ProcessEnv = process.env
): Promise<AllowanceStatus> {
  const window = ALLOWANCE_DEFAULTS[kind].window;
  if (!billingEnabled(env)) return { kind, window, limit: null, used: 0, remaining: null, resetsAt: null };
  const t = tier ?? (await tierFor(userId, env));
  const limit = allowanceLimit(kind, t, env);
  const { used, resetsAt } = await countUses((sql, p) => query(sql, p), userId, kind, limit);
  return {
    kind,
    window,
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    resetsAt: limit !== null && used >= limit ? resetsAt : null,
  };
}

export interface AllowanceUse {
  // Gives the use back (the action failed before the learner got anything).
  release(): Promise<void>;
}

const NO_USE: AllowanceUse = { release: async () => {} };

// Counts one use, or throws: UpgradeRequiredError when the tier's limit is 0
// (not included), AllowanceReachedError at the limit. No count is kept when
// the switch is off or the tier has no count limit.
export async function consumeAllowance(
  userId: string,
  kind: AllowanceKind,
  tier?: Tier,
  env: NodeJS.ProcessEnv = process.env
): Promise<AllowanceUse> {
  if (!billingEnabled(env)) return NO_USE;
  const t = tier ?? (await tierFor(userId, env));
  const limit = allowanceLimit(kind, t, env);
  if (limit === null) return NO_USE;
  if (limit === 0) {
    const feature = KIND_FEATURE[kind];
    throw new UpgradeRequiredError(upgradeMessage(feature), feature, FEATURES[feature].minTier, t);
  }
  const id = await withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`allowance:${kind}:${userId}`]);
    const { used, resetsAt } = await countUses(async (sql, p) => (await tx.query(sql, p)) as Array<Record<string, unknown>>, userId, kind, limit);
    if (used >= limit) {
      const at = resetsAt ?? new Date(Date.now() + WINDOW_SECONDS[ALLOWANCE_DEFAULTS[kind].window] * 1000).toISOString();
      throw new AllowanceReachedError(allowanceMessage(kind, limit, new Date(at), t), {
        kind,
        window: ALLOWANCE_DEFAULTS[kind].window,
        limit,
        used,
        remaining: 0,
        resetsAt: at,
      });
    }
    const row = await tx.queryOne<{ id: string }>(`insert into allowance_uses (user_id, kind) values ($1, $2) returning id`, [userId, kind]);
    return row!.id;
  });
  return {
    release: async () => {
      await query(`delete from allowance_uses where id = $1`, [id]).catch(() => {});
    },
  };
}

// Runs fn with one use counted, giving the use back if fn throws.
export async function withAllowance<T>(
  userId: string,
  kind: AllowanceKind,
  fn: () => Promise<T>,
  tier?: Tier,
  env: NodeJS.ProcessEnv = process.env
): Promise<T> {
  const use = await consumeAllowance(userId, kind, tier, env);
  try {
    return await fn();
  } catch (err) {
    await use.release();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Monthly AI cap
// ---------------------------------------------------------------------------

export function monthStartUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
export function nextMonthStartUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function aiPausedMessage(resetsAt: Date): string {
  const day = resetsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  return (
    `You've used this month's AI coaching. The coach and new lesson versions open again on ${day}. ` +
    "Grading, practice and review keep working as usual, so this is a good time to answer questions on your own."
  );
}

export async function aiAllowanceStatus(
  userId: string,
  tier?: Tier,
  env: NodeJS.ProcessEnv = process.env
): Promise<{ paused: boolean; resetsAt: string | null }> {
  if (!billingEnabled(env)) return { paused: false, resetsAt: null };
  const t = tier ?? (await tierFor(userId, env));
  const cap = monthlyAiCapUsd(t, env);
  if (cap === null) return { paused: false, resetsAt: null };
  const spent = await spendSinceUsd(userId, monthStartUtc()).catch(() => 0);
  return spent >= cap ? { paused: true, resetsAt: nextMonthStartUtc().toISOString() } : { paused: false, resetsAt: null };
}

// Coach chat and lesson regenerate only. Grading and review never call this.
export async function requireAiAllowance(userId: string, tier?: Tier, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const s = await aiAllowanceStatus(userId, tier, env);
  if (s.paused) throw new AiAllowancePausedError(aiPausedMessage(new Date(s.resetsAt!)), s.resetsAt!);
}

// ---------------------------------------------------------------------------
// Free course
// ---------------------------------------------------------------------------

export interface FreeCourse {
  trackId: string;
  title: string;
  chosenBy: "auto" | "learner";
  chosenAt: string;
  canSwitchAt: string | null; // null = can switch now
}

export async function freeCourseFor(userId: string, env: NodeJS.ProcessEnv = process.env): Promise<FreeCourse | null> {
  const row = await queryOne<{ track_id: string; title: string; chosen_by: "auto" | "learner"; chosen_at: Date }>(
    `select c.track_id, st.title, c.chosen_by, c.chosen_at
       from free_course_choice c join subject_tracks st on st.id = c.track_id
      where c.user_id = $1`,
    [userId]
  );
  if (!row) return null;
  const chosenAt = new Date(row.chosen_at);
  const next = new Date(chosenAt.getTime() + freeCourseSwitchDays(env) * 86400_000);
  const canSwitchAt = row.chosen_by === "auto" || next.getTime() <= Date.now() ? null : next.toISOString();
  return { trackId: row.track_id, title: row.title, chosenBy: row.chosen_by, chosenAt: chosenAt.toISOString(), canSwitchAt };
}

function courseLockedError(tier: Tier, free: FreeCourse): UpgradeRequiredError {
  return new UpgradeRequiredError(
    `Free includes one course at a time, and yours is ${free.title}. You can switch your free course in Settings` +
      (free.canSwitchAt ? " once a week" : "") +
      ", or study every course with Plus.",
    "all_courses",
    "plus",
    tier,
    { freeCourse: free }
  );
}

// Free learners study one course: the first one they open becomes theirs.
export async function requireCourseAccess(userId: string, trackId: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (!billingEnabled(env)) return;
  const tier = await tierFor(userId, env);
  if (tierHas(tier, "all_courses")) return;
  let free = await freeCourseFor(userId, env);
  if (!free) {
    await query(
      `insert into free_course_choice (user_id, track_id, chosen_by) values ($1, $2, 'auto') on conflict (user_id) do nothing`,
      [userId, trackId]
    );
    free = await freeCourseFor(userId, env);
  }
  if (free && free.trackId !== trackId.toLowerCase()) throw courseLockedError(tier, free);
}

export async function requireCourseAccessForObjective(userId: string, objectiveId: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (!billingEnabled(env)) return;
  const row = await queryOne<{ track_id: string }>(
    `select cu.track_id from objectives o join course_units cu on cu.id = o.unit_id where o.id = $1`,
    [objectiveId]
  );
  if (row) await requireCourseAccess(userId, row.track_id, env);
}

export class FreeCourseSwitchError extends UserFacingError {
  constructor(free: FreeCourse) {
    const day = new Date(free.canSwitchAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
    super(`You switched your free course recently. You can switch again on ${day}, or study every course with Plus.`, 409, {
      freeCourse: free,
    });
    this.name = "FreeCourseSwitchError";
  }
}

// The learner picks their free course. An automatic choice can be switched
// at once; a chosen one after BILLING_FREE_COURSE_SWITCH_DAYS (7).
export async function chooseFreeCourse(userId: string, trackId: string, env: NodeJS.ProcessEnv = process.env): Promise<FreeCourse> {
  return withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`free-course:${userId}`]);
    const current = await freeCourseFor(userId, env);
    if (current && current.trackId === trackId) {
      if (current.chosenBy === "auto") {
        await tx.query(`update free_course_choice set chosen_by = 'learner' where user_id = $1`, [userId]);
      }
    } else {
      if (current && current.canSwitchAt) throw new FreeCourseSwitchError(current);
      await tx.query(
        `insert into free_course_choice (user_id, track_id, chosen_by, chosen_at) values ($1, $2, 'learner', now())
         on conflict (user_id) do update set track_id = excluded.track_id, chosen_by = 'learner', chosen_at = now()`,
        [userId, trackId]
      );
    }
    const t = await tx.queryOne<{ title: string }>(`select title from subject_tracks where id = $1`, [trackId]);
    const next = new Date(Date.now() + freeCourseSwitchDays(env) * 86400_000).toISOString();
    return {
      trackId,
      title: t?.title ?? "",
      chosenBy: "learner" as const,
      chosenAt: new Date().toISOString(),
      canSwitchAt: current && current.trackId === trackId && current.chosenBy === "learner" ? current.canSwitchAt : next,
    };
  });
}

// ---------------------------------------------------------------------------
// Grants (comps). Policy is Nick's; this is only the mechanism.
// ---------------------------------------------------------------------------

export async function grantEntitlement(opts: { userId: string; tier: PaidTier; until?: Date | null; note?: string | null }): Promise<string> {
  const externalId = `grant:${randomUUID()}`;
  const row = await queryOne<{ id: string }>(
    `insert into entitlements (user_id, tier, source, external_id, status, period_end, note, last_event_at)
     values ($1, $2, 'grant', $3, 'active', $4, $5, now()) returning id`,
    [opts.userId, opts.tier, externalId, opts.until ?? null, opts.note ?? null]
  );
  await query(
    `insert into billing_events (provider, event_id, event_type, user_id, occurred_at, outcome, detail)
     values ('grant', $1, 'GRANT', $2, now(), 'applied', $3)`,
    [externalId, opts.userId, JSON.stringify({ tier: opts.tier, until: opts.until?.toISOString() ?? null })]
  );
  return row!.id;
}

export async function revokeGrants(userId: string): Promise<number> {
  const rows = await query(
    `update entitlements set status = 'revoked', updated_at = now()
      where user_id = $1 and source = 'grant' and status = 'active' returning id`,
    [userId]
  );
  if (rows.length) {
    await query(
      `insert into billing_events (provider, event_id, event_type, user_id, occurred_at, outcome)
       values ('grant', $1, 'REVOKE', $2, now(), 'applied')`,
      [`revoke:${randomUUID()}`, userId]
    );
  }
  return rows.length;
}

// ---------------------------------------------------------------------------
// GET /api/billing/me
// ---------------------------------------------------------------------------

export async function billingSummary(userId: string, env: NodeJS.ProcessEnv = process.env) {
  if (!billingEnabled(env)) return { enabled: false, tier: "pro" as Tier };
  const ent = await currentEntitlement(userId);
  const tier: Tier = ent && isTier(ent.tier) ? ent.tier : "free";
  // Decision 6: the plan shown may be a paid period kept after a downgrade;
  // say what comes after it, and whether the subscription itself renews.
  let next: { tier: Tier; from: string } | null = null;
  let renews = ent ? ent.status === "active" && ent.source !== "grant" : false;
  if (ent && ent.external_id.startsWith("held:") && ent.period_end) {
    const main = await queryOne<{ tier: PaidTier; status: string }>(
      `select tier, status from entitlements where source = $1 and external_id = $2`,
      [ent.source, ent.external_id.slice("held:".length)]
    );
    const after = main && ["active", "canceled", "billing_issue"].includes(main.status) ? main.tier : "free";
    next = { tier: after, from: new Date(ent.period_end).toISOString() };
    renews = main?.status === "active";
  }
  const manage =
    !ent ? null : ent.source === "stripe" ? "stripe" : ent.source === "grant" ? "grant" : ent.store === "PLAY_STORE" ? "play_store" : ent.store === "APP_STORE" || ent.store === "MAC_APP_STORE" ? "app_store" : "store";
  const allowances: AllowanceStatus[] = [];
  for (const kind of ALLOWANCE_KINDS) {
    const limit = allowanceLimit(kind, tier, env);
    if (limit === 0) continue;
    allowances.push(await allowanceStatus(userId, kind, tier, env));
  }
  return {
    enabled: true,
    tier,
    entitlement: ent
      ? {
          source: ent.source,
          status: ent.status,
          plan: ent.plan,
          productId: ent.product_id,
          periodEnd: ent.period_end ? new Date(ent.period_end).toISOString() : null,
          willRenew: renews,
          manage,
          // REQ-124: { tier, from } when this plan was kept to the end of its
          // paid period after a downgrade: what applies from then.
          next,
        }
      : null,
    freeCourse: tier === "free" ? await freeCourseFor(userId, env) : null,
    allowances,
    aiPaused: await aiAllowanceStatus(userId, tier, env),
  };
}
