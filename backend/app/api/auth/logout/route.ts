import { ok, badRequest, serverError, readJson } from "@/lib/http";
import { revokeRefreshFamily, revokeRefreshToken } from "@/lib/auth/tokens";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// POST /api/auth/logout -- revokes just this one session.
// { refreshToken } (native; and web tabs from before REQ-192), or REQ-192:
// no body with a bearer access token, which ends the session (refresh
// family) that token belongs to. The second is how the app signs out when it
// holds no readable refresh token: biometric unlock seals it behind the OS
// prompt. (The web app's cookie session ends at DELETE /api/auth/refresh.)
export async function POST(req: Request) {
  try {
    const text = await req.text();
    const body = text.trim() ? await readJson(new Request("http://x", { method: "POST", body: text })) : {};
    const { refreshToken } = body ?? {};
    if (typeof refreshToken === "string" && refreshToken) {
      await revokeRefreshToken(refreshToken);
      return ok({ success: true });
    }
    if (refreshToken === undefined && req.headers.get("authorization")) {
      try {
        const user = await requireUser(req);
        if (user.familyId) {
          await revokeRefreshFamily(user.id, user.familyId);
          return ok({ success: true });
        }
      } catch (err) {
        if (!(err instanceof AuthError)) throw err;
        // An access token that no longer works names no session we can end.
      }
    }
    return badRequest("refreshToken is required");
  } catch (err) {
    return serverError(err);
  }
}
