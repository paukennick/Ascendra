// REQ-192: the web app's refresh token lives in an httpOnly cookie, not in
// the page's sessionStorage, where any injected script could read it.
//
// Who gets the cookie: a request that says X-Ascendra-Platform: web (the web
// app, mobile/src/api/client.ts). Native apps keep the token in the OS
// secure store and send it in the body, exactly as before; their responses
// still carry `refreshToken`. A web response never does.
//
// The cookie: HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh, so
// only the refresh routes ever receive it (POST rotates, DELETE ends the
// session -- the web app's logout). No Max-Age: it is a browser-session
// cookie, keeping what sessionStorage gave (closing the browser signs out);
// the server-side 30-day expiry still applies.
//
// CSRF: SameSite=Strict keeps it off cross-site requests, and a request that
// authenticates with the cookie must also carry an Origin that is ours
// (allowed origins, APP_BASE_URL, or the request's own origin) and the
// platform header (a custom header, so a cross-origin page cannot send it
// without a CORS preflight we refuse). A token in the body is not
// cookie-authenticated and is not origin-checked: a page that knows the
// token has no use for CSRF.
import { NextResponse } from "next/server";
import { allowedOriginsFor } from "../../proxy";
import { APP_PLATFORM_HEADER } from "../client-version";

export const REFRESH_COOKIE = "ascendra_rt";
export const REFRESH_COOKIE_PATH = "/api/auth/refresh";
export const CSRF_REJECTED = "This request did not come from Ascendra.";

type Env = { NODE_ENV?: string; ALLOWED_ORIGINS?: string; APP_BASE_URL?: string };

export function isWebClient(req: Request): boolean {
  return req.headers.get(APP_PLATFORM_HEADER)?.trim().toLowerCase() === "web";
}

export function readRefreshCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== REFRESH_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    try {
      return value ? decodeURIComponent(value) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function originOf(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function trustedOrigins(req: Request, env: Env = process.env as Env): string[] {
  const out = new Set(allowedOriginsFor(env));
  const base = originOf(env.APP_BASE_URL);
  if (base) out.add(base);
  const own = originOf(req.url);
  if (own) out.add(own);
  return [...out];
}

// True when a cookie-authenticated request may proceed: web platform header
// present and an Origin we serve. A missing or "null" Origin is refused.
export function cookieRequestAllowed(req: Request, env: Env = process.env as Env): boolean {
  if (!isWebClient(req)) return false;
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return false;
  return trustedOrigins(req, env).includes(origin);
}

export function csrfRejected() {
  return NextResponse.json({ error: CSRF_REJECTED, code: "csrf_rejected" }, { status: 403 });
}

function cookieAttributes(): string {
  return `Path=${REFRESH_COOKIE_PATH}; HttpOnly; Secure; SameSite=Strict`;
}

export function setRefreshCookie(res: NextResponse, raw: string): NextResponse {
  res.headers.append("Set-Cookie", `${REFRESH_COOKIE}=${encodeURIComponent(raw)}; ${cookieAttributes()}`);
  return res;
}

export function clearRefreshCookie(res: NextResponse): NextResponse {
  res.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=; ${cookieAttributes()}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  return res;
}

// The answer to a sign-in or refresh. Native: the body as-is. Web: the
// refresh token moves from the body into the cookie.
export function sessionResponse<T extends { refreshToken: string }>(req: Request, session: T): NextResponse {
  if (!isWebClient(req)) return NextResponse.json(session, { status: 200 });
  const { refreshToken, ...rest } = session;
  return setRefreshCookie(NextResponse.json(rest, { status: 200 }), refreshToken);
}
