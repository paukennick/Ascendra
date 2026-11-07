import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { requireAcknowledgementForObjective } from "@/lib/auth/requireAcknowledgement";
import { LabError, labView, openRun, visibleLab } from "@/lib/labs";
import { labRouteError } from "@/lib/lab-routes";

export const dynamic = "force-dynamic";

// POST /api/labs/:id/runs { restart?: boolean } -- REQ-123: start (or
// resume) a run of this lab. Without restart the open run comes back, so a
// double tap or a second device never makes two. restart: true abandons the
// open run and starts a new one; any step graded before makes the new run's
// result a repeat (lib/grading-service.ts labAssistReason). No model call.
// Returns the lab view for the run.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req).catch(() => null);
    const user = await requireUser(req);
    if (!isUuid(id)) throw new LabError(404, "Lab not found");
    const lab = await visibleLab(id, user.id);
    if (!lab) throw new LabError(404, "Lab not found");
    await requireAcknowledgementForObjective(lab.objective_id, user.id);
    const run = await openRun(user.id, lab.id, body?.restart === true);
    return ok(await labView(lab, user.id, run.id));
  } catch (err) {
    return labRouteError(err);
  }
}
