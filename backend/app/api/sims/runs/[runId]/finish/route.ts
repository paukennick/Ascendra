import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { parseCaps } from "@/lib/sim/server-run.ts";
import { finishRun, requireSimsEnabled, simRouteError } from "@/lib/sims";

export const dynamic = "force-dynamic";

// POST /api/sims/runs/:runId/finish { leaseEpoch, tick? } -- REQ-190: the submit route. Replays to the end, scores and records one attempt. Idempotent.
export async function POST(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    requireSimsEnabled();
    const { runId } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    return ok(await finishRun(user.id, runId, body, process.env, parseCaps(req.headers.get("x-sim-caps"))));
  } catch (err) {
    return simRouteError(err);
  }
}
