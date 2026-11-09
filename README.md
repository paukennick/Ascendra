<p align="center">
  <img src="docs/images/readme/banner.png" alt="Ascendra: adaptive, AI-tutored exam prep with honest mastery tracking" width="100%">
</p>

<p align="center">
  <a href="https://github.com/paukennick/Ascendra/actions/workflows/ci.yml"><img src="https://github.com/paukennick/Ascendra/actions/workflows/ci.yml/badge.svg?branch=master" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-proprietary-5A7BF0" alt="License: proprietary, view only"></a>
  <img src="https://img.shields.io/badge/platforms-iOS%20%C2%B7%20Android%20%C2%B7%20Web-5A7BF0" alt="Platforms: iOS, Android, Web">
  <img src="https://img.shields.io/badge/node-22%20to%2024-5A7BF0" alt="Node 22 to 24">
</p>

**Ascendra is a study coach for certification and licensure exams.** Every course runs the same adaptive loop: short lessons, guided then solo practice, spaced review, unit checks, scenario questions, practice exams and graded hands-on labs. Progress is measured from evidence, not time spent, and the app says plainly when there isn't enough evidence yet.

One Expo codebase ships to iOS, Android and the web. A Next.js API on Vercel holds the logic, Postgres (Supabase) holds the data, and Anthropic's Claude writes lessons and grades typed answers behind guardrails.

## Contents

- [Who it's for](#who-its-for)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Testing and CI](#testing-and-ci)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Project status](#project-status)
- [Content, sources and legal](#content-sources-and-legal)
- [License](#license)

## Who it's for

Learners preparing for a specific exam who want to know whether they're actually ready. The shared catalog has **95 courses** (counted from the seed in `backend/supabase/seed/`):

- **IT and cloud (50):** 18 CompTIA, 11 AWS, 11 Google Cloud and 10 Microsoft Azure certifications
- **Project management (12):** PMI certifications
- **Physical therapy (13):** NPTE-PT, NPTE-PTA, the DPT pathway and the ABPTS specialist certifications
- **Nursing and critical care (10):** CNA through BSN, NCLEX-RN and NCLEX-PN, CCRN (adult, pediatric, neonatal) and MS Health Informatics
- **Fitness (6):** NASM, ACE, ACSM, NSCA (CPT and CSCS) and ISSA/NCCPT personal trainer certifications
- **Software development (4):** Python, JavaScript, CS degree math and MSCS foundations

Course objectives are written from published exam guides, standards and licensure requirements, and certification courses carry the exam's domain weights.

## Features

**Learning loop**

- **Lessons in four steps:** a quick guess first, short teach cards (what it is, why it matters, a worked example, the common mistake), guided practice, then a solo check.
- **Spaced review of everything learned:** objectives reached at Guided or above come back on a 1, 3, 7, 21 and 60-day ladder, each time with a fresh question graded on the server. Missed questions come back too.
- **Unit checks** that ask a scenario built from each unit's goal, scored part by part.
- **Scenario questions (PBQs)** with multi-part answers graded per part, a model answer and one "next step" line.
- **Practice exams:** a 10-question timed sprint, or a full mock with the real exam's length, domain weights and time limit (with an untimed option).
- **Study plan and placement:** set an exam date and weekly hours and the plan works back from it; an optional placement check lets you start where you are.
- **Ways to understand, not just answer:** comparison cards for look-alike concepts, "explain it back" in your own words, and Quiz me on weak spots.

**Honest mastery**

- Each objective's level (Introduced, Guided, Independent, Transfer-ready) comes from **weighted accuracy across all assessment types**: guided steps, multiple choice, typed answers, unit checks, PBQs and labs. Harder formats count for more; answers given with help count for less; getting something right after a gap counts for more than repeating it in one sitting.
- Certification courses show readiness weighted by each exam domain, and say "Not enough evidence yet" until there is.

**Hands-on labs**

- **Build labs** (produce an artifact, such as an IAM policy, a work breakdown structure or an SBAR handoff) and **case labs** (a fictional case that unfolds over two to four steps). Every part is scored met, partly there or not yet, with the model answer beside yours, and a finished lab counts toward mastery.
- One study notice, accepted once at first launch, covers every lesson, question, lab, sim and the AI coach (practice material that may contain errors, not professional or clinical advice, not affiliated with any exam body, and what the AI features send to Anthropic). The seed authors 80 labs today.

**AI coach with guardrails**

- "Ask the coach" chat per course. It won't give away the answer to a question you still owe, including through option letters, abbreviations or "I give up, just name it", and a second, cheaper model checks replies about open questions before they're sent.
- AI-written questions must stay inside the exam version's scope and flag uncertainty; flagged content is held back. A shared question goes live only if a second model, answering without the key, agrees with it.
- Learner text is fenced as data, never instructions. A per-learner daily AI budget guards against abuse.

**Accounts, accessibility and safety**

- Email and password, Google sign-in, two-factor (authenticator app, email code, backup codes), session management, data export and account deletion.
- WCAG AA contrast enforced by a test (`mobile/src/lib/contrast.test.ts`), 48 dp minimum touch targets, screen-reader labels, large-text reflow and reduced-motion support.
- Real-consequence courses (nursing, for example) require a per-account disclaimer acknowledgement before the first lesson.

**Paid plans, built and switched off**

Free, Plus and Pro are built into the app and server but **off**: until one server setting turns them on, every learner keeps everything and no plan, price or upgrade prompt appears. Details in [docs/billing.md](docs/billing.md).

## Screenshots

Captured from a local build of the web app with a demo account and sample practice history. No production data, and no AI output (lesson and review screens need a live model, so they aren't shown here).

<p align="center">
  <img src="docs/images/readme/screens-study.png" alt="Home screen, course overview with readiness, and the mastery matrix" width="100%">
</p>

<p align="center">
  <img src="docs/images/readme/screens-practice.png" alt="Catalog explorer, practice exam setup, and a build lab with its practice disclaimer" width="100%">
</p>

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
    CRON["Vercel cron<br/>health ping, auth-data purge"]
  end

  subgraph services["Services"]
    direction LR
    DB[("Postgres<br/>on Supabase")]
    AI["Anthropic Claude<br/>lessons, grading, coach"]
    MAIL["Resend<br/>email"]
  end

  subgraph ops["Automation"]
    direction LR
    MIG["GitHub Actions<br/>migrate production"]
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
  PAY -. "webhooks" .-> API
```

- **Scheduled and automated callers.** Vercel cron pings `/api/health` and purges expired sign-in records daily; a GitHub Actions job pings health as an independent keep-alive; the quarterly catalog review agent reads `/api/catalog/review-context` and writes `/api/catalog/review-findings` with its own machine credential.
- **One backend, two kinds of client.** The web app is the mobile app exported with `expo export --platform web` and copied into `backend/public/` at build time (`backend/scripts/build-webapp.sh`), so it calls the API on the same origin. Native builds get their API URL from `mobile/eas.json`.
- **No ORM and no Supabase client.** The backend talks to Postgres directly through `DATABASE_URL`, scopes learner data by user in code, and migration `026` locks Supabase's public Data API out of every table.
- **AI is server-side only.** Lessons are generated once per objective and cached for every learner; grading, the coach and its guard use a faster model (`backend/lib/anthropic.ts`). Production authenticates with Workload Identity Federation rather than a stored key.
- **Migrations keep the live code working.** 62 files under `backend/supabase/migrations/`, applied in order by `npm run migrate`. The deploy runbook requires each to be additive, because the old backend runs on the new schema until the deploy finishes; backfills and a mastery recompute follow where the rules changed.

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

`GET /api/health` reports the database and lists any missing configuration. Without `ANTHROPIC_API_KEY`, everything that doesn't need a model works (catalog, courses, progress, practice exam setup, reading a lab), while lessons, grading and the coach return errors. Without `RESEND_API_KEY`, sign-up can't send its verification email; for a local-only test account you can mark it verified in your own database with `update app_users set email_verified_at = now() where email = '<address>';`.

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

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to `master` and every pull request:

- **Backend:** typecheck, unit tests, a full build (which also exports the web app) and a blocking `npm audit`.
- **Database:** every migration on an empty Postgres 16, a schema check, the seed run twice, and the integration tests.
- **Backfills:** older migrations, then a synthetic learner history, then the rest, checking that each backfill did real work and every stored level matches the mastery rule.
- **Production-state rehearsal:** rebuilds the pre-release production schema, migrates it, then rolls it back and checks the old routes still work.
- **Mobile:** typecheck and unit tests, with `npm audit` and `expo-doctor` reported but not blocking.
- **Workspace freshness:** the generated `.ai/` files match what's committed.

Live-model evals (`.github/workflows/live-evals.yml`) run only by hand, with a hard spending cap.

## Deployment

The backend and web app deploy to Vercel from `backend/` (with files outside the root directory included, so the build can reach `mobile/`). Production migrations run from GitHub, never from a laptop:

1. Push the release commit to `ops/migrate-production` to apply new migrations.
2. Merge to `master`; Vercel deploys.
3. Push to `ops/post-deploy-production` to seed the catalog and recompute mastery.

The full procedure, rollback order and what was run for the last release are in [docs/deploy-runbook-integration.md](docs/deploy-runbook-integration.md#routine-deploys-after-2026-11-07). Database settings, monitoring and upkeep are in [docs/operations-runbook.md](docs/operations-runbook.md).

## Documentation

- [CHANGELOG.md](CHANGELOG.md): every requirement, newest first, with the reasoning behind it
- [docs/deploy-runbook-integration.md](docs/deploy-runbook-integration.md): deploys, rollback, and routine releases
- [docs/operations-runbook.md](docs/operations-runbook.md): Postgres settings, indexes, monitoring, upkeep
- [docs/restore-drill.md](docs/restore-drill.md): restoring from a backup
- [docs/release-2026-11-07.md](docs/release-2026-11-07.md): the most recent release record
- [docs/labs.md](docs/labs.md): lab kinds, grading, disclaimers and review status
- [docs/billing.md](docs/billing.md): plans, the off switch, and payment providers
- [docs/sims.md](docs/sims.md): the sim labs design (not built yet)
- [docs/education-taxonomy.md](docs/education-taxonomy.md): categories, freshness models, publication rules
- [docs/source-reliability-standard.md](docs/source-reliability-standard.md): which sources course content may rely on
- [docs/catalog-review-agent.md](docs/catalog-review-agent.md): the quarterly catalog freshness review
- [docs/support-process.md](docs/support-process.md): how support requests are handled
- [`.ai/context-brief.md`](.ai/context-brief.md): working rules for AI coding assistants

## Project status

Release 2026-11-07 is live in production. Open items from that release: in-app spot checks, the mobile store build, and dropping the release backup after 2026-12-08.

**In development: sim labs.** Interactive simulations (a bedside monitor for clinical cases first) are designed in [docs/sims.md](docs/sims.md) and have not been built. Nothing about them is in the app yet.

**Built but switched off: paid plans.** See [docs/billing.md](docs/billing.md).

The catalog keeps growing one vendor strand at a time, and a quarterly review agent checks each course's recorded source and flags anything that may be out of date.

## Content, sources and legal

- Practice content is written to resemble real exam style and coverage but is not sourced from, and is not a copy of, any live exam.
- Course objectives are authored from publicly published exam guides, accreditation standards and licensure requirements, never copied from paid course platforms.
- Labs and practice content may contain errors and are not professional advice; every lab says so, and lessons, questions and labs carry a "Report a problem" link.
- Ascendra is not affiliated with, and not endorsed by, AWS, Microsoft, Google Cloud, CompTIA, PMI, NCSBN, AACN, FSBPT, ABPTS or any other credentialing body named in the catalog. Names are used only to identify the exams a course prepares for.

## License

Copyright (c) 2026 Nicholas J Pauken. All rights reserved. The source is published for viewing only; no license is granted to use, copy, modify or distribute it. See [LICENSE](LICENSE), which also gives the contact for licensing enquiries.
