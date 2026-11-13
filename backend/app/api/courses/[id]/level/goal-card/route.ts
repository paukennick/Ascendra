import { ok, badRequest, notFound, unauthorized, serverError, readJson, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { isUuid, taughtObjective, visibleTrack } from "@/lib/visibility";
import { goalCardShowing } from "@/lib/learner-level";

export const dynamic = "force-dynamic";

// POST /api/courses/:id/level/goal-card { objectiveId } -> { show, autoDismissed }
// REQ-256: the lesson asks before showing REQ-255's goal card. The server
// counts the lessons it was shown in (learner_events goal_card_shown, once
// per lesson), so a reinstall or a cleared device does not reset the count.
// After GOAL_CARD_MAX_SHOWINGS lessons without an answer or "Not now", it is
// recorded dismissed the way "Not now" is (course_goal_set: outcome
// dismissed, via lesson, reason auto) and `show` is false from then on.
// No model call. Unauthenticated: 401.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    if (!isUuid(body?.objectiveId)) return badRequest("objectiveId is required");
    try {
      await consumeRateLimit("lesson_event", user.id, { max: 300, windowMinutes: 10 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    if (!(await visibleTrack(id, user.id))) return notFound("Course not found");
    const objective = await taughtObjective(body.objectiveId, user.id);
    if (!objective || objective.track_id !== id) return notFound("Objective not found");
    return ok(await goalCardShowing(user.id, id, objective.id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
