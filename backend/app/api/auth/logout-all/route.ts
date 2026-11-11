import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { revokeAllRefreshTokens } from "@/lib/auth/tokens";
import { bumpTokenVersion } from "@/lib/auth/sessionControl";
import { clearRefreshCookie, isWebClient } from "@/lib/auth/refreshCookie";

export const dynamic = "force-dynamic";

// POST /api/auth/logout-all — revokes every session for the authenticated user.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req, { termsOptional: true });
    await revokeAllRefreshTokens(user.id);
    // REQ-116: access tokens already issued stop too, not 15 minutes later.
    await bumpTokenVersion(user.id);
    // REQ-192: and this browser's (now revoked) cookie goes too.
    const res = ok({ success: true });
    return isWebClient(req) ? clearRefreshCookie(res) : res;
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
