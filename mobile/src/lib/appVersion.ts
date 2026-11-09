// REQ-175: which app build this is, sent on every API request (native and
// web) so the server can tell builds apart:
//   X-Ascendra-App:      <APP_VERSION>+<build>   e.g. 2.0.0+u.1a2b3c4d
//   X-Ascendra-Platform: ios | android | web
// A request without X-Ascendra-App is a build from before this header
// (backend/lib/client-version.ts): the server lets those accept the previous
// Terms version, and asks this build for the current one.
//
// APP_VERSION equals `expo.version` in app.json (src/lib/appVersion.test.ts
// checks). The server compares it with MIN_APP_VERSION; below it, requests
// are answered 426 { code: "update_required" } and the app shows the
// "Update required" screen (components/UpdateRequired.tsx).
export const APP_VERSION = "2.0.0";

export const APP_VERSION_HEADER = "X-Ascendra-App";
export const APP_PLATFORM_HEADER = "X-Ascendra-Platform";
export const UPDATE_REQUIRED_CODE = "update_required";

export type AppPlatform = "ios" | "android" | "web";

export interface AppIdentity {
  version: string;
  // "web", "embedded" (the binary's own bundle) or "u.<first 8 of the
  // update id>" for an over-the-air update.
  build: string;
  platform: AppPlatform;
}

// Build metadata may hold only [0-9A-Za-z.-] and the server reads at most 64.
export function buildTag(platform: AppPlatform, updateId: string | null | undefined, embedded: boolean): string {
  if (platform === "web") return "web";
  const id = (updateId ?? "").replace(/[^0-9A-Za-z]/g, "").slice(0, 8);
  if (embedded || !id) return "embedded";
  return `u.${id}`;
}

export function appHeaders(identity: AppIdentity): Record<string, string> {
  return {
    [APP_VERSION_HEADER]: `${identity.version}+${identity.build}`,
    [APP_PLATFORM_HEADER]: identity.platform,
  };
}

export interface UpdateRequired {
  message: string;
  minVersion: string | null;
  storeUrl: string | null;
}

const STORE_HOSTS = /^https:\/\/(play\.google\.com|apps\.apple\.com)\//;

// The server's 426 answer, or null for any other response. A store link is
// kept only when it is an https link to one of the two stores.
export function readUpdateRequired(status: number, data: unknown): UpdateRequired | null {
  if (status !== 426 || !data || typeof data !== "object") return null;
  const d = data as { code?: unknown; error?: unknown; minVersion?: unknown; storeUrl?: unknown };
  if (d.code !== UPDATE_REQUIRED_CODE) return null;
  return {
    message: typeof d.error === "string" && d.error.trim() ? d.error : "Please update Ascendra.",
    minVersion: typeof d.minVersion === "string" ? d.minVersion : null,
    storeUrl: typeof d.storeUrl === "string" && STORE_HOSTS.test(d.storeUrl) ? d.storeUrl : null,
  };
}
