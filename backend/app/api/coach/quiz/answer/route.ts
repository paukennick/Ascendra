import { ok, badRequest, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { isUuid } from "@/lib/visibility";
import { queryOne } from "@/lib/db";
import { answerQuizTurn } from "@/lib/coach-quiz";

export const dynamic = "force-dynamic";

// POST /api/coach/quiz/answer { turnId, choice, clientAttemptId? } -- grade one
// try at a "Quiz me" question. choice is the position the learner saw; the
// server maps it back through their shuffle. Returns the feedback (a graded
// hint after a miss, the explanation once closed) and the turn's new state.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const turnId = body?.turnId;
    if (!isUuid(turnId)) return badRequest("turnId is required");
    const user = await requireUser(req);
    const owned = await queryOne<{ track_id: string }>(`select track_id from coach_quiz_turns where id = $1 and user_id = $2`, [
      turnId,
      user.id,
    ]);
    if (!owned) return notFound("Quiz question not found");
    await requireAcknowledgementForTrack(owned.track_id, user.id);

    const result = await answerQuizTurn(user.id, turnId, body.choice, validClientAttemptId(body.clientAttemptId));
    if (result.status === "not_found") return notFound("Quiz question not found");
    if (result.status === "bad_choice") return badRequest("choice must be one of the options shown");
    if (result.status === "closed") return ok({ turn: result.turn, closed: true });
    return ok({ turn: result.turn, correct: result.correct, message: result.message, replayed: result.replayed });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
