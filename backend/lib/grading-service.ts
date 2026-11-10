import { advanceDueSchedule } from "@/lib/review-step";
import { queryOne, withTransaction, type TxClient } from "@/lib/db";
import { getLessonFor } from "@/lib/lesson-store";
import { lessonItemKey } from "@/lib/choice-order";
import { optionReasonsFor } from "@/lib/lesson-store";
import { cleanText } from "@/lib/text-input";

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
  kind: "lesson" | "quiz" | "pbq" | "unitcheck" | "lab" | "review" | "labtask" | "simtask";
  stage?: string | null;
  format: "mc" | "open" | "pbq";
  question: string;
  answer: string;
  verdict: "correct" | "partial" | "incorrect";
  feedback?: string | null;
  classification?: string | null;
  missedParts?: string[] | null;
  confidence?: number | null;
  // REQ-127: one id per submitted answer from the app. A second request
  // with the same id is a retry, not a new attempt (see findClientAttempt).
  clientAttemptId?: string | null;
  // REQ-109: an assessment_types row (migration 031/038) for answer kinds
  // the kind/stage/format columns can't express (exam-style formats).
  // Required for any kind other than lesson/pbq to count as mastery
  // evidence; null keeps the derived type.
  assessmentType?: string | null;
  // REQ-105: the grader's model answer and "what to fix" line, stored so a
  // replay returns them too.
  modelAnswer?: string | null;
  fixNext?: string | null;
  // REQ-105: this answer revises the missed attempt with this id, with that
  // attempt's feedback on screen. Recorded as assisted ("retry").
  retryOf?: string | null;
  // REQ-106: a lab report's objective. Lab attempts keep objective_id NULL
  // (a database check enforces it) so mastery_from_attempts never sees them:
  // on this branch a self-reported lab is recorded, but it must not raise or
  // lower mastery. The weighted mastery model can read this column once it
  // decides what a lab is worth.
  labObjectiveId?: string | null;
  // REQ-111: the caller already knows this answer was assisted (comparison
  // card reopened, explain-back text copied). Otherwise an answer with an
  // assessmentType is a repeat when this learner already answered the same
  // item of the same type -- within `repeatWindowHours` if given, otherwise
  // ever (see typedAssistReason).
  // REQ-108: review answers pass "hint" when the choices were shown before
  // a typed answer. One field for every caller-known reason.
  assist?: AssistReason | null;
  repeatWindowHours?: number | null;
  // REQ-109: exam-style answers (sprint / mock) are repeats when this learner
  // answered the same question on this objective in ANY setting -- a lesson
  // check, an earlier sprint or mock -- because the answer was shown then.
  repeatAnySetting?: boolean;
  // REQ-108: a unit check's item (attempts.unit_check_item_id, migration 037).
  unitCheckItemId?: string | null;
  // REQ-112 (j): the PBQ grader's per-part scores (attempts.part_scores,
  // migration 041), stored so a replayed request returns them.
  partScores?: unknown[] | null;
  // REQ-108: false skips the error_log row for a miss (unit checks are
  // offered again from Review instead).
  errorLog?: boolean;
  // REQ-123: a verifiable lab (kind 'labtask', migration 050): the lab
  // (attempts.lab_id) and the run being finished. The run decides the
  // repeat rule (see labAssistReason).
  labId?: string | null;
  labRunId?: string | null;
  // REQ-190: a finished sim run (kind 'simtask', migration 062): the sim
  // (attempts.sim_id) and the run. A run after an earlier revealed run of
  // the same sim is a repeat (see simAssistReason, docs/sims.md 9.4).
  simId?: string | null;
  simRunId?: string | null;
}

// "retry" (REQ-105): a revision written with the first answer's feedback and
// model answer on screen.
//
// "reveal" (REQ-111): the learner saw the answer's source (the comparison card
// reopened, or explain-back text copied from the lesson) before answering.
export type AssistReason = "hint" | "repeat" | "retry" | "reveal";

// REQ-127: the stored attempt for an id the app has already submitted, in
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
    model_answer: string | null;
    fix_next: string | null;
    part_scores?: unknown;
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
    ...(row.model_answer ? { modelAnswer: row.model_answer } : {}),
    ...(row.fix_next ? { fixNext: row.fix_next } : {}),
    // REQ-112 (j): a PBQ's per-part scores (migration 041).
    ...(Array.isArray(row.part_scores) ? { partScores: row.part_scores } : {}),
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

// REQ-105: a second revision of the same attempt (attempts_retry_of_unique).
export function isDuplicateRetry(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string } | null;
  return e?.code === "23505" && (e.constraint ?? "") === "attempts_retry_of_unique";
}

// REQ-105: the attempt a revision points at, if it belongs to this learner,
// was a miss, is not itself a revision, and has not been revised yet. The
// caller checks it is for the same item (objective/stage/question or PBQ
// scenario). The unique index on attempts.retry_of is the real one-revision
// guard; this read gives a clear message in the common case.
export interface RetryTarget {
  id: string;
  kind: string;
  stage: string | null;
  format: string;
  question: string;
  objective_id: string | null;
  pbq_scenario_id: string | null;
  verdict: string;
  missed_parts: string[] | null;
}

export type RetryLookup =
  | { status: "ok"; target: RetryTarget }
  | { status: "not-found" }
  | { status: "not-a-miss" }
  | { status: "is-revision" }
  | { status: "already-revised" };

export async function retryTargetFor(userId: string, attemptId: unknown): Promise<RetryLookup> {
  if (typeof attemptId !== "string" || !/^[0-9a-f-]{36}$/i.test(attemptId)) return { status: "not-found" };
  const row = await queryOne<RetryTarget & { retry_of: string | null; revised: boolean }>(
    `select a.id, a.kind, a.stage, a.format, a.question, a.objective_id, a.pbq_scenario_id, a.verdict,
            a.missed_parts, a.retry_of,
            exists(select 1 from attempts r where r.retry_of = a.id) as revised
       from attempts a where a.id = $1 and a.user_id = $2`,
    [attemptId, userId]
  );
  if (!row) return { status: "not-found" };
  if (row.retry_of) return { status: "is-revision" };
  if (row.verdict !== "partial" && row.verdict !== "incorrect") return { status: "not-a-miss" };
  if (row.revised) return { status: "already-revised" };
  return {
    status: "ok",
    target: {
      id: row.id,
      kind: row.kind,
      stage: row.stage,
      format: row.format,
      question: row.question,
      objective_id: row.objective_id,
      pbq_scenario_id: row.pbq_scenario_id,
      verdict: row.verdict,
      missed_parts: row.missed_parts,
    },
  };
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

// REQ-135: a client attempt id names ONE submission. The replay used to
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

// REQ-134 + REQ-135: `question` is optional. /api/grade no longer takes the
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

// REQ-134: everything needed to grade a lesson's Guided ("fade") or Solo
// ("solo") check, read from the lesson THIS learner was shown -- their own
// regenerated lesson if they have one (REQ-129), otherwise the shared one.
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
  // REQ-105: one reason per stored choice, or null for a lesson cached
  // before option reasons existed (grading then falls back to `why`).
  optionReasons: string[] | null;
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
  const reasons = stage === "fade" ? r.fade_option_reasons : r.solo_option_reasons;
  // Practice half still generating (or a malformed row): nothing to grade against.
  if (!question || !Array.isArray(choices) || !Number.isInteger(correctIndex)) return { status: "pending" };
  return {
    status: "ok",
    check: {
      stage,
      question,
      choices,
      correctIndex,
      why: why ?? "",
      teach: r.teach,
      optionReasons: optionReasonsFor(reasons, choices),
    },
  };
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

// Whether this learner has been shown the choices for this item.
export async function hasHintReveal(userId: string, objectiveId: string, stage: string, question: string) {
  return !!(await queryOne(
    `select 1 from lesson_hint_reveals where user_id = $1 and objective_id = $2 and item_key = $3`,
    [userId, objectiveId, lessonItemKey(stage, question)]
  ));
}

// The name hashed for the per-pair grading lock. Must stay identical to
// grade_lock_key() in migration 029 (which hashes uuid::text, always
// lowercase), so ids are lowercased here: an upper-case id in a request would
// otherwise take a different lock from the recompute.
export function gradeLockName(userId: string, objectiveId: string): string {
  return `grade:${userId.toLowerCase()}:${objectiveId.toLowerCase()}`;
}

// REQ-127: the attempt, the mastery update and the review-log changes are
// one transaction. With client attempt ids, a retry replays the stored
// attempt instead of re-running this -- so a write that half-succeeded
// (attempt saved, mastery not) would otherwise stay half-done for good.
export async function recordAttemptAndUpdateMastery(input: AttemptInput) {
  return withTransaction((tx) => recordAttemptTx(tx, input));
}

// Exported for callers that add their own writes to the same transaction
// (REQ-108: lib/review-store.ts).
export async function recordAttemptTx(tx: TxClient, input: AttemptInput) {
  const query = tx.query.bind(tx);
  const userId = input.userId;
  // REQ-106: see AttemptInput.labObjectiveId. Refused here as well as by the
  // attempts_lab_not_mastery_evidence check, with a clearer message.
  if (input.kind === "lab" && input.objectiveId) {
    throw new Error("A lab attempt is linked through labObjectiveId, never objectiveId (it is not mastery evidence)");
  }
  // REQ-123 (FAIL-480): a verifiable lab's answer always names its lab and
  // the objective it is evidence for. Enforced here rather than by the
  // attempts_labtask_shape check, which must still allow objective_id to be
  // cleared (SET NULL) when a course is deleted; attempts.lab_id has no
  // foreign key (migration 050, FAIL-481).
  if (input.kind === "labtask" && (!input.labId || !input.objectiveId)) {
    throw new Error("A labtask attempt names its lab (labId) and its objective (objectiveId)");
  }
  // REQ-190: the same for a sim run (attempts.sim_id has no foreign key either).
  if (input.kind === "simtask" && (!input.simId || !input.objectiveId)) {
    throw new Error("A simtask attempt names its sim (simId) and its objective (objectiveId)");
  }

  // Serialise grades for the same learner and objective, so two at once
  // can't each compute accuracy without the other's attempt and have the
  // later write overwrite mastery with a stale status. Released at commit.
  // recompute_mastery_pair() (migration 029) takes the same lock, through
  // grade_lock_key(), so a recompute never overwrites a grade (FAIL-118).
  if (input.objectiveId) {
    await query(`select pg_advisory_xact_lock(hashtext($1))`, [gradeLockName(userId, input.objectiveId)]);
  }

  // REQ-134: was this answer given with help? Decided here, under the lock
  // above, so two first answers racing can't both count as the first.
  // FAIL-231 (integration): every kind goes through assistReasonFor, so a
  // PBQ revision is a retry, an exam answer a repeat, an explain-back copy a
  // reveal, and a caller-known reason (review "hint") is kept.
  const assistReason = await assistReasonFor(query, input);
  const clean = modelTextCleaner();

  const extraCols: { col: string; value: unknown }[] = [];
  if (input.unitCheckItemId) extraCols.push({ col: "unit_check_item_id", value: input.unitCheckItemId });
  if (input.partScores && input.partScores.length) extraCols.push({ col: "part_scores", value: JSON.stringify(cleanDeep(input.partScores)) });
  // REQ-123: lab_id (migration 050), only named when set.
  if (input.labId) extraCols.push({ col: "lab_id", value: input.labId });
  // REQ-190: sim_id (migration 062), only named when set.
  if (input.simId) extraCols.push({ col: "sim_id", value: input.simId });
  const attemptRows = await query(
    `insert into attempts
      (user_id, unit_id, objective_id, pbq_scenario_id, kind, stage, format, question, answer,
       verdict, feedback, classification, missed_parts, confidence, client_attempt_id, assisted, assist_reason,
       assessment_type, model_answer, fix_next, retry_of, lab_objective_id${extraCols.map((c) => `, ${c.col}`).join("")})
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22${extraCols.map((_, i) => `,$${23 + i}`).join("")})
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
      clean(input.feedback),
      clean(clampClassification(input.classification)),
      input.missedParts ? JSON.stringify(input.missedParts.map((m) => clean(m) ?? "")) : null,
      input.confidence ?? null,
      input.clientAttemptId ?? null,
      assistReason !== null,
      assistReason,
      input.assessmentType ?? null,
      clean(input.modelAnswer),
      clean(input.fixNext),
      input.retryOf ?? null,
      input.labObjectiveId ?? null,
      // unit_check_item_id (037) and part_scores (041) are only named when
      // set, so other grading keeps working on a database without them.
      ...extraCols.map((c) => c.value),
    ]
  );
  const attempt = attemptRows[0];

  // REQ-134 / REQ-100: mastery is recomputed from this learner's whole
  // attempt history by mastery_from_attempts() -- the weighted cross-format
  // model written out in migration 031 -- the same function the recompute
  // uses, so the two cannot disagree.
  if (input.objectiveId) {
    await query(
      `insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
       select $1, $2, m.status, m.score, m.evidence, now() from mastery_from_attempts($1, $2) m
       on conflict (user_id, objective_id) do update set
         status = excluded.status, score_0_4 = excluded.score_0_4, evidence = excluded.evidence, updated_at = now()`,
      [userId, input.objectiveId]
    );
  } else if (input.format === "pbq" && input.unitId) {
    // REQ-100: a PBQ covers its whole unit, so it is evidence for every
    // objective of the unit this learner has already studied. An objective
    // with no direct answers comes back Not started; it only gets written if
    // it already has a row (as recompute_mastery() would), so a PBQ never
    // creates rows for objectives the learner hasn't studied. Take the same
    // per-objective locks the lesson path takes, in id order so two PBQs
    // cannot deadlock, before reading attempts.
    await query(
      `select pg_advisory_xact_lock(hashtext('grade:' || $1 || ':' || o.id))
         from objectives o where o.unit_id = $2 order by o.id`,
      [userId, input.unitId]
    );
    await query(
      `insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
       select $1, o.id, m.status, m.score, m.evidence, now()
         from objectives o cross join lateral mastery_from_attempts($1, o.id) m
        where o.unit_id = $2
          and (m.status <> 'Not started'
               or exists (select 1 from mastery x where x.user_id = $1 and x.objective_id = o.id))
       on conflict (user_id, objective_id) do update set
         status = excluded.status, score_0_4 = excluded.score_0_4, evidence = excluded.evidence, updated_at = now()
       where mastery.status is distinct from excluded.status
          or mastery.score_0_4 is distinct from excluded.score_0_4
          or mastery.evidence is distinct from excluded.evidence`,
      [userId, input.unitId]
    );
  }

  // REQ-084 / REQ-134: a correct answer moves the item's open review entries
  // on one step (1 -> 7 -> 21 days -> resolved), but only entries due today or
  // overdue: an early review no longer jumps the interval, and because the
  // step sets the next date in the future an entry moves at most once a day.
  // Only a Solo answer (lesson) or a retry of the same PBQ scenario counts;
  // the scaffolded Guided step and the choices hint do not. Offsets mirror
  // REVIEW_OFFSETS_DAYS in lib/mastery.ts.
  const reviewEvidence =
    input.verdict === "correct" &&
    assistReason !== "hint" &&
    // REQ-105: a revision written with the model answer on screen is
    // practice, not evidence the item has been kept.
    assistReason !== "retry" &&
    ((input.kind === "lesson" && input.stage === "solo" && !!input.objectiveId) || !!input.pbqScenarioId);
  // REQ-124 (Nick, 2026-11-07, decision 14): a finished lab run, first try
  // (not a repeat after seeing the model answers), is a retrieval of the
  // objective: correct, it moves the objective's due review on as a correct
  // Solo answer does (the error_log entries below) and steps its review
  // schedule when one is due, as a spaced exam answer does; missed or
  // partly there, it is a miss -- an error_log entry (below) and, when the
  // schedule is due, a step back. A repeat run changes neither.
  // REQ-190 (docs/sims.md 9.4): a first-run sim moves the schedule the same way.
  const labReview =
    ((input.kind === "labtask" && !!input.labId) || (input.kind === "simtask" && !!input.simId)) && !!input.objectiveId && assistReason === null;
  if (labReview) {
    await advanceDueSchedule(tx, userId, input.objectiveId!, attempt.id as string, new Date(), input.verdict);
  }
  // REQ-112 (d): a correct, unassisted exam answer (sprint or mock) that is
  // spaced -- by the mastery rule's own definition, attempt_spaced() in 041
  // -- is a retrieval like a review answer, so it moves a DUE review on: the
  // error_log entries for its objective (below) and the review schedule
  // (lib/review-step.ts). Not spaced, assisted (a repeat of a seen question)
  // or not due: nothing moves. A missed exam answer gets its own entry below.
  const examReview =
    input.repeatAnySetting === true &&
    input.verdict === "correct" &&
    assistReason === null &&
    !!input.objectiveId &&
    ((await query(`select attempt_spaced($1) as ok`, [attempt.id]))[0] as { ok?: boolean } | undefined)?.ok === true;
  if (examReview) {
    await advanceDueSchedule(tx, userId, input.objectiveId!, attempt.id as string, new Date());
  }
  // REQ-117 (FAIL-361): an unaided, spaced exam MISS on a due objective is a
  // due review too: it steps the schedule back and is logged, so "kept"
  // (review_state, migration 045) sees the misses and not only the hits.
  // Before, only correct exam answers were logged, so a mock-only learner
  // read kept 33 of 36 whatever the misses.
  const examMiss =
    input.repeatAnySetting === true &&
    input.verdict !== "correct" &&
    assistReason === null &&
    !!input.objectiveId &&
    ((await query(`select attempt_spaced($1) as ok`, [attempt.id]))[0] as { ok?: boolean } | undefined)?.ok === true;
  if (examMiss) {
    await advanceDueSchedule(tx, userId, input.objectiveId!, attempt.id as string, new Date(), input.verdict);
  }
  if (reviewEvidence || examReview || (labReview && input.verdict === "correct")) {
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
  // seeded with review_stage 0 (first review due in 1 day). Not for a missed
  // revision (REQ-105): the attempt it revises already put this item in
  // review, and a second entry would schedule the same item twice.
  // REQ-106: nor for a lab report. It is optional, self-reported practice on
  // the learner's own machine; a weak report is feedback, not a review item.
  // REQ-108: nor when the caller asks for none (unit checks come back from
  // Review instead).
  // REQ-124: a lab run's miss is logged only on a first try (labReview); a
  // repeat is practice.
  const labMiss = input.kind === "labtask" || input.kind === "simtask" ? labReview : true;
  if (input.verdict !== "correct" && assistReason !== "retry" && input.kind !== "lab" && input.errorLog !== false && labMiss) {
    // FAIL-529: "tomorrow" is the database's current_date + 1, the same clock
    // every due check (next_review_at <= current_date) reads. A date built
    // from the Node process's local zone was today's database date whenever
    // that zone was a day behind (e.g. a Pacific evening against UTC), so a
    // new miss was due at once and the next correct answer moved it.
    await query(
      `insert into error_log
        (user_id, unit_id, objective_id, pbq_scenario_id, attempt_id, topic, error_text, why, classification,
         review_stage, next_review_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,current_date + 1)`,
      [
        userId,
        input.unitId ?? null,
        input.objectiveId ?? null,
        input.pbqScenarioId ?? null,
        attempt.id,
        cleanText(input.question, 200),
        input.answer,
        clean(input.feedback),
        clean(clampClassification(input.classification)),
      ]
    );
  }

  return attempt;
}

// REQ-117 (Audit 3 A3, FAIL-358): text from the model (feedback, missed
// parts, model answer, fix-next line, classification, per-part scores) is
// cleaned before it is stored. A schema-valid reply carrying a NUL or a lone
// surrogate made the INSERT fail, so the learner's answer was lost with a
// 500. Learner text is still validated at the route (textField).
export const MODEL_TEXT_MAX = 20_000;
function modelTextCleaner() {
  return (v: string | null | undefined): string | null => (v == null ? null : cleanText(v, MODEL_TEXT_MAX));
}
export function cleanDeep(v: unknown): unknown {
  if (typeof v === "string") return cleanText(v, MODEL_TEXT_MAX);
  if (Array.isArray(v)) return v.map(cleanDeep);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [cleanText(k, 200), cleanDeep(x)]));
  return v;
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
  if (input.retryOf) return "retry";
  if (input.assist) return input.assist;
  // REQ-123: a finished lab run (kind 'labtask').
  if (input.labId) return labAssistReason(query, input);
  // REQ-190: a finished sim run (kind 'simtask').
  if (input.simId) return simAssistReason(query, input);
  // REQ-117 (Audit 3 A1, FAIL-356): a unit-wide answer (PBQ or unit check)
  // to a scenario or item this learner already answered -- and so saw graded,
  // with the model answer -- is a repeat, as a lesson item is. It used to be
  // recorded unassisted, so a pasted-back model answer counted as full
  // evidence. Migration 045's rule derives the same from history.
  if (!input.objectiveId && (input.pbqScenarioId || input.unitCheckItemId)) {
    const seen = await query(
      `select 1 from attempts
        where user_id = $1 and objective_id is null and verdict is not null
          and (($2::uuid is not null and pbq_scenario_id = $2::uuid)
            or ($3::uuid is not null and unit_check_item_id = $3::uuid))
        limit 1`,
      [input.userId, input.pbqScenarioId ?? null, input.unitCheckItemId ?? null]
    );
    return seen.length ? "repeat" : null;
  }
  // REQ-109: see repeatAnySetting. Without this a reused item would earn
  // full credit.
  if (input.repeatAnySetting && input.objectiveId) {
    const seen = await query(
      `select 1 from attempts where user_id = $1 and objective_id = $2 and question = $3 limit 1`,
      [input.userId, input.objectiveId, input.question]
    );
    return seen.length ? "repeat" : null;
  }
  if (input.assessmentType) return typedAssistReason(query, input);
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

// REQ-123: a lab run is a 'repeat' when this learner had any graded step of
// the same lab in another run (finished or abandoned) or an earlier recorded
// attempt on it: each graded step showed that step's model answer, so the
// next run can be answered from memory of the key. Runs under the grade lock.
async function labAssistReason(query: TxClient["query"], input: AttemptInput): Promise<AssistReason | null> {
  const seen = await query(
    `select 1 from lab_run_steps s join lab_runs r on r.id = s.run_id
      where r.user_id = $1 and r.lab_id = $2 and r.id is distinct from $3::uuid
     union all
     select 1 from attempts a where a.user_id = $1 and a.lab_id = $2 and a.verdict is not null
     limit 1`,
    [input.userId, input.labId, input.labRunId ?? null]
  );
  return seen.length ? "repeat" : null;
}

// REQ-190 (docs/sims.md 9.4): a sim run is a 'repeat' when this learner has
// another run of the same sim (any version) marked revealed -- they acted in
// it or something was revealed -- or an earlier recorded attempt on it. So
// abandoning a run before its debrief and starting again does not make the
// next run a first run. Runs under the grade lock.
async function simAssistReason(query: TxClient["query"], input: AttemptInput): Promise<AssistReason | null> {
  const seen = await query(
    `select 1 from sim_runs r
      where r.user_id = $1 and r.sim_id = $2 and r.id is distinct from $3::uuid and r.revealed
     union all
     select 1 from attempts a where a.user_id = $1 and a.sim_id = $2 and a.verdict is not null
     limit 1`,
    [input.userId, input.simId, input.simRunId ?? null]
  );
  return seen.length ? "repeat" : null;
}

// REQ-111: the same rules for an answer with an explicit assessment type.
// A reason the caller already knows wins; otherwise an earlier answer by this
// learner to the same item (same objective, type and question) makes it a
// repeat, because grading showed the answer then. Runs under the grade lock.
async function typedAssistReason(query: TxClient["query"], input: AttemptInput): Promise<AssistReason | null> {
  if (input.assist) return input.assist;
  if (!input.objectiveId) return null;
  const before = await query(
    `select 1 from attempts
      where user_id = $1 and objective_id = $2 and assessment_type = $3 and question = $4
        and ($5::numeric is null or created_at > now() - make_interval(secs => $5::double precision * 3600))
      limit 1`,
    [input.userId, input.objectiveId, input.assessmentType, input.question, input.repeatWindowHours ?? null]
  );
  return before.length ? "repeat" : null;
}
