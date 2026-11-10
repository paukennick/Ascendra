import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { gradeReasoning, requireSimsEnabled, simRouteError } from "@/lib/sims";

export const dynamic = "force-dynamic";

// POST /api/sims/runs/:runId/reasoning { momentId, openedSeq, openedTick, answer, clientAttemptId } -- REQ-190: grade one written-reasoning moment (docs/sims.md 10).
export async function POST(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    requireSimsEnabled();
    const { runId } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    return ok(await gradeReasoning(user.id, runId, body));
  } catch (err) {
    return simRouteError(err);
  }
}
