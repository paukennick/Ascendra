// REQ-301 (mastery decay, step 1: shadow mode). On every review_log row,
// store what the proposed memory model (lib/memory-model.ts) predicted the
// learner's recall to be at the moment of the review, and the model state it
// used, beside the real outcome review_log already holds. Nothing decides
// anything from it: scheduling stays fixed_v1, readiness is unchanged, no
// learner sees a number. Step 2 compares the two (lib/decay-calibration.ts).
// Design: docs/mastery-decay-design.md, "Rollout".
//
// Three parts:
//   - predictShadow(): pure. The history of a learner's course before one
//     review in, the prediction out. The live write and the backfill both call
//     it, so a backfilled row and a live row are the same computation.
//   - recordShadowPrediction(): the live write, called by stepSchedule right
//     after it inserts the review_log row. It must NEVER fail the review:
//     everything runs in a savepoint with a short statement timeout, and any
//     failure (the migration not applied yet, a timeout, a bad row, a bug in
//     the model) rolls the savepoint back, logs one line and returns.
//   - shadowEnabled(): the switch (DECAY_SHADOW=off), for an operator who
//     needs the extra reads gone at once.
//
// What a prediction is: the model's probability that the learner recalls the
// objective on THIS review, from the state their earlier reviews of it left
// (stability, difficulty) and the memory clock k fitted on every earlier
// unaided review in the course (the review itself is never in its own fit).
// No exam date and no clinical flag enter: they change the schedule's target
// (priorFor), not the recall the model predicts.

import { createHash } from "node:crypto";
import { TX_STATEMENT_TIMEOUT_MS, type TxClient } from "@/lib/db";
import { describeError } from "@/lib/error-summary";
import type { CourseGoal, Level } from "@/lib/learner-level-rules";
import {
  ASSISTED_MAX_GROWTH,
  FIT_LEARNING_BELOW,
  FIT_STARTING_BELOW,
  FSRS6_DEFAULT_W,
  GOAL_PRIOR,
  K_GRID,
  LEVEL_K,
  PRIOR_LOG_SD,
  enrollState,
  fitPersonalScale,
  gradeFor,
  priorFor,
  recallAt,
  reviewState,
  type FitStage,
  type LoggedReview,
  type MemoryState,
  type Verdict,
} from "@/lib/memory-model";

// The label stored in review_log.model_version. Calibration compares
// predictions made by one parameter set, so a change to anything that moves a
// prediction (the FSRS weights, the goal and level priors, the help cap, the
// fit grid or its stage thresholds) must come with a new label.
// lib/decay-shadow.test.ts pins the fingerprint of those constants to this
// label and fails when they drift apart.
export const MEMORY_MODEL_VERSION = "fsrs6-k-v1";

export function modelFingerprint(): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        w: FSRS6_DEFAULT_W,
        goal: GOAL_PRIOR,
        level: LEVEL_K,
        sd: PRIOR_LOG_SD,
        help: ASSISTED_MAX_GROWTH,
        grid: [K_GRID.length, K_GRID[0], K_GRID[K_GRID.length - 1]],
        stages: [FIT_STARTING_BELOW, FIT_LEARNING_BELOW],
      })
    )
    .digest("hex")
    .slice(0, 12);
}

// DECAY_SHADOW (on unless off/0/false/no).
export function shadowEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env.DECAY_SHADOW ?? "").trim().toLowerCase();
  return !(v === "off" || v === "0" || v === "false" || v === "no");
}

// ---------------------------------------------------------------------------
// The pure part.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

export interface ShadowReview {
  objectiveId: string;
  atMs: number; // review_log.reviewed_at
  verdict: Verdict;
  assisted: boolean;
}

export interface ShadowInput {
  // Every EARLIER stepped review in the course, whatever objective, in any
  // order (the target review itself excluded).
  history: ShadowReview[];
  // review_schedule.enrolled_at per objective, in ms: the model's first
  // rating (Good). Needs the target's objective and every history objective.
  enrolledAtMs: ReadonlyMap<string, number>;
  target: { objectiveId: string; atMs: number };
  goal: CourseGoal | null; // null = the learner did not answer
  level: Level | null; // null = the default, Some background
}

export interface ShadowPrediction {
  predictedRecall: number;
  stability: number;
  difficulty: number;
  k: number;
  fitStage: FitStage;
  goal: CourseGoal | "none";
  level: Level;
}

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

// null when there is nothing to predict from: the target has no enrolment, or
// a number came out non-finite.
export function predictShadow(input: ShadowInput): ShadowPrediction | null {
  const { target } = input;
  if (!Number.isFinite(target.atMs)) return null;
  const targetEnrolled = input.enrolledAtMs.get(target.objectiveId);
  if (targetEnrolled === undefined || !Number.isFinite(targetEnrolled)) return null;

  const byObjective = new Map<string, ShadowReview[]>();
  for (const r of input.history) {
    if (!Number.isFinite(r.atMs)) continue;
    const list = byObjective.get(r.objectiveId);
    if (list) list.push(r);
    else byObjective.set(r.objectiveId, [r]);
  }
  for (const list of byObjective.values()) list.sort((a, b) => a.atMs - b.atMs);

  // The fit's input: an enrolment (Good) then each review, per objective. An
  // enrolment stamped after the first review (bad data) moves back to it.
  const log: LoggedReview[] = [];
  const enrollDay = (objectiveId: string, enrolledMs: number): number => {
    const first = byObjective.get(objectiveId)?.[0]?.atMs;
    return (first !== undefined ? Math.min(enrolledMs, first) : enrolledMs) / DAY_MS;
  };
  for (const [objectiveId, list] of byObjective) {
    const enrolled = input.enrolledAtMs.get(objectiveId);
    if (enrolled === undefined || !Number.isFinite(enrolled)) continue; // not scheduled: no model state
    log.push({ objectiveId, day: enrollDay(objectiveId, enrolled), kind: "enroll" });
    for (const r of list) {
      log.push({ objectiveId, day: r.atMs / DAY_MS, kind: "review", verdict: r.verdict, assisted: r.assisted });
    }
  }

  const prior = priorFor({ goal: input.goal, level: input.level, hasExamDate: false });
  const fit = fitPersonalScale(log, prior);

  // The target objective's state just before this review, at that k.
  let st: MemoryState = enrollState(3);
  let lastDay = enrollDay(target.objectiveId, targetEnrolled);
  for (const r of byObjective.get(target.objectiveId) ?? []) {
    const day = r.atMs / DAY_MS;
    st = reviewState(st, day - lastDay, gradeFor(r.verdict, r.assisted), fit.k, FSRS6_DEFAULT_W, r.assisted).next;
    lastDay = day;
  }
  const predicted = recallAt(st, target.atMs / DAY_MS - lastDay, fit.k);

  const out: ShadowPrediction = {
    predictedRecall: round6(Math.min(1, Math.max(0, predicted))),
    stability: round6(st.s),
    difficulty: round6(st.d),
    k: round6(fit.k),
    fitStage: fit.stage,
    goal: input.goal ?? "none",
    level: input.level ?? "some",
  };
  const nums = [out.predictedRecall, out.stability, out.difficulty, out.k];
  // The table's check: stability > 0, difficulty 1..10, k > 0.
  if (!nums.every(Number.isFinite) || out.stability <= 0 || out.difficulty < 1 || out.difficulty > 10 || out.k <= 0) return null;
  return out;
}

// ---------------------------------------------------------------------------
// The live write.
// ---------------------------------------------------------------------------

// Each shadow statement gets this long, then it is abandoned and the review
// goes on. The transaction's own limit (TX_STATEMENT_TIMEOUT_MS, lib/db.ts) is
// put back after it.
export const SHADOW_STATEMENT_TIMEOUT_MS = 2_000;
// A learner's course history this long is skipped, not truncated: a truncated
// history would be a wrong state, and the step 2 report is about right ones.
export const SHADOW_MAX_HISTORY_ROWS = 5_000;

export const SHADOW_COLUMNS_SQL = `predicted_recall = $2, model_stability = $3, model_difficulty = $4, model_k = $5,
       model_fit_stage = $6, model_goal = $7, model_level = $8, model_version = $9, model_source = $10`;

export interface ShadowRow {
  objective_id: string;
  reviewed_at: Date;
  verdict: Verdict;
  assisted: boolean;
  enrolled_at: Date;
}

// Reads that both the live write and the backfill make. The course of an
// objective, the learner's goal and level there, and (for the live write) the
// objective's enrolment. Retired objectives' old reviews are kept on purpose:
// they are real observations of this learner's memory, and nothing here
// shows them to anyone.
export const COURSE_PROFILE_SQL = `
select u.track_id, p.goal, p.level
  from objectives o
  join course_units u on u.id = o.unit_id
  left join learner_course_profiles p on p.user_id = $1 and p.track_id = u.track_id
 where o.id = $2`;

export const COURSE_HISTORY_SQL = `
select l.objective_id, l.reviewed_at, l.verdict::text as verdict, l.assisted, s.enrolled_at
  from review_log l
  join objectives o on o.id = l.objective_id
  join course_units u on u.id = o.unit_id and u.track_id = $2
  join review_schedule s on s.user_id = l.user_id and s.objective_id = l.objective_id
 where l.user_id = $1 and l.scheduler is not null and l.id <> $3
 order by l.reviewed_at, l.id
 limit $4`;

export function enrolledMap(rows: Array<{ objective_id: string; enrolled_at: Date }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.objective_id, new Date(r.enrolled_at).getTime());
  return m;
}

export function toShadowReview(r: ShadowRow): ShadowReview {
  return { objectiveId: r.objective_id, atMs: new Date(r.reviewed_at).getTime(), verdict: r.verdict, assisted: r.assisted };
}

function asGoal(v: unknown): CourseGoal | null {
  return typeof v === "string" && v in GOAL_PRIOR && v !== "none" ? (v as CourseGoal) : null;
}
function asLevel(v: unknown): Level | null {
  return v === "new" || v === "some" || v === "experienced" ? v : null;
}
export { asGoal, asLevel };

// Called inside the review's transaction, after the review_log row `logId`
// exists. Returns whether a prediction was stored. Never throws.
export async function recordShadowPrediction(
  tx: TxClient,
  a: { logId: string; userId: string; objectiveId: string; enrolledAt: Date; at: Date }
): Promise<boolean> {
  if (!shadowEnabled()) return false;
  const sp = "decay_shadow";
  let opened = false;
  try {
    await tx.query(`savepoint ${sp}`);
    opened = true;
    await tx.query(`select set_config('statement_timeout', $1, true)`, [`${SHADOW_STATEMENT_TIMEOUT_MS}ms`]);
    const stored = await storePrediction(tx, a);
    // Put the transaction's own limit back BEFORE releasing: a release keeps
    // a SET LOCAL made inside the savepoint, a rollback undoes it.
    await tx.query(`select set_config('statement_timeout', $1, true)`, [`${TX_STATEMENT_TIMEOUT_MS}ms`]);
    await tx.query(`release savepoint ${sp}`);
    return stored;
  } catch (err) {
    // The review stands. Rolling back to the savepoint also puts the
    // transaction's statement timeout back.
    if (opened) await tx.query(`rollback to savepoint ${sp}`).catch(() => undefined);
    // eslint-disable-next-line no-console
    console.warn(`[decay-shadow] prediction skipped: ${describeError(err)}`);
    return false;
  }
}

async function storePrediction(
  tx: TxClient,
  a: { logId: string; userId: string; objectiveId: string; enrolledAt: Date; at: Date }
): Promise<boolean> {
  const course = await tx.queryOne<{ track_id: string | null; goal: string | null; level: string | null }>(COURSE_PROFILE_SQL, [
    a.userId,
    a.objectiveId,
  ]);
  if (!course?.track_id) return false;
  const rows = await tx.query<ShadowRow>(COURSE_HISTORY_SQL, [a.userId, course.track_id, a.logId, SHADOW_MAX_HISTORY_ROWS + 1]);
  if (rows.length > SHADOW_MAX_HISTORY_ROWS) throw new Error(`course history over ${SHADOW_MAX_HISTORY_ROWS} reviews`);
  const enrolled = enrolledMap(rows);
  enrolled.set(a.objectiveId, new Date(a.enrolledAt).getTime());
  const p = predictShadow({
    history: rows.map(toShadowReview),
    enrolledAtMs: enrolled,
    target: { objectiveId: a.objectiveId, atMs: a.at.getTime() },
    goal: asGoal(course.goal),
    level: asLevel(course.level),
  });
  if (!p) return false;
  const done = await tx.query(`update review_log set ${SHADOW_COLUMNS_SQL} where id = $1 returning id`, [
    a.logId,
    p.predictedRecall,
    p.stability,
    p.difficulty,
    p.k,
    p.fitStage,
    p.goal,
    p.level,
    MEMORY_MODEL_VERSION,
    "live",
  ]);
  return done.length === 1;
}
