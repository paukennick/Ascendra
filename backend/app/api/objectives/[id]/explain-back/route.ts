import { consumeGradedAnswer } from "@/lib/ai-access";
import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, conflict, serverError } from "@/lib/http";
import { requireStudyNotice } from "@/lib/study-notice";
import { replayMatches, REPLAY_CONFLICT } from "@/lib/replay-binding";
import { hasUnstorableText } from "@/lib/text-input";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { taughtObjective } from "@/lib/visibility";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { getLessonFor } from "@/lib/lesson-store";
import { queryOne } from "@/lib/db";
import { findClientAttempt, recordAttemptIdempotent } from "@/lib/grading-service";
import {
  copiedShare,
  COPIED_SHARE_LIMIT,
  EXPLAIN_BACK_REPEAT_WINDOW_HOURS,
  explainBackQuestion,
  isGuidedPlus,
} from "@/lib/understanding";
import { lastExplainBack, masteryStatus } from "@/lib/understanding-store";
import { gradeExplainBack } from "@/lib/understanding-ai";
import { withGradingClaim, GradingInProgressError } from "@/lib/grading-claims";
import { recordGraderMisconception } from "@/lib/understanding-grading";
import { consumeAllowance, featureLock, requireFeature } from "@/lib/entitlements";

// REQ-202: seconds this route may run (one fast-model grade). Never above 300, the Hobby
// plan ceiling with Fluid compute (docs/billing.md, "Function duration").
export const maxDuration = 120;

export const dynamic = "force-dynamic";

const MAX_ANSWER = 4000;
const MIN_WORDS = 8;

async function objectiveTitle(id: string): Promise<string> {
  return (await queryOne<{ title: string }>(`select title from objectives where id = $1`, [id]))?.title ?? "";
}

// GET /api/objectives/:id/explain-back -- REQ-111 explain-it-back: whether it
// is open for this learner (the objective is at Guided or above), the prompt,
// and their last explanation's verdict and feedback.
// Returns { eligible, status, question, last }.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!(await taughtObjective(id, user.id))) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);
    const status = await masteryStatus(user.id, id);
    // REQ-122: not in this learner's plan -- shown as not open, with why.
    const locked = await featureLock(user.id, "explain_back", { objectiveId: id });
    return ok({
      ...(locked ? { locked } : {}),
      eligible: !locked && isGuidedPlus(status),
      status: status ?? "Not started",
      question: explainBackQuestion(await objectiveTitle(id)),
      last: await lastExplainBack(user.id, id),
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    if (err instanceof GradingInProgressError) return conflict(err.message);
    return serverError(err);
  }
}

// POST /api/objectives/:id/explain-back -- grades one explanation.
// Body: { answer, clientAttemptId? }.
//
// Graded by the fast model against the objective's cached teaching (the
// lesson this learner is served) on four checks: correct, complete, key terms
// used correctly, no misconception. The learner's text is fenced as data.
// Recorded as an attempt (kind quiz, stage explain, format open,
// assessment_type explain_back), so it counts as application-level evidence
// in the weighted model. Assisted when:
//   - repeat: another explanation of this objective within the last 24 hours
//     (the feedback just named the gaps); a day or more later counts in full
//   - reveal: at least half of it is copied word for word from the teaching
//     (lib/understanding.ts copiedShare) -- graded, but not their own words
// Open only at Guided or above (409 otherwise).
//
// Returns { verdict, feedback, missedParts, rubric, diagnosis, assisted,
//   assistReason, copied }.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    // REQ-205 (FAIL-907): this route sends what the learner wrote to the model, so
    // the study notice that says so must have been accepted -- checked here, not
    // only in the app.
    await requireStudyNotice(user.id);
    const objective = await taughtObjective(id, user.id);
    if (!objective) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);
    const tier = await requireFeature(user.id, "explain_back", { objectiveId: objective.id }); // REQ-122, REQ-170
    const body = await req.json().catch(() => ({}));

    const clientAttemptId = validClientAttemptId(body?.clientAttemptId);
    // REQ-116: only a replay of this objective's explain-back.
    // REQ-218: and only of the same explanation -- the stored answer must be
    // the text sent now, or the id is refused (the new text was never graded).
    const sentAnswer = typeof body?.answer === "string" ? (body.answer as string) : null;
    const replayStored = async () => {
      const prior = clientAttemptId && sentAnswer !== null ? await findClientAttempt(user.id, clientAttemptId) : null;
      if (!prior) return null;
      if (!replayMatches(prior.attempt, { objectiveId: id, kind: "quiz", stage: "explain", answer: sentAnswer! })) {
        return conflict(REPLAY_CONFLICT);
      }
      return ok({ ...prior, rubric: null, diagnosis: null, copied: prior.assistReason === "reveal" });
    };
    const done = await replayStored();
    if (done) return done;

    const answer = body?.answer;
    if (typeof answer !== "string" || !answer.trim()) return badRequest("answer is required");
    if (answer.length > MAX_ANSWER) return badRequest(`answer must be at most ${MAX_ANSWER} characters`);
    // REQ-116: a NUL or lone surrogate can't be stored; refuse it before the
    // billed model call rather than failing after it.
    if (hasUnstorableText(answer)) return badRequest("answer contains characters that can't be stored");
    if (answer.trim().split(/\s+/).length < MIN_WORDS) {
      return badRequest("Try a few sentences — imagine explaining it to a friend who has never heard of it.");
    }
    const status = await masteryStatus(user.id, id);
    if (!isGuidedPlus(status)) {
      return ok({ error: "Explain-it-back opens once this objective reaches Guided.", eligible: false }, 409);
    }
    const lesson = await getLessonFor(user.id, id);
    if (!lesson?.row.teach) return notFound("No lesson for this objective yet");

    // REQ-120 (FAIL-431): copies of one explanation sent at once share one
    // grader call (lib/grading-claims.ts); the others replay the stored result.
    const gradeAndRecord = async () => {
      try {
        // REQ-135 / FAIL-230: atomic count-and-record.
        await consumeRateLimit("explain_back", user.id, { max: 20, windowMinutes: 10 }, { userId: user.id });
      } catch (err) {
        if (err instanceof RateLimitError) return tooManyRequests(err.message);
        throw err;
      }

      const title = await objectiveTitle(id);
      const question = explainBackQuestion(title);
      const copied = copiedShare(answer, lesson.row.teach) >= COPIED_SHARE_LIMIT;
      // Nick, 2026-11-07 (decision 9): an explanation counts against the same
      // daily allowance as a graded typed answer (only a tier with a count
      // limit is counted; given back if grading fails).
      const use = await consumeGradedAnswer(user.id, () => consumeAllowance(user.id, "graded_answer", tier)); // REQ-201
      let graded: Awaited<ReturnType<typeof gradeExplainBack>>;
      try {
        graded = await gradeExplainBack({
          objectiveId: id,
          objectiveTitle: title,
          teach: lesson.row.teach,
          question,
          answer,
          userId: user.id,
        });
      } catch (err) {
        await use.release();
        throw err;
      }
      const feedback = copied
        ? `${graded.feedback}\n\nMuch of this matches the lesson text word for word. Try it again in your own words later for full credit — putting it your way is what makes it stick.`
        : graded.feedback;
      const { attempt, prior } = await recordAttemptIdempotent({
        userId: user.id,
        unitId: objective.unit_id,
        objectiveId: id,
        kind: "quiz",
        stage: "explain",
        format: "open",
        question,
        answer,
        verdict: graded.verdict,
        feedback,
        classification: graded.classification,
        missedParts: graded.missedParts ?? [],
        assessmentType: "explain_back",
        assist: copied ? "reveal" : null,
        repeatWindowHours: EXPLAIN_BACK_REPEAT_WINDOW_HOURS,
        clientAttemptId,
      });
      if (prior) return (await replayStored()) ?? ok({ ...prior, rubric: null, diagnosis: null, copied: prior.assistReason === "reveal" });
      const diagnosis = await recordGraderMisconception({
        userId: user.id,
        objectiveId: id,
        attemptId: attempt.id,
        verdict: graded.verdict,
        misconception: graded.misconception,
        confusedWith: graded.confusedWith,
      });
      return ok({
        verdict: graded.verdict,
        feedback,
        missedParts: graded.missedParts ?? [],
        rubric: graded.rubric,
        diagnosis,
        assisted: attempt.assisted === true,
        assistReason: attempt.assist_reason ?? null,
        copied,
      });
    };
    return await withGradingClaim(user.id, clientAttemptId, gradeAndRecord, replayStored);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    if (err instanceof GradingInProgressError) return conflict(err.message);
    return serverError(err);
  }
}
