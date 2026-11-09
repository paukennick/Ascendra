import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { isAcceptableTermsVersion, recordTermsAcceptance } from "@/lib/legal";
import { isLegacyClient } from "@/lib/client-version";
import { onboardingState } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

// POST /api/onboarding/terms { version } -- REQ-119: the one-tap "Agree and
// continue" an account sees once when it has not accepted the current Terms
// and Privacy Policy. Repeats are ignored; the first acceptance time is kept.
//
// REQ-175 (FAIL-560): an app build from before the X-Ascendra-App header
// (a "legacy client", lib/client-version.ts) shows the previous Terms text
// and sends its version. That version is accepted from it and recorded
// exactly as sent -- never as the current version -- and satisfies its
// launch gate. A build that sends the header must accept the current
// version; after updating, an account that agreed on an old build is asked
// once more, for the current text.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => null);
    const ctx = { legacy: isLegacyClient(req) };
    if (!isAcceptableTermsVersion(body?.version, ctx)) {
      return badRequest("These terms have been updated. Please update or reload Ascendra to see the current version.");
    }
    await recordTermsAcceptance(user.id, body.version, "prompt", ctx);
    return ok(await onboardingState(user.id, ctx));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
