import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/version -- REQ-177: the deployed build, so a web tab left open
// can tell its bundle is out of date (mobile/src/lib/webVersion.ts). No
// database, no auth; never cached. `buildId` is the deployed commit
// (VERCEL_GIT_COMMIT_SHA, which build-webapp.sh also bakes into the web
// bundle), or null where that isn't set (local runs).
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  return NextResponse.json(
    { buildId: sha && /^[0-9a-f]{7,64}$/i.test(sha) ? sha : null },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
