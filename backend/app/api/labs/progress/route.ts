import { ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid, visibleTrack } from "@/lib/visibility";
import { requireAcknowledgementForTrack } from "@/lib/auth/requireAcknowledgement";
import { LabError, labProgress, listLabs } from "@/lib/labs";
import { labRouteError } from "@/lib/lab-routes";

export const dynamic = "force-dynamic";

// GET /api/labs/progress?trackId= -- REQ-123: a course's lab progress per
// unit: { total, finished, correct, units: [{ unitId, unitTitle, total,
// finished, correct }] }. "correct" is the latest finished run's verdict.
// No model call.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const trackId = new URL(req.url).searchParams.get("trackId");
    if (!isUuid(trackId) || !(await visibleTrack(trackId, user.id))) throw new LabError(404, "Course not found");
    await requireAcknowledgementForTrack(trackId, user.id);
    return ok(labProgress(await listLabs(user.id, { trackId })));
  } catch (err) {
    return labRouteError(err);
  }
}
