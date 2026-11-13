# Developing Ascendra

<p>
  <a href="https://github.com/paukennick/Ascendra/actions/workflows/ci.yml"><img src="https://github.com/paukennick/Ascendra/actions/workflows/ci.yml/badge.svg?branch=master" alt="CI status"></a>
  <img src="https://img.shields.io/badge/node-22%20to%2024-5A7BF0" alt="Node 22 to 24">
</p>

Everything about how Ascendra is built, run, tested and deployed. The
[README](../README.md) describes the product for learners; this page is for
people working on the code. The sections below were moved here from the README
on 2026-11-11 (REQ-229) without rewording, apart from links that now resolve
from `docs/`.

## Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Testing and CI](#testing-and-ci)
- [Production settings](#production-settings)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Project status](#project-status)
- [Feature detail (engineering view)](#feature-detail-engineering-view)
- [README screenshots to add](#readme-screenshots-to-add)

## Overview

One Expo codebase ships to iOS, Android and the web. A Next.js API on Vercel holds the logic, Postgres (Supabase) holds the data, and Anthropic's Claude writes lessons and grades typed answers behind guardrails.

## Architecture

```mermaid
flowchart TB
  subgraph clients["Clients"]
    direction LR
    NATIVE["iOS and Android app<br/>Expo, built with EAS"]
    WEB["Web app<br/>Expo web export"]
  end

  subgraph vercel["Vercel"]
    direction LR
    API["Next.js backend<br/>API routes + web app files"]
    CRON["Vercel cron<br/>health, purge, content signals,<br/>service emails"]
  end

  subgraph services["Services"]
    direction LR
    DB[("Postgres<br/>on Supabase")]
    AI["Anthropic Claude<br/>lessons, grading, coach"]
    MAIL["Resend<br/>email"]
  end

  subgraph ops["Automation"]
    direction LR
    MIG["GitHub Actions<br/>migrate, seed, pre-generate"]
    BACKUP["GitHub Actions<br/>nightly encrypted backup"]
    KEEP["GitHub Actions<br/>daily keep-alive"]
    AGENT["Catalog review agent<br/>quarterly"]
  end

  PAY["RevenueCat, Stripe<br/>plans switched off"]

  NATIVE -- "HTTPS, JWT" --> API
  WEB -- "same origin" --> API
  API -- "SQL, scoped per user" --> DB
  API --> AI
  API --> MAIL
  CRON --> API
  KEEP --> API
  AGENT --> API
  MIG -- "migrations, seed, recompute" --> DB
  BACKUP -- "pg_dump, encrypted" --> DB
  PAY -. "webhooks" .-> API
```

- **Scheduled and automated callers.** Vercel cron pings `/api/health`, purges expired sign-in records, collects content signals and runs the service-email job (which sends nothing while switched off); GitHub Actions takes an encrypted nightly backup (`production-backup` environment) and pings health as an independent keep-alive; the quarterly catalog review agent reads `/api/catalog/review-context` and writes `/api/catalog/review-findings` with its own machine credential.
- **One backend, two kinds of client.** The web app is the mobile app exported with `expo export --platform web` and copied into `backend/public/` at build time (`backend/scripts/build-webapp.sh`), so it calls the API on the same origin. Native builds get their API URL from `mobile/eas.json`.
- **No ORM and no Supabase client.** The backend talks to Postgres directly through `DATABASE_URL` (the Supabase transaction pooler in production), scopes learner data by user in code, and migration `026` locks Supabase's public Data API out of every table. Migration `071` adds a login-less `app_runtime` role the app can switch to later, with fewer rights than the owner login.
- **AI is server-side only.** Lessons are generated once per objective and cached for every learner; grading, the coach and its guard use a faster model (`backend/lib/anthropic.ts`). Production authenticates with Workload Identity Federation rather than a stored key.
- **Migrations keep the live code working.** 78 files under `backend/supabase/migrations/`, applied in order by `npm run migrate`. The deploy runbook requires each to be additive, because the old backend runs on the new schema until the deploy finishes; backfills and a mastery recompute follow where the rules changed.

## Tech stack

- **Client:** Expo SDK 57, Expo Router, React Native 0.86 with react-native-web, TypeScript
- **API:** Next.js 16 (App Router, API routes only), Node 22 to 24, zod validation
- **Database:** PostgreSQL on Supabase, plain SQL migrations via `pg`
- **Auth:** custom JWT access and refresh tokens, bcrypt, TOTP and email-code MFA, Google OAuth
- **AI:** Anthropic Claude through `@anthropic-ai/sdk` (model ids set by `ANTHROPIC_MODEL` and `ANTHROPIC_FAST_MODEL`)
- **Email:** Resend
- **Payments (off):** RevenueCat in the app, RevenueCat and Stripe webhooks on the server
- **Hosting and builds:** Vercel for the backend and web app, EAS for native builds
- **Tests:** `node:test` (via `tsx` in the backend), Postgres integration tests in CI

## Repository layout

```text
backend/                    Next.js API on Vercel, also serves the web app
  app/api/                  One route group per resource (auth, courses, review, exam, labs, coach, billing ...)
  lib/                      Domain logic: mastery, grading, coach guard, labs, billing, AI wrapper
  lib/*.test.ts             Unit tests (pure modules)
  lib/*.dbtest.ts           Integration tests against a real Postgres
  scripts/                  Web build, evals, metrics, CI fixtures, production rehearsal
  supabase/migrations/      Additive SQL migrations, applied in order
  supabase/seed/            The shared catalog: courses, units, objectives, exam blueprints, labs
mobile/                     Expo Router app for iOS, Android and web
  app/(auth)/ (app)/ (legal)/   Screens grouped by sign-in state
  src/lib/                  Pure helpers with node:test suites
  src/components/           Shared UI, lab and disclaimer components
docs/                       Runbooks, design documents and standing references
.ai/                        Assistant working rules and the requirements registry (see CLAUDE.md)
.github/workflows/          CI, production migrations, keep-alive, live evals
CHANGELOG.md                One entry per requirement (REQ-###), newest first
```

## Getting started

You need Node 22, 23 or 24, npm, and PostgreSQL 16 or newer (a local server or a Supabase project).

### 1. Backend and database

```bash
cd backend
npm ci
cp .env.example .env.local
```

Edit `backend/.env.local`. For a local Postgres, set `DATABASE_URL` (for example `postgres://postgres:postgres@localhost:5432/ascendra`) and add `PGSSLMODE=disable`. Set `AUTH_JWT_SECRET` and `CHOICE_ORDER_SECRET` to long random values and `AUTH_ENCRYPTION_KEY` to 32 random bytes in base64; `.env.example` explains every variable and how to generate each one.

Create the schema and the catalog, the same way CI's Database job does. The migrate and seed scripts read `backend/.env.local` themselves.

```bash
createdb ascendra                                                  # local Postgres only
psql "<your DATABASE_URL>" -f scripts/ci/supabase-roles.sql        # local Postgres only: the roles Supabase provides
npm run migrate -- --all      # each file runs once, in its own transaction
npm run migrate -- --status   # should end "Schema is current"
npm run seed                  # idempotent; safe to re-run
```

### 2. Run the app on the web

```bash
npm run build    # exports the Expo web app into public/, then builds Next.js
npm start        # http://localhost:3000 serves the app and the API
```

`GET /api/health` reports the database and lists any missing configuration. Without `ANTHROPIC_API_KEY`, everything that doesn't need a model works (catalog, courses, progress, practice exam setup, reading a lab), while lessons, grading and the coach return errors. Without `RESEND_API_KEY`, sign-up can't send its verification email (and in production `EMAIL_FROM` must be on a domain verified in Resend: see docs/operations-runbook.md, "Email sender"); for a local-only test account you can mark it verified in your own database with `update app_users set email_verified_at = now() where email = '<address>';`.

### 3. Run the native app

```bash
cd mobile
npm ci
cp .env.example .env.local    # set EXPO_PUBLIC_API_URL to your backend
npx expo start
```

Production native builds go through EAS (`npx eas build -p android --profile production`, or `-p ios`).

## Testing and CI

```bash
cd backend && npm run typecheck && npm test      # unit tests, no database or API key
cd backend && npm run test:db                    # integration tests; needs DATABASE_URL to a migrated, seeded database
cd mobile  && npm run typecheck && npm test
```

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push to `master` and every pull request:

- **Backend:** typecheck, unit tests, a full build (which also exports the web app) and a blocking `npm audit`.
- **Database:** every migration on an empty Postgres 16, a schema check, the seed run twice, and the integration tests.
- **Backfills:** older migrations, then a synthetic learner history, then the rest, checking that each backfill did real work and every stored level matches the mastery rule.
- **Production-state rehearsal:** rebuilds the pre-release production schema, migrates it, then rolls it back and checks the old routes still work.
- **Mobile:** typecheck and unit tests, with `npm audit` and `expo-doctor` reported but not blocking.
- **Workspace freshness:** the generated `.ai/` files match what's committed.

Live-model evals (`.github/workflows/live-evals.yml`) run only by hand, with a hard spending cap.

## Production settings

Every setting the server code reads, by name and purpose. Values live only in Vercel (or GitHub environments for the workflows), never in this repo; `backend/.env.example` explains how to generate each secret. `GET /api/health` reports missing required settings by name.

**Set in production now** (reported by Nick, 2026-11-11):

- `APP_BASE_URL` is `https://www.ascendra-learn.com`
- `SIMS_ENABLED=true`
- `AI_ACCESS_MODE=granted`
- `AI_GLOBAL_DAILY_CEILING_USD=5`
- `BILLING_ENABLED` off
- `ERROR_TRACKER_DSN` is supported but **not set yet**, so server errors are only in the Vercel logs

**Required**

| Setting | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (transaction pooler, port 6543, in production) |
| `AUTH_JWT_SECRET` | Signs 15-minute access tokens |
| `AUTH_ENCRYPTION_KEY` | Encrypts two-factor secrets at rest (32 bytes, base64) |
| `CHOICE_ORDER_SECRET` | Keys the per-learner shuffle of answer choices (production) |
| `APP_BASE_URL` | Base URL for links in emails |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sending email; `EMAIL_FROM` must be on a verified domain |
| `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID`, `ANTHROPIC_WORKSPACE_ID` | Claude access by workload identity federation (production); identifiers, not secrets |
| `ANTHROPIC_API_KEY` | Claude access by static key (local development; takes precedence when set) |
| `CRON_SECRET` | Authorises Vercel cron calls and the detailed health report |
| `GOOGLE_OAUTH_CLIENT_IDS` | Google sign-in client ids; Google sign-in is off without it |

**AI models and spend**

| Setting | Purpose |
|---|---|
| `ANTHROPIC_MODEL`, `ANTHROPIC_FAST_MODEL` | Model ids for lessons, and for chat and grading |
| `AI_ACCESS_MODE` | `all` (default), `granted` or `paid`: who gets full AI |
| `AI_GLOBAL_DAILY_CEILING_USD` | Daily spend ceiling across everyone (unset = none) |
| `AI_DAILY_BUDGET_USD`, `AI_DAILY_GRADING_BUDGET_USD` | Per-learner daily coach and grading pools |
| `OWNER_EMAILS` | Owner accounts (unrestricted access, Settings > Access) |
| `AI_UNRESTRICTED_DAILY_CEILING_USD`, `OWNER_MONTHLY_AI_CAP_USD` | Safety caps for unrestricted accounts and owners |
| `AI_MONTHLY_CAP_<PLAN>_USD` | Monthly AI cap per plan (used when billing is on, and for grants) |
| `ITEM_FACT_CHECK` | `off` turns off the fact-check gate on generated questions |
| `CHAT_HISTORY_TOKEN_BUDGET` | Size of the coach history sent per message |
| `AI_CALL_LOG` | `off` stops recording model calls in `ai_calls` |
| `AI_PROVIDER`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Local-only alternative model; refused in production |

**Features and content**

| Setting | Purpose |
|---|---|
| `SIMS_ENABLED` | Shows sims (off by default) |
| `SIMS_RENDERERS` | Which sim screen types are on (default `bedside,board,session,security-console,treatment-session,terminal`; `lib/sim/server-run.ts` `DEFAULT_RENDERERS`) |
| `SIMS_SERVE_UNREVIEWED`, `LABS_SERVE_UNREVIEWED` | Serve sims and labs before review (on by default) |
| `SERVICE_EMAILS_ENABLED` | Turns on the service emails (off until the privacy text covers them) |
| `SERVICE_EMAIL_BATCH`, `DIGEST_EMAIL_FROM`, `MAIL_POSTAL_ADDRESS` | Service email batch size, digest sender and footer address |
| `SUPPORT_EMAIL`, `SUPPORT_FORWARD_TO`, `RESEND_WEBHOOK_SECRET` | Support address, where inbound support mail is forwarded, and the inbound webhook secret |
| `CATALOG_REVIEW_AGENT_TOKEN` | Credential for the quarterly catalog review agent |
| `MIN_APP_VERSION`, `IOS_APP_STORE_URL` | Oldest app version the server accepts, and where to send iOS users to update |
| `ALLOWED_ORIGINS` | Extra browser origins allowed to call the API |

**Billing (off)**

| Setting | Purpose |
|---|---|
| `BILLING_ENABLED` | Master switch for plans and prices |
| `BILLING_PRICE_<FAMILY>_<PERIOD>_USD`, `BILLING_ALLOWANCE_<KIND>_<TIER>`, `BILLING_FREE_COURSE_SWITCH_DAYS` | Prices, allowances and the free course switch |
| `REVENUECAT_WEBHOOK_AUTH`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_<PLAN>` | Payment providers |
| `BILLING_WEB_RETURN_URL` (or `APP_URL`) | Where web checkout returns |
| `VERIFIED_DISCOUNTS_ENABLED`, `VERIFIED_DISCOUNT_GROUPS`, `VERIFIED_DISCOUNT_VALID_DAYS`, `DISCOUNT_PERCENT_<GROUP>`, `STRIPE_COUPON_<GROUP>`, `PLAY_OFFER_<GROUP>`, `APP_STORE_OFFER_REDEEM_URL` | Verified group discounts |

**Database, monitoring and platform**

| Setting | Purpose |
|---|---|
| `ERROR_TRACKER_DSN` | Sends server errors to Sentry (supported, not set yet) |
| `DATABASE_CA_CERT` or `PGSSLROOTCERT` | Verify the database's TLS certificate (optional; see docs/ops/db-tls.md) |
| `PGSSLMODE` | `disable` for local and CI databases only |
| `DB_STATEMENT_TIMEOUT_MS` | Per-query time limit sent when connecting (default 25 s, but on the Supabase pooler only when set explicitly; 0 turns it off) |
| `MIGRATION_LOCK_TIMEOUT` | Lock wait for migrations (default 5 s) |
| `RECHECK_ALLOW_PRIVILEGED` | Lets the content re-check job run as a privileged role on a local database only |
| `SANDBOX_NODE_IMAGE`, `SANDBOX_PYTHON_IMAGE`, `DOCKER_HOST` | Container images and Docker host for the fact-check code sandbox (GitHub Actions) |
| `NODE_ENV`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` | Set by the platform; the commit is shown by `/api/health` and `/api/version` |

**App build (`mobile/`, public by design):** `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_WEB_BUILD_ID`.

**GitHub workflow secrets** (in the `production-database` or `production-backup` environment): `PROD_DATABASE_URL` (session pooler, port 5432), `ANTHROPIC_PREGEN_API_KEY` (pre-generation only) and `BACKUP_AGE_RECIPIENT` (the public key the backups are encrypted to; a variable or a secret).

## Deployment

The backend and web app deploy to Vercel from `backend/` (with files outside the root directory included, so the build can reach `mobile/`). Production migrations run from GitHub, never from a laptop. A release ships in batches, one pull request each:

1. Merge the batch into the release branch; CI must be green.
2. If it adds a migration, push the release branch head to `ops/migrate-production`.
3. Merge the pull request into `master` (a merge commit); Vercel deploys. Check `/api/health`.
4. If the seed or mastery rule changed, push the merge commit to `ops/post-deploy-production` to seed the catalog and recompute mastery.

Once the `protect-ops` ruleset exists, push the ops branches without `--force`; a forward deploy from `master` is a fast-forward. The full procedure and rollback are in [docs/deploy-runbook-integration.md](deploy-runbook-integration.md#routine-deploys-after-2026-11-07). Database settings, monitoring and upkeep are in [docs/operations-runbook.md](operations-runbook.md).

## Documentation

- [CHANGELOG.md](../CHANGELOG.md): every requirement, newest first, with the reasoning behind it
- [docs/deploy-runbook-integration.md](deploy-runbook-integration.md): deploys, rollback, and routine releases
- [docs/operations-runbook.md](operations-runbook.md): Postgres settings, indexes, monitoring, upkeep
- [docs/restore-drill.md](restore-drill.md): restoring from a backup
- [docs/release-2026-11-11.md](release-2026-11-11.md) and [docs/release-2026-11-10.md](release-2026-11-10.md): the two most recent releases ([2026-11-07](release-2026-11-07.md) before them)
- [docs/ops/2026-11-10-lockdown-and-db-rotation.md](ops/2026-11-10-lockdown-and-db-rotation.md): production lockdown and password rotation
- [docs/next-store-build-plan.md](next-store-build-plan.md): what the next App Store and Play Store build carries
- [docs/labs.md](labs.md): lab kinds, grading, disclaimers and review status
- [docs/billing.md](billing.md): plans, the off switch, and payment providers
- [docs/sims.md](sims.md): sims, design and as built, including pacing
- [docs/education-taxonomy.md](education-taxonomy.md): categories, freshness models, publication rules
- [docs/source-reliability-standard.md](source-reliability-standard.md): which sources course content may rely on
- [docs/catalog-review-agent.md](catalog-review-agent.md): the quarterly catalog freshness review
- [docs/support-process.md](support-process.md): how support requests are handled
- [`.ai/context-brief.md`](../.ai/context-brief.md): working rules for AI coding assistants

## Project status

**Live in production:** releases 2026-11-10 and 2026-11-11 (`master` d7304d3; `/api/health` reported `"status":"ok","schema":"current"` on 2026-11-11). Sims are on, AI is limited to owners and invited people with a $5 global daily ceiling, and billing is off.

**Open:**

- Production lockdown: rulesets on `master` and `ops/*`, the reviewer gate, and deleting the repository-level database secret ([status](operations-runbook.md#production-status)).
- Error monitoring: `ERROR_TRACKER_DSN` is not set.
- The next store build (push notifications, screen-capture blocking, mic and read-aloud, an Expo SDK step) and the privacy text the service emails wait for: [docs/next-store-build-plan.md](next-store-build-plan.md).
- The release backup from 2026-11-07 is dropped automatically after 2026-12-08.

**Built but switched off:** paid plans and verified discounts ([docs/billing.md](billing.md)), and service emails.

The catalog keeps growing one vendor strand at a time, and a quarterly review agent checks each course's recorded source and flags anything that may be out of date.

## Feature detail (engineering view)

The README's former feature list, kept here because it names settings, files and switches the product page leaves out.

**Learning loop**

- **Lessons in four steps:** a quick guess first, short teach cards (what it is, why it matters, a worked example, the common mistake), guided practice, then a solo check.
- **Spaced review of everything learned:** objectives reached at Guided or above come back on a 1, 3, 7, 21 and 60-day ladder, each time with a fresh question graded on the server. Missed questions come back too.
- **Unit checks** that ask a scenario built from each unit's goal, scored part by part.
- **Scenario questions (PBQs)** with multi-part answers graded per part, a model answer and one "next step" line.
- **Practice exams:** a 10-question timed sprint, or a full mock with the real exam's length, domain weights and time limit (with an untimed option).
- **Study profile, plan and placement:** tell the app your goal, exams, dates, experience and weekly time; the plan works back from the exam date, and an optional placement check lets you start where you are.
- **Study reminders** on the phone that name one due topic. Service emails (exam change notices, exam countdown, a weekly digest) are built but switched off.
- **Ways to understand, not just answer:** comparison cards for look-alike concepts, "explain it back" in your own words, and Quiz me on weak spots.

**Honest mastery**

- Each objective's level (Introduced, Guided, Independent, Transfer-ready) comes from **weighted accuracy across all assessment types**: guided steps, multiple choice, typed answers, unit checks, PBQs and labs. Harder formats count for more; answers given with help count for less; getting something right after a gap counts for more than repeating it in one sitting. Independent and Transfer-ready also need a second unassisted correct answer at least a day after the first.
- Certification courses show readiness weighted by each exam domain, and say "Not enough evidence yet" until there is.

**Hands-on labs**

- **Build labs** (produce an artifact, such as an IAM policy, a work breakdown structure or an SBAR handoff) and **case labs** (a fictional case that unfolds over two to four steps). Every part is scored met, partly there or not yet, with the model answer beside yours, and a finished lab counts toward mastery.
- **Interactive parts** graded instantly with no AI cost: put steps in order, match pairs, tap the problem lines in a log or config, type a command (compared with accepted forms, never run) or give a number with a tolerance. Each has partial credit.
- The seed authors **1,287 labs** for the visible courses.
- One study notice, accepted once at first launch, covers every lesson, question, lab, sim and the AI coach (practice material that may contain errors, not professional or clinical advice, not affiliated with any exam body, and what the AI features send to Anthropic).

**Simulations (sims)**

- A scenario that runs on a real clock and reacts to what you do, then scores the outcome and your process and gives a debrief. Eleven scenarios are seeded (`backend/lib/sim/documents.ts` `ALL_DOCUMENTS`, sims wave 1 in #134): five CCRN Adult bedside cases (**tamponade after cardiac surgery**, with a code/ACLS module, sepsis, DKA, stroke and post-Whipple bleeding), two CNA bedside cases, three EPPP client sessions on the `session` screen, and **TicketBurst launch day** (AWS Solutions Architect Associate, on a design board) with a Professional-level band registered to the AWS SAP course. REQ-231 adds three Security+ incidents on the `security-console` screen (a phished account, ransomware on a file server, a leaked cloud key), each also a band on the Security+ V8 course. REQ-232 adds three Doctor of Physical Therapy cases on the `treatment-session` screen (early mobility in the ICU, a knee replacement with signs of a clot, balance and fall risk after a stroke). REQ-237 adds two outages each for Linux+, Network+ and CKA on the `terminal` screen (a bounded command line, a transcript and a network or cluster map). REQ-239 adds five counseling sessions on the `session` screen: two for the NCE (boundaries in a small town, a court-referred substance use assessment) and three for the NCMHCE (a diagnostic intake, suicide risk and a safety plan, and a trauma-informed treatment plan over two sessions).
- **Pacing for clinical and body sims:** Study pace (3x) by default, Exam realism (1x) on request, a focused start near the deterioration, a "Skip to the next change" offer when nothing is happening, unscored prediction prompts with sources, and chapters you can save and finish on another device. IT, cloud, project-management and security sims move only when you act (in the security incidents each task costs analyst time on the attacker's clock).
- Every command is saved on the device before it is sent, so killing the app loses nothing. Design and details: [docs/sims.md](sims.md).

**AI coach with guardrails**

- "Ask the coach" chat per course. It won't give away the answer to a question you still owe, including through option letters, abbreviations or "I give up, just name it", and a second, cheaper model checks replies about open questions before they're sent.
- AI-written questions must stay inside the exam version's scope and flag uncertainty. A lesson or question is held back only when the writer reports low confidence or the fact-check disagrees with the key; it is rewritten once with the disputed claims steered out, and if still held the learner is told why. A shared question goes live only if a second model, answering without the key, agrees with it.
- Learner text is fenced as data, never instructions.
- **Spend limits on every AI call:** each learner has a daily coach pool and a separate grading pool, a worst-case cost is reserved before each call, and a global daily ceiling pauses chat and regeneration for everyone but owners when reached.
- **AI access modes:** AI for everyone, only for owners and invited people (Settings > Access), or only for paid plans. Without full AI a learner keeps every course and non-AI feature, with three AI-graded written answers a day.
- Lessons for launch courses can be pre-generated in bulk from GitHub Actions under a hard budget, with a separate API key.

**Accounts, accessibility and safety**

- Email and password, Google sign-in, two-factor (authenticator app, email code, backup codes), session management, data export and account deletion. Adding a sign-in method or deleting an account asks you to prove it's you.
- The app **locks after time away** (Face or fingerprint unlock, the device passcode, or your password) instead of signing you out, and logging out ends the session on every device. On the web the long-lived sign-in is an httpOnly cookie.
- Accounts are for people **16 or older**; sign-up asks you to confirm it. Terms and Privacy are one version (2026-11-10).
- WCAG AA contrast enforced by a test (`mobile/src/lib/contrast.test.ts`), 48 dp minimum touch targets, screen-reader labels, large-text reflow and reduced-motion support. On the web: headings and landmarks, the lock traps focus, and keyboard Tab order is checked by a repeatable script (`mobile/e2e/tab-order.e2e.mjs`).
- Clinical courses (nursing, PT, EMS, mental health) require a one-time study notice acknowledgement per account before the first lesson; mental health courses also need an 18+ confirmation.

**Paid plans, built and switched off**

Free, Plus and Pro, and category plans (IT and cloud, project management, fitness, all-access, Clinical Pro), are built into the app and server but **off**: until `BILLING_ENABLED` turns them on, no plan, price or upgrade prompt appears. Prices are proposals. Details in [docs/billing.md](billing.md).

## README screenshots to add

**TODO: screenshots to add** (from a local build with a demo account, never production):

- the sim launch card with Study pace / Exam realism and the focused start
- a running tamponade sim: bedside monitor, the large sim clock, the skip offer
- a prediction prompt and the sim debrief with pacing
- the TicketBurst design board
- an interactive lab part (order or select)
- the coach in limited preview (`AI_ACCESS_MODE=granted`)
- sign-up with the 16-or-older checkbox, and the lock screen
- the study profile (intake form)
