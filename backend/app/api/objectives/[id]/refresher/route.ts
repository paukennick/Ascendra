import { ok, badRequest, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { isUuid, visibleObjective } from "@/lib/visibility";
import { insightStatus, recordRefresherOpened, refresherOffer } from "@/lib/understanding-store";
import { ensurePrerequisites, inBackground } from "@/lib/understanding-ai";

export const dynamic = "force-dynamic";

// GET /api/objectives/:id/refresher -- REQ-111 prerequisite remediation. After
// a miss on this objective: if it builds on another objective of the course
// that this learner has not got credit on yet (not started, introduced, or
// needing review) and whose teaching is already cached, an offer of a short
// (about two minutes) refresher of it, taken from that teaching. No model
// call per learner: the course's prerequisite map is generated once (in the
// background on first need; the offer is null until it exists).
// Returns { offer: { prerequisite: { id, title }, status, refresher, minutes,
//   trimmed } | null, pending }.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const objective = await visibleObjective(id, user.id);
    if (!objective) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);
    const state = await insightStatus(objective.track_id, "prerequisites");
    if (state !== "ready") inBackground(() => ensurePrerequisites(objective.track_id, user.id));
    return ok({ offer: await refresherOffer(user.id, id), pending: state !== "ready" && state !== "failed" });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

// POST /api/objectives/:id/refresher -- the learner opened the refresher.
// Body: { prerequisiteId }. Recorded (prerequisite_refreshers) so whether
// refreshers help can be measured; it does not touch mastery.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!(await visibleObjective(id, user.id))) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);
    const body = await req.json().catch(() => ({}));
    if (!isUuid(body?.prerequisiteId)) return badRequest("prerequisiteId is required");
    const recorded = await recordRefresherOpened(user.id, id, body.prerequisiteId);
    if (!recorded) return notFound("That is not a prerequisite of this objective");
    return ok({ recorded });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
