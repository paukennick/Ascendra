import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The mobile app authenticates with a bearer token, never cookies, so a
// wildcard origin couldn't actually leak a session -- but scoping it means a
// typo'd or unexpected frontend origin fails loudly instead of silently
// working from anywhere. ALLOWED_ORIGINS (.env.local / Vercel env) is a
// comma-separated list of extra origins on top of the defaults below --
// add a LAN IP there to test the web preview from another device.
const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.ascendra-learn.com",
  "https://ascendra-learn.com",
  "http://localhost:8081",
];

const allowedOrigins = [
  ...DEFAULT_ALLOWED_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
];

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function proxy(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  if (request.method === "OPTIONS") {
    return NextResponse.json({}, { headers });
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
