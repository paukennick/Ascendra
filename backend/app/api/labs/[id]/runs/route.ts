import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { requireAcknowledgementForObjective } from "@/lib/auth/requireAcknowledgement";
import { LabError, labView, openRun, visibleLab } from "@/lib/labs";
import { gateLab, labRouteError } from "@/lib/lab-routes";

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
    const restart = body?.restart === true;
    // REQ-124: resuming an open run is always allowed (an attempt in
    // progress may be finished); a new run needs Pro or the sample.
    const access = await gateLab(user.id, lab, restart ? "start" : "resume");
    const run = await openRun(user.id, lab.id, restart);
    return ok(await labView(lab, user.id, run.id, access));
  } catch (err) {
    return labRouteError(err);
  }
}
