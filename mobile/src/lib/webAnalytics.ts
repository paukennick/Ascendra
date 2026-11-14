// REQ-261: visitor analytics exist on the web build only. This is the native
// file (Android, iOS): it does nothing and imports nothing from Vercel, so
// the analytics packages never enter the phone app's bundle. Metro picks
// webAnalytics.web.ts on the web instead; a test (analyticsWiring.test.ts)
// keeps this file free of imports.

export function startWebAnalytics(): void {
  // Intentionally empty.
}
