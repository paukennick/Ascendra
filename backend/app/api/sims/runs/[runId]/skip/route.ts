import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { skipWait, requireSimsEnabled, simRouteError } from "@/lib/sims";

export const dynamic = "force-dynamic";

// POST /api/sims/runs/:runId/skip { leaseEpoch, seq, tick, timer?, instance? } -- REQ-190: skip to a pending wait; returns the skip command the server built.
export async function POST(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    requireSimsEnabled();
    const { runId } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    return ok(await skipWait(user.id, runId, body));
  } catch (err) {
    return simRouteError(err);
  }
}
