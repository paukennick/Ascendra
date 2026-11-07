import { ok, badRequest } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { todaySummary } from "@/lib/review-service";
import { readyUnitChecks } from "@/lib/unit-check";
import { optionalTrackId, reviewRouteError } from "@/lib/review-routes";

export const dynamic = "force-dynamic";

// GET /api/review/today?trackId= -- REQ-108: what Review shows before a
// session starts. Counts only, never the list of due objectives: the screen
// says "N for today" rather than showing a wall of them.
//   { dueCount, forToday, nextDueOn, unitChecks: [{unitId, unitTitle, trackId, trackTitle, lastVerdict}] }
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const trackId = optionalTrackId(new URL(req.url).searchParams.get("trackId"));
    if (trackId === undefined) return badRequest("trackId must be a UUID");
    const summary = await todaySummary(user.id, trackId);
    const checks = await readyUnitChecks(user.id, trackId);
    return ok({
      ...summary,
      unitChecks: checks.map((c) => ({
        unitId: c.unit_id,
        unitTitle: c.unit_title,
        trackId: c.track_id,
        trackTitle: c.track_title,
        lastVerdict: c.last_verdict,
      })),
    });
  } catch (err) {
    return reviewRouteError(err);
  }
}
