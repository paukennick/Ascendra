import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { CURRENT_TERMS_VERSION, isCurrentTermsVersion, recordTermsAcceptance } from "@/lib/legal";
import { onboardingState } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

// POST /api/onboarding/terms { version } -- REQ-119: the one-tap "Agree and
// continue" an account sees once when it has not accepted the current Terms
// and Privacy Policy. Only the current version can be accepted (an app
// showing older text is told so and asks again after it updates). Repeats
// are ignored; the first acceptance time is kept.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => null);
    if (!isCurrentTermsVersion(body?.version)) {
      return badRequest(`version must be the current terms version (${CURRENT_TERMS_VERSION})`);
    }
    await recordTermsAcceptance(user.id, CURRENT_TERMS_VERSION, "prompt");
    return ok(await onboardingState(user.id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
