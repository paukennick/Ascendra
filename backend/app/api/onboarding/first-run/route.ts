import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { isLegacyClient } from "@/lib/client-version";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { visibleTrack } from "@/lib/visibility";
import { completeFirstRun, onboardingState } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

// POST /api/onboarding/first-run { trackId?: uuid | null, justExploring?: boolean }
// REQ-119: the first-run flow is done (or skipped). trackId is the course the
// learner picked as their goal; justExploring (or neither) means they chose
// to look around first. The exam date, if any, is saved through the course's
// own PUT /api/courses/:id/plan, and placement through its placement route.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => null);
    const rawTrack = body?.trackId ?? null;
    if (rawTrack !== null && typeof rawTrack !== "string") return badRequest("trackId must be a course id or null");
    if (body?.justExploring !== undefined && typeof body.justExploring !== "boolean") {
      return badRequest("justExploring must be true or false");
    }
    let trackId: string | null = null;
    if (rawTrack) {
      const track = await visibleTrack(rawTrack, user.id);
      if (!track) return notFound("Track not found");
      trackId = track.id;
    }
    await completeFirstRun(user.id, { trackId, justExploring: trackId === null });
    return ok(await onboardingState(user.id, { legacy: isLegacyClient(req) }));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
