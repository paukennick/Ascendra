import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { requireAcknowledgementForObjective } from "@/lib/auth/requireAcknowledgement";
import { LabError, visibleLab } from "@/lib/labs";
import { labRouteError } from "@/lib/lab-routes";
import { acknowledgeLabDisclaimer } from "@/lib/lab-disclaimer";

export const dynamic = "force-dynamic";

// POST /api/labs/:id/acknowledgement { version } -- REQ-125: the learner
// accepts the practice-lab disclaimer for this lab's subject family
// (clinical or fitness), once per family and disclaimer version. `version`
// is the one the app showed (GET /api/labs/:id -> disclaimer.version); a
// superseded one is refused. A general lab needs none (400). No model call.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req).catch(() => null);
    const user = await requireUser(req);
    if (!isUuid(id)) throw new LabError(404, "Lab not found");
    const lab = await visibleLab(id, user.id);
    if (!lab) throw new LabError(404, "Lab not found");
    await requireAcknowledgementForObjective(lab.objective_id, user.id);
    const acknowledgedAt = await acknowledgeLabDisclaimer(user.id, lab.safety_family, body?.version);
    return ok({ acknowledged: true, family: lab.safety_family, acknowledgedAt }, 201);
  } catch (err) {
    return labRouteError(err);
  }
}
