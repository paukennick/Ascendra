# Prep LMS — local companion app

A mobile companion to Pak's existing Claude Artifact study coaches (`mscs-coach.html`,
`security-plus-coach.html`). It does **not** replace those — it adds a real backend (Next.js
+ Postgres/Supabase + the Anthropic API directly) and a standalone Android app (Expo) so the
same adaptive guess -> teach -> fade -> solo teaching loop, mastery tracking, spaced review,
and PBQ simulator work outside of claude.ai, on its own database.

```
prep-lms/
  backend/     Next.js API (App Router, /app/api/*) — deploys to Vercel
  backend/supabase/   SQL migration + seed script
  mobile/      Expo app (expo-router) — builds to a standalone Android APK via EAS
  README.md    this file
```

Follow the steps below in order — each one unblocks the next.

---

## 1. Create the Supabase project and load the schema

1. Go to [supabase.com](https://supabase.com), sign in, and create a new project (pick any
   region close to you; note the database password you set — you'll need it for the
   connection string in step 2).
2. Once the project is ready, open **SQL Editor** in the left sidebar, click **New query**,
   paste in the entire contents of `backend/supabase/migrations/001_init.sql`, and click
   **Run**. This creates every table, enum, view, and index the app needs.
3. Get your connection string: **Project Settings -> Database -> Connection string -> URI**.
   Use the **Transaction pooler** string (port `6543`) — it's the one meant for serverless
   platforms like Vercel. It looks like:
   `postgres://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres`
4. Run the seed script locally to load the starting dataset (two courses: MSCS Foundations
   Coach with 15 weeks, Security+ Coach with 5 domains and ~36 objectives):
   ```
   cd backend
   npm install
   cp .env.example .env.local
   # edit .env.local: paste your DATABASE_URL from step 3, leave DEFAULT_USER_EMAIL as-is
   # (or set it to your own address — it's just a lookup key, not sent anywhere)
   npm run seed
   ```
   You should see log lines like `subject_tracks: created MSCS -> <uuid>` and
   `seeded 15 units for MSCS`. The seed script is safe to re-run.

## 2. Deploy the backend to Vercel

1. Push this repo to GitHub from VS Code (or however you normally push).
2. In the [Vercel dashboard](https://vercel.com/new), import that GitHub repo.
3. When Vercel asks for the **Root Directory**, set it to `backend` (this repo has both
   `backend/` and `mobile/` at the top level — only `backend/` is the Vercel project).
4. Before the first deploy (or right after, then redeploy), go to
   **Project Settings -> Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your key from console.anthropic.com — see step 3 below |
   | `ANTHROPIC_MODEL` | `claude-sonnet-4-5` (confirm this is still current — see the note in step 3) |
   | `DATABASE_URL` | the same Supabase pooler connection string from step 1.3 |
   | `DEFAULT_USER_EMAIL` | whatever you set in `.env.local` when you ran the seed script |

   Set these for all three environments (Production, Preview, Development) unless you want
   different Supabase projects per environment.
5. Deploy. Once it's live, note the deployment URL, e.g. `https://prep-lms-xyz.vercel.app`
   — you'll need it in step 4.
6. Sanity check: open `https://<your-url>.vercel.app/api/health` in a browser — it should
   return `{"status":"ok"}`. If it errors, re-check `DATABASE_URL`.

## 3. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com/settings/keys), sign in, and
   create a new API key.
2. Paste it **only** into Vercel's environment variable UI (step 2.4 above) — never into any
   file in this repo, never into a commit, and never into a chat with Claude.
3. **Model name note:** `backend/.env.example` and `backend/lib/anthropic.ts` default to
   `claude-sonnet-4-5`. This was chosen without live access to Anthropic's current model
   catalog at the time this app was built, so **confirm the exact current model ID** at
   [docs.anthropic.com/en/docs/about-claude/models](https://docs.anthropic.com/en/docs/about-claude/models)
   before relying on this in daily use, and update the `ANTHROPIC_MODEL` env var in Vercel
   if it's changed.

## 4. Point the mobile app at your deployed backend

Edit `mobile/eas.json` and replace the placeholder URL with your real Vercel URL from step 2.5:

```json
"production": {
  "android": { "buildType": "apk" },
  "env": { "EXPO_PUBLIC_API_URL": "https://prep-lms-xyz.vercel.app" }
}
```

(For running the app locally with `expo start` instead of a built APK, copy
`mobile/.env.example` to `mobile/.env.local` and set `EXPO_PUBLIC_API_URL` there too.)

## 5. Build the Android APK with EAS

From the `mobile/` folder:

```
cd mobile
npm install
npx eas login
npx eas build -p android --profile production
```

- `eas login` asks for your Expo account (create one free at expo.dev if you don't have one).
- The first time you run `eas build` in this project, it will ask to link/create an EAS
  project — accept the defaults.
- The build runs on Expo's servers (a few minutes). When it finishes, the CLI prints a URL
  like `https://expo.dev/artifacts/eas/...` — that's your APK download link. It also shows
  up under **your project -> Builds** on [expo.dev](https://expo.dev).

## 6. Install the APK on your Pixel 9

1. On the Pixel 9, open the build link from step 5 (in Chrome, or whichever browser/file
   manager you used to download it) and download the `.apk` file.
2. Android will likely block the install the first time. When prompted, tap **Settings** on
   the warning, then enable **Allow from this source** for the browser or file manager you
   used to download it (Settings path: **Settings -> Apps -> [Chrome / Files] -> Install
   unknown apps -> Allow from this source**).
3. Go back and tap the downloaded APK again — it should now install normally. Open **Prep LMS**
   from the app drawer.

---

## What's in each part

### `backend/`
Next.js 14 App Router project, API routes only (no rendered pages beyond a placeholder home
page). Key files:
- `lib/db.ts` — pg Pool + `getDefaultUserId()` (single-user lookup by seeded email).
- `lib/anthropic.ts` — Anthropic Messages API wrapper (`callClaude`, `callClaudeJSON`), model
  id from `ANTHROPIC_MODEL` env var.
- `lib/prompts.ts` — prompt builders for lesson generation, free-response grading, PBQ
  generation/grading, and chat — ported from the governing rules in `mscs-coach.html` /
  `security-plus-coach.html` (define every term, grade every sub-part by name, never grade
  past a gap, MC-until-proficient, etc).
- `lib/mastery.ts` — the 0-4 mastery rubric, `isProficient()` (>=2 attempts, >=85% accuracy),
  mastery-status suggestion logic, and the 1/7/21-day spaced-review scheduler.
- `lib/grading-service.ts` — shared "record an attempt, update mastery, log an error if not
  correct" logic used by both `/api/grade` and `/api/pbq`.
- `app/api/*` — one route per resource: `courses`, `units`, `objectives/:id/lesson` (cached
  lesson generation), `objectives/:id/mastery`, `grade` (MC + free-response grading),
  `pbq` (scenario generation + grading), `chat`, `attempts`, `errors`, `sessions`, `health`.

### `backend/supabase/`
- `migrations/001_init.sql` — full schema: `app_users`, `subject_tracks`, `course_units`,
  `objectives`, `lesson_content` (per-objective cache), `pbq_scenarios`, `mastery`,
  `attempts`, `error_log` (with `review_stage`/`next_review_at` for spaced review),
  `chat_messages`, `study_sessions`, plus rollup views (`view_unit_mastery`,
  `view_track_progress`, `view_due_reviews`).
- `seed/data.ts` — the real MSCS week titles/objectives and Security+ domain
  titles/weights/objectives, ported from the two Artifact apps.
- `seed/seed.ts` — idempotent seed script (`npm run seed`).

### `mobile/`
Expo (managed workflow) app using **expo-router** (file-based routing) rather than plain
React Navigation, since it maps cleanly onto this app's URL-shaped screens
(`/course/[trackId]/lesson/[objectiveId]`, etc) and needs less boilerplate.

Screens:
- `app/index.tsx` — Home / course switcher.
- `app/course/[trackId]/index.tsx` — Course dashboard (units, mastery badges, continue CTA).
- `app/course/[trackId]/lesson/[objectiveId].tsx` — the guess -> teach -> fade -> solo lesson
  flow: MC or free-response at each check step, a 1-5 confidence rating, and a "send
  follow-up" box under a graded verdict.
- `app/course/[trackId]/pbq.tsx` — PBQ scenario simulator (multi-part, graded per sub-part).
- `app/course/[trackId]/chat.tsx` — Ask the coach (multi-turn, persisted).
- `app/course/[trackId]/progress.tsx` — Mastery matrix.
- `app/course/[trackId]/history.tsx` — Filterable answer history.
- `app/settings.tsx` — shows the configured API URL.

`eas.json` has a `production` profile with `android.buildType: "apk"` so `eas build` produces
a directly installable `.apk` rather than an `.aab` (which would need Play Store submission).

---

## Verification performed on this build (and its limits)

- **Backend**: `npm install`, `npx tsc --noEmit`, and `npm run build` (a real Next.js
  production build) all completed with no errors, in this sandbox, against the actual
  `next@14.2.35` / `@anthropic-ai/sdk` / `pg` versions pinned in `package.json`. Every
  `/api/*` route is correctly detected as dynamic (server-rendered per request, not
  statically cached) because they read `request.url` or use runtime env vars.
- **Backend seed script**: typechecked cleanly on its own (it's a standalone `tsx` script,
  not part of the Next.js build).
- **Mobile**: `npm install` and `npx tsc --noEmit` both completed cleanly; `npx expo config`
  resolved `app.json`/`eas.json` without error. **Not verified**: an actual `expo start`
  session, a Metro bundle, or a real EAS cloud build — those need a device/simulator and an
  Expo account this sandbox doesn't have. Fix anything Metro flags the first time you run
  `npx expo start` the same way you'd fix any new project's first-run issues.
- **Not verified at all** (no credentials in this sandbox, and none were sought): an actual
  Supabase project, a live Anthropic API call, a Vercel deployment, or an EAS cloud build.
  Everything above is code/config-level verification only.

## Judgment calls made while building this

- **Schema**: extended the pasted blueprint's `subject_tracks`/`course_modules` shape rather
  than reusing `quiz_questions`/`quiz_attempts` as-is, since those assumed a static
  pre-authored question bank with string-equality grading — incompatible with per-objective
  AI-generated content and Claude-graded free-response/PBQ answers. Kept the blueprint's
  naming spirit (`subject_tracks` survives) but renamed `course_modules` -> `course_units`
  to read naturally for both "week" and "domain", and replaced the static tables with
  `lesson_content` (cache), `mastery`, `attempts`, `error_log`, `pbq_scenarios`.
- **Model string**: defaulted to `claude-sonnet-4-5` in `.env.example` / `lib/anthropic.ts`.
  Confirm this against Anthropic's current model list before relying on it (see step 3 above)
  — the model catalog moves and this was picked without checking it live.
- **Expo Router vs React Navigation**: chose expo-router for the file-based routes matching
  this app's natural URL shape and less setup code; React Navigation would work equally well
  if preferred later.
- **MC-vs-free-response gating**: the lesson-flow screen always offers a mode toggle (MC or
  free response) rather than fully hiding free-response until proficiency is reached, since
  enforcing that gate purely client-side would need an extra round-trip to
  `/api/objectives/:id/mastery` before rendering each check step. The backend's
  `isProficient()` / accuracy logic in `lib/mastery.ts` is there and used to drive the mastery
  *status* suggestion after each attempt — wiring it into a hard UI gate (hiding the MC
  toggle once proficient) is a small follow-up if you want the exact same "MC evaporates"
  behavior as the Artifact apps.
- **PBQ scope**: PBQ scenarios are generated per **unit** (not per objective), matching how
  `security-plus-coach.html` scopes them, and are cached but not deduplicated — each "try
  another scenario" call generates and stores a new one, so a unit accumulates a history of
  scenarios over time rather than caching exactly one.
- **Single-user**: every table carries a `user_id`, and one `app_users` row is seeded from
  `DEFAULT_USER_EMAIL`; no login screen exists since this is single-user by design, but the
  schema doesn't need a migration if a real auth layer gets added later.

## The exact next 3 commands to run

```
cd backend && npm install
```
then set up Supabase (step 1) and paste `DATABASE_URL` into `backend/.env.local`, then:
```
npm run seed
```
then, once you've deployed `backend/` to Vercel and set `EXPO_PUBLIC_API_URL` in
`mobile/eas.json` (steps 2 and 4):
```
cd ../mobile && npm install && npx eas login
```
