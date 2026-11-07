import { ok, badRequest } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid, visibleObjective, visibleTrack, visibleUnit } from "@/lib/visibility";
import {
  requireAcknowledgementForObjective,
  requireAcknowledgementForTrack,
  requireAcknowledgementForUnit,
} from "@/lib/auth/requireAcknowledgement";
import { LabError, listLabs, type LabScope } from "@/lib/labs";
import { labRouteError } from "@/lib/lab-routes";

export const dynamic = "force-dynamic";

// GET /api/labs?trackId= | ?unitId= | ?objectiveId= -- REQ-123: the
// verifiable labs this learner can open in a course, unit or objective, with
// their own state on each (new / in progress / done, last verdict). No model
// call. Returns { labs: [...] }.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    const unitId = searchParams.get("unitId");
    const objectiveId = searchParams.get("objectiveId");
    const given = [trackId, unitId, objectiveId].filter((v) => v !== null);
    if (given.length !== 1) return badRequest("pass exactly one of trackId, unitId or objectiveId");
    let scope: LabScope;
    if (trackId !== null) {
      if (!isUuid(trackId) || !(await visibleTrack(trackId, user.id))) throw new LabError(404, "Course not found");
      await requireAcknowledgementForTrack(trackId, user.id);
      scope = { trackId };
    } else if (unitId !== null) {
      if (!isUuid(unitId) || !(await visibleUnit(unitId, user.id))) throw new LabError(404, "Unit not found");
      await requireAcknowledgementForUnit(unitId, user.id);
      scope = { unitId };
    } else {
      if (!isUuid(objectiveId) || !(await visibleObjective(objectiveId!, user.id))) throw new LabError(404, "Objective not found");
      await requireAcknowledgementForObjective(objectiveId!, user.id);
      scope = { objectiveId: objectiveId! };
    }
    return ok({ labs: await listLabs(user.id, scope) });
  } catch (err) {
    return labRouteError(err);
  }
}
