import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { syncRun, requireSimsEnabled, simRouteError } from "@/lib/sims";

export const dynamic = "force-dynamic";

// POST /api/sims/runs/:runId/commands { leaseEpoch, commands[], tick?, stateHash? } -- REQ-190: the step route. Idempotent by seq; the server replays from its checkpoint and its replay is the record.
export async function POST(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    requireSimsEnabled();
    const { runId } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    return ok(await syncRun(user.id, runId, body));
  } catch (err) {
    return simRouteError(err);
  }
}
