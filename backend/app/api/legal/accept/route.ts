import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { LEGAL_VERSIONS, acceptedDocumentVersions, recordAcceptance } from "@/lib/legal";
import { isLegacyClient } from "@/lib/client-version";

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
    // REQ-175: a legacy client (no X-Ascendra-App) may echo the previous
    // versions; they are recorded exactly as sent.
    const versions = acceptedDocumentVersions(body, { legacy: isLegacyClient(req) });
    if (!versions) {
      return badRequest("These terms have been updated. Reload the page to see the current version.");
    }
    await recordAcceptance(user.id, ["terms", "privacy"], "prompt", versions);
    return ok({ accepted: versions });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
