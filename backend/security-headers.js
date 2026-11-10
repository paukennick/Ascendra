// REQ-207 (FAIL-947): the response headers next.config.js sets. A separate
// CommonJS file so lib/security-headers.test.ts can load it.
//
// Three kinds of response:
//  1. The web app -- mobile/'s Expo export, served same-origin by the
//     catch-all route (app/[[...path]]/route.ts). Strict: scripts only from
//     this origin, no inline script, no eval, nothing from another site.
//  2. The few pages Next renders itself (reset-password, verify-email, ...).
//     Next's streaming bootstrap is an inline <script>, so these need
//     'unsafe-inline' for scripts until they get per-request nonces. They
//     carry a one-time token in the URL and no third-party content.
//  3. /api/*: JSON. Nothing may load or frame it.
//
// style-src keeps 'unsafe-inline': react-native-web writes its stylesheet and
// per-element styles at run time. See docs/ops/csp.md for what was tested.

const NEXT_RENDERED_PAGES = [
  "reset-password",
  "verify-email",
  "confirm-email-change",
  "cancel-email-change",
  "unsubscribe",
  "delete-account",
];

const COMMON = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
];

function csp(parts) {
  return [...parts, ...COMMON].join("; ");
}

const APP_CSP = csp([
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
]);

const NEXT_PAGE_CSP = csp([
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
]);

const API_CSP = csp(["default-src 'none'"]);

const BASE = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // One year. No includeSubDomains / preload: other subdomains of the
  // custom domain are not ours to promise HTTPS for from here.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

// REPORT_ONLY=true flips the app CSP to Content-Security-Policy-Report-Only
// (violations are logged in the browser console but nothing is blocked).
function headerFor(value, reportOnly) {
  return { key: reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value };
}

function buildHeaders(env = process.env) {
  const reportOnly = env.CSP_REPORT_ONLY === "true";
  const nextPages = NEXT_RENDERED_PAGES.join("|");
  return [
    { source: "/:path*", headers: BASE },
    // The web app: every path that is not an API route, a Next asset or one of
    // the Next-rendered pages.
    { source: `/((?!api(?:/|$)|_next(?:/|$)|(?:${nextPages})(?:/|$)).*)`, headers: [headerFor(APP_CSP, reportOnly)] },
    ...NEXT_RENDERED_PAGES.map((p) => ({ source: `/${p}`, headers: [headerFor(NEXT_PAGE_CSP, reportOnly)] })),
    { source: "/api/:path*", headers: [headerFor(API_CSP, reportOnly)] },
  ];
}

module.exports = { buildHeaders, APP_CSP, NEXT_PAGE_CSP, API_CSP, NEXT_RENDERED_PAGES };
