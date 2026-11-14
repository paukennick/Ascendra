# Web keyboard tests

`tab-order.e2e.mjs` Tabs through every control on the main web screens and checks visual order, a visible focus indicator, no keyboard trap (and correct focus handling in sheets), and that nothing hidden takes focus. It runs against a **web export served by the backend** and calls no model: the lesson API is answered locally.

Run it against a local web export:

1. Build and serve the app: `cd backend && ./scripts/build-webapp.sh && npm run dev` (the app is then at http://localhost:3000). The database needs migrations and the seed.
2. Register a learner in the app and verify the email in the local database: `update app_users set email_verified_at = now() where email = '<email>'`.
3. Find a course, unit and objective: `select st.id, cu.id, o.id from subject_tracks st join course_units cu on cu.track_id = st.id join objectives o on o.unit_id = cu.id where o.retired_at is null limit 1`.
4. Install Playwright anywhere outside the repo (`npm i --prefix /tmp/pw playwright`) and run:

```
PLAYWRIGHT_DIR=/tmp/pw BASE_URL=http://localhost:3000 \
E2E_EMAIL=... E2E_PASSWORD=... E2E_TRACK=<course id> E2E_UNIT=<unit id> E2E_OBJECTIVE=<objective id> \
node mobile/e2e/tab-order.e2e.mjs
```

Self-test (needs only Playwright and a Chromium, no app): `E2E_SELFTEST=1 PLAYWRIGHT_DIR=/tmp/pw node mobile/e2e/tab-order.e2e.mjs` audits small pages with known defects (wrong order, positive tabindex, no focus ring, off-screen or transparent focus, unreachable clickable div, a trapped or cyclic Tab, a leaky dialog) and fails if any is not caught. Run it after changing the script.

Optional: `E2E_LAB`, `E2E_SIM` (ids; without them the first item of the labs and sims lists is opened, and the screen is reported as not reached if none opens), `E2E_ONLY` (a regex on screen names), `E2E_JSON_OUT` (a file for the full result), `CHROME_PATH` (a Chromium to use). Exit code 1 means at least one screen failed.

## Study keyboard shortcuts (REQ-290)

The shortcuts (1-9 or A-D, Enter, N, P, F, Space, ?) act only while focus is in a question area and never in a text box, so they leave the Tab order and the focus ring alone. This script does not press them: its checks are unchanged, and the rules are unit-tested (`src/lib/studyShortcuts.test.ts`, on a faked document). What no test here covers is the keys in a real browser against the full app. To check by hand on a web export: open a lesson check, press 2 and then Enter (it should pick the second choice, then check it); press ? (a labelled dialog opens, Esc closes it and focus returns); type "n" in the dispute box (nothing happens); turn the switch off in Settings, under Study, and confirm none of it works. The question areas add one line of muted text ("Press ? for keyboard shortcuts.") that is not a tab stop.
