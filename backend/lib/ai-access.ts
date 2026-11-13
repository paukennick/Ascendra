import { queryOne } from "@/lib/db";
import { UserFacingError } from "@/lib/http";
import { accessFor } from "@/lib/account-access";
import { globalSpendSinceUsd } from "@/lib/ai-budget";
import { allowanceLimit, billingEnabled } from "@/lib/billing-config";
import { recordCountedUse, whenPhrase, GIVES_ACCESS, type AllowanceUse } from "@/lib/entitlements";
import {
  CEILING_CACHE_MS,
  CEILING_FRESH_FRACTION,
  COACH_PREVIEW_MESSAGE,
  GLOBAL_PAUSE_MESSAGE,
  LESSON_PREPARING_MESSAGE,
  REGENERATE_PREVIEW_MESSAGE,
  aiAccessMode,
  aiLimited,
  ceilingVerdict,
  coachLimitMessage,
  globalDailyCeilingUsd,
  gradedPreviewMessage,
  nextUtcDayStart,
  pilotCoachMessagesPerDay,
  pilotGradedAnswersPerDay,
  utcDayStart,
  type AiAccessBody,
  type AiAccessMode,
  type AiFeature,
  type AiUserKind,
} from "@/lib/ai-access-config";

// REQ-201: AI access modes and the global daily AI ceiling -- the database
// side. The rules and words are in lib/ai-access-config.ts.
//
// Every check here returns at once, without a database read, in the default
// configuration (AI_ACCESS_MODE unset = all, no AI_GLOBAL_DAILY_CEILING_USD),
// so with neither set every route behaves exactly as before REQ-201.

type Env = NodeJS.ProcessEnv;

export class AiAccessError extends UserFacingError {
  constructor(message: string, status: number, readonly body: AiAccessBody) {
    super(message, status, { aiAccess: body });
    this.name = "AiAccessError";
  }
}

// ---------------------------------------------------------------------------
// Who the learner is
// ---------------------------------------------------------------------------

// REQ-219 (FAIL-1118): the paid-access rule is lib/entitlements.ts's (status and
// the grace hours after a period ends). It was copied here with the grace
// hard-coded as 24, so changing the grace in one place left "paying" in
// paid AI mode disagreeing with the learner's actual tier.
export async function aiUserKind(userId: string, env: Env = process.env): Promise<AiUserKind> {
  const access = await accessFor(userId, env).catch(() => null);
  if (access?.level === "owner") return "owner";
  if (access) return "granted";
  if (aiAccessMode(env) === "paid") {
    const row = await queryOne(`select 1 from entitlements where user_id = $1 and ${GIVES_ACCESS} limit 1`, [userId]).catch(() => null);
    if (row) return "paying";
  }
  return "ordinary";
}

// Whether this learner gets the Free AI experience under the current mode.
// No database read in `all` mode, or in `paid` mode with billing on.
export async function aiLimitedFor(userId: string, env: Env = process.env): Promise<boolean> {
  const mode = aiAccessMode(env);
  const billingOn = billingEnabled(env);
  // Decided without knowing who the learner is?
  if (!aiLimited(mode, "ordinary", billingOn)) return false;
  return aiLimited(mode, await aiUserKind(userId, env), billingOn);
}

// ---------------------------------------------------------------------------
// The mode
// ---------------------------------------------------------------------------

// Coach chat and lesson regenerate: a 403 with the limited-preview message
// when the mode gives this learner the Free AI experience. REQ-246: the coach
// is let through when AI_PILOT_COACH_MESSAGES_PER_DAY is above 0 (it is then
// counted by consumeCoachMessage below). No database read for the coach in
// that case, nor in the default configuration.
export async function requireAiFeature(userId: string, feature: "coach" | "regenerate", env: Env = process.env): Promise<void> {
  if (feature === "coach" && pilotCoachMessagesPerDay(env) > 0) return;
  if (!(await aiLimitedFor(userId, env))) return;
  throw new AiAccessError(feature === "coach" ? COACH_PREVIEW_MESSAGE : REGENERATE_PREVIEW_MESSAGE, 403, {
    state: "limited_preview",
    feature,
    mode: aiAccessMode(env),
    resetsAt: null,
  });
}

const NO_USE: AllowanceUse = { release: async () => {} };

// REQ-216 (low): a counted use is given back on EVERY path that stores no
// graded answer (the grader throws, the write fails, a copy of the same answer
// was stored first), and never twice. `release` of the use itself is not
// idempotent: two give-backs would hand the learner a free answer.
export function releaseOnce(use: AllowanceUse): AllowanceUse {
  let given = false;
  return {
    release: async () => {
      if (given) return;
      given = true;
      await use.release();
    },
  };
}

// REQ-246: one coach message. When the mode gives this learner the Free AI
// experience and AI_PILOT_COACH_MESSAGES_PER_DAY is above 0, it is counted per
// rolling day in allowance_uses (kind coach_message, the plans' rows), with a
// 429 { aiAccess: coach_limit } at the limit and no upsell; the plan count does
// not ALSO run, so one message is never counted twice. Otherwise `billing`
// runs: the plan count (REQ-122) exactly as before, a no-op with billing off.
// The caller gives the use back on every path that saves no reply.
export async function consumeCoachMessage(
  userId: string,
  billing: () => Promise<AllowanceUse>,
  env: Env = process.env
): Promise<AllowanceUse> {
  const limit = pilotCoachMessagesPerDay(env);
  if (limit > 0 && (await aiLimitedFor(userId, env))) {
    const mode = aiAccessMode(env);
    return recordCountedUse(userId, "coach_message", limit, (used, resetsAt) =>
      new AiAccessError(coachLimitMessage(limit, whenPhrase(new Date(resetsAt))), 429, {
        state: "coach_limit",
        feature: "coach",
        mode,
        resetsAt,
        limit,
        used,
      })
    );
  }
  return billing();
}

// An AI-graded written answer (grade_open, explain-back, lab written parts,
// sim reasoning, PBQ, unit check). When the mode gives this learner the Free
// AI experience it is counted against AI_PILOT_GRADED_ANSWERS_PER_DAY
// (REQ-246) when set, else Free's daily graded-answer allowance
// (BILLING_ALLOWANCE_GRADED_ANSWER_FREE, 3), with a 429 { aiAccess:
// graded_limit } at the limit and no upsell. Otherwise `billing` runs: the
// route's own plan count (REQ-122) exactly as before, or nothing (null) for a
// route the plans never counted. Grading is never refused for any other
// reason here, and never by the global ceiling.
export async function consumeGradedAnswer(
  userId: string,
  billing: (() => Promise<AllowanceUse>) | null,
  env: Env = process.env
): Promise<AllowanceUse> {
  if (await aiLimitedFor(userId, env)) {
    // REQ-246: the pilot's own count first, so raising it never changes
    // Free's count once billing is on.
    const limit = pilotGradedAnswersPerDay(env) ?? allowanceLimit("graded_answer", "free", env);
    if (limit === null) return NO_USE; // the Free count was set to "none"
    const mode = aiAccessMode(env);
    return recordCountedUse(userId, "graded_answer", limit, (used, resetsAt) =>
      new AiAccessError(gradedPreviewMessage(limit, whenPhrase(new Date(resetsAt))), 429, {
        state: "graded_limit",
        feature: "written_grading",
        mode,
        resetsAt,
        limit,
        used,
      })
    );
  }
  return billing ? billing() : NO_USE;
}

// ---------------------------------------------------------------------------
// The global daily ceiling
// ---------------------------------------------------------------------------

let cache: { day: number; at: number; usd: number } | null = null;

// Tests only: forget the cached sum.
export function resetGlobalSpendCache(): void {
  cache = null;
}

// Model spend across every learner since midnight UTC, reused for up to
// CEILING_CACHE_MS per server instance. A failed read counts as no spend
// (the per-learner budget still stands).
// `freshAtOrAbove` (REQ-216): the cached sum is not reused once it is at or
// above this many dollars, so near the ceiling every check reads fresh.
export async function globalSpendTodayUsd(now = new Date(), freshAtOrAbove?: number): Promise<number> {
  const day = utcDayStart(now).getTime();
  if (cache && cache.day === day && now.getTime() - cache.at < CEILING_CACHE_MS && (freshAtOrAbove === undefined || cache.usd < freshAtOrAbove)) {
    return cache.usd;
  }
  const usd = await globalSpendSinceUsd(new Date(day)).catch(() => 0);
  cache = { day, at: now.getTime(), usd };
  return usd;
}

export async function globalCeilingReached(env: Env = process.env): Promise<boolean> {
  const ceiling = globalDailyCeilingUsd(env);
  if (ceiling === null) return false;
  return (await globalSpendTodayUsd(new Date(), ceiling * CEILING_FRESH_FRACTION)) >= ceiling;
}

async function ceilingUserKind(userId: string, env: Env): Promise<AiUserKind> {
  const access = await accessFor(userId, env).catch(() => null);
  return access?.level === "owner" ? "owner" : "ordinary";
}

// Coach chat and lesson regenerate: a 429 when the day's ceiling is reached,
// for everyone but owners. No database read when no ceiling is set.
export async function requireGlobalCeiling(userId: string, feature: "coach" | "regenerate", env: Env = process.env): Promise<void> {
  if (!(await globalCeilingReached(env))) return;
  if (ceilingVerdict(feature, await ceilingUserKind(userId, env), true) !== "paused") return;
  throw ceilingPausedError(feature, env);
}

// The 429 every paused answer carries (REQ-201), also thrown by the model-call
// layer's global ceiling check (lib/ai-spend-gate.ts, REQ-202).
export function ceilingPausedError(feature: "coach" | "regenerate", env: Env = process.env): AiAccessError {
  return new AiAccessError(GLOBAL_PAUSE_MESSAGE, 429, {
    state: "paused",
    feature,
    mode: aiAccessMode(env),
    resetsAt: nextUtcDayStart().toISOString(),
  });
}

// First generation of a shared lesson nobody has opened yet: "being
// prepared" at the ceiling (a 429, which the app shows in the server's own
// words; a 5xx would be replaced by a generic message).
export async function requireSharedLessonRoom(userId: string, env: Env = process.env): Promise<void> {
  if (!(await globalCeilingReached(env))) return;
  if (ceilingVerdict("shared_lesson", await ceilingUserKind(userId, env), true) !== "preparing") return;
  throw new AiAccessError(LESSON_PREPARING_MESSAGE, 429, {
    state: "preparing",
    feature: "shared_lesson",
    mode: aiAccessMode(env),
    resetsAt: nextUtcDayStart().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

// What the app needs to show a gated feature before the learner tries it.
// null in the default configuration (no field is added to the response).
// REQ-246: `coachPerDay` is the pilot's daily coach count for a limited
// learner when it is above 0 (the coach box shows), otherwise null.
export async function aiAccessSummary(
  userId: string,
  env: Env = process.env
): Promise<{ mode: AiAccessMode; full: boolean; coachPerDay: number | null } | null> {
  const mode = aiAccessMode(env);
  if (mode === "all") return null;
  const full = !(await aiLimitedFor(userId, env));
  const pilot = pilotCoachMessagesPerDay(env);
  return { mode, full, coachPerDay: !full && pilot > 0 ? pilot : null };
}

export type { AiFeature };
