# Ascendra

**Adaptive AI-tutored exam prep · Real certification catalog · Mastery tracking, spaced review, PBQ practice**

A cross-platform (iOS · Android · Web) study coach. Every course runs the same adaptive **guess → teach → fade → solo** lesson loop, a 0–4 mastery rubric with 1/7/21-day spaced review, a performance-based-question simulator, and an ask-the-coach chat — over a real, continuously-verified certification and academic catalog, not a static course library.

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Mobile / Web client | Expo Router (React Native, SDK 57) | One codebase → iOS, Android, and a same-origin web export |
| Backend | Next.js 16 (App Router, `/app/api/*`) | API routes only, deploys to Vercel |
| Database | Supabase (PostgreSQL) | SQL migrations, no ORM |
| Auth | Custom JWT + MFA (TOTP, email code, backup codes) + Google OAuth | `backend/lib/auth/*` — no third-party auth platform |
| AI | Anthropic Claude API | Per-objective lesson generation (cached), grading, chat, PBQ generation/grading |
| Content ops | Claude API Managed Agent (scheduled) | Quarterly sweep of every course's official source for outdated material |
| Native builds | EAS | `eas build` → installable `.apk` / TestFlight-ready `.ipa` |
| Deploy | Vercel | Backend + the mobile app's web export, same origin |

---

## Features

| Capability | Description |
|---|---|
| **Adaptive lessons** | Guess → teach → fade → solo, one Claude-generated lesson per objective, cached after first generation so cost doesn't scale with users |
| **Mastery tracking** | 0–4 rubric, proficiency at ≥2 attempts / ≥85% accuracy, 1/7/21-day spaced review scheduler |
| **PBQ simulator** | Multi-part performance-based-question scenarios, graded per sub-part |
| **Ask the coach** | Multi-turn chat, persisted per course |
| **Catalog navigation** | Home screen groups courses by education category (bounded, currently 14) instead of a flat list; per-course Verified / Review due / Unverified freshness badge and filter |
| **Full account system** | Email/password, TOTP + email-code MFA with per-method backup codes, Google OAuth linking, active-session management, account export/delete |
| **Per-course disclaimers** | Tracks where acting on wrong content has real consequences (nursing) require an explicit, per-account acknowledgement before the first lesson |
| **Automated freshness review** | A quarterly scheduled agent checks every course's recorded source against the vendor's current page and files a findings record — see [Catalog content ops](#catalog-content-ops) below |

**Catalog today:** 38 courses across 14 categories / 140 subcategories — 9 core (graduate CS + language/security foundations), 11 AWS certifications, 10 Azure certifications, 1 Google Cloud certification (strand in progress), 6 nursing tracks (CNA → BSN-RN + NCLEX-RN/PN), 226 units, 3,083 objectives, 28 tracked credential exams.

---

## Project Structure

```
ascendra/
├── backend/                     Next.js API (App Router) — deploys to Vercel
│   ├── app/api/                 One route group per resource
│   │   ├── auth/                 Login, register, MFA (TOTP/email/backup codes), Google OAuth, sessions
│   │   ├── courses/               List/create tracks, favorite, acknowledgement
│   │   ├── catalog/               review-context / review-findings — the quarterly agent's only surface
│   │   ├── taxonomy/              Category/subcategory tree
│   │   └── objectives/ grade/ pbq/ chat/ ...  Lesson, grading, PBQ, chat
│   ├── lib/
│   │   ├── auth/                 requireUser, requireReviewAgent (machine credential, separate from user auth), MFA, OAuth, tokens, crypto
│   │   ├── anthropic.ts          Claude Messages API wrapper
│   │   ├── prompts.ts            Lesson/grading/PBQ/chat prompt builders
│   │   └── mastery.ts            0–4 rubric, proficiency check, spaced-review scheduler
│   └── supabase/
│       ├── migrations/           18 migrations, additive-only — see below
│       └── seed/                 Catalog content: data.ts (core tracks) + tracks/{aws,azure,gcp,nursing}.ts
├── mobile/                      Expo Router app — iOS, Android (EAS), and web export
│   └── app/(app)/, (auth)/, (legal)/   Screens, grouped by auth state; legal = FAQ/disclaimer/privacy/cookies/terms
├── docs/                        education-taxonomy.md and other standing references
├── .ai/                         AI-assistant working rules (entrypoints, playbooks, requirements registry) — see CLAUDE.md
├── CHANGELOG.md                 One entry per requirement, newest first
└── README.md                    This file
```

### Database migrations (`backend/supabase/migrations/`)

Additive-only — nothing has ever been dropped or destructively rewritten.

`001` init schema (tracks, units, objectives, lesson cache, PBQ, mastery, attempts, error log, chat, sessions) · `002` password auth, sessions/refresh tokens, email verification/reset · `003` MFA (TOTP) + OAuth account linking · `004` profile pictures (stored in Postgres, no Storage integration) · `005` course favorites · `006` email-change flow · `007` education taxonomy — 13 categories/subcategories, versioned credential/exam records, freshness models · `008` email-code MFA · `009` backup codes per MFA method · `010` confirmation required to disable your last MFA method · `011` support tickets + course-request submissions · `012` per-track disclaimer acknowledgements · `013` Healthcare & Nursing category (14th) · `014` credential basis widened for accreditation/licensure (non-exam) qualifications · `015` `content_format` axis, decoupled from `track_type` · `016`–`017` `vendor_exam_unpublished_code` basis, for vendors (Google Cloud) that publish no exam code · `018` `content_review_findings` — the catalog-review agent's write target.

---

## Getting Started

### 1. Supabase project + schema

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** — run every file in `backend/supabase/migrations/` in numeric order.
3. **Project Settings → Database → Connection string → URI**, using the **Transaction pooler** (port `6543`).

### 2. Seed the catalog

```bash
cd backend
cp .env.example .env.local   # fill in DATABASE_URL, DEFAULT_USER_EMAIL
npm install
npm run seed
```

Idempotent — safe to re-run; existing rows update in place rather than duplicating.

### 3. Backend env vars + deploy

Set these in Vercel (**Project Settings → Environment Variables**, all three environments) as well as `.env.local` for local dev — full list and explanations in `backend/.env.example`:

| Variable | For |
|---|---|
| `DATABASE_URL` | Supabase pooler connection string |
| `ANTHROPIC_API_KEY` (or Workload Identity Federation vars) | Lesson generation, grading, chat, PBQ |
| `AUTH_JWT_SECRET`, `AUTH_ENCRYPTION_KEY` | Session tokens, MFA secret encryption |
| `GOOGLE_OAUTH_CLIENT_IDS`, `RESEND_API_KEY` | Google sign-in, transactional email |
| `CATALOG_REVIEW_AGENT_TOKEN` | The quarterly catalog-review agent's machine credential |

Import the repo in Vercel with **Root Directory** set to `backend`. Sanity check after deploy: `GET /api/health` → `{"status":"ok"}`.

### 4. Mobile app

```bash
cd mobile
cp .env.example .env.local   # EXPO_PUBLIC_API_URL -> your deployed backend
npm install
npx expo start                       # local dev
npx eas build -p android --profile production   # or ios
```

---

## Catalog Content Ops

The catalog isn't static: courses are added strand-by-strand (one certification vendor finished completely before the next — AWS, then Azure, then the GCP strand now in progress), each authored from the vendor's own official exam guide, never from training-data memory or copied third-party course text.

Staying current is the harder, ongoing half. A **Claude API Managed Agent** runs quarterly (`backend/app/api/catalog/review-context` / `review-findings`), re-checks every course's recorded source against the vendor's page today, and records a finding either way. Only a confirmed-current finding advances the live freshness fields the app's Verified/Unverified badges read — a flagged one pulls a course into "Review due" immediately without ever claiming a verification that didn't happen.

---

## Documentation

| Document | Contents |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | Every requirement (`REQ-###`), newest first, with the reasoning behind it |
| [docs/education-taxonomy.md](docs/education-taxonomy.md) | Category/subcategory model, freshness models, publication rules |
| [docs/catalog-review-agent.md](docs/catalog-review-agent.md) | The quarterly agent's resources, credential rotation, manual testing, troubleshooting |
| [`.ai/`](.ai/context-brief.md) | AI-assistant working rules — requirement tracking, playbooks, project map |
| `backend/AGENTS.md`, `backend/CLAUDE.md` | Backend-specific notes for AI coding assistants (this Next.js version has its own quirks) |

---

## Legal

- Practice content is written to resemble real exam style and coverage but is **not sourced from, and is not a copy of, any live exam** (`mobile/app/(legal)/terms.tsx`).
- Course objective trees are authored from publicly published exam guides, accreditation standards, and licensure requirements — never copied from paid course platforms; those are used only as evidence a topic is industry-recognized.
- Nursing and other real-consequence tracks require an explicit, per-account disclaimer acknowledgement before the first lesson.
- Not affiliated with, and not endorsed by, AWS, Microsoft Azure, Google Cloud, CompTIA, NCSBN, or any other credentialing body named in the catalog.
