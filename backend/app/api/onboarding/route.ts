import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { onboardingState } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

// GET /api/onboarding -- REQ-119: what the app should ask on launch.
// { terms: { currentVersion, acceptedVersion, acceptedAt, needsAcceptance },
//   firstRun: { needed, completedAt, goalTrackId, justExploring },
//   notice: { currentVersion, acceptedAt, needed } (REQ-165) }
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return ok(await onboardingState(user.id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
