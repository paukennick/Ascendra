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

## 055 attempts index

`055_content_review_queue.sql` (REQ-143) also adds `attempts_answered_created`,
the date index the daily content-signals job needs: it reads every graded
answer of the last 194 days, and without the index the lesson, Quiz me and
comparison branches each scanned all of `attempts`. As for 046, build it
first on production over the **direct** connection (port 5432), so the
migration does not hold inserts into `attempts` while it builds:

```sql
create index concurrently if not exists attempts_answered_created on attempts (created_at)
  where user_id is not null and verdict is not null and voided_at is null and not assisted;
```

Then `npm run migrate -- 055_content_review_queue.sql` finds it and creates
only the queue table. A failed concurrent build leaves an INVALID index:
`drop index concurrently attempts_answered_created;` and run it again. The
`/api/health` probe for 055 requires the index to be valid
(`pg_index.indisvalid`), so an invalid one shows up there. Rollback:
`scripts/rollback-release-2026-11-07.sql` drops it.

Fixture (3M attempts over three years, 17% of them inside the 194-day
window, heap in insertion (date) order; local Postgres 16): the concurrent
build took 2.7 s and the index is 64 MB next to a 384 MB table. The job's
correct-rate query read about 30k pages instead of 147k (three seq scans of
49k pages each); its run time went from about 2.0-2.6 s to 1.9 s because
most of it is the sort that keeps each learner's first answer, which the
index does not change. The page saving grows with history: the scans stay
the size of the window while the table grows.

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

## Email sender (REQ-191)

All mail (verification, password reset, email change, MFA codes, alerts)
goes through Resend from `EMAIL_FROM`. Unset, it falls back to
`onboarding@resend.dev`, which Resend delivers only to the address of the
Resend account itself; every other recipient's send is refused with a 403
(https://resend.com/docs/knowledge-base/403-error-resend-dev-domain). To
send to real users:

1. In the Resend dashboard, add and verify the sending domain (DNS records).
2. In Vercel -> Project Settings -> Environment Variables, set `EMAIL_FROM`
   for Production to an address on that domain, e.g.
   `Ascendra <no-reply@ascendra-learn.com>`, and redeploy.
3. Open `/api/health`: it should say `"email":"ok"`.

`/api/health` reports `"email":"unconfigured"` (with a `warnings` entry) in
production while `EMAIL_FROM` is unset or ends in `@resend.dev`. It stays a
200 like the jit warning, so the keepalive does not go red.

**Finding failed sends.** Resend answers a refused send with an error
instead of throwing; `lib/email.ts` now turns that into `EmailSendError`.
Each failure logs one JSON line in Vercel's logs:

```
{"event":"email_send_failed","route":"auth/register","kind":"verification","code":"validation_error","statusCode":403}
```

Search the logs for `email_send_failed`. The line never carries the
address, the token or Resend's message text (which can name an address).
Sign-up, resend-verification and forgot-password still answer their usual
generic message (they must not reveal which addresses have accounts);
signed-in actions whose mail fails (an MFA code, an email-change
confirmation) answer 503 "We couldn't send the email just now."

**Email links are scanner-safe.** `/verify-email`, `/confirm-email-change`
and `/cancel-email-change` only read the token when opened; the person
presses a button (a POST) to use it. Mail scanners that open links before
the person does no longer use them up. A link already used on a verified
account says "Your email is already verified. You can log in."

**Stuck unverified accounts.** A learner who never got the verification
mail can use "Resend verification email" (on the "Check your email" screen,
also shown when login answers 403), or "Forgot password": a completed reset
now also verifies the address. Do not hand-verify accounts in production.

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
- **Nightly backup** (REQ-200): a failed "Nightly database backup" run
  emails the repo owner; see "Backups" below.
- **Restore drill**: quarterly, starting with the latest nightly backup, [restore-drill.md](restore-drill.md).
- **Content review queue** (REQ-143): `npm run review-queue -- list`
  shows what learners' reports or a correct-rate drop put in front of a
  person; resolve each entry there or through `npm run items`
  ([content-review.md](content-review.md)). The daily cron
  `/api/cron/content-signals` (10:40 UTC, `CRON_SECRET`) fills it.
- **Service emails** (REQ-197): the daily cron `/api/cron/service-emails`
  (16:10 UTC, `CRON_SECRET`) sends exam change notices, the 14- and 3-day
  exam countdown and the opt-in weekly digest, each at most once per learner
  and period (`service_email_log`). Off until `SERVICE_EMAILS_ENABLED=true`
  (switch on with the Privacy Policy update). Batches of
  `SERVICE_EMAIL_BATCH` (default 25) with a 0.6 s gap, at most 3 service
  mails per address a day; the rest wait for the next run. The digest is
  refused (reported as `refused` in the cron response) until
  `MAIL_POSTAL_ADDRESS` and `DIGEST_EMAIL_FROM` are set. Failed sends show
  as `status = 'failed'` and are retried up to 3 tries; a new exam change is
  added to `backend/lib/exam-changes.ts` (its test checks the dates against
  the seed).
- **Source currency** (REQ-142): `npm run currency:report` lists exam
  outlines and lab sources overdue or due within 60 days
  ([source-reliability-standard.md](source-reliability-standard.md)).
- **`auth_events` retention**: owned by the security branch (daily purge
  cron).

## Backups

REQ-200. The Supabase Free plan keeps no backup we can download or restore
on our own, so `.github/workflows/db-backup.yml` ("Nightly database backup")
takes one every day at 11:23 UTC (03:23 PST), and on demand from the Actions
tab. It runs `pg_dump --format=custom --no-owner --no-privileges` of the whole
database through the `PROD_DATABASE_URL` secret (the same Session pooler
secret and `production-database` environment as `migrate-production.yml`),
streams it straight into `age`, and uploads the encrypted `.age` file with
two small files as an artifact kept 30 days. The plaintext dump never touches
disk. The repo is public, so anyone signed in to GitHub can download the
artifact; without the private key it is noise.

The artifact holds three files:

- `ascendra-db-<UTC time>.dump.age`: the dump, encrypted.
- `manifest.json.age`: the manifest, encrypted to the same key. It holds the
  file size, the sha256 of the dump `.age` file, the server version, the
  time, the number of tables in `public` and the row counts of `app_users`,
  `attempts` and `mastery`. No user data. The counts and the dump come from
  one database snapshot, so a restore must match them exactly. It is piped
  from `jq` into `age`, so it is never plaintext on disk.
- `checksums.json`: the only plaintext. A format number (2) and the sha256 of
  the two `.age` files, nothing else, so a corrupt download is caught before
  decrypting. No counts, no table names, no versions.

The workflow log shows no counts, versions or sizes either (the log is as
public as the artifact). To read the manifest:
`age -d -i ascendra-backup.key manifest.json.age | jq`.
Backups made before this change (format 1) have a plaintext `manifest.json`
and cannot be drilled by the current `restore-drill.sh`; they expire after 30
days. The privacy policy tells people the backups are kept 30 days: change
`retention-days` and the policy together.

The job fails, and GitHub emails the repo owner, if `PROD_DATABASE_URL` or
`BACKUP_AGE_RECIPIENT` is missing, the recipient is not an age public key,
`pg_dump` is older than the server, or the encrypted file is under 1 MB
(production is about 29 MB). The logic is `backend/scripts/db-backup.sh`.

### One-time setup (Nick)

1. Install age on your own computer: `brew install age`, `apt install age`,
   or a release from github.com/FiloSottile/age.
2. Make the key: `age-keygen -o ascendra-backup.key`. It prints
   `Public key: age1...`.
3. Save `ascendra-backup.key` in your password manager (as a file
   attachment or a secure note with the whole file), then delete the local
   copy. Without it no backup can ever be read, so check the saved copy
   opens before deleting.
4. In GitHub: Settings -> Secrets and variables -> Actions -> Variables ->
   New repository variable, name `BACKUP_AGE_RECIPIENT`, value the `age1...`
   public key only. (A secret of the same name also works.)
5. Actions -> "Nightly database backup" -> Run workflow, once. Check the run
   is green and the artifact is there, then do the restore drill below with
   it.

The private key (`AGE-SECRET-KEY-1...`) is never pasted anywhere: not into
GitHub, Vercel, Supabase, a chat or an issue. The workflow refuses a value
that starts with it. If it ever leaks, make a new key, change the variable,
and treat every artifact from the last 30 days as exposed.

### Restoring

1. Actions -> "Nightly database backup" -> the run you want -> download the
   artifact and unzip it (the dump `.age` file, `manifest.json.age` and
   `checksums.json`; keep them in one folder).
2. Put the key file from your password manager somewhere temporary.
3. Prove the backup first, on a local Postgres 17 (never production):
   `backend/scripts/restore-drill.sh <file>.dump.age ascendra-backup.key`
   (details in [restore-drill.md](restore-drill.md)).
4. To restore for real into a new Supabase project (it already has the
   `extensions` schema with uuid-ossp that the tables' defaults call):
   `age -d -i ascendra-backup.key <file>.dump.age | pg_restore --no-owner
   --no-privileges --schema=public --dbname="$TARGET_DIRECT_URL"`, then
   `npm run migrate -- --status` against it and the checks in
   [restore-drill.md](restore-drill.md). Point Vercel's `DATABASE_URL` at it
   last.
5. Delete the key file copy and the downloaded files when done.

### What this does not cover

- No point-in-time recovery. A restore goes back to the last nightly
  snapshot, so up to 24 hours of answers, accounts and payments since then
  are lost (more if a night's run failed: check the Actions tab).
- 30 days of history only; nothing older survives.
- Supabase's own schemas (`auth`, `storage`, ...) are in the dump but the
  drill restores `public` only, which holds all of Ascendra's data.
- If GitHub Actions or the repo is unavailable, so are the backups.

### When to move to Supabase Pro

Switch on Supabase Pro (daily platform backups, and point-in-time recovery
as an add-on) when any of these is true: billing is on and people are paying,
about 50 active users, the database is over about 300 MB, or losing a day of
data is no longer acceptable (point-in-time recovery needed). Keep this
workflow running after the switch; it is a copy off Supabase.

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
