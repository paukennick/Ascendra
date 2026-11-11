import { ok, badRequest, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack } from "@/lib/auth/requireAcknowledgement";
import { visibleTrack } from "@/lib/visibility";
import { startSession } from "@/lib/review-service";
import { optionalTrackId, reviewRouteError } from "@/lib/review-routes";

// REQ-202: seconds this route may run (writing a review question). Never above 300, the Hobby
// plan ceiling with Fluid compute (docs/billing.md, "Function duration").
export const maxDuration = 120;

export const dynamic = "force-dynamic";

// POST /api/review/sessions { trackId? } -- REQ-108: start today's review, or
// resume today's unfinished one. Up to 12 due objectives (8 after a rough
// session, opening with a likely win), mixed across units, each with a
// question the learner has not seen. Questions carry no choices and no key.
//   200 { session: { id, gentleStart, total, answered, items: [...] }, unavailable }
//   200 { session: null, unavailable: 0 } when nothing is due
//   200 { session: null, unavailable: N, message } when N reviews are due but
//       none could be prepared just now (REQ-216): not "nothing is due".
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const trackId = optionalTrackId(body?.trackId);
    if (trackId === undefined) return badRequest("trackId must be a UUID");
    if (trackId) {
      if (!(await visibleTrack(trackId, user.id))) return notFound("Course not found");
      await requireAcknowledgementForTrack(trackId, user.id);
    }
    const started = await startSession(user.id, trackId);
    if (!started) return ok({ session: null, unavailable: 0 });
    return ok(started);
  } catch (err) {
    return reviewRouteError(err);
  }
}
