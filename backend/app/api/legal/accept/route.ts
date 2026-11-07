import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { LEGAL_VERSIONS, acceptsCurrentVersions, recordAcceptance } from "@/lib/legal";

export const dynamic = "force-dynamic";

// GET /api/legal/accept -- the current versions, so the app can show them.
export async function GET() {
  return ok({ versions: LEGAL_VERSIONS });
}

// POST /api/legal/accept -- { termsVersion, privacyVersion }
// REQ-093: the app echoes back the versions it actually displayed, so agreeing
// to text that changed mid-session is not recorded as agreeing to the new text.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => null);
    if (!acceptsCurrentVersions(body)) {
      return badRequest("These terms have been updated. Reload the page to see the current version.");
    }
    await recordAcceptance(user.id, ["terms", "privacy"]);
    return ok({ accepted: LEGAL_VERSIONS });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
