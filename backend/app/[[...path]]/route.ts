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
//
// Vercel's static-file serving for public/ matches the request URL
// including its query string, but requests for fonts/assets in this export
// carry a `?platform=web&hash=...` suffix -- so in production (not in
// `next dev`, which strips the query string first) those never match the
// static file and fall through here instead. Reading matching files
// directly from public/ below, ignoring the query string, so a real asset
// request never gets the SPA shell's HTML by mistake.
const PUBLIC_DIR = path.join(process.cwd(), "public");
const INDEX_HTML_PATH = path.join(PUBLIC_DIR, "index.html");

const CONTENT_TYPES: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

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

  // Serve a real static file if the path (ignoring the query string) maps
  // to one under public/ -- must resolve to a path still inside PUBLIC_DIR,
  // since pathname comes from the request.
  const candidatePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (candidatePath.startsWith(PUBLIC_DIR) && candidatePath !== INDEX_HTML_PATH) {
    try {
      const stat = fs.statSync(candidatePath);
      if (stat.isFile()) {
        const ext = path.extname(candidatePath).toLowerCase();
        const body = fs.readFileSync(candidatePath);
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch {
      // Not a real file -- fall through to the SPA shell below.
    }
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
