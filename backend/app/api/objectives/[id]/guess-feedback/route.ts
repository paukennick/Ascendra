import { queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, serverError } from "@/lib/http";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { guessFeedbackPrompt, guessFeedbackSchema } from "@/lib/prompts";
import { loadObjective } from "@/lib/lesson-generation";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/objectives/:id/guess-feedback -- compares a learner's pre-teaching
// guess against the objective's actual teaching content and returns a short,
// ungraded comparison. Intentionally separate from /api/grade: this never
// touches attempts or mastery (see the comment on guessFeedbackPrompt in
// backend/lib/prompts.ts for why), so it has none of that route's
// verdict/classification/missedParts shape -- just { feedback }.
//
// Body: { guess: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const guess = typeof body?.guess === "string" ? body.guess.trim() : "";
    if (!guess) return badRequest("guess is required");

    const user = await requireUser(req);
    await requireAcknowledgementForObjective(id, user.id);

    try {
      await checkRateLimit("guess_feedback", user.id, { max: 40, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("guess_feedback", user.id);

    const [lessonRow, objective] = await Promise.all([
      queryOne<{ guess_prompt: string; teach: string }>(
        `select guess_prompt, teach from lesson_content where objective_id = $1`,
        [id]
      ),
      loadObjective(id),
    ]);
    if (!lessonRow) return notFound("No lesson content for this objective yet");

    const { system, user: userPrompt } = guessFeedbackPrompt({
      objectiveTitle: objective?.title ?? "this objective",
      guessPrompt: lessonRow.guess_prompt,
      teach: lessonRow.teach,
      guess,
    });
    const { feedback } = await callClaudeStructured({
      system,
      messages: [{ role: "user", content: userPrompt }],
      schema: guessFeedbackSchema,
      maxTokens: 500,
      disableThinking: true,
      model: getFastModel(),
    });

    return ok({ feedback });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
