import { ok, badRequest, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { isUuid, visibleTrack } from "@/lib/visibility";
import { conceptSetsForTrack, insightStatus } from "@/lib/understanding-store";
import { ensureConceptSets, generateLearnedSets, inBackground } from "@/lib/understanding-ai";
import { featureLock } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// GET /api/courses/:id/comparisons[?objectiveId=] -- REQ-111 comparison cards
// for look-alike concepts in this course (only those touching objectiveId,
// when given), the ones this learner has mixed up first.
//
// The cards are generated once per course with the fast model and shared by
// every learner of it. The first request starts that generation in the
// background and answers { pending: true, sets: [] }; the app asks again a
// little later. Once the course's cards exist, a request may also add one
// "learned" card for a confusion three or more learners share (each tried
// once ever), also in the background.
//
// REQ-113 (Audit 3 mobile L4): `failed` is true when the last try at writing
// this course's cards failed (it is retried after a back-off), so the app can
// say so instead of "no look-alikes were found".
//
// Returns { pending, failed, sets: [{ id, source, howToTell, dimensions, concepts,
//   questionCount, yourMixUps }] }. No answer keys are included.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const track = await visibleTrack(id, user.id);
    if (!track) return notFound("Course not found");
    await requireAcknowledgementForTrack(id, user.id);
    const objectiveId = new URL(req.url).searchParams.get("objectiveId");
    if (objectiveId && !isUuid(objectiveId)) return badRequest("objectiveId must be an id");
    // REQ-122: not in this learner's plan -- no cards, said gently, and no
    // generation started on their behalf.
    const locked = await featureLock(user.id, "comparison", id);
    if (locked) return ok({ pending: false, failed: false, sets: [], locked });

    const state = await insightStatus(id, "concept_sets");
    if (state !== "ready") {
      inBackground(() => ensureConceptSets(id, user.id));
    } else {
      inBackground(() => generateLearnedSets(id, user.id));
    }
    const sets = await conceptSetsForTrack(id, user.id, objectiveId);
    return ok({ pending: state !== "ready" && state !== "failed", failed: state === "failed" && sets.length === 0, sets });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message, err.extra);
    return serverError(err);
  }
}
