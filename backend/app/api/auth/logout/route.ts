import { ok, badRequest, serverError, readJson } from "@/lib/http";
import { revokeRefreshFamily, revokeRefreshToken, verifyAccessTokenForLogout } from "@/lib/auth/tokens";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

// POST /api/auth/logout -- revokes just this one session.
// { refreshToken } (native; and web tabs from before REQ-192), or REQ-192:
// no body with a bearer access token, which ends the session (refresh
// family) that token belongs to. The second is how the app signs out when it
// holds no readable refresh token: biometric unlock seals it behind the OS
// prompt. (The web app's cookie session ends at DELETE /api/auth/refresh.)
//
// REQ-203 (FAIL-866, FAIL-867): a refresh token that has already rotated
// ends its whole session, not just itself, so the live successor can't
// outlast the sign-out. The bearer form accepts a token that is validly
// signed but past its 15 minutes: the app signs out after time away, when the
// token is always stale, and it used to be refused with a 400 while the
// session stayed live. The token only names the session to end; nothing is
// granted by it, so it needs no live-account check.
export async function POST(req: Request) {
  try {
    const text = await req.text();
    const body = text.trim() ? await readJson(new Request("http://x", { method: "POST", body: text })) : {};
    const { refreshToken } = body ?? {};
    if (typeof refreshToken === "string" && refreshToken) {
      await revokeRefreshToken(refreshToken);
      return ok({ success: true });
    }
    const header = req.headers.get("authorization");
    if (refreshToken === undefined && header?.startsWith("Bearer ")) {
      const named = verifyAccessTokenForLogout(header.slice("Bearer ".length).trim());
      if (named?.fam && UUID.test(named.sub) && UUID.test(named.fam)) {
        await revokeRefreshFamily(named.sub.toLowerCase(), named.fam);
        return ok({ success: true });
      }
    }
    return badRequest("refreshToken is required");
  } catch (err) {
    return serverError(err);
  }
}
