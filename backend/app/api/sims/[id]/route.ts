import { ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { requireSimsEnabled, simRouteError, simView } from "@/lib/sims";
import { parseCaps } from "@/lib/sim/server-run.ts";

export const dynamic = "force-dynamic";

// GET /api/sims/:id -- REQ-190: one sim (brief, access, the open run if any,
// the latest finished run). The client document comes with a run.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSimsEnabled();
    const { id } = await params;
    const user = await requireUser(req);
    return ok(await simView(user.id, id, parseCaps(req.headers.get("x-sim-caps"))));
  } catch (err) {
    return simRouteError(err);
  }
}
