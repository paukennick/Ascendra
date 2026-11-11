import path from "node:path";

// REQ-207 (FAIL-948): helpers for app/[[...path]]/route.ts, which serves the
// Expo web export from public/.

// The file a request path names, only if it is inside `dir`. The old check was
// `candidate.startsWith(dir)`, which is also true for a sibling such as
// `<cwd>/public-secrets/x` (a request for `/../public-secrets/x`): a prefix is
// not containment. Compare with a path separator.
export function resolveInside(dir: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const candidate = path.resolve(dir, "." + (decoded.startsWith("/") ? decoded : "/" + decoded));
  return candidate === dir || candidate.startsWith(dir + path.sep) ? candidate : null;
}

// Expo content-hashes the files it can cache forever: the entry bundle
// (`entry-<32 hex>.js`) and every asset (`name.<32 hex>.ext`, with an optional
// `@2x` density suffix). Only those may be `immutable`: the old route marked
// every file under public/ immutable for a year, so a changed favicon.ico or
// metadata.json would never reach a browser that had seen it.
const HASHED = /[.-][0-9a-f]{32}(?:@\dx)?\.[a-z0-9]+$/i;

export function cacheControlFor(filePath: string): string {
  return HASHED.test(path.basename(filePath))
    ? "public, max-age=31536000, immutable"
    : "public, max-age=3600, must-revalidate";
}
