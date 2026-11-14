# Website analytics (REQ-261)

Ascendra's web app counts which pages are used and how fast they load with
Vercel Web Analytics and Vercel Speed Insights. Decided by Nick on 2026-11-11 and
disclosed in the Privacy Policy and Cookies page dated 2026-11-14. The phone app
has no analytics.

## What it does

- Loaded by `mobile/src/lib/webAnalytics.web.ts`, once when the web app starts.
  Metro picks that file on the web only; `webAnalytics.ts` (Android, iOS) is
  empty. Not loaded on the server-rendered pages (reset password, verify email,
  confirm email change, unsubscribe, delete account); those never had it.
- Off when the browser sends Global Privacy Control (`navigator.globalPrivacyControl`
  is true) or Do Not Track (`navigator.doNotTrack` is "1"): neither script is added to
  the page. Read once at page load, so a change takes effect on the next load.
- Every page address passes through `redactEvent` (`mobile/src/lib/analyticsPrivacy.ts`)
  before it is sent: no query string, no fragment, and any path part that looks
  like an id or a token becomes `:id` (`/course/<uuid>/lesson/<uuid>?x=1#y` is sent
  as `/course/:id/lesson/:id`). An address that is not http(s) is dropped.
- No custom events, no user id, no cookie: nothing about the account reaches
  Vercel. What a page view holds is in `docs/legal/data-inventory.md`, "Website
  analytics".
- Packages (exact pins in `mobile/package.json`): `@vercel/analytics` 2.0.1 and
  `@vercel/speed-insights` 2.0.0. Both load their script from this site's own
  origin (`/_vercel/...`), so the Content-Security-Policy needed no change
  (`docs/ops/csp.md`).

## The flag: EXPO_PUBLIC_WEB_ANALYTICS

Read when the web app is built (Expo inlines `EXPO_PUBLIC_*` values), so changing
it needs a redeploy; a tab already open keeps the old bundle until it reloads.

| Value | Result |
|---|---|
| `on` (also `1`, `true`) | both scripts load (unless GPC or Do Not Track) |
| anything else, or unset | nothing loads |

`backend/scripts/build-webapp.sh` sets it for you: `on` when `VERCEL_ENV` is
`production`, `off` for previews and local builds. A value already in the
environment wins, so to turn analytics off for production without a code change,
add `EXPO_PUBLIC_WEB_ANALYTICS=off` to the Vercel project's Production
environment variables and redeploy. Remove it to go back to the default. It is
public by design (it ships in the web bundle); never put a secret in an
`EXPO_PUBLIC_` variable.

## Turn it on in Vercel (once)

The scripts only receive data once the features are enabled for the project: in
the Vercel dashboard, open the project, then its **Analytics** tab and **Speed
Insights** tab and enable each, then redeploy. Until then the script requests
are not answered by Vercel, so they fall through to the app's catch-all route,
which returns the app's page; the browser refuses that as a script (a console
error) and the app carries on. Nothing in this repo can enable them. Check the
plan's limits on what is kept and counted in the dashboard.

## Viewing the data

Vercel dashboard, project, **Analytics** (visitors, page views, top pages,
referrers, countries, devices, browsers) and **Speed Insights** (Core Web Vitals
by route and device). Pages appear as `/course/:id/lesson/:id`, so a row is a
kind of page, never one learner's page. Figures are aggregate and anonymous:
there is no way to look up a person, and none is needed.

## Checking it by hand

1. `cd backend && EXPO_PUBLIC_WEB_ANALYTICS=on ./scripts/build-webapp.sh`, serve it,
   and open the browser's network tab: `/_vercel/insights/script.js` and
   `/_vercel/speed-insights/script.js` are requested (locally they are not served,
   since Vercel serves them in production only). With Global Privacy Control or Do Not Track on, or
   the flag `off`, neither is requested.
2. In a Vercel deployment, the requests to `/_vercel/insights/view` and
   `/_vercel/speed-insights/vitals` carry the redacted address (no `?` and no `#`).
   The scripts send nothing from an automated browser (`navigator.webdriver` or
   "Headless" in the user agent), so use a normal browser.

## Changing the redaction or the packages

- A new kind of id in a path (a slug that is a secret, a date, a name) needs a rule
  and a test in `analyticsPrivacy.ts` / `analyticsPrivacy.test.ts`. The test that
  reads the app's own route names fails if a real screen name would be redacted.
- Upgrading either package: `analyticsWiring.test.ts` fails if the new version
  references another host, which would also need a CSP change and a policy update.
  Read the new script for storage use (`localStorage`, `document.cookie`) before
  shipping it: the policy says nothing is stored on the device, and the scripts
  are served by Vercel, so their behavior can change without a deploy here.
- Anything that stores data on the device or sets a cookie needs a consent prompt
  first (Cookies page); do not add `identify`, `group` or the cookie mode.

## Known limits

- The referrer is sent by Vercel's script and cannot be redacted by `beforeSend`;
  it is another site's address, left out when it is this site.
- Speed Insights also sends a CSS selector of the slowest element (for example
  `h1.css-...`); it holds no text. Disclosed in the Privacy Policy.
- Whether events reach Vercel, and whether the two features are enabled in the
  dashboard, can only be seen in the Vercel dashboard.
