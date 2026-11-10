import { ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { getDebrief, requireSimsEnabled, simRouteError } from "@/lib/sims";

export const dynamic = "force-dynamic";

// GET /api/sims/runs/:runId/debrief -- REQ-190: the stored debrief of an ended run.
export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    requireSimsEnabled();
    const { runId } = await params;
    const user = await requireUser(req);
    return ok(await getDebrief(user.id, runId));
  } catch (err) {
    return simRouteError(err);
  }
}
