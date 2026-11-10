// REQ-177 (web): a tab left open keeps running the bundle it loaded --
// expo-updates is off on the web -- so after a deploy it can call the API
// with old assumptions (the Terms version in FAIL-560 was this kind of
// bug). The web app compares the build id baked into its bundle
// (EXPO_PUBLIC_WEB_BUILD_ID, set from VERCEL_GIT_COMMIT_SHA by
// backend/scripts/build-webapp.sh) with the deployed one (GET /api/version)
// when the tab regains focus and every WEB_VERSION_CHECK_MS, and offers
// "Reload" when they differ. A server answer that this build is too old
// (426 update_required, backend/lib/client-version.ts) reloads at once --
// unless the screen holds work in progress, where the Update required
// screen asks instead.
//
// Kept pure (no React Native import) so the rules can be tested.

export const WEB_VERSION_CHECK_MS = 10 * 60 * 1000;
// Focus can fire many times a minute; checks are spaced at least this far.
export const WEB_VERSION_MIN_GAP_MS = 60 * 1000;
// One automatic reload per build per this long, so a server that keeps
// saying "too old" (a misconfigured MIN_APP_VERSION) can't loop the tab.
export const AUTO_RELOAD_KEY = "ascendra_auto_reloaded";
export const AUTO_RELOAD_GAP_MS = 10 * 60 * 1000;

// Screens holding in-memory work that a reload would discard. Shared with
// src/updates/useAppUpdates.ts (native silent apply).
export const PROTECTED_ROUTE_FRAGMENTS = [
  "/lesson",
  "/pbq",
  "/chat",
  "/lab",
  "/sim",
  "/exam",
  "/quiz",
  "/review-session",
  "/unit-check",
  "/explain",
  "/placement",
] as const;

export function holdsUnsavedWork(pathname: string): boolean {
  return PROTECTED_ROUTE_FRAGMENTS.some((fragment) => pathname.includes(fragment));
}

const BUILD_ID = /^[0-9A-Za-z._-]{4,64}$/;

export function readBuildId(raw: unknown): string | null {
  return typeof raw === "string" && BUILD_ID.test(raw) && raw !== "local" ? raw : null;
}

// "new" only when both ids are known and differ. An unknown id on either
// side (a local build, an older server, a failed request) says nothing.
export function compareBuild(bundled: unknown, deployed: unknown): "same" | "new" | "unknown" {
  const a = readBuildId(bundled);
  const b = readBuildId(deployed);
  if (!a || !b) return "unknown";
  return a === b ? "same" : "new";
}

export function shouldCheckNow(lastCheckedAt: number, now: number): boolean {
  return now - lastCheckedAt >= WEB_VERSION_MIN_GAP_MS;
}

// Whether a 426 may reload the tab by itself now. `marker` is the stored
// "<buildId>|<time>" of the last automatic reload, or null.
export function mayAutoReload(opts: { pathname: string; buildId: string | null; marker: string | null; now: number }): boolean {
  if (holdsUnsavedWork(opts.pathname)) return false;
  if (!opts.marker) return true;
  const [id, at] = opts.marker.split("|");
  if (id !== (opts.buildId ?? "")) return true;
  const t = Number(at);
  return !Number.isFinite(t) || opts.now - t >= AUTO_RELOAD_GAP_MS;
}

export function autoReloadMarker(buildId: string | null, now: number): string {
  return `${buildId ?? ""}|${now}`;
}
