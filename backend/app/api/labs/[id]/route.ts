import { ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { requireAcknowledgementForObjective } from "@/lib/auth/requireAcknowledgement";
import { LabError, labView, visibleLab } from "@/lib/labs";
import { gateLab, labRouteError } from "@/lib/lab-routes";

export const dynamic = "force-dynamic";

// GET /api/labs/:id[?runId=] -- REQ-123: one lab as this learner sees it:
// the brief, the steps revealed so far (a case's later steps stay hidden
// until the earlier ones are graded), and their open run -- or latest
// finished run -- with each graded step's per-part result and the rubric's
// reference answers for those steps only. No model call.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!isUuid(id)) throw new LabError(404, "Lab not found");
    const lab = await visibleLab(id, user.id);
    if (!lab) throw new LabError(404, "Lab not found");
    await requireAcknowledgementForObjective(lab.objective_id, user.id);
    const access = await gateLab(user.id, lab, "view"); // REQ-124: Pro, or this course's sample
    const runId = new URL(req.url).searchParams.get("runId");
    if (runId !== null && !isUuid(runId)) throw new LabError(404, "Run not found");
    return ok(await labView(lab, user.id, runId, access));
  } catch (err) {
    return labRouteError(err);
  }
}
