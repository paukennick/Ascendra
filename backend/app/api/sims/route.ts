import { ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { listSims, requireSimsEnabled, simRouteError, SimError, type SimScope } from "@/lib/sims";
import { parseCaps } from "@/lib/sim/server-run.ts";

export const dynamic = "force-dynamic";

// GET /api/sims?trackId= | ?unitId= | ?objectiveId= -- REQ-190 (docs/sims.md 7):
// the sims this learner can open, with their state, access (full / sample /
// locked) and whether this app can run them (x-sim-caps header, 5.10).
export async function GET(req: Request) {
  try {
    requireSimsEnabled();
    const user = await requireUser(req);
    const url = new URL(req.url);
    const trackId = url.searchParams.get("trackId");
    const unitId = url.searchParams.get("unitId");
    const objectiveId = url.searchParams.get("objectiveId");
    const scope: SimScope | null = trackId ? { trackId } : unitId ? { unitId } : objectiveId ? { objectiveId } : null;
    if (!scope) throw new SimError(400, "bad_request", "Pass trackId, unitId or objectiveId");
    return ok({ sims: await listSims(user.id, scope, parseCaps(req.headers.get("x-sim-caps"))) });
  } catch (err) {
    return simRouteError(err);
  }
}
