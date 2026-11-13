import { ok, badRequest, notFound, unauthorized, serverError, readJson, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { isUuid, visibleTrack, visibleUnit } from "@/lib/visibility";
import { checkLevelDownSuggestion, checkLevelUp } from "@/lib/learner-level";

export const dynamic = "force-dynamic";

// POST /api/courses/:id/level/check { unitId, suggest? }
//   -> { change: LevelChangeView | null, suggestion: LevelDownSuggestion | null }
// REQ-252: called by the lesson after a solo answer. When the unit's recent
// first-try solo answers cross the threshold (lib/learner-level-rules.ts
// LEVEL_UP_WINDOW / LEVEL_UP_MIN_FIRST_TRY_CORRECT), the unit moves up one
// level and the change comes back for its notice and Undo (Nick,
// 2026-11-12: automatic, never silent). Reads graded attempts only; no
// model call. Unauthenticated: 401.
//
// REQ-256: when nothing moved up and the app sends `suggest: true` (it can
// show the question; older builds never send it, so nothing is recorded for
// them), the same moment may bring a move-down SUGGESTION -- never a change
// -- when the unit's recent answers show it is tougher than expected
// (lib/learner-level-rules.ts LEVEL_DOWN_*). The learner answers it with
// POST /api/courses/:id/level/suggestion.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    try {
      await consumeRateLimit("level_check", user.id, { max: 120, windowMinutes: 10 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    if (!(await visibleTrack(id, user.id))) return notFound("Course not found");
    const unitId = body?.unitId;
    if (!isUuid(unitId)) return badRequest("unitId is required");
    const unit = await visibleUnit(unitId, user.id);
    if (!unit || unit.track_id !== id) return notFound("Unit not found");
    const change = await checkLevelUp(user.id, id, unit.id);
    const suggestion = !change && body?.suggest === true ? await checkLevelDownSuggestion(user.id, id, unit.id) : null;
    return ok({ change, suggestion });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
