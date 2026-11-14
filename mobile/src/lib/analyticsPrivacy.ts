// REQ-261: what the web app's visitor analytics (Vercel Web Analytics and
// Speed Insights, src/lib/webAnalytics.web.ts) may send, and when it may run.
// Pure (no React Native, no Vercel package) so the rules can be tested.
//
// Two rules, both in the Privacy Policy (section 4) and in
// docs/web-analytics.md:
//
//  1. Redaction. Every page address handed to the analytics scripts passes
//     through `redactAnalyticsUrl` first: the query string and the fragment
//     are dropped, and any path segment that looks like an id or a token
//     (a UUID, a number, a long hex or base64-like string, an email
//     address) becomes ":id". "/course/<uuid>/lesson/<uuid>?x=1#top" is
//     reported as "/course/:id/lesson/:id". An address that can't be read as
//     an http(s) address is dropped (null), never sent as it was.
//  2. Opt-out signals. Global Privacy Control or Do Not Track means neither
//     script is loaded at all, checked once when the page loads.

export const ID_PLACEHOLDER = ":id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMBER = /^\d+$/;
const LONG_HEX = /^(?:0x)?[0-9a-f]{12,}$/i;
// Letters, digits and the punctuation base64, base64url and JWTs use.
const TOKEN_CHARS = /^[A-Za-z0-9_~.+=-]+$/;
const JWT = /^[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}$/;

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment; // malformed escape: judge the raw text
  }
}

// True when a path segment looks like an identifier or a secret rather than
// the name of a screen. Errs toward redacting: a false positive only merges
// two rows in a report; a miss would send an id or a token.
export function isSensitiveSegment(segment: string): boolean {
  const s = decode(segment);
  if (!s) return false;
  if (s.includes("@")) return true; // an email address
  if (UUID.test(s) || NUMBER.test(s) || LONG_HEX.test(s) || JWT.test(s)) return true;
  if (!TOKEN_CHARS.test(s)) {
    // Spaces, brackets and the like: a screen name never has them, and a
    // long one is more likely pasted data than a name.
    return s.length >= 20;
  }
  const hasDigit = /\d/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  const hasLower = /[a-z]/.test(s);
  if (s.length >= 20 && hasDigit) return true;
  if (s.length >= 12 && hasDigit && hasUpper && hasLower) return true;
  // No digits, but mixed case with no word separators: random base64.
  if (s.length >= 24 && hasUpper && hasLower && !/[-_.]/.test(s)) return true;
  return false;
}

export function redactPath(pathname: string): string {
  return pathname
    .split("/")
    .map((seg) => (isSensitiveSegment(seg) ? ID_PLACEHOLDER : seg))
    .join("/");
}

// The address to report for a page, or null when it must not be reported.
// Origin and redacted path only: no credentials, query string or fragment.
export function redactAnalyticsUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  return `${u.origin}${redactPath(u.pathname)}`;
}

// A route the script was given (Speed Insights' optional `route`): a path,
// possibly with a query or fragment. Same rules; null when there is none.
function redactRoute(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  const path = raw.split(/[?#]/)[0] ?? "";
  return redactPath(path);
}

export type AnalyticsEvent = { type: string; url: string; route?: string };

// The `beforeSend` both scripts share. Returns a copy with the address (and
// route, if any) redacted, or null to drop the event. Nothing else on the
// event is passed through: the scripts' event objects carry only these
// fields, and a copy cannot carry a field added later by mistake.
export function redactEvent<T extends AnalyticsEvent>(event: T): T | null {
  const url = redactAnalyticsUrl(event?.url);
  if (!url) return null;
  const out = { type: event.type, url } as AnalyticsEvent;
  if (event.route !== undefined && event.route !== null) {
    const route = redactRoute(event.route);
    if (route === null) return null;
    out.route = route;
  }
  return out as T;
}

// What the browser tells us about the visitor's choice.
export type PrivacySignals = {
  navigator?: object | null;
  window?: object | null;
};
type Flags = { globalPrivacyControl?: unknown; doNotTrack?: unknown; msDoNotTrack?: unknown };

// Global Privacy Control is `true`; Do Not Track is "1" (older browsers
// also say "yes"). Either one, from any of the places browsers put it.
export function optedOut(signals: PrivacySignals): boolean {
  const nav = signals.navigator as Flags | null | undefined;
  const win = signals.window as Flags | null | undefined;
  if (nav?.globalPrivacyControl === true) return true;
  const dnt = [nav?.doNotTrack, nav?.msDoNotTrack, win?.doNotTrack];
  return dnt.some((v) => v === "1" || v === "yes" || v === 1);
}

// EXPO_PUBLIC_WEB_ANALYTICS: "on" (also "1" or "true") turns analytics on;
// anything else, including unset, leaves it off. backend/scripts/build-
// webapp.sh sets it to "on" for Vercel production builds.
export function flagOn(raw: unknown): boolean {
  return typeof raw === "string" && ["on", "1", "true"].includes(raw.trim().toLowerCase());
}

export function shouldLoadAnalytics(flag: unknown, signals: PrivacySignals): boolean {
  return flagOn(flag) && !optedOut(signals);
}
