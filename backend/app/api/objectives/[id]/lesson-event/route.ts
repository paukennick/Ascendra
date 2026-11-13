import { ok, badRequest, notFound, unauthorized, serverError, readJson, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { taughtObjective } from "@/lib/visibility";
import { recordEvent } from "@/lib/events";
import { isLessonEvent, lessonEventDetail } from "@/lib/learner-level-rules";

export const dynamic = "force-dynamic";

// POST /api/objectives/:id/lesson-event { event, detail? } -> { recorded: true }
// REQ-252 (design section 8, phase 1 measurement): one lesson step event in
// learner_events -- the hunch shown, answered or skipped, a Teach card
// reached, Guided skipped, a step reached, Key terms opened or closed. The
// detail is rebuilt from a fixed list of keys (level, flow, kind, seconds,
// card, step); anything else in the request is dropped, and no answer text
// is ever stored. First-party only. Unauthenticated: 401.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    if (!isLessonEvent(body?.event)) return badRequest("Unknown lesson event");
    try {
      await consumeRateLimit("lesson_event", user.id, { max: 300, windowMinutes: 10 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    const objective = await taughtObjective(id, user.id);
    if (!objective) return notFound("Objective not found");
    const detail = lessonEventDetail(body?.detail);
    await recordEvent(user.id, body.event, {
      trackId: objective.track_id,
      objectiveId: objective.id,
      detail: detail as Record<string, string | number | boolean>,
    });
    return ok({ recorded: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
