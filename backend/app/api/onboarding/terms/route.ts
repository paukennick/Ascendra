import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { isAcceptableTermsVersion, recordTermsAcceptance, legalContext } from "@/lib/legal";
import { onboardingState } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

// POST /api/onboarding/terms { version } -- REQ-119: the one-tap "Agree and
// continue" an account sees once when it has not accepted the current Terms
// and Privacy Policy. Repeats are ignored; the first acceptance time is kept.
//
// REQ-175 (FAIL-560), REQ-205: an installed build shows the Terms text it was
// built with and sends that version. Every generation still in the field is
// accepted from the builds that carry it, recorded exactly as sent -- never
// as the current version -- and satisfies that build's launch gate
// (lib/legal.ts legalContext: a build without X-Ascendra-App, one with it
// but without X-Ascendra-Legal, and one declaring the previous version).
// A build that declares the current version must accept the current
// version; after updating, an account that agreed on an old build is asked
// once more, for the current text.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => null);
    const ctx = legalContext(req);
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
