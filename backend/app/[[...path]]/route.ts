import fs from "node:fs";
import path from "node:path";

// Serves the web app (mobile/'s Expo Router app, exported for web and
// copied into public/ by scripts/build-webapp.sh) for any request that
// isn't an API route or one of the few server-rendered pages this project
// still owns directly (reset-password, verify-email, confirm-email-change).
// Those all have their own more specific route/page files, which Next.js
// resolves before ever reaching this catch-all -- the guard below is
// defense-in-depth, not the primary mechanism.
//
// The app itself is a client-side-routed SPA (Expo Router's web output), so
// every real path (/login, /course/:id, ...) needs to receive the SAME
// index.html and let its own router take over client-side; there's no
// server-side knowledge of its routes here.
const INDEX_HTML_PATH = path.join(process.cwd(), "public", "index.html");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { pathname } = new URL(req.url);
  if (
    pathname.startsWith("/api/") ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/confirm-email-change"
  ) {
    return new Response("Not found", { status: 404 });
  }

  let html: string;
  try {
    html = fs.readFileSync(INDEX_HTML_PATH, "utf8");
  } catch {
    return new Response(
      "Web app not built. Run backend/scripts/build-webapp.sh, then redeploy.",
      { status: 503, headers: { "Content-Type": "text/plain" } }
    );
  }

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
