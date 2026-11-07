import { ok, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { visibleTrack } from "@/lib/visibility";
import { coverageFor } from "@/lib/review-store";
import { reviewRouteError } from "@/lib/review-routes";

export const dynamic = "force-dynamic";

// GET /api/review/coverage?trackId= (optional; all courses without it) -- REQ-108 (research item #10): for each
// objective the learner has studied, its named terms and which of them they
// have answered correctly on their own in a review.
//   { objectives: [{ objectiveId, title, unitTitle, trackTitle, terms: [{ term, covered }] }] }
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const trackId = new URL(req.url).searchParams.get("trackId");
    if (!trackId) return ok({ objectives: await coverageFor(user.id, null) });
    const track = await visibleTrack(trackId, user.id);
    if (!track) return notFound("Course not found");
    return ok({ objectives: await coverageFor(user.id, track.id) });
  } catch (err) {
    return reviewRouteError(err);
  }
}
