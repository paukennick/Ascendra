import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, conflict, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { visibleObjective } from "@/lib/visibility";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForObjective } from "@/lib/coach-context";
import { gradeFreeResponse } from "@/lib/free-response-grader";
import { findClientAttempt, recordAttemptIdempotent } from "@/lib/grading-service";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { labAnswersFor, labObjective, labQuestionsFor } from "@/lib/lesson-experience";
import { labReportAnswer, labReportQuestion, labReportTaughtText } from "@/lib/prompts";
import { hasUnstorableText } from "@/lib/text-input";
import { withGradingClaim, GradingInProgressError } from "@/lib/grading-claims";
import { replayMatches, REPLAY_CONFLICT } from "@/lib/replay-binding";
import { consumeAllowance, requireFeature } from "@/lib/entitlements";
import { LABS_FEATURE } from "@/lib/labs";

// REQ-202: seconds this route may run (questions then grade). Never above 300, the Hobby
// plan ceiling with Fluid compute (docs/billing.md, "Function duration").
export const maxDuration = 120;

export const dynamic = "force-dynamic";

// POST /api/objectives/:id/lab/report -- REQ-106 (research #7): grades a lab
// report with the existing free-response grader, in ONE call for all its
// questions (graded as a multi-part question, so a skipped part is named),
// and records it as an attempt of kind 'lab'.
//
// NOT MASTERY EVIDENCE on this branch: the attempt keeps objective_id NULL
// and points at the objective through lab_objective_id (migration 035), so
// mastery_from_attempts never reads it and the level cannot move either way.
// The weighted mastery model will decide later what a self-reported lab is
// worth. It also adds no spaced-review entry (grading-service.ts).
//
// Learner text reaches the model only inside fenceLearnerText (via
// gradeFreeResponsePrompt). The questions come from the server's own cache,
// never from the request.
//
// Body: { clientAttemptId?, answers: string[] } (one per question shown).
// Returns { verdict, feedback, missedParts, modelAnswer?, fixNext?, attempt }.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const user = await requireUser(req);
    if (!(await visibleObjective(id, user.id))) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);
    const tier = await requireFeature(user.id, LABS_FEATURE, { objectiveId: id }); // REQ-122, REQ-170
    const obj = await labObjective(id);
    const prompt = obj?.lab_prompt?.trim();
    if (!obj || !prompt) return notFound("This objective has no lab");

    // A resend of a report the server already graded gets that result back,
    // before the rate limit and the model call (same rule as /api/grade).
    const clientAttemptId = validClientAttemptId(body?.clientAttemptId);
    const replayStored = async () => {
      const prior = clientAttemptId ? await findClientAttempt(user.id, clientAttemptId) : null;
      if (!prior) return null;
      // REQ-121 (FAIL-441): a mismatch is the shared 409, as on grade, review,
      // unit check and explain-back (was a 400 with its own wording).
      if (!replayMatches(prior.attempt as Record<string, unknown>, { kind: "lab", stage: "lab", labObjectiveId: id })) {
        return conflict(REPLAY_CONFLICT);
      }
      return ok(prior);
    };
    const done = await replayStored();
    if (done) return done;

    // REQ-120 (FAIL-432): copies of one report sent at once share one grader
    // call (lib/grading-claims.ts); the others replay the stored result.
    const gradeAndRecord = async () => {
      try {
        // REQ-135 / FAIL-230: atomic count-and-record (was check, then record later).
        await consumeRateLimit("grade_open", user.id, { max: 40, windowMinutes: 10 }, { userId: user.id });
      } catch (err) {
        if (err instanceof RateLimitError) return tooManyRequests(err.message);
        throw err;
      }

      const ctx = await coachContextForObjective(id);
      const questions = await labQuestionsFor(id, obj.title, prompt, ctx ?? undefined, user.id);
      const answers = labAnswersFor(body?.answers, questions.length);
      if (typeof answers === "string") return badRequest(answers);
      // REQ-116: refused before the billed model call.
      if (answers.some(hasUnstorableText)) return badRequest("an answer contains characters that can't be stored");

      const question = labReportQuestion(questions);
      const answer = labReportAnswer(answers);
      // Nick, 2026-11-07 (decision 9): a lab report counts against the same
      // daily allowance as a graded typed answer; given back if grading fails.
      const use = await consumeAllowance(user.id, "graded_answer", tier);
      let graded: Awaited<ReturnType<typeof gradeFreeResponse>>;
      try {
        graded = await gradeFreeResponse({
          taughtText: labReportTaughtText(obj.title, prompt),
          question,
          answer,
          ctx: ctx ?? undefined,
          userId: user.id,
          purpose: "lab_grade",
        });
      } catch (err) {
        await use.release();
        throw err;
      }
      const { attempt, prior } = await recordAttemptIdempotent({
        userId: user.id,
        unitId: obj.unit_id,
        objectiveId: null,
        labObjectiveId: id,
        kind: "lab",
        stage: "lab",
        format: "open",
        question,
        answer,
        verdict: graded.verdict,
        feedback: graded.feedback,
        classification: graded.classification,
        missedParts: graded.missedParts ?? [],
        modelAnswer: graded.modelAnswer ?? null,
        fixNext: graded.fixNext ?? null,
        clientAttemptId,
      });
      if (prior) return (await replayStored()) ?? ok(prior);
      return ok({ ...graded, attempt });
    };
    return await withGradingClaim(user.id, clientAttemptId, gradeAndRecord, replayStored);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    if (err instanceof GradingInProgressError) return conflict(err.message);
    return serverError(err);
  }
}
