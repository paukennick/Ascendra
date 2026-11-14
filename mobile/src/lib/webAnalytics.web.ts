// REQ-261: Vercel Web Analytics and Speed Insights for the web app (the
// Expo web export served at the site root), loaded once when the page loads.
// The native app gets webAnalytics.ts (a no-op) instead of this file.
//
// What is sent and when is decided in analyticsPrivacy.ts:
//  - off unless EXPO_PUBLIC_WEB_ANALYTICS is "on" (docs/web-analytics.md);
//  - off when the browser sends Global Privacy Control or Do Not Track:
//    neither script is added to the page;
//  - every page address passes through `redactEvent` (no query string, no
//    fragment, ids and tokens replaced) before it leaves the browser.
// No custom events, no identifiers. Both scripts load from this site's own
// origin (/_vercel/..., served by Vercel), which the app's Content-Security-
// Policy already allows (backend/security-headers.js).
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { redactEvent, shouldLoadAnalytics, type PrivacySignals } from "./analyticsPrivacy.ts";

export type AnalyticsDeps = {
  flag?: unknown;
  signals?: PrivacySignals;
  inject?: typeof inject;
  injectSpeedInsights?: typeof injectSpeedInsights;
};

let started = false;

// Safe to call more than once; the scripts are added at most once. Never
// throws: analytics must not be able to break the app. Returns whether the
// scripts were added.
export function startWebAnalytics(deps: AnalyticsDeps = {}): boolean {
  if (started) return false;
  try {
    // process.env.EXPO_PUBLIC_* is replaced with its value at build time, and
    // only when written exactly like this.
    const flag = "flag" in deps ? deps.flag : process.env.EXPO_PUBLIC_WEB_ANALYTICS;
    const signals: PrivacySignals =
      deps.signals ??
      (typeof navigator === "undefined" ? {} : { navigator, window: typeof window === "undefined" ? null : window });
    if (!shouldLoadAnalytics(flag, signals)) return false;
    started = true;
    // `mode: "production"` pins the same-origin script; "auto" would pick the
    // debug script on va.vercel-scripts.com in a development bundle.
    (deps.inject ?? inject)({ mode: "production", beforeSend: redactEvent });
    (deps.injectSpeedInsights ?? injectSpeedInsights)({ beforeSend: redactEvent });
    return true;
  } catch {
    return false;
  }
}

// For tests only.
export function resetWebAnalyticsForTests(): void {
  started = false;
}
