import { ok, badRequest, conflict, notFound, unauthorized, serverError, readJson, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { isUuid, visibleTrack, visibleUnit } from "@/lib/visibility";
import { answerLevelDownSuggestion, levelState, SuggestionError } from "@/lib/learner-level";

export const dynamic = "force-dynamic";

// POST /api/courses/:id/level/suggestion { unitId, answer: "yes" | "not_now" }
//   -> { change: LevelChangeView | null, state: LevelState }
// REQ-256: the learner's answer to "This unit seems tougher than expected.
// Want more step-by-step help here?" (asked by POST .../level/check). Yes
// moves the unit down one level (never below New), recorded in
// learner_level_changes with reason 'suggested' so Undo
// (POST .../level/changes/:changeId) puts it back; Not now snoozes the
// question for that unit for a week. Only an open suggestion can be
// answered (409 otherwise); repeating the same answer changes nothing. No
// model call. Unauthenticated: 401.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    const answer = body?.answer;
    if (answer !== "yes" && answer !== "not_now") return badRequest("answer must be yes or not_now");
    if (!isUuid(body?.unitId)) return badRequest("unitId is required");
    try {
      await consumeRateLimit("level_save", user.id, { max: 60, windowMinutes: 10 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    if (!(await visibleTrack(id, user.id))) return notFound("Course not found");
    const unit = await visibleUnit(body.unitId, user.id);
    if (!unit || unit.track_id !== id) return notFound("Unit not found");
    let change;
    try {
      ({ change } = await answerLevelDownSuggestion(user.id, id, unit.id, answer));
    } catch (err) {
      if (err instanceof SuggestionError) return conflict(err.message);
      throw err;
    }
    return ok({ change, state: await levelState(user.id, id, unit.id) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
