import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { requireSimsEnabled, simRouteError, startRun } from "@/lib/sims";
import { parseCaps } from "@/lib/sim/server-run.ts";

export const dynamic = "force-dynamic";

// POST /api/sims/:id/runs { restart?, deviceId?, cachedHash? } -- REQ-190:
// start or resume a run and take its lease. Returns the run (seed, lease
// epoch), the client document (unless cachedHash matches) and every
// accepted command, which the app replays to the server's state.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSimsEnabled();
    const { id } = await params;
    const body = await readJson(req).catch(() => null);
    const user = await requireUser(req);
    return ok(await startRun(user.id, id, body, parseCaps(req.headers.get("x-sim-caps"))));
  } catch (err) {
    return simRouteError(err);
  }
}
