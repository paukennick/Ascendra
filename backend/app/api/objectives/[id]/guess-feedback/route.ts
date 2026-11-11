import { getLessonFor } from "@/lib/lesson-store";
import { requireStudyNotice } from "@/lib/study-notice";
import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, serverError, readJson } from "@/lib/http";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { guessFeedbackPrompt, guessFeedbackSchema } from "@/lib/prompts";
import { loadObjective } from "@/lib/lesson-generation";
import { taughtObjective } from "@/lib/visibility";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { textField, TEXT_LIMITS } from "@/lib/text-input";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { requireCourseAccessForObjective } from "@/lib/entitlements";

// REQ-202: seconds this route may run (one fast-model call). Never above 300, the Hobby
// plan ceiling with Fluid compute (docs/billing.md, "Function duration").
export const maxDuration = 120;

export const dynamic = "force-dynamic";

// POST /api/objectives/:id/guess-feedback -- compares a learner's pre-teaching
// guess against the objective's actual teaching content and returns a short,
// ungraded comparison. Intentionally separate from /api/grade: this never
// touches attempts or mastery (see the comment on guessFeedbackPrompt in
// backend/lib/prompts.ts for why), so it has none of that route's
// verdict/classification/missedParts shape -- just { feedback, guessMatch }.
//
// Body: { guess: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const guess = typeof body?.guess === "string" ? body.guess.trim() : "";
    if (!guess) return badRequest("guess is required");
    // REQ-135: bounded before it goes into a model prompt.
    const g = textField(guess, "guess", TEXT_LIMITS.answer, { required: true });
    if (!g.ok) return badRequest(g.error);

    const user = await requireUser(req);
    // REQ-205 (FAIL-907): this route sends what the learner wrote to the model, so
    // the study notice that says so must have been accepted -- checked here, not
    // only in the app.
    await requireStudyNotice(user.id);
    // REQ-129: 404 for an objective in another user's private track, before
    // anything is read, rate-limited or sent to Anthropic.
    if (!(await taughtObjective(id, user.id))) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);
    await requireCourseAccessForObjective(user.id, id); // REQ-122: Free studies one course

    try {
      await consumeRateLimit("guess_feedback", user.id, { max: 40, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }

    const [lessonRow, objective] = await Promise.all([
      // The lesson this learner actually saw: their regenerated one if any.
      getLessonFor(user.id, id).then((r) => (r ? { guess_prompt: r.row.guess_prompt, teach: r.row.teach } : null)),
      loadObjective(id),
    ]);
    if (!lessonRow) return notFound("No lesson content for this objective yet");

    const { system, user: userPrompt } = guessFeedbackPrompt({
      objectiveTitle: objective?.title ?? "this objective",
      guessPrompt: lessonRow.guess_prompt,
      teach: lessonRow.teach,
      guess,
      ctx: objective?.ctx ?? undefined,
    });
    const { feedback, guessMatch } = await callClaudeStructured({
      system,
      messages: [{ role: "user", content: userPrompt }],
      schema: guessFeedbackSchema,
      maxTokens: 500,
      model: getFastModel(),
      effort: "low",
      thinking: "off",
      purpose: "guess_feedback",
      userId: user.id,
    });

    // REQ-106: guessMatch only steers the optional "skip Guided" / "full
    // worked example" suggestion in the app. Not a verdict, not recorded.
    return ok({ feedback, guessMatch: guessMatch ?? null });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message, err.extra);
    return serverError(err);
  }
}
