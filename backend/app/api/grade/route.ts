import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, conflict, serverError } from "@/lib/http";
import { gradeFreeResponse } from "@/lib/free-response-grader";
import {
  cachedCorrectIndex,
  findClientAttempt,
  recordAttemptIdempotent,
  sameAttempt,
  IdempotencyConflictError,
  type AttemptIdentity,
} from "@/lib/grading-service";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { visibleObjective, visibleUnit, normUuid } from "@/lib/visibility";
import { textField, TEXT_LIMITS } from "@/lib/text-input";

// The attempt_kind enum (migration 001).
const ATTEMPT_KINDS = ["lesson", "quiz", "pbq", "unitcheck", "lab"];
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  requireAcknowledgementForUnit,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForObjective, coachContextForUnit } from "@/lib/coach-context";

export const dynamic = "force-dynamic";

// POST /api/grade — grades one lesson/quiz/unit-check answer (MC or free-response) and
// records the attempt + mastery update + (if not correct) an error-log entry with the
// first spaced-review date. PBQ grading has its own route (see /api/pbq) since it needs
// a scenario + multiple named sub-parts.
//
// Body for format "mc" (graded locally — no Anthropic call needed). For a lesson check
// (objectiveId + stage "fade"/"solo") the correct index comes from the cached lesson
// content on the server; the client's correctIndex is only used when no lesson is cached:
//   { format: "mc", kind, stage?, objectiveId?, unitId?, question, chosenIndex, correctIndex,
//     chosenText, why?, confidence? }
//
// Body for format "open" (graded by Claude):
//   { format: "open", kind, stage?, objectiveId?, unitId?, question, answer, taughtText, confidence? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { format, kind } = body ?? {};

    if (!format || !kind || !body?.question) {
      return badRequest("format, kind, and question are required");
    }

    // REQ-098: these went straight to the INSERT, so a kind outside the enum,
    // a stage over 50 characters, a confidence of 9 or "abc", a NUL
    // character or half an emoji all came back as a 500. They are 400s now,
    // and free text has a length cap (lib/text-input.ts).
    if (!ATTEMPT_KINDS.includes(kind)) return badRequest(`kind must be one of: ${ATTEMPT_KINDS.join(", ")}`);
    const q = textField(body.question, "question", TEXT_LIMITS.question, { required: true });
    if (!q.ok) return badRequest(q.error);
    const question = q.value;
    const st = textField(body.stage, "stage", TEXT_LIMITS.stage);
    if (!st.ok) return badRequest(st.error);
    const stage: string | null = st.value || null;
    const rawConfidence = body.confidence;
    if (rawConfidence != null && !(Number.isInteger(rawConfidence) && rawConfidence >= 1 && rawConfidence <= 5)) {
      return badRequest("confidence must be a whole number from 1 to 5");
    }
    const confidence: number | null = rawConfidence ?? null;

    const authUser = await requireUser(req);

    // REQ-091: the ids in the body are untrusted. Each must be in a track the
    // caller can see (shared catalog or their own), and if both are sent the
    // objective must belong to that unit -- otherwise an attempt (and its
    // mastery / review entries) could be filed against someone else's course.
    // requireAcknowledgement* is not an access check: it returns silently
    // for a track the caller can't see.
    for (const [name, v] of [["objectiveId", body.objectiveId], ["unitId", body.unitId]] as const) {
      if (v !== undefined && v !== null && typeof v !== "string") return badRequest(`${name} must be a string`);
    }
    // REQ-098: from here on the ids are the canonical (lowercase) ones the
    // visibility checks return, so lock keys and comparisons match however
    // the client spelled them. A non-uuid id is simply not found.
    let objectiveId: string | undefined;
    let unitId: string | undefined;
    if (body.objectiveId) {
      const objective = await visibleObjective(body.objectiveId, authUser.id);
      if (!objective) return notFound("Objective not found");
      if (body.unitId && objective.unit_id !== normUuid(body.unitId)) {
        return badRequest("objectiveId does not belong to unitId");
      }
      objectiveId = objective.id;
      unitId = objective.unit_id;
      await requireAcknowledgementForObjective(objectiveId, authUser.id);
    } else if (body.unitId) {
      const unit = await visibleUnit(body.unitId, authUser.id);
      if (!unit) return notFound("Unit not found");
      unitId = unit.id;
      await requireAcknowledgementForUnit(unitId, authUser.id);
    }
    const attemptUnitId = unitId;

    // REQ-089: an id the app already submitted is a retry (dropped
    // connection, double tap, resumed lesson) -- hand back the stored result
    // rather than grading again, recording a second attempt and moving
    // mastery twice. Checked before the rate limit and the Anthropic call.
    //
    // REQ-098: the replay is bound to the submission. The same id with a
    // different answer, objective, stage or question is a 409, not the old
    // verdict (see assertSameAttempt), so the answer is worked out first.
    if (format !== "mc" && format !== "open") {
      return badRequest("format must be 'mc' or 'open' (use /api/pbq for PBQ grading)");
    }
    let answer: string;
    if (format === "mc") {
      if (!Number.isInteger(body.chosenIndex)) {
        return badRequest("chosenIndex is required for format 'mc'");
      }
      const ct = textField(body.chosenText, "chosenText", TEXT_LIMITS.answer);
      if (!ct.ok) return badRequest(ct.error);
      answer = body.chosenText != null ? ct.value : String(body.chosenIndex);
    } else {
      const a = textField(body.answer, "answer", TEXT_LIMITS.answer, { required: true });
      if (!a.ok) return badRequest("answer and taughtText are required for format 'open'");
      answer = a.value;
    }
    const identity: AttemptIdentity = { objectiveId, kind, format, stage, question, answer };

    const clientAttemptId = validClientAttemptId(body.clientAttemptId);
    if (clientAttemptId) {
      const prior = await findClientAttempt(authUser.id, clientAttemptId);
      if (prior) {
        if (!sameAttempt(prior.attempt, identity)) return conflict(new IdempotencyConflictError().message);
        return ok(prior);
      }
    }
    // Two requests with the same id can still race past that check; the
    // unique index makes the slower one fail, and it returns the winner's.
    const record = (input: Parameters<typeof recordAttemptIdempotent>[0]) =>
      recordAttemptIdempotent({ ...input, clientAttemptId });

    if (format === "mc") {
      const { chosenIndex } = body;
      const w = textField(body.why, "why", TEXT_LIMITS.why);
      if (!w.ok) return badRequest(w.error);
      const why = w.value;
      // The client's correctIndex is not trusted: anyone with a token could
      // send correctIndex = chosenIndex and be graded correct every time.
      // For a lesson check the answer key is the cached lesson_content row.
      let correctIndex: unknown = body.correctIndex;
      if (objectiveId) {
        const cached = await cachedCorrectIndex(authUser.id, objectiveId, stage);
        if (cached.hasLesson) {
          if (!cached.validStage) {
            return badRequest("stage must be 'fade' or 'solo' for a multiple-choice check on a lesson");
          }
          if (cached.index === null) {
            return badRequest("This lesson's practice questions are still being generated -- try again in a moment.");
          }
          correctIndex = cached.index;
        }
        // else: no lesson is cached for this objective, so there is no
        // server-side answer key. Fall back to the client's value rather
        // than refusing to grade; this is the only path that trusts it.
      }
      if (!Number.isInteger(correctIndex)) {
        return badRequest("correctIndex is required for format 'mc' when no lesson is cached");
      }
      const correct = chosenIndex === correctIndex;
      const verdict = correct ? "correct" : "incorrect";
      const feedback = `${correct ? "That's right." : "Not quite."} ${why ?? ""}`.trim();
      const { attempt, prior } = await record({
        userId: authUser.id,
        unitId: attemptUnitId,
        objectiveId,
        kind,
        stage,
        format: "mc",
        question,
        answer,
        verdict,
        feedback,
        classification: "none",
        confidence,
      });
      if (prior) return ok(prior);
      return ok({ verdict, feedback, classification: "none", missedParts: [], attempt });
    }

    {
      const tt = textField(body.taughtText, "taughtText", TEXT_LIMITS.taughtText, { required: true });
      if (!tt.ok) {
        return badRequest(
          body.taughtText ? tt.error : "answer and taughtText are required for format 'open'"
        );
      }
      const taughtText = tt.value;
      try {
        await consumeRateLimit("grade_open", authUser.id, { max: 40, windowMinutes: 10 });
      } catch (err) {
        if (err instanceof RateLimitError) return tooManyRequests(err.message);
        throw err;
      }
      // REQ-076: grade in the voice of the learner's actual track/exam.
      const ctx = objectiveId
        ? await coachContextForObjective(objectiveId)
        : unitId
          ? await coachContextForUnit(unitId)
          : null;
      const graded = await gradeFreeResponse({
        taughtText,
        question,
        answer,
        ctx: ctx ?? undefined,
        userId: authUser.id,
      });
      const { attempt, prior } = await record({
        userId: authUser.id,
        unitId: attemptUnitId,
        objectiveId,
        kind,
        stage,
        format: "open",
        question,
        answer,
        verdict: graded.verdict,
        feedback: graded.feedback,
        classification: graded.classification,
        missedParts: graded.missedParts ?? [],
        confidence,
      });
      if (prior) return ok(prior);
      return ok({ ...graded, attempt });
    }
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof IdempotencyConflictError) return conflict(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
