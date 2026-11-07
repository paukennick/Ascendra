import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, serverError } from "@/lib/http";
import { gradeFreeResponse } from "@/lib/free-response-grader";
import {
  findClientAttempt,
  lessonCheckFor,
  recordAttemptIdempotent,
  type LessonCheck,
} from "@/lib/grading-service";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { visibleObjective } from "@/lib/visibility";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForObjective } from "@/lib/coach-context";
import { presentationOrder, presentationSeed, shownIndexOf, storedIndexAt } from "@/lib/choice-order";

export const dynamic = "force-dynamic";

const MAX_ANSWER = 8000;

// POST /api/grade -- grades one answer to a lesson's Guided ("fade") or Solo
// ("solo") check and records the attempt, the mastery update and (if not
// correct) a spaced-review entry. PBQs have their own route (/api/pbq).
//
// REQ-097: grading is entirely server-side. The question, the teaching text
// and the answer key come from the lesson this learner was shown; the app
// sends only which check it is and its answer. Fields older clients send
// (question, taughtText, correctIndex, chosenText, why) are ignored. The
// answer key and explanation are returned only with the verdict.
//
//   { clientAttemptId?, format: "mc",   objectiveId, stage, chosenIndex, confidence? }
//   { clientAttemptId?, format: "open", objectiveId, stage, answer,      confidence? }
//
// chosenIndex is a position in the order the choices were shown, which is
// this learner's fixed shuffle (lib/choice-order.ts).
//
// Returns { verdict, feedback, classification, missedParts, assisted,
//   assistReason, correctIndex (shown order), correctAnswer, why, attempt }.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { format, stage, objectiveId, unitId, confidence } = body ?? {};
    const kind = body?.kind ?? "lesson";

    if (format !== "mc" && format !== "open") {
      return badRequest("format must be 'mc' or 'open' (use /api/pbq for PBQ grading)");
    }
    if (kind !== "lesson") return badRequest("only lesson checks are graded here");
    if (typeof objectiveId !== "string" || !objectiveId) return badRequest("objectiveId is required");
    if (stage !== "fade" && stage !== "solo") return badRequest("stage must be 'fade' or 'solo'");
    if (unitId !== undefined && unitId !== null && typeof unitId !== "string") return badRequest("unitId must be a string");

    const authUser = await requireUser(req);

    // REQ-091: ids in the body are untrusted; the objective must be in a track
    // the caller can see, and a unitId sent alongside must be its own unit.
    const objective = await visibleObjective(objectiveId, authUser.id);
    if (!objective) return notFound("Objective not found");
    if (unitId && objective.unit_id !== unitId) return badRequest("objectiveId does not belong to unitId");
    await requireAcknowledgementForObjective(objectiveId, authUser.id);

    const found = await lessonCheckFor(authUser.id, objectiveId, stage);
    if (found.status === "no-lesson") return notFound("No lesson for this objective yet");
    if (found.status !== "ok") {
      return badRequest("This lesson's practice questions are still being generated -- try again in a moment.");
    }
    const check = found.check;
    const order = presentationOrder(presentationSeed(authUser.id, objectiveId, stage, check.question), check.choices.length);
    const reveal = {
      correctIndex: shownIndexOf(order, check.correctIndex),
      correctAnswer: check.choices[check.correctIndex] ?? null,
      why: check.why || null,
    };

    // REQ-089: an id the app already submitted is a retry -- hand back the
    // stored result rather than grading again. Checked before the rate limit
    // and the model call. The key is added back only if the stored attempt was
    // for the question this lesson still has (a regenerate changes it).
    const clientAttemptId = validClientAttemptId(body.clientAttemptId);
    if (clientAttemptId) {
      const prior = await findClientAttempt(authUser.id, clientAttemptId);
      if (prior) return ok(withReveal(prior, check, reveal));
    }
    const record = (input: Parameters<typeof recordAttemptIdempotent>[0]) =>
      recordAttemptIdempotent({ ...input, clientAttemptId });
    const common = { userId: authUser.id, unitId: objective.unit_id, objectiveId, kind: "lesson" as const, stage, confidence };

    if (format === "mc") {
      const stored = storedIndexAt(order, body.chosenIndex);
      if (stored === null) return badRequest(`chosenIndex must be 0-${check.choices.length - 1}`);
      const correct = stored === check.correctIndex;
      const verdict = correct ? "correct" : "incorrect";
      const feedback = `${correct ? "That's right." : "Not quite."} ${check.why}`.trim();
      const { attempt, prior } = await record({
        ...common,
        format: "mc",
        question: check.question,
        answer: check.choices[stored],
        verdict,
        feedback,
        classification: "none",
      });
      if (prior) return ok(withReveal(prior, check, reveal));
      return ok({ verdict, feedback, classification: "none", missedParts: [], ...assistOf(attempt), ...reveal, attempt });
    }

    const answer = body.answer;
    if (typeof answer !== "string" || !answer.trim()) return badRequest("answer is required for format 'open'");
    if (answer.length > MAX_ANSWER) return badRequest(`answer must be at most ${MAX_ANSWER} characters`);
    try {
      await checkRateLimit("grade_open", authUser.id, { max: 40, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("grade_open", authUser.id);
    // REQ-076: grade in the voice of the learner's actual track/exam.
    const ctx = await coachContextForObjective(objectiveId);
    const graded = await gradeFreeResponse({
      taughtText: check.teach,
      question: check.question,
      answerKey: answerKeyText(check),
      answer,
      ctx: ctx ?? undefined,
      userId: authUser.id,
    });
    const { attempt, prior } = await record({
      ...common,
      format: "open",
      question: check.question,
      answer,
      verdict: graded.verdict,
      feedback: graded.feedback,
      classification: graded.classification,
      missedParts: graded.missedParts ?? [],
    });
    if (prior) return ok(withReveal(prior, check, reveal));
    return ok({ ...graded, ...assistOf(attempt), ...reveal, attempt });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

function answerKeyText(check: LessonCheck): string {
  const right = check.choices[check.correctIndex];
  return check.why ? `${right}\nWhy: ${check.why}` : right;
}

function assistOf(attempt: Record<string, unknown> | null) {
  return {
    assisted: attempt?.assisted === true,
    assistReason: (attempt?.assist_reason as string | null | undefined) ?? null,
  };
}

function withReveal<T extends { attempt: Record<string, unknown> }>(
  prior: T,
  check: LessonCheck,
  reveal: { correctIndex: number; correctAnswer: string | null; why: string | null }
) {
  return prior.attempt.question === check.question && prior.attempt.stage === check.stage ? { ...prior, ...reveal } : prior;
}
