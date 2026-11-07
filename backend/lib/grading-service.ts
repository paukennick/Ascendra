import { queryOne, withTransaction, type TxClient } from "@/lib/db";
import { getLessonFor } from "@/lib/lesson-store";
import {
  accuracyFromAttempts,
  suggestStatus,
  statusToScore,
  toDateOnlyString,
} from "@/lib/mastery";

// classification is a model-generated freeform tag (see
// backend/lib/prompts.ts's grading prompts: "a short tag for the kind of
// gap, e.g. 'misconception', 'incomplete', 'off-scope', 'none'") -- a soft
// instruction, not a schema-enforced enum, so the model occasionally
// returns a full descriptive phrase instead of a short tag. Migration 021
// widened attempts.classification/error_log.classification from
// varchar(50) to text after that mismatch made grading fail outright with
// a raw "value too long for type character varying(50)" Postgres error
// shown straight to the learner (looked like "the submit button doesn't
// work"). Truncating here too, defensively: a schema fix alone still
// leaves this an unbounded value from a source we don't fully control.
export const CLASSIFICATION_MAX_LENGTH = 200;
export function clampClassification(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  return value.length > CLASSIFICATION_MAX_LENGTH ? value.slice(0, CLASSIFICATION_MAX_LENGTH) : value;
}

export interface AttemptInput {
  userId: string;
  unitId?: string | null;
  objectiveId?: string | null;
  pbqScenarioId?: string | null;
  kind: "lesson" | "quiz" | "pbq" | "unitcheck" | "lab";
  stage?: string | null;
  format: "mc" | "open" | "pbq";
  question: string;
  answer: string;
  verdict: "correct" | "partial" | "incorrect";
  feedback?: string | null;
  classification?: string | null;
  missedParts?: string[] | null;
  confidence?: number | null;
  // REQ-089: one id per submitted answer from the app. A second request
  // with the same id is a retry, not a new attempt (see findClientAttempt).
  clientAttemptId?: string | null;
}

// REQ-089: the stored attempt for an id the app has already submitted, in
// the shape /api/grade returns, or null if this id is new.
export async function findClientAttempt(userId: string, clientAttemptId: string) {
  const row = await queryOne<{
    id: string;
    verdict: "correct" | "partial" | "incorrect";
    feedback: string | null;
    classification: string | null;
    missed_parts: string[] | null;
  }>(
    `select * from attempts where user_id = $1 and client_attempt_id = $2`,
    [userId, clientAttemptId]
  );
  if (!row) return null;
  return {
    verdict: row.verdict,
    feedback: row.feedback ?? "",
    classification: row.classification ?? "none",
    missedParts: Array.isArray(row.missed_parts) ? row.missed_parts : [],
    attempt: row,
    replayed: true,
  };
}

// Postgres unique_violation: two requests with the same client id raced and
// the other one recorded first.
export function isDuplicateClientAttempt(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string } | null;
  return e?.code === "23505" && (e.constraint ?? "").includes("client_attempt");
}

// Records an attempt, or -- when its client id was already recorded, either
// earlier or by a request that raced this one past the first check -- hands
// back the stored result instead. Exactly one of `attempt` / `prior` is set.
// Shared by /api/grade and /api/pbq so both replay the same way.
export async function recordAttemptIdempotent(input: AttemptInput) {
  try {
    return { attempt: await recordAttemptAndUpdateMastery(input), prior: null };
  } catch (err) {
    if (input.clientAttemptId && isDuplicateClientAttempt(err)) {
      const prior = await findClientAttempt(input.userId, input.clientAttemptId);
      if (prior) return { attempt: null, prior };
    }
    throw err;
  }
}

// The correct choice for a lesson's Guided ("fade") or Solo ("solo") check,
// read from the cached lesson_content so /api/grade doesn't have to trust
// the index the client sends. null when no lesson is cached for the
// objective yet, or the stage isn't one of the two multiple-choice stages.
// The answer key is the lesson THIS learner was shown: their own
// regenerated lesson if they have one (REQ-091, per-learner regeneration),
// otherwise the shared one. Reading only the shared row would grade a
// learner who regenerated against a different question's key.
// `practiceReady` is false while fade/solo are still generating.
export async function cachedCorrectIndex(
  userId: string,
  objectiveId: string,
  stage: string | null | undefined
): Promise<{ hasLesson: boolean; validStage: boolean; index: number | null }> {
  const found = await getLessonFor(userId, objectiveId);
  if (!found) return { hasLesson: false, validStage: false, index: null };
  const row = found.row as { fade_correct_index?: number | null; solo_correct_index?: number | null };
  if (stage === "fade") return { hasLesson: true, validStage: true, index: row.fade_correct_index ?? null };
  if (stage === "solo") return { hasLesson: true, validStage: true, index: row.solo_correct_index ?? null };
  return { hasLesson: true, validStage: false, index: null };
}

// "Got it" on a review entry: one guarded UPDATE, not read-then-write. The
// stage moves 0 -> 1 -> 2 -> 3 (1 / 7 / 21 days out, then resolved), the same
// mapping as REVIEW_OFFSETS_DAYS in lib/mastery.ts and the auto-advance in
// recordAttemptTx. `resolved = false` stops a finished row going past 3.
// `fromStage` (optional) is the stage the learner was looking at: a retry or
// double tap carries the old stage, no longer matches, and changes nothing
// instead of skipping the 7-day review. Returns null if the caller has no
// such entry; otherwise the row and whether this call advanced it.
export async function advanceReviewStage(
  userId: string,
  errorId: string,
  fromStage?: number | null
): Promise<{ row: Record<string, unknown>; advanced: boolean } | null> {
  const guarded = await queryOne<Record<string, unknown>>(
    `update error_log
        set review_stage = review_stage + 1,
            resolved = (review_stage + 1) >= 3,
            next_review_at = case review_stage + 1
                               when 1 then current_date + 7
                               when 2 then current_date + 21
                               else null
                             end
      where id = $1 and user_id = $2 and resolved = false
        and ($3::int is null or review_stage = $3::int)
      returning *`,
    [errorId, userId, fromStage ?? null]
  );
  if (guarded) return { row: guarded, advanced: true };
  const current = await queryOne<Record<string, unknown>>(
    `select * from error_log where id = $1 and user_id = $2`,
    [errorId, userId]
  );
  return current ? { row: current, advanced: false } : null;
}

// REQ-089: the attempt, the mastery update and the review-log changes are
// one transaction. With client attempt ids, a retry replays the stored
// attempt instead of re-running this -- so a write that half-succeeded
// (attempt saved, mastery not) would otherwise stay half-done for good.
export async function recordAttemptAndUpdateMastery(input: AttemptInput) {
  return withTransaction((tx) => recordAttemptTx(tx, input));
}

async function recordAttemptTx(tx: TxClient, input: AttemptInput) {
  const query = tx.query.bind(tx);
  const userId = input.userId;

  // Serialise grades for the same learner and objective, so two at once
  // can't each compute accuracy without the other's attempt and have the
  // later write overwrite mastery with a stale status. Released at commit.
  if (input.objectiveId) {
    await query(`select pg_advisory_xact_lock(hashtext($1))`, [`grade:${userId}:${input.objectiveId}`]);
  }

  const attemptRows = await query(
    `insert into attempts
      (user_id, unit_id, objective_id, pbq_scenario_id, kind, stage, format, question, answer,
       verdict, feedback, classification, missed_parts, confidence, client_attempt_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     returning *`,
    [
      userId,
      input.unitId ?? null,
      input.objectiveId ?? null,
      input.pbqScenarioId ?? null,
      input.kind,
      input.stage ?? null,
      input.format,
      input.question,
      input.answer,
      input.verdict,
      input.feedback ?? null,
      clampClassification(input.classification),
      input.missedParts ? JSON.stringify(input.missedParts) : null,
      input.confidence ?? null,
      input.clientAttemptId ?? null,
    ]
  );
  const attempt = attemptRows[0];

  // Update mastery only when the attempt is tied to a specific objective (PBQs are
  // tied to a unit, not one objective, so they don't directly drive per-objective mastery).
  if (input.objectiveId) {
    const priorAttempts = await query<{ verdict: string | null }>(
      `select verdict from attempts where user_id = $1 and objective_id = $2 and format != 'pbq'`,
      [userId, input.objectiveId]
    );
    const acc = accuracyFromAttempts(priorAttempts);
    const newStatus = suggestStatus({
      acc,
      lastFormat: input.format === "pbq" ? "open" : input.format,
      lastVerdict: input.verdict,
    });
    const score = statusToScore(newStatus);
    await query(
      `insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
       values ($1,$2,$3,$4,$5, now())
       on conflict (user_id, objective_id) do update set
         status = excluded.status, score_0_4 = excluded.score_0_4, evidence = excluded.evidence, updated_at = now()`,
      [
        userId,
        input.objectiveId,
        newStatus,
        score,
        `${input.kind}/${input.stage ?? input.format} on ${new Date().toISOString().slice(0, 10)}: ${input.verdict}`,
      ]
    );
  }

  // REQ-084: a correct graded answer on an objective is the strongest
  // evidence its open review entries deserve to move on -- the same step the
  // Review screen's "Got it" takes (1 -> 7 -> 21 days -> resolved), applied
  // automatically instead of waiting to be cleared by hand. Offsets mirror
  // REVIEW_OFFSETS_DAYS in lib/mastery.ts.
  if (input.verdict === "correct" && input.objectiveId) {
    await query(
      `update error_log
          set review_stage = review_stage + 1,
              resolved = (review_stage + 1) >= 3,
              next_review_at = case review_stage + 1
                                 when 1 then current_date + 7
                                 when 2 then current_date + 21
                                 else null
                               end
        where user_id = $1 and objective_id = $2 and resolved = false`,
      [userId, input.objectiveId]
    );
  }

  // Any non-correct verdict goes into the spaced-review error log (1/7/21 days out),
  // seeded with review_stage 0 (first review due in 1 day).
  if (input.verdict !== "correct") {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    await query(
      `insert into error_log
        (user_id, unit_id, objective_id, attempt_id, topic, error_text, why, classification, review_stage, next_review_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,0,$9)`,
      [
        userId,
        input.unitId ?? null,
        input.objectiveId ?? null,
        attempt.id,
        input.question.slice(0, 200),
        input.answer,
        input.feedback ?? null,
        clampClassification(input.classification),
        toDateOnlyString(next),
      ]
    );
  }

  return attempt;
}
