# Operations runbook: performance, monitoring and upkeep

REQ-118 (Audit 3 performance, infra and CI). Things production needs that are
not a migration or a deploy step: database settings, how to build the 046
indexes without blocking writes, the error tracker, caches and their limits,
and regular upkeep. Deploy order stays in
[deploy-runbook-integration.md](deploy-runbook-integration.md); restoring
from a backup is in [restore-drill.md](restore-drill.md).

## Postgres settings

### JIT off for the app role (Audit 3 HIGH-1)

Postgres's JIT compiler is on by default. The course view's readiness query
crosses its cost threshold, so with JIT on every course view compiles about
155 functions before running: on the audit fixture 260-420 ms instead of
9-20 ms for a typical learner, and 2.6 s instead of 28 ms for a learner with
1,300 answers. Nothing in this app benefits from JIT (no long analytic
queries).

1. Check (Supabase SQL editor or psql, as the app's role):

   ```sql
   show jit;
   select rolname, rolconfig from pg_roles where rolname = current_user;
   ```

   `npm run migrate -- --status` and `GET /api/health` (as a `warnings`
   entry) also say when it is on.

2. If it is `on`, turn it off for the role the backend connects as (the user
   in `DATABASE_URL`; on Supabase usually `postgres`, or
   `postgres.<project-ref>` through the pooler, which maps to `postgres`):

   ```sql
   alter role postgres set jit = off;
   ```

   It applies to new connections. The pooler reuses server connections, so
   either restart the project's pooler from the dashboard or wait for its
   connections to cycle; then `show jit;` from a fresh connection says
   `off`.

3. Roll back with `alter role postgres reset jit;`.

The `fix/audit3-mastery` branch also turns JIT off inside the readiness read
itself, so this setting is defence in depth, but it also covers any other
query that crosses the threshold.

## 046 indexes without blocking writes

`046_perf_indexes.sql` creates nine indexes (the per-learner `auth_events` and
`ai_calls` indexes come from 044 and 043). The migration runner applies a
file inside a transaction, where `CREATE INDEX CONCURRENTLY` is not allowed,
and a plain `CREATE INDEX` blocks inserts into that table while it builds.
On production, build them first, one at a time, over the **direct**
connection (port 5432; `CONCURRENTLY` cannot run through the transaction
pooler or inside a transaction block):

```sql
create index concurrently if not exists attempts_user_unit_created on attempts (user_id, unit_id, created_at desc);
create index concurrently if not exists attempts_unit on attempts (unit_id);
create index concurrently if not exists item_flags_user on item_flags (user_id) where user_id is not null;
create index concurrently if not exists review_session_items_answered on review_session_items (session_id, objective_id) where answered_at is not null;
create index concurrently if not exists error_log_attempt on error_log (attempt_id) where attempt_id is not null;
create index concurrently if not exists review_log_attempt on review_log (attempt_id) where attempt_id is not null;
create index concurrently if not exists review_session_items_attempt on review_session_items (attempt_id) where attempt_id is not null;
create index concurrently if not exists exam_session_items_attempt on exam_session_items (attempt_id) where attempt_id is not null;
create index concurrently if not exists placement_items_attempt on placement_items (attempt_id) where attempt_id is not null;
```

Then `npm run migrate -- 046_perf_indexes.sql` finds them and only records
the file. If a concurrent build fails it leaves an INVALID index; drop it
(`drop index concurrently <name>;`) and run the statement again. Check with
`select indexrelid::regclass, indisvalid from pg_index where not indisvalid;`.

Fixture build times with CONCURRENTLY (2.75M attempts, 6M auth_events,
1.2M ai_calls, 1.2M review_log; local Postgres 16, 2 vCPU, other agents on
the box): attempts_user_unit_created 3.1 s, attempts_unit 2.0 s,
review_session_items_answered 1.1 s, the five attempt_id indexes 0.1-0.3 s
each. The migration afterwards: under a second.

## Error tracker (Audit 3 MEDIUM-10)

`lib/error-tracker.ts` receives every 500 that `serverError()` answers
(`lib/http.ts`), with its request id. With `ERROR_TRACKER_DSN` unset it does
nothing. To turn it on:

1. Create a Sentry project (Platform: Node.js) and copy its DSN.
2. In Vercel -> Project Settings -> Environment Variables, add
   `ERROR_TRACKER_DSN` for Production (and Preview if wanted) and redeploy.
3. Add an alert rule in Sentry for "a new issue" and "more than N events in
   5 minutes".

What is sent: error type, message (500 chars), stack, request id, route,
environment. Never request bodies, headers, tokens or learner ids. The
transport is a plain `fetch` to Sentry's store endpoint; replacing it with
`@sentry/nextjs` later changes only that file. Errors a route does not catch
reach Next's `onRequestError` hook in `instrumentation.ts`, which passes them
to the same tracker with the route path only.

## Health check: required settings

`GET /api/health` now also checks that the settings the backend needs are
present (names only, never values): `DATABASE_URL`, `AUTH_JWT_SECRET`,
`AUTH_ENCRYPTION_KEY` (and that it decodes to 32 bytes), `APP_BASE_URL`,
`RESEND_API_KEY`, `CHOICE_ORDER_SECRET` (production), and Anthropic
credentials (an API key, or both federation ids). In production a missing one
answers 503 `{ status: "misconfigured", env: [...] }`, so a bad deploy turns
the health check red straight away instead of failing on a learner's first
sign-in. Outside production it is a `warnings` entry. Open `/api/health`
once after every deploy (the daily cron only runs at 09:00 UTC).

## Caches and their limits

- **Course readiness** (`lib/readiness-cache.ts`): per learner and course,
  60 s, keyed on the learner's newest answer, so a grade on any route or
  server shows on the next view. In-process memory: each serverless
  instance has its own (up to 5,000 entries), so a cold instance always
  recomputes and the hit rate falls as instances multiply. Correctness does
  not depend on it. If the course view becomes hot across many instances,
  move it to a shared store.
- **Exam blueprint**: per course, 60 s, same in-process limits. A catalog
  edit shows within a minute.
- **Health**: 30 s (unchanged).

## Upkeep

- **Rollback backups**: `npm run migrate -- --status` lists each
  `mastery_backup_*` / `error_log_backup_*` table with its size and age and
  flags those past 30 days. Drop them as in deploy-runbook-integration.md
  "Cleanup", in the same change that removes their probes from
  `backend/lib/schema-status.ts`.
- **Restore drill**: quarterly, [restore-drill.md](restore-drill.md).
- **`auth_events` retention**: owned by the security branch (daily purge
  cron).

## CI

- `backfill` job: applies 001-028, loads `scripts/ci/synthetic-history.sql`
  (1,500 learners, about 122k attempts), applies the rest including every
  backfill, runs the batched recompute, and fails unless the backfills did
  real work and every level matches the rule. About 2 minutes locally.
- Mobile: `expo-doctor` and `npm audit` are report-only (reasons in
  `.github/workflows/ci.yml`). The app's JS bundle is exported in the backend
  job's build.
- `engines.node` is `>=22 <25` in both packages (CI and Vercel use 24).
- Vercel installs with `npm ci` (lockfile exact), as does the web-app build
  script for `mobile/`.

## Measurements (REQ-118, 2026-11-07)

Audit fixture (10k learners, 2.75M attempts, JIT on as stock), `next start`
(webpack build), sequential requests, 2 warm-ups then 7 samples, p50 in ms.
"Before" is integration/all at fc85fb1, "after" is this branch with 046.

| Request | Before | After |
|---|---|---|
| Course view, typical learner | 146 (9 queries) | 17 (3) |
| Course view, 1.3k / 5k attempts | 2,100 / 2,089 | 10 / 13 (cached) |
| Course view, 26k attempts | 21,560 | 12 warm; a cold compute is still ~22 s until fix/audit3-mastery |
| Review session, fresh plan | 66 (65 queries) | 39 (16 here: no model key, so the rate limit and a failed write run; 10 with cached questions) |
| Same at 15 ms injected round trip | 1,085 | 304 |
| review/today, 26k attempts | 69 | 11 |
| attempts?trackId, 26k attempts | 82 | 16 |
| Export page 1, 26k attempts | 4,450 KB | 362 KB |
| Account delete, typical (240 attempts) | 39.5 s | 0.17 s |
| Account delete, 26k attempts | > 13 min (cancelled) | 1.0 s |

Load test, 15 ms injected latency per query, 30 s, mixed home-screen
requests (course view, review/today, review session, course list, history),
one typical learner per client:

| Clients | Before p50 / p95 | After p50 / p95 | Throughput before / after |
|---|---|---|---|
| 20 | 380 / 1,598 ms | 307 / 654 ms | 31 / 61 req/s |
| 50 | 1,769 / 16,529 ms | 814 / 2,818 ms | 14 / 53 req/s |

Scripts: the REQ-118 session scratchpad (`bench.mjs`, `run1.mjs`,
`load.mjs`, `pgcount.cjs`); the preload adds the latency before each query.
