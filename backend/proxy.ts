import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The mobile app authenticates with a bearer token in the Authorization
// header, never cookies, so a wildcard origin is safe here (no credentials
// to leak cross-site) and keeps this working for both the LAN dev backend
// and whatever origin the web preview / eventual deployed frontend runs on.
const corsOptions = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return NextResponse.json({}, { headers: corsOptions });
  }

  const response = NextResponse.next();
  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
