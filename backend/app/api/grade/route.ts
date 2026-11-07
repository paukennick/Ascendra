import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, serverError } from "@/lib/http";
import { callClaudeJSON, getFastModel } from "@/lib/anthropic";
import { gradeFreeResponsePrompt, type GradeResult } from "@/lib/prompts";
import {
  cachedCorrectIndex,
  findClientAttempt,
  recordAttemptIdempotent,
} from "@/lib/grading-service";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { visibleObjective, visibleUnit } from "@/lib/visibility";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  requireAcknowledgementForUnit,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
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
    const { format, kind, stage, objectiveId, unitId, question, confidence } = body ?? {};

    if (!format || !kind || !question) {
      return badRequest("format, kind, and question are required");
    }

    const authUser = await requireUser(req);

    // REQ-091: the ids in the body are untrusted. Each must be in a track the
    // caller can see (shared catalog or their own), and if both are sent the
    // objective must belong to that unit -- otherwise an attempt (and its
    // mastery / review entries) could be filed against someone else's course.
    // requireAcknowledgement* is not an access check: it returns silently
    // for a track the caller can't see.
    for (const [name, v] of [["objectiveId", objectiveId], ["unitId", unitId]] as const) {
      if (v !== undefined && v !== null && typeof v !== "string") return badRequest(`${name} must be a string`);
    }
    let attemptUnitId: string | undefined = unitId || undefined;
    if (objectiveId) {
      const objective = await visibleObjective(objectiveId, authUser.id);
      if (!objective) return notFound("Objective not found");
      if (unitId && objective.unit_id !== unitId) {
        return badRequest("objectiveId does not belong to unitId");
      }
      attemptUnitId = objective.unit_id;
      await requireAcknowledgementForObjective(objectiveId, authUser.id);
    } else if (unitId) {
      const unit = await visibleUnit(unitId, authUser.id);
      if (!unit) return notFound("Unit not found");
      await requireAcknowledgementForUnit(unitId, authUser.id);
    }

    // REQ-089: an id the app already submitted is a retry (dropped
    // connection, double tap, resumed lesson) -- hand back the stored result
    // rather than grading again, recording a second attempt and moving
    // mastery twice. Checked before the rate limit and the Anthropic call.
    const clientAttemptId = validClientAttemptId(body.clientAttemptId);
    if (clientAttemptId) {
      const prior = await findClientAttempt(authUser.id, clientAttemptId);
      if (prior) return ok(prior);
    }
    // Two requests with the same id can still race past that check; the
    // unique index makes the slower one fail, and it returns the winner's.
    const record = (input: Parameters<typeof recordAttemptIdempotent>[0]) =>
      recordAttemptIdempotent({ ...input, clientAttemptId });

    if (format === "mc") {
      const { chosenIndex, chosenText, why } = body;
      if (!Number.isInteger(chosenIndex)) {
        return badRequest("chosenIndex is required for format 'mc'");
      }
      // The client's correctIndex is not trusted: anyone with a token could
      // send correctIndex = chosenIndex and be graded correct every time.
      // For a lesson check the answer key is the cached lesson_content row.
      let correctIndex: unknown = body.correctIndex;
      if (objectiveId) {
        const cached = await cachedCorrectIndex(objectiveId, stage);
        if (cached.hasLesson) {
          if (cached.index === null) {
            return badRequest("stage must be 'fade' or 'solo' for a multiple-choice check on a lesson");
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
        answer: chosenText ?? String(chosenIndex),
        verdict,
        feedback,
        classification: "none",
        confidence,
      });
      if (prior) return ok(prior);
      return ok({ verdict, feedback, classification: "none", missedParts: [], attempt });
    }

    if (format === "open") {
      const { answer, taughtText } = body;
      if (!answer || !taughtText) {
        return badRequest("answer and taughtText are required for format 'open'");
      }
      try {
        await checkRateLimit("grade_open", authUser.id, { max: 40, windowMinutes: 10 });
      } catch (err) {
        if (err instanceof RateLimitError) return tooManyRequests(err.message);
        throw err;
      }
      await recordAuthEvent("grade_open", authUser.id);
      // REQ-076: grade in the voice of the learner's actual track/exam.
      const ctx = objectiveId
        ? await coachContextForObjective(objectiveId)
        : unitId
          ? await coachContextForUnit(unitId)
          : null;
      const { system, user } = gradeFreeResponsePrompt({
        taughtText,
        question,
        answer,
        ctx: ctx ?? undefined,
      });
      const graded = await callClaudeJSON<GradeResult>({
        system,
        messages: [{ role: "user", content: user }],
        maxTokens: 800,
        model: getFastModel(),
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

    return badRequest("format must be 'mc' or 'open' (use /api/pbq for PBQ grading)");
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
