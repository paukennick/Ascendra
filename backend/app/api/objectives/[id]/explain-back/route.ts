import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { visibleObjective } from "@/lib/visibility";
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
import { recordGraderMisconception } from "@/lib/understanding-grading";

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
    if (!(await visibleObjective(id, user.id))) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);
    const status = await masteryStatus(user.id, id);
    return ok({
      eligible: isGuidedPlus(status),
      status: status ?? "Not started",
      question: explainBackQuestion(await objectiveTitle(id)),
      last: await lastExplainBack(user.id, id),
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
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
    const objective = await visibleObjective(id, user.id);
    if (!objective) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);
    const body = await req.json().catch(() => ({}));

    const clientAttemptId = validClientAttemptId(body?.clientAttemptId);
    if (clientAttemptId) {
      const prior = await findClientAttempt(user.id, clientAttemptId);
      if (prior) return ok({ ...prior, rubric: null, diagnosis: null, copied: prior.assistReason === "reveal" });
    }

    const answer = body?.answer;
    if (typeof answer !== "string" || !answer.trim()) return badRequest("answer is required");
    if (answer.length > MAX_ANSWER) return badRequest(`answer must be at most ${MAX_ANSWER} characters`);
    if (answer.trim().split(/\s+/).length < MIN_WORDS) {
      return badRequest("Try a few sentences — imagine explaining it to a friend who has never heard of it.");
    }
    const status = await masteryStatus(user.id, id);
    if (!isGuidedPlus(status)) {
      return ok({ error: "Explain-it-back opens once this objective reaches Guided.", eligible: false }, 409);
    }
    const lesson = await getLessonFor(user.id, id);
    if (!lesson?.row.teach) return notFound("No lesson for this objective yet");

    try {
      await checkRateLimit("explain_back", user.id, { max: 20, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("explain_back", user.id);

    const title = await objectiveTitle(id);
    const question = explainBackQuestion(title);
    const copied = copiedShare(answer, lesson.row.teach) >= COPIED_SHARE_LIMIT;
    const graded = await gradeExplainBack({
      objectiveId: id,
      objectiveTitle: title,
      teach: lesson.row.teach,
      question,
      answer,
      userId: user.id,
    });
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
    if (prior) return ok({ ...prior, rubric: null, diagnosis: null, copied: prior.assistReason === "reveal" });
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
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
