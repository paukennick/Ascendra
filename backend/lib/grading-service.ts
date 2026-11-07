import { queryOne, withTransaction, type TxClient } from "@/lib/db";
import { getLessonFor } from "@/lib/lesson-store";
import { toDateOnlyString } from "@/lib/mastery";
import { lessonItemKey } from "@/lib/choice-order";

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

export type AssistReason = "hint" | "repeat";

// REQ-089: the stored attempt for an id the app has already submitted, in
// the shape /api/grade returns, or null if this id is new.
export async function findClientAttempt(userId: string, clientAttemptId: string) {
  const row = await queryOne<{
    id: string;
    verdict: "correct" | "partial" | "incorrect";
    feedback: string | null;
    classification: string | null;
    missed_parts: string[] | null;
    assisted: boolean | null;
    assist_reason: AssistReason | null;
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
    assisted: row.assisted === true,
    assistReason: row.assist_reason ?? null,
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
      if (prior) {
        assertSameAttempt(prior.attempt, input);
        return { attempt: null, prior };
      }
    }
    throw err;
  }
}

// REQ-098: a client attempt id names ONE submission. The replay used to
// return whatever was stored under the id, so reusing an id for a different
// answer, objective or route (/api/pbq after /api/grade) silently dropped
// the new submission and answered with the old verdict. The replay is now
// bound to what was submitted: the stored attempt must be for the same
// objective / scenario, kind, format, stage, question and answer, or the
// request is refused with 409. Compared field by field against the stored
// row, so no schema change is needed.
export class IdempotencyConflictError extends Error {
  constructor(message = "This id was already used for a different submission.") {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

// REQ-097 + REQ-098: `question` is optional. /api/grade no longer takes the
// question from the request -- it is read from the stored lesson -- so its
// identity is objective, kind, format, stage and the answer it graded (the
// text of the chosen stored choice, or the free-response text). A retry
// after the lesson was regenerated is still the same submission there.
export type AttemptIdentity = Pick<
  AttemptInput,
  "objectiveId" | "pbqScenarioId" | "kind" | "format" | "stage" | "answer"
> & { question?: string };

const idOrNull = (v: unknown) => (typeof v === "string" && v ? v.toLowerCase() : null);

export function sameAttempt(stored: Record<string, unknown>, req: AttemptIdentity): boolean {
  return (
    idOrNull(stored.objective_id) === idOrNull(req.objectiveId) &&
    idOrNull(stored.pbq_scenario_id) === idOrNull(req.pbqScenarioId) &&
    stored.kind === req.kind &&
    stored.format === req.format &&
    (stored.stage ?? null) === (req.stage ?? null) &&
    (req.question === undefined || stored.question === req.question) &&
    sameAnswer(stored.answer, req.answer)
  );
}

// A retry of a failed submit may differ only in surrounding whitespace (the
// app's resend signature trims; the request body doesn't). That is the same
// submission, not a conflict.
function sameAnswer(stored: unknown, sent: unknown): boolean {
  if (typeof stored === "string" && typeof sent === "string") return stored.trim() === sent.trim();
  return stored === sent;
}

export function assertSameAttempt(stored: Record<string, unknown>, req: AttemptIdentity): void {
  if (!sameAttempt(stored, req)) throw new IdempotencyConflictError();
}

// REQ-097: everything needed to grade a lesson's Guided ("fade") or Solo
// ("solo") check, read from the lesson THIS learner was shown -- their own
// regenerated lesson if they have one (REQ-091), otherwise the shared one.
// /api/grade grades only against this; the question, teaching text and answer
// key are never taken from the request. Indexes here are in stored order; the
// shuffle the learner saw is applied by the route (lib/choice-order.ts).
export interface LessonCheck {
  stage: "fade" | "solo";
  question: string;
  choices: string[];
  correctIndex: number;
  why: string;
  teach: string;
}

export type LessonCheckLookup =
  | { status: "ok"; check: LessonCheck }
  | { status: "no-lesson" }
  | { status: "bad-stage" }
  | { status: "pending" };

export async function lessonCheckFor(
  userId: string,
  objectiveId: string,
  stage: unknown
): Promise<LessonCheckLookup> {
  if (stage !== "fade" && stage !== "solo") return { status: "bad-stage" };
  const found = await getLessonFor(userId, objectiveId);
  if (!found) return { status: "no-lesson" };
  const r = found.row;
  const question = stage === "fade" ? r.fade_problem : r.solo_check;
  const choices = stage === "fade" ? r.fade_choices : r.solo_choices;
  const correctIndex = stage === "fade" ? r.fade_correct_index : r.solo_correct_index;
  const why = stage === "fade" ? r.fade_why : r.solo_why;
  // Practice half still generating (or a malformed row): nothing to grade against.
  if (!question || !Array.isArray(choices) || !Number.isInteger(correctIndex)) return { status: "pending" };
  return { status: "ok", check: { stage, question, choices, correctIndex, why: why ?? "", teach: r.teach } };
}

// Records that this learner asked to see the choices for a Solo item. Called
// before the choices are sent, so the hint is known to the server rather than
// reported by the app. Idempotent.
export async function recordHintReveal(userId: string, objectiveId: string, stage: string, question: string) {
  await queryOne(
    `insert into lesson_hint_reveals (user_id, objective_id, item_key) values ($1, $2, $3)
     on conflict do nothing returning 1`,
    [userId, objectiveId, lessonItemKey(stage, question)]
  );
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
    // REQ-098: lowercased, so an uppercase copy of the same id takes the same lock.
    await query(`select pg_advisory_xact_lock(hashtext($1))`, [
      `grade:${userId.toLowerCase()}:${input.objectiveId.toLowerCase()}`,
    ]);
  }

  // REQ-097: was this answer given with help? Decided here, under the lock
  // above, so two first answers racing can't both count as the first.
  const assistReason = await assistReasonFor(query, input);

  const attemptRows = await query(
    `insert into attempts
      (user_id, unit_id, objective_id, pbq_scenario_id, kind, stage, format, question, answer,
       verdict, feedback, classification, missed_parts, confidence, client_attempt_id, assisted, assist_reason)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
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
      assistReason !== null,
      assistReason,
    ]
  );
  const attempt = attemptRows[0];

  // REQ-097: mastery is recomputed from this learner's whole attempt history
  // on the objective by mastery_from_attempts() (migration 029, where the
  // rule is written out) -- the same function the 029 recompute used. Status
  // no longer comes from the latest answer alone, and only unassisted Solo
  // free-response successes lift it above Guided (two at least 24 hours apart
  // for Transfer-ready).
  if (input.objectiveId) {
    await query(
      `insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
       select $1, $2, m.status, m.score, m.evidence, now() from mastery_from_attempts($1, $2) m
       on conflict (user_id, objective_id) do update set
         status = excluded.status, score_0_4 = excluded.score_0_4, evidence = excluded.evidence, updated_at = now()`,
      [userId, input.objectiveId]
    );
  }

  // REQ-084 / REQ-097: a correct answer moves the item's open review entries
  // on one step (1 -> 7 -> 21 days -> resolved), but only entries due today or
  // overdue: an early review no longer jumps the interval, and because the
  // step sets the next date in the future an entry moves at most once a day.
  // Only a Solo answer (lesson) or a retry of the same PBQ scenario counts;
  // the scaffolded Guided step and the choices hint do not. Offsets mirror
  // REVIEW_OFFSETS_DAYS in lib/mastery.ts.
  const reviewEvidence =
    input.verdict === "correct" &&
    assistReason !== "hint" &&
    ((input.kind === "lesson" && input.stage === "solo" && !!input.objectiveId) || !!input.pbqScenarioId);
  if (reviewEvidence) {
    await query(
      `update error_log
          set review_stage = review_stage + 1,
              resolved = (review_stage + 1) >= 3,
              next_review_at = case review_stage + 1
                                 when 1 then current_date + 7
                                 when 2 then current_date + 21
                                 else null
                               end
        where user_id = $1 and resolved = false
          and next_review_at <= current_date
          and (($2::uuid is not null and objective_id = $2::uuid)
            or ($3::uuid is not null and pbq_scenario_id = $3::uuid))`,
      [userId, input.pbqScenarioId ? null : input.objectiveId ?? null, input.pbqScenarioId ?? null]
    );
  }

  // Any non-correct verdict goes into the spaced-review error log (1/7/21 days out),
  // seeded with review_stage 0 (first review due in 1 day).
  if (input.verdict !== "correct") {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    await query(
      `insert into error_log
        (user_id, unit_id, objective_id, pbq_scenario_id, attempt_id, topic, error_text, why, classification,
         review_stage, next_review_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10)`,
      [
        userId,
        input.unitId ?? null,
        input.objectiveId ?? null,
        input.pbqScenarioId ?? null,
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

// "hint": the Solo choices were on screen -- answered as multiple choice, or
//   the hint was opened for this item (lesson_hint_reveals).
// "repeat": this learner already answered this exact item (same stage, same
//   question), and grading showed the answer then.
// Either keeps the answer from lifting mastery above Guided.
async function assistReasonFor(
  query: TxClient["query"],
  input: AttemptInput
): Promise<AssistReason | null> {
  if (input.kind !== "lesson" || !input.objectiveId || (input.stage !== "fade" && input.stage !== "solo")) return null;
  if (input.stage === "solo") {
    if (input.format === "mc") return "hint";
    const hinted = await query(
      `select 1 from lesson_hint_reveals where user_id = $1 and objective_id = $2 and item_key = $3`,
      [input.userId, input.objectiveId, lessonItemKey(input.stage, input.question)]
    );
    if (hinted.length) return "hint";
  }
  const before = await query(
    `select 1 from attempts where user_id = $1 and objective_id = $2 and stage = $3 and question = $4 limit 1`,
    [input.userId, input.objectiveId, input.stage, input.question]
  );
  return before.length ? "repeat" : null;
}
