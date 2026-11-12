import { ok, badRequest, notFound, unauthorized, serverError, readJson, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { isUuid, visibleTrack, visibleUnit } from "@/lib/visibility";
import { checkLevelUp } from "@/lib/learner-level";

export const dynamic = "force-dynamic";

// POST /api/courses/:id/level/check { unitId } -> { change: LevelChangeView | null }
// REQ-252: called by the lesson after a solo answer. When the unit's recent
// first-try solo answers cross the threshold (lib/learner-level-rules.ts
// LEVEL_UP_WINDOW / LEVEL_UP_MIN_FIRST_TRY_CORRECT), the unit moves up one
// level and the change comes back for its notice and Undo (Nick,
// 2026-11-12: automatic, never silent). Reads graded attempts only; no
// model call. Unauthenticated: 401.
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
    return ok({ change: await checkLevelUp(user.id, id, unit.id) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
