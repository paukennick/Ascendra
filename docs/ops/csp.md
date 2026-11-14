# Content-Security-Policy and HSTS (REQ-207, FAIL-947)

What the site now sends, why, and how it was checked. The policy lives in
`backend/security-headers.js` (loaded by `backend/next.config.js`) and is
covered by `backend/lib/security-headers.test.ts`.

## What is sent

| Response | Policy |
|---|---|
| The web app (Expo export, every path the catch-all route serves) | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob:` plus `base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'` |
| Pages Next renders itself: reset-password, verify-email, confirm-email-change, cancel-email-change, unsubscribe, delete-account | Same, but `script-src 'self' 'unsafe-inline'` (Next's streaming bootstrap is an inline script) |
| `/api/*` | `default-src 'none'` plus the four common rules |
| Everything | `Strict-Transport-Security: max-age=31536000` (one year, no `includeSubDomains`, no `preload`) |

Why `style-src` keeps `'unsafe-inline'`: react-native-web writes its
stylesheet and per-element styles at run time. Removing it blanks the app.
Scripts are the part that matters for stopping injected code, and those are
`'self'` only (no inline script, no eval) for the app itself.

HSTS is left without `includeSubDomains` and `preload` on purpose: both are
hard to undo and nobody has checked every subdomain. Add them later as a
separate decision.

## Website analytics (REQ-261)

The web app loads Vercel Web Analytics and Speed Insights. They need no change
here: both scripts load from this site's own origin (`/_vercel/insights/script.js`,
`/_vercel/speed-insights/script.js`, which Vercel serves) and post to
`/_vercel/insights/view` and `/_vercel/speed-insights/vitals` on the same origin,
so `script-src 'self'` and `connect-src 'self'` cover them. Observed on
2026-11-13: the built web app, served with this policy and Vercel's real scripts
at those paths, loaded both, sent page views and vitals, and raised no
violation. `lib/security-headers.test.ts` keeps the policy same-origin, and
`mobile/src/lib/analyticsWiring.test.ts` fails if an upgrade of either package
adds another host. The server-rendered pages (the second row above) do not load
them.

## Report-only switch

Set `CSP_REPORT_ONLY=true` in Vercel and redeploy to send the same policy as
`Content-Security-Policy-Report-Only`. The browser then logs violations
without blocking anything. Use it if a page you did not test breaks.

## What was checked (observed)

A real Chrome (Playwright) loaded the production build (`next build --webpack`
plus the Expo web export) against a throwaway migrated and seeded database,
listening for `securitypolicyviolation` events and CSP lines in the console.
Result: zero violations on sign-in, sign-up, forgot-password, home (after
signing in and accepting the terms), a course, a lesson, the course chat,
account, settings, the privacy page, reset-password and verify-email.
The response headers were read back: the app policy on pages, `default-src
'none'` on `/api/*`, HSTS on both.

Not checked (inferred only): the chat answer streaming with a real model
(the model was not called; only the page and its request path were), the
lesson interactive components other than the first lesson, and any page behind
a feature flag.

## If something breaks

1. Set `CSP_REPORT_ONLY=true`, redeploy, and the page works again.
2. Open the browser console on the broken page; the blocked source and the
   directive are named in the message.
3. Widen only that directive in `backend/security-headers.js`, update the
   test, and switch report-only off.
