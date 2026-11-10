import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { minAppVersion, needsUpdate, updateRequiredBody } from "./lib/client-version";

// The app authenticates with a bearer token; since REQ-192 the web app's
// refresh token is also an httpOnly cookie on /api/auth/refresh only
// (lib/auth/refreshCookie.ts), so credentials are allowed for the listed
// origins (the Expo web dev server is cross-origin). Scoping also means a
// typo'd or unexpected frontend origin fails loudly instead of silently
// working from anywhere. ALLOWED_ORIGINS (.env.local / Vercel env) is a
// comma-separated list of extra origins on top of the defaults below --
// add a LAN IP there to test the web preview from another device.
//
// REQ-116 (audit 3, low): the Expo web dev server (localhost:8081) is only
// a default outside production. In production any page on the visitor's own
// machine could otherwise call the API from that origin. Add it through
// ALLOWED_ORIGINS if a production backend ever needs it.
export function allowedOriginsFor(env: { NODE_ENV?: string; ALLOWED_ORIGINS?: string }): string[] {
  return [
    "https://www.ascendra-learn.com",
    "https://ascendra-learn.com",
    ...(env.NODE_ENV === "production" ? [] : ["http://localhost:8081"]),
    ...(env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
  ];
}

const allowedOrigins = allowedOriginsFor(process.env);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    // REQ-146: X-Ascendra-Client is the app protocol (lib/client-protocol.ts).
    // REQ-175: X-Ascendra-App / -Platform are the app build (lib/client-version.ts).
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ascendra-Client, X-Ascendra-App, X-Ascendra-Platform",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export function proxy(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  if (request.method === "OPTIONS") {
    return NextResponse.json({}, { headers });
  }

  // REQ-175: MIN_APP_VERSION (unset = no minimum). An app build below it is
  // answered 426 { code: "update_required" } and shows "Update required";
  // read per request so changing the env needs no code change.
  const min = minAppVersion(process.env as Record<string, string | undefined>);
  if (min && needsUpdate(request, min)) {
    return NextResponse.json(updateRequiredBody(request, min, process.env as Record<string, string | undefined>), { status: 426, headers });
  }

  const response = NextResponse.next();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
