// REQ-175: which app build a request came from, and whether it is still
// supported.
//
// From REQ-175 on, the app (native and web, mobile/src/api/client.ts) sends
//   X-Ascendra-App:      <semver>+<build>   e.g. 2.0.0+u.1a2b3c4d, 2.0.0+web
//   X-Ascendra-Platform: ios | android | web
// on every request. A request WITHOUT X-Ascendra-App is a "legacy client":
// an app build (or a cached web bundle) from before this header, or a
// direct API call. Legacy is decided by the header's absence only; a header
// that is present but unreadable is NOT legacy, so a garbled value can never
// widen what the server accepts.
//
// What legacy changes (lib/legal.ts): those builds carry the Terms text of
// the version before the current one and send that version when the
// learner agrees, so the server records exactly that version for them and
// lets it satisfy their launch gate. A build that sends the header must
// accept the current version.
//
// MIN_APP_VERSION (env, semver; unset or unreadable = no minimum): a request
// whose X-Ascendra-App is below it, or unreadable, is answered 426
// { code: "update_required" } by proxy.ts before any route runs. Legacy
// requests are not version-checked: they cannot be told apart from
// server-to-server callers (webhooks, cron) and those builds cannot show the
// update screen anyway.
export const APP_VERSION_HEADER = "X-Ascendra-App";
export const APP_PLATFORM_HEADER = "X-Ascendra-Platform";

export const UPDATE_REQUIRED_CODE = "update_required";
export const UPDATE_REQUIRED_MESSAGE = "Please update Ascendra. This version is no longer supported.";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.hel1x.ascendra";

export type AppPlatform = "ios" | "android" | "web";
type Env = { MIN_APP_VERSION?: string; IOS_APP_STORE_URL?: string };
export type Semver = readonly [number, number, number];

export interface AppClient {
  // Null when the header was sent but could not be read.
  version: Semver | null;
  build: string | null;
  platform: AppPlatform | null;
}

const SEMVER = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})(?:\+([0-9A-Za-z.-]{1,64}))?$/;

export function parseSemver(raw: string | null | undefined): { version: Semver; build: string | null } | null {
  const m = SEMVER.exec((raw ?? "").trim());
  if (!m) return null;
  return { version: [Number(m[1]), Number(m[2]), Number(m[3])], build: m[4] ?? null };
}

export function compareSemver(a: Semver, b: Semver): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}

function headers(req: Request | { headers: Headers }): Headers {
  return req.headers;
}

// The app build behind a request, or null for a legacy client (no header).
export function appClient(req: Request | { headers: Headers }): AppClient | null {
  const raw = headers(req).get(APP_VERSION_HEADER);
  if (raw === null) return null;
  const parsed = parseSemver(raw);
  const p = headers(req).get(APP_PLATFORM_HEADER)?.trim().toLowerCase();
  return {
    version: parsed?.version ?? null,
    build: parsed?.build ?? null,
    platform: p === "ios" || p === "android" || p === "web" ? p : null,
  };
}

export function isLegacyClient(req: Request | { headers: Headers }): boolean {
  return headers(req).get(APP_VERSION_HEADER) === null;
}

// The configured minimum, or null for none (unset, empty or unreadable --
// a typo in the env must not lock every learner out).
export function minAppVersion(env: Env = process.env as Env): Semver | null {
  return parseSemver(env.MIN_APP_VERSION)?.version ?? null;
}

// True when this request must be told to update: it carries the app header,
// a minimum is set, and its version is unreadable or below the minimum.
export function needsUpdate(req: Request | { headers: Headers }, min: Semver | null): boolean {
  if (!min) return false;
  const client = appClient(req);
  if (!client) return false;
  if (!client.version) return true;
  return compareSemver(client.version, min) < 0;
}

export function storeUrlFor(platform: AppPlatform | null, env: Env = process.env as Env): string | null {
  if (platform === "android") return PLAY_STORE_URL;
  if (platform === "ios") {
    const url = env.IOS_APP_STORE_URL?.trim();
    return url && /^https:\/\/apps\.apple\.com\//.test(url) ? url : null;
  }
  return null;
}

// The 426 body the app recognises (mobile/src/lib/appVersion.ts).
export function updateRequiredBody(
  req: Request | { headers: Headers },
  min: Semver,
  env: Env = process.env as Env
) {
  const platform = appClient(req)?.platform ?? null;
  return {
    error: UPDATE_REQUIRED_MESSAGE,
    code: UPDATE_REQUIRED_CODE,
    minVersion: min.join("."),
    storeUrl: storeUrlFor(platform, env),
  };
}
