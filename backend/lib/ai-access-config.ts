// REQ-201: AI access modes -- the pure parts (no database), so every
// mode x user x feature decision runs under `npm test`. The database side
// (who the learner is, counting, the global spend) is lib/ai-access.ts.
//
// Nick, 2026-11-09 ("Go with C right now"): everyone gets the core
// experience, invited pilot users get full AI, and later AI becomes
// paid-only once billing is on.
//
// AI_ACCESS_MODE (read per call, so it is switched in Vercel without new code):
//   all      (unset or empty) -- exactly the behaviour before REQ-201: the
//            billing gates decide (with BILLING_ENABLED off, everyone is Pro
//            for AI; the $0.50 daily budget is the only limit).
//   granted  -- full AI only for owners (OWNER_EMAILS) and owner-granted
//            accounts (account_access, Settings > Access). Everyone else gets
//            the Free AI experience while every course and non-AI feature
//            stays open: no coach chat, no lesson regenerate, and AI-graded
//            written answers count against Free's daily graded-answer
//            allowance (3). Rule-graded work and review are never counted.
//   paid     -- AI follows the billing tiers (REQ-122 / REQ-170). With
//            BILLING_ENABLED on this adds nothing to the billing gates. With
//            it off, an owner, a granted account or a learner holding a live
//            paid entitlement (a comp) gets full AI, and everyone else the
//            same Free AI experience as `granted`.
// It is independent of BILLING_ENABLED. An unrecognised value is treated as
// `granted` (the mode that spends least without locking anyone out of
// courses) and reported by the env check, since a typo here is a spending
// control that silently did nothing.
//
// AI_GLOBAL_DAILY_CEILING_USD: total model spend across every learner (and
// shared generation) per UTC day, from ai_calls. Unset, empty, "off" or 0 =
// no ceiling. At the ceiling coach chat and lesson regenerate pause for
// everyone but owners, and a lesson nobody has opened yet answers "being
// prepared, try again later" instead of being generated. Grading, review
// and everything already generated keep working.

import { billingEnabled } from "./billing-config";

type Env = Record<string, string | undefined>;

export type AiAccessMode = "all" | "granted" | "paid";
export const AI_ACCESS_MODES: readonly AiAccessMode[] = ["all", "granted", "paid"];

export function rawAiAccessMode(env: Env = process.env): string {
  return (env.AI_ACCESS_MODE ?? "").trim().toLowerCase();
}

export function aiAccessModeIsValid(env: Env = process.env): boolean {
  const raw = rawAiAccessMode(env);
  return raw === "" || (AI_ACCESS_MODES as readonly string[]).includes(raw);
}

export function aiAccessMode(env: Env = process.env): AiAccessMode {
  const raw = rawAiAccessMode(env);
  if (raw === "") return "all";
  return (AI_ACCESS_MODES as readonly string[]).includes(raw) ? (raw as AiAccessMode) : "granted";
}

// Who the learner is, for AI: an owner, an account an owner granted access
// to, a learner holding a live paid entitlement, or anyone else.
export type AiUserKind = "owner" | "granted" | "paying" | "ordinary";

// The AI features the modes touch.
//   coach           -- coach chat (POST /api/chat)
//   regenerate      -- a new lesson version (POST /api/objectives/:id/lesson)
//   written_grading -- an AI-graded written answer: grade_open, explain-back,
//                      lab written parts, sim reasoning, PBQ, unit check
//   shared_lesson   -- first generation of a shared catalog lesson
export type AiFeature = "coach" | "regenerate" | "written_grading" | "shared_lesson";
export const AI_FEATURES: readonly AiFeature[] = ["coach", "regenerate", "written_grading", "shared_lesson"];

// What the mode does to one feature for one learner:
//   billing  -- unchanged: the billing gates (REQ-122) decide, as before
//   blocked  -- refused with the limited-preview message (403)
//   counted  -- allowed, counted against Free's daily graded-answer allowance
//   open     -- allowed, never counted by the mode
export type AiVerdict = "billing" | "blocked" | "counted" | "open";

// Whether the mode gives this learner the Free AI experience.
export function aiLimited(mode: AiAccessMode, user: AiUserKind, billingOn: boolean): boolean {
  if (mode === "all") return false;
  if (user === "owner" || user === "granted") return false;
  if (mode === "granted") return true;
  // paid: billing on -> the billing tiers decide; off -> paid-only
  if (billingOn) return false;
  return user !== "paying";
}

export function aiVerdict(mode: AiAccessMode, user: AiUserKind, feature: AiFeature, billingOn: boolean): AiVerdict {
  if (!aiLimited(mode, user, billingOn)) return "billing";
  switch (feature) {
    case "coach":
    case "regenerate":
      return "blocked";
    case "written_grading":
      return "counted";
    case "shared_lesson":
      return "open";
  }
}

// ---------------------------------------------------------------------------
// The global daily ceiling
// ---------------------------------------------------------------------------

export function globalDailyCeilingUsd(env: Env = process.env): number | null {
  const raw = env.AI_GLOBAL_DAILY_CEILING_USD?.trim().toLowerCase();
  if (!raw || raw === "off") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function aiGlobalCeilingIsValid(env: Env = process.env): boolean {
  const raw = env.AI_GLOBAL_DAILY_CEILING_USD?.trim().toLowerCase();
  if (!raw || raw === "off") return true;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0;
}

// What the ceiling does to one feature for one learner when it is reached.
//   paused    -- coach and regenerate, for everyone but owners
//   preparing -- first generation of a shared lesson, for everyone but owners
//   open      -- grading and review never stop
export type CeilingVerdict = "paused" | "preparing" | "open";

export function ceilingVerdict(feature: AiFeature, user: AiUserKind, reached: boolean): CeilingVerdict {
  if (!reached || user === "owner") return "open";
  if (feature === "coach" || feature === "regenerate") return "paused";
  if (feature === "shared_lesson") return "preparing";
  return "open";
}

export function utcDayStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
export function nextUtcDayStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

// How long the summed spend is reused before it is read again.
export const CEILING_CACHE_MS = 60_000;

// ---------------------------------------------------------------------------
// Words (no upsell or pricing: billing is off while these show)
// ---------------------------------------------------------------------------

export const COACH_PREVIEW_MESSAGE =
  "The AI coach is in limited preview, open to invited pilot learners for now. Your lessons, practice, " +
  "review and every course keep working as usual.";

export const REGENERATE_PREVIEW_MESSAGE =
  "New lesson versions are in limited preview, open to invited pilot learners for now. The lesson you have " +
  "still works, and so does everything else.";

export function gradedPreviewMessage(limit: number, when: string): string {
  return (
    `AI grading for typed answers is in limited preview: ${limit} a day for now, and you've used today's. ` +
    `More open up ${when}. Multiple-choice checks, labs, review and every course keep working.`
  );
}

export const GLOBAL_PAUSE_MESSAGE =
  "The AI coach and new lesson versions are paused for today while we keep AI use within its daily limit. " +
  "They come back after midnight UTC. Lessons, practice, grading and review keep working.";

export const LESSON_PREPARING_MESSAGE =
  "This lesson is being prepared. Please try again later. Lessons you've already opened, practice, " +
  "grading and review keep working.";

// The structured part of a refusal, under `aiAccess`, so the app can show the
// right screen without parsing words.
export type AiAccessState = "limited_preview" | "graded_limit" | "paused" | "preparing";

export interface AiAccessBody {
  state: AiAccessState;
  feature: AiFeature;
  mode: AiAccessMode;
  resetsAt: string | null;
  limit?: number;
  used?: number;
}

// ---------------------------------------------------------------------------
// Settings worth a warning (GET /api/health warnings; never fatal)
// ---------------------------------------------------------------------------

export function aiAccessWarnings(env: Env = process.env): string[] {
  const out: string[] = [];
  if (!aiAccessModeIsValid(env)) {
    out.push(`AI_ACCESS_MODE "${rawAiAccessMode(env)}" is not all, granted or paid; treated as granted (AI for owners and invited pilot accounts only).`);
  }
  if (!aiGlobalCeilingIsValid(env)) {
    out.push("AI_GLOBAL_DAILY_CEILING_USD is not a dollar amount; no global AI ceiling is applied.");
  }
  if (billingEnabled(env) && aiAccessMode(env) === "granted") {
    out.push("AI_ACCESS_MODE is granted while BILLING_ENABLED is on: paying learners outside the pilot get the Free AI experience. Set AI_ACCESS_MODE=paid at launch.");
  }
  return out;
}
