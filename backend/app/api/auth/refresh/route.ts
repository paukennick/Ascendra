import { ok, badRequest, unauthorized, serverError, UserFacingError, INVALID_JSON } from "@/lib/http";
import { rotateRefreshToken, RefreshTokenError, revokeRefreshToken } from "@/lib/auth/tokens";
import { signAccessToken } from "@/lib/auth/tokens";
import { queryOne } from "@/lib/db";
import { getClientIp, getUserAgent } from "@/lib/auth/util";
import {
  clearRefreshCookie,
  cookieRequestAllowed,
  csrfRejected,
  isWebClient,
  readRefreshCookie,
  sessionResponse,
} from "@/lib/auth/refreshCookie";

export const dynamic = "force-dynamic";

// Reads an optional JSON body; the web app's cookie refresh sends none.
async function optionalJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new UserFacingError(INVALID_JSON, 400);
  }
}

// Which token this request presents. A body token (native, and a web tab
// exchanging the sessionStorage token it held before REQ-192) wins over the
// cookie. A cookie is only used from the web app, from our own origin.
type Presented = { token: string; via: "body" | "cookie" } | { error: "missing" | "csrf" };
function presentedToken(req: Request, body: Record<string, unknown>): Presented {
  if (typeof body.refreshToken === "string" && body.refreshToken) return { token: body.refreshToken, via: "body" };
  if (body.refreshToken !== undefined) return { error: "missing" };
  const cookie = readRefreshCookie(req);
  if (!cookie) return { error: "missing" };
  if (!cookieRequestAllowed(req)) return { error: "csrf" };
  return { token: cookie, via: "cookie" };
}

// POST /api/auth/refresh -- native: { refreshToken, deviceLabel? }, answered
// { accessToken, refreshToken }. Web (X-Ascendra-Platform: web): no body
// (the cookie), or once { refreshToken } to move an old sessionStorage token
// into the cookie; answered { accessToken } with the rotated token set as
// the cookie (lib/auth/refreshCookie.ts).
export async function POST(req: Request) {
  try {
    const body = await optionalJson(req);
    const presented = presentedToken(req, body);
    if ("error" in presented) {
      if (presented.error === "csrf") return csrfRejected();
      if (isWebClient(req)) return clearRefreshCookie(unauthorized("No session. Sign in again."));
      return badRequest("refreshToken is required");
    }
    const { deviceLabel } = body;

    let rotated;
    try {
      rotated = await rotateRefreshToken(presented.token, {
        deviceLabel: typeof deviceLabel === "string" ? deviceLabel : undefined,
        userAgent: getUserAgent(req),
        ip: getClientIp(req),
      });
    } catch (err) {
      if (err instanceof RefreshTokenError) {
        const res = unauthorized(err.message);
        return isWebClient(req) ? clearRefreshCookie(res) : res;
      }
      throw err;
    }

    const user = await queryOne<{ id: string; email: string; token_version: number }>(
      "select id, email, token_version from app_users where id = $1",
      [rotated.userId]
    );
    if (!user) return unauthorized("Account no longer exists.");

    // REQ-116: signed under the account's current token_version and this
    // session's family (see lib/auth/tokens.ts).
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      ver: user.token_version,
      fam: rotated.familyId,
    });
    return sessionResponse(req, { accessToken, refreshToken: rotated.raw });
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/auth/refresh -- REQ-192: the web app's logout. Revokes the
// session the cookie names and clears the cookie. It works with an expired
// access token (the web idle sign-out runs 30 minutes after the last input).
// Same origin rule as a cookie refresh.
export async function DELETE(req: Request) {
  try {
    const token = readRefreshCookie(req);
    if (token) {
      if (!cookieRequestAllowed(req)) return csrfRejected();
      await revokeRefreshToken(token);
    }
    return clearRefreshCookie(ok({ success: true }));
  } catch (err) {
    return serverError(err);
  }
}
