# Operations runbook: performance, monitoring and upkeep

REQ-118 (Audit 3 performance, infra and CI). Things production needs that are
not a migration or a deploy step: database settings, how to build the 046
indexes without blocking writes, the error tracker, caches and their limits,
and regular upkeep. Deploy order stays in
[deploy-runbook-integration.md](deploy-runbook-integration.md); restoring
from a backup is in [restore-drill.md](restore-drill.md).

## Production status

As of 2026-11-11. "Observed" means checked from this repo or a public
endpoint; "reported" means Nick said so and it was not checked here.

- **Running:** `master` d7304d3, releases 2026-11-10 and 2026-11-11.
  Observed: `/api/health` answered `"status":"ok","schema":"current"` with
  that commit.
- **Deploying:** per batch, release branch -> `ops/migrate-production` ->
  PR merge -> `ops/post-deploy-production`. Steps and the no-`--force` rule
  for the ops branches:
  [deploy-runbook-integration.md](deploy-runbook-integration.md#per-batch-as-run-for-releases-2026-11-10-and-2026-11-11).
- **Settings (reported):** `APP_BASE_URL` is `https://www.ascendra-learn.com`,
  `SIMS_ENABLED=true`, `AI_ACCESS_MODE=granted`,
  `AI_GLOBAL_DAILY_CEILING_USD=5`, `BILLING_ENABLED` off.
  `ERROR_TRACKER_DSN` is supported but **not set** (see "Error tracker").

### Lockdown and password rotation (REQ-207)

Guide: [ops/2026-11-10-lockdown-and-db-rotation.md](ops/2026-11-10-lockdown-and-db-rotation.md).

| Step | What | State |
|---|---|---|
| 0 | New database password and the two pooler strings | **Done 2026-11-10** (reported) |
| 1.1 | `production-backup` environment with `PROD_DATABASE_URL` | **Done 2026-11-10** (reported) |
| 1.2 | `PROD_DATABASE_URL` in `production-database` | **Done 2026-11-10** (reported) |
| 1.3 | Branch rule on `production-database` (`ops/*`, `master`) | **Done 2026-11-10** (reported) |
| 1.4 | Rulesets `protect-master` and `protect-ops` | **To do.** Observed 2026-11-11: the repository's rulesets API returned an empty list |
| 1.5 | Prove the rulesets | To do |
| 2 | Fix branch released (migration 071, backup workflows on `production-backup`) | **Done 2026-11-10** (reported; 071 is in the deployed commit) |
| 3 | Reset the password; Vercel `DATABASE_URL` on the transaction pooler, port 6543; redeploy | **Done 2026-11-10** (reported) |
| 4 | Required reviewer on `production-database`, prove it, delete the repository-level `PROD_DATABASE_URL` | **To do** |
| 5 | Optional: run the app as `app_runtime` | Not started |

Until step 4 is done, anyone who can push an `ops/*` branch can start a
production migration without approval, and the repository-level secret is
still readable by any workflow. Until `protect-ops` exists, ops branches can
still be force-pushed.

One check worth doing: lockdown step 3.4 item 5 runs the nightly backup by
hand. The Actions API listed no runs of "Nightly database backup" on
2026-11-11 at about 03:00 UTC, so confirm the first scheduled run (11:23
UTC) is green.

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
environment. Never request bodies, headers, tokens or learner ids. Sentry is
named as a processor in the Privacy Policy (REQ-205), which is correct once
this is on; in Sentry set the project's data retention to what you want to
stand behind, since the policy only says it follows Sentry's own schedule. The
transport is a plain `fetch` to Sentry's store endpoint; replacing it with
`@sentry/nextjs` later changes only that file. Errors a route does not catch
reach Next's `onRequestError` hook in `instrumentation.ts`, which passes them
to the same tracker with the route path only.

## After SQL applied by hand (FAIL-1162)

Use `npm run migrate` for schema changes: it records each file in the ledger
and sets a lock timeout. Migrations are not all safe to run twice, so never
re-run one on the assumption that they are. If SQL has to be applied by hand
anyway (a re-run, a file pasted into the Supabase SQL editor, a one-off fix),
finish with both of these, in this order, against the same database:

```sql
select app_runtime_sync();
```

then `npm run migrate -- --status` (it must end with "Schema is current").
`app_runtime_sync()` gives the app's least-privilege role (`app_runtime`) the
grants and policies for any table, view, sequence or function the hand-applied
SQL added, and puts back the `search_path` and the revoked PUBLIC EXECUTE on
any function it replaced; without it the app can fail on the new object while
checks run as the owner look fine.

## Health check: required settings

`GET /api/health` now also checks that the settings the backend needs are
present (names only, never values): `DATABASE_URL`, `AUTH_JWT_SECRET`,
`AUTH_ENCRYPTION_KEY` (and that it decodes to 32 bytes), `APP_BASE_URL`,
`RESEND_API_KEY`, `CHOICE_ORDER_SECRET` and `CRON_SECRET` (both production;
without `CRON_SECRET` every `/api/cron/*` route answers 503 and the daily
jobs stop, FAIL-1161), and Anthropic credentials (an API key, or both
federation ids). In production a missing one
answers 503 `{ status: "misconfigured", env: [...] }`, so a bad deploy turns
the health check red straight away instead of failing on a learner's first
sign-in. Outside production it is a `warnings` entry. Open `/api/health`
once after every deploy (the daily cron only runs at 09:00 UTC).

## Optional settings (FAIL-1163)

Each is read by the code, optional, and listed with its default in
`backend/.env.example`. Set them in Vercel -> Project Settings ->
Environment Variables and redeploy: Vercel applies a changed value to the
next deployment only.

- `AI_ACCESS_MODE` (`all`, `granted`, `paid`; unset = `all`). Who gets full AI
  (REQ-201). A typo is treated as `granted`, the cheapest safe mode, and
  reported.
- `AI_GLOBAL_DAILY_CEILING_USD` (unset or `off` = none). Total model spend per
  UTC day; at it coach chat and lesson regenerate pause for everyone but
  owners.
- `AI_PILOT_COACH_MESSAGES_PER_DAY` (default `0` = no coach) and
  `AI_PILOT_GRADED_ANSWERS_PER_DAY` (unset = Free's 3). REQ-246, pilot only:
  daily coach messages and AI-graded answers for a learner the AI mode limits
  (not owners, not granted accounts). Pilot values `10` and `20`. They do
  nothing once `AI_ACCESS_MODE` is `all` (or `paid` with billing on); delete
  them when the pilot ends. A value that is not a whole number is reported
  in `/api/health` (coach falls back to 0, graded to Free's allowance). Raise
  the graded count with the pilot name, never
  `BILLING_ALLOWANCE_GRADED_ANSWER_FREE`, which is Free's count after launch.
  docs/billing.md, "Pilot-only allowances".
- `ERROR_TRACKER_DSN`: see "Error tracker" above. Unset = nothing is sent.
- `MIN_APP_VERSION` (semver; unset = no minimum). App builds below it get a
  426 "update required". `IOS_APP_STORE_URL` (an `https://apps.apple.com/`
  link) is the iOS update screen's button; unset = no button. Android uses the
  Play Store link in code.
- `DATABASE_CA_CERT` or `PGSSLROOTCERT`: pin the database's CA so TLS is
  verified, not only encrypted ([ops/db-tls.md](ops/db-tls.md)). A value that
  cannot be read is an error, never a silent fall back. `PGSSLMODE=disable`
  turns TLS off: a throwaway local or CI Postgres only.
- `DB_STATEMENT_TIMEOUT_MS` (0 = off, at most 600000). Unset = 25 s on a direct
  or local connection and none sent through the pooler, where the
  `app_runtime` role carries its own 25 s limit.
- `MIGRATION_LOCK_TIMEOUT` (default `5s`; `0` = off). The lock wait
  `npm run migrate` allows before a migration fails and rolls back.
- `SIMS_ENABLED` (off unless set), `SIMS_RENDERERS` (default
  `bedside,board,session,security-console,treatment-session,terminal`), `SIMS_SERVE_UNREVIEWED` (on unless `off`): simulations.
  `LABS_SERVE_UNREVIEWED` (on unless `off`): labs waiting for expert review.
- `ITEM_FACT_CHECK` (on unless `off`): the second-model check before generated
  items publish. Off lets them publish unchecked.
- `CSP_REPORT_ONLY=true`: send the Content-Security-Policy as report-only
  (browser console logs, nothing blocked). Use it to trial a stricter policy;
  leave it unset in production.
- `APP_URL`: only a fallback for `BILLING_WEB_RETURN_URL` (Stripe Checkout and
  the discount verification return address). `APP_BASE_URL` builds email
  links.

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

## Support inbox (REQ-205)

People are told to write to one address (the Privacy Policy, Terms and the
delete-account page): `SUPPORT_EMAIL` if set, else `support@ascendra-learn.com`
(`lib/support-contact.ts`, and `OWNER.contactEmail` in
`mobile/src/content/legal.ts`; a test fails if the two differ). Nick has not
confirmed the address. To change it: edit both constants, or set
`SUPPORT_EMAIL` in Vercel (the pages on the web follow the variable; the
app's text follows the constant, so edit both for a lasting change).

How mail reaches Nick: Resend receives it for the domain, calls
`POST /api/inbound/email` with an `email.received` webhook, and the route
checks the signature, fetches the message through Resend's API and forwards it
to `SUPPORT_FORWARD_TO` as plain text. The sender's own HTML is not passed on
and attachments are only listed by name. The forward comes `From:`
`EMAIL_FROM` with `Reply-To:` the original sender, so replying in Gmail answers
the learner. Nothing from a message is written to the logs.

The root domain `ascendra-learn.com` already has its MX record pointing at
Resend (`receive.forge.rmta.net`), so receiving goes on the root domain. No
`mail.` subdomain is needed.

**One-time setup (Nick):**

1. Receiving is already ON for `ascendra-learn.com` in Resend (Nick turned it
   on 2026-11-09; Domains -> `ascendra-learn.com` -> Receiving shows it
   verified). Nothing to do here unless it is ever turned off.
2. Resend dashboard -> Webhooks -> Add Webhook. URL:
   `https://<the production domain>/api/inbound/email`. Event: `email.received`
   only. Click Add, then open the webhook and copy its **Signing Secret**
   (`whsec_...`).
3. In Vercel -> Project Settings -> Environment Variables (Production), set:
   - `RESEND_WEBHOOK_SECRET` = the signing secret;
   - `SUPPORT_FORWARD_TO` = the mailbox that should receive support mail (your
     Gmail address). It must not be an `@ascendra-learn.com` address (that
     would loop; the route refuses it);
   - `RESEND_API_KEY` must already be set, and be a key that can read received
     email (a "Full access" key; a sending-only key is refused with 401/403);
   - optional: `SUPPORT_EMAIL` to point the delete-account page and support
     ticket notifications at the same address.
   Redeploy.
4. Test: send an email to the support address from another account. It should
   arrive in `SUPPORT_FORWARD_TO` within a minute, subject `[Support] ...`.
   In Resend -> Webhooks -> the webhook -> Logs, the delivery should be 200.

**Troubleshooting.** The route answers: 503 when `RESEND_WEBHOOK_SECRET`,
`RESEND_API_KEY` or `SUPPORT_FORWARD_TO` is missing or the forward address is on
the support address's domain (nothing is forwarded; the message stays in
Resend's Emails -> Receiving tab); 401 when the signature is wrong (wrong
secret, or the secret was rotated); 429 above 120 messages an hour; 502 when
Resend's API or the forward failed. Resend retries 429/502/503 for a while. A
log line `inbound email <id>: fetch failed (401)` means the API key cannot read
received mail.

**Where else mail goes.** Support tickets and course requests made in the app
are emailed to `SUPPORT_EMAIL` (`lib/email.ts`), falling back to `EMAIL_FROM`
when unset. If `SUPPORT_EMAIL` is the support address, those notifications also
pass through this route.

**Where received mail is kept.** Resend keeps received messages under its own
schedule and in `SUPPORT_FORWARD_TO`'s mailbox until deleted. There is no fixed
retention period (the Privacy Policy says so); decide one if you want one.

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
- **Global AI spend** (REQ-201, `lib/ai-access.ts`): the day's total from
  `ai_calls`, 60 s per instance, read only when `AI_GLOBAL_DAILY_CEILING_USD`
  is set. Each instance may run up to a minute behind, so spend can pass the
  ceiling by about a minute of traffic before chat and regenerate pause.
  Switching modes and the ceiling: docs/billing.md, "AI access modes and the
  global AI ceiling".

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
   `extensions` schema with uuid-ossp that the tables' defaults call), in
   this order (FAIL-1160; a dump holds no roles and no grants, and its
   policies are written `TO app_runtime` and `TO content_recheck`, so a
   restore into a cluster without those roles fails with about 120 errors):
   1. Create the two roles, NOLOGIN, before the restore:
      `psql "$TARGET_DIRECT_URL" -f backend/scripts/restore/01-roles-before-restore.sql`
      (safe to run twice; a new Supabase project does not
      have them).
   2. `age -d -i ascendra-backup.key <file>.dump.age | pg_restore --no-owner
      --no-privileges --schema=public --dbname="$TARGET_DIRECT_URL"`. It must
      finish with no errors.
   3. Re-apply migration 071 (`app_runtime`'s grants and settings, PUBLIC's
      revoked EXECUTE): `psql "$TARGET_DIRECT_URL" --single-transaction -f
      backend/supabase/migrations/071_app_runtime_role.sql` (safe to run
      twice; `npm run migrate -- 071...` would skip it, the restored ledger
      says it is applied).
   4. Re-apply `content_recheck`'s grants, which are migration 064's grant
      block: `psql "$TARGET_DIRECT_URL" --single-transaction -f
      backend/scripts/restore/02-recheck-grants-after-restore.sql`. Do not
      re-run the whole of 064 instead: its policies would undo 071's
      narrowing of what `content_recheck` can read.
   The roles are new and cannot log in: set `app_runtime`'s password again
   if the app is to connect as it (docs/ops/2026-11-10-lockdown-and-db-rotation.md,
   step 5), and create the LOGIN user for the re-check jobs again
   (docs/content-review.md, "Re-check database user"). Then `npm run migrate
   -- --status` against it and the checks in [restore-drill.md](restore-drill.md).
   Point Vercel's `DATABASE_URL` at it last. The drill runs those four steps in
   the same order, and CI runs it on a second Postgres server that has never
   had the roles (`backend/scripts/ci/backup-drill-test.sh`).
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

## Pre-generating lessons

Shared catalog lessons are normally written the first time a learner opens an
objective (a 13-20 second wait for that learner). **Pre-generation** writes
them ahead of time for chosen courses, through the Message Batches API at half
price. It runs only from the **Pre-generate lessons** workflow
(`.github/workflows/pregenerate.yml`, Actions tab, run by hand); nobody handles
the API key or the database URL. Code: `lib/pregen.ts`, `scripts/pregenerate.ts`,
`scripts/pregenerate-lib.ts` (REQ-132, REQ-208).

**How a lesson is made.** Exactly as the app makes one on demand, in two
batches because the practice questions are written from the teaching text:

1. `submit` creates the **intro batch** (guess prompt + teaching cards).
2. `collect <intro batch>`, once it has ended, applies the app's checks to each
   teaching text (content lint; teaching text the writer is unsure of is held
   back) and creates the **practice batch**, whose prompts carry that text and,
   for Python/JavaScript/academic courses, ask for a verification program.
3. `collect <practice batch>` with `intro_batch_id`, once it has ended, shuffles
   the stored answer position, runs the content lint, the second-model fact-check
   (one live call per lesson, not discounted), the holdbacks and the exec-check
   queue, then saves **insert-if-absent**: it never replaces a lesson, a lesson
   a content fix voided or corrected, an authored lesson or a learner's own
   version. A lesson that fails a check is logged in `item_holdbacks` (review
   with `npm run items`) and not saved.
4. REQ-235: a held half gets the app's one steered retry, as a live call
   (purpose `pregen_retry`, not discounted, inside `max_usd`, outside the
   global daily ceiling like the rest of pre-generation). A held teaching text
   is retried during the first collect, and if the retry passes that lesson is
   finished live there (its practice was never in the batch); a held practice
   half is retried during the second collect. Only a retry that passes every
   check is saved. A retry the cap cannot cover is not made: the lesson stays
   held and its first learner visit makes it through the full pipeline. Both
   collects print the retry counts (retried, saved after the retry, held again,
   not retried for budget), and the summary carries them.
5. REQ-248: the distractor lint (an absolute cue word in a wrong option, a
   right answer much longer than the others, "asks for N but option lists M")
   is a **style finding**, as in the app (`generateValid`, REQ-216 M6), not a
   failure. A practice draft whose only problems are style findings gets the
   app's one steered retry (live, `pregen_retry`, inside `max_usd`, steered
   with the findings); a retry with style findings only is saved, as the app
   serves it, with the app's log line "lesson served with style findings after
   one retry" (as kinds, no option text). A retry with a hard problem (an
   empty or duplicate option, a key out of range, not English, an explanation
   naming an option by position) fails, and a style retry the cap cannot cover
   is not made: either way the lesson stays missing and is made on first
   visit. A hard problem in the first draft fails at once, as before. Collect
   prints the style-retry counts and the style findings by kind
   (`styleFindingKinds`); `problemKinds` is the problems of lessons that failed.
   Before REQ-248 any style finding failed the lesson outright (the
   2026-11-12 trial: 21 of 25 practice halves, FAIL-1600).

Left out always: retired objectives and units, hidden courses (`hidden_at`
passed), private courses, authored lessons, and any objective that already has
a lesson row of any kind.

**The money.** `max_usd` is checked against an **upper bound**, not a guess:
every request priced at its full `max_tokens` with the Batches discount, plus
the fact-check at its full `max_tokens` (thinking included), plus (REQ-248) one
live steered retry of the practice half at the full live price, so every
lesson in the batch can have its retry inside the cap. At the 2026-11-09
prices (Sonnet 5.5, $2 in / $10 out per million tokens; batches $1 / $5) that is
about **$0.195 a lesson (it was $0.119 before the retry was reserved), so about
51 lessons per $10** of cap. Every live call (a retry, a fact-check) is also
checked against the cap at its worst case before it is made, so `max_usd` is a
ceiling on the whole run, not only on the plan. The real cost is
expected to be well under that (collect prints the actual figure), so a run
usually leaves cap unspent; run estimate again afterwards for what is left.
`--tracks` is a **priority order**: a track is filled before the next, a unit at
a time, and the first unit that would pass `max_usd` ends the list, so the
lowest-priority track loses its later units. Estimate prints per-track counts
and cost and where the cutoff falls. Submit refuses if even the first unit does
not fit, if a batch is already running (a second click would pay twice), or
without `tracks` and `max_usd`.

**Where the spend shows.** Each batch's usage is one `ai_calls` row, purpose
`pregen`, dated when the batch ended (collecting it twice does not count it
twice); the live fact-checks are purpose `pregen_fact_check`. Neither counts
toward `AI_GLOBAL_DAILY_CEILING_USD` (docs/billing.md): a run this size would reach the
recommended $5 ceiling at once and pause chat and regenerate for learners. The
rows are in `ai_calls`, so any total over the table includes them; the app's
price table prices tokens at list price, so such a total shows a batch at twice
its real cost. The real cost is what collect prints and the artifact holds.

### Steps

**(a) One-time setup (Nick).** In the Claude Console create a workspace named
**pregen** with a **$110 spend limit**, and create an API key in it. In
GitHub: repository Settings -> Environments -> **production-database** -> add
the secret **`ANTHROPIC_PREGEN_API_KEY`** with that key. It is a separate secret
from the app's key, which this job never has; in GitHub Actions the script
refuses any other key. (If production pins `ANTHROPIC_MODEL`, set the same as a
repository variable named `ANTHROPIC_MODEL`; blank uses the default.) The
workflow stops at once, naming the secret, if `PROD_DATABASE_URL` or
`ANTHROPIC_PREGEN_API_KEY` is missing.

**(b) Estimate.** Actions -> Pre-generate lessons -> Run workflow, mode
`estimate`. `tracks` defaults to the launch set in priority order:
`DPT,PTPREREQ,CCRNADULT,AWSSAA,AWSMLA,SECPLUS,CNA`; `max_usd` 110. On the
2026-11-12 seed (REQ-248, the retry reserved) a fresh database has 886 lessons
for these tracks and an upper bound of $172.79 (DPT 110, PTPREREQ 95,
CCRNADULT 271, AWSSAA 99, AWSMLA 107, SECPLUS 77, CNA 127); the 881 production
still lacks are about $171.82. **$110 no longer covers the whole set**: it
covers 551 lessons by the bound (fresh seed): the cutoff falls in AWSSAA, at
"Design Cost-Optimized Architectures", leaving AWSMLA, SECPLUS and CNA out. Raise
`max_usd` and the Console workspace limit together, or let the cutoff stand and
run again with what is left (the actual cost is expected to be far below the
bound). Read the log:
lessons and upper-bound cost per track and the line "Cut off at ...". Change
the order or drop courses until the cutoff is where you want it. No model call,
no write.

**(b2) Trial first.** Before the full run, spend a few dollars to prove the
whole path on real API responses. Run `submit` with the same `tracks`,
**`limit` 25 and `max_usd` 6** (25 lessons are about $4.90 at the upper bound),
then collect both stages as in (d). Check the counts and the Console usage page
(e): **most of the 25 (90% or more) should be saved**. If they are not, read the
"Content-check problems" and "Style findings" lines, fix the cause, and run
another trial; do not go on. The 2026-11-12 trial saved 4 of 25 (FAIL-1600).
Then run **estimate again**: the saved lessons drop out, and the new total and
cutoff are what the full submit will use. Only then run (c) without `limit`.

**(c) Submit.** Mode `submit`, the agreed `tracks` (priority order) and
`max_usd`, no `limit`, and tick **`confirm_full_run`** (REQ-248): a submit with
`limit` blank is refused without it, by the workflow before anything is
installed and by the script (`--confirm-full-run`). It is a deliberate "the
trial passed" step, not a check the script can make: the trial's counts live in
its workflow artifact, not in the database. The log prints the intro batch id (`msgbatch_...`). Most batches
finish within an hour.

**(d) Collect, until it ends.** Mode `collect`, `batch_id` = the intro batch id,
the same `tracks` and `max_usd`. "Not finished yet" means run it later. When it
has ended it starts the **practice batch** and prints its id. Wait again, then
run `collect` with `batch_id` = the practice batch id and `intro_batch_id` = the
intro batch id. That run saves the lessons and prints the counts (saved,
already had one, held back, failed, and the REQ-235 retry counts) and the actual
cost. Run each collect once
per ended batch: a repeat of the first starts nothing (the workflow refuses
when a newer batch exists), and a repeat of the second only re-checks lessons
still unsaved. To cover what was cut off, go back to (b): saved lessons drop out
of the estimate, so use `max_usd` = $110 minus what has been spent.

**(e) Check.** The job summary and the `pregen-summary` artifact hold counts
only. Then: `npm run items -- list` shows lessons held back for review;
`select purpose, count(*), sum(output_tokens) from ai_calls where purpose like
'pregen%' group by 1;` shows the usage; open a pre-generated objective in the
app and confirm the lesson appears at once; the Console workspace's usage page
should agree with the actual cost collect printed. Failed and held objectives are
not a problem: they are simply still missing and are made on first visit.

The log never contains prompts, lesson text or claims (the held-back claims are in
`item_holdbacks`). To rehearse without cost, `npm run pregen -- --submit
--tracks ... --max-usd 110 --dry-run` builds every request and sends nothing.

## Generating sims (REQ-230)

`npm run sims:generate` (backend) drafts one sim at a time for a course
sub-objective and a screen (bedside, board or session), runs every gate and
an independent fact check, and writes a draft that passes as files for a
person to register. It never registers a sim, never touches the database,
and sends nothing without `--run`. Design and gates: docs/sims.md 12.2.

**Key and spend.** It uses only `ANTHROPIC_PREGEN_API_KEY`, the
pre-generation workspace's key (set up under "Pre-generating lessons"
(a)), so its spend sits under that workspace's limit and shows on its usage
page, not in the app's `ai_calls` or daily ceiling. With no key, `--run`
stops before any call and says so. Each run is also capped by `--max-usd`
(default $3): before every call it adds the largest that call could cost
(prompt plus the full output limit) and stops instead of passing the cap.
Nick's plan: measure the first 20 drafts, then set a separate monthly sim
budget from `--cost-summary`.

**Steps** (from `backend/`, locally, with the key in the shell or in
`backend/.env.local`):

1. Pick objectives: `npm run sims:generate -- --select --course CCRNADULT`.
   The list is a keyword screen with the reason recorded for each; a person
   chooses. Objectives that already have a sim are listed last (breadth
   before variants).
2. Estimate: the same command with `--objective "<exact title>" --screen
   bedside` and no `--run`. Read the prompt it writes under
   `sim-drafts/prompts/` once per screen type.
3. Generate: add `--run` (and `--idea "<seed idea>"` if you have one).
   Exit 0 is ready, 2 is held, 1 is an error (no key, unknown objective,
   bad arguments).
4. Ready: read `sim-drafts/ready/<COURSE>/<slug>.sim.json`, then follow
   `<slug>.register.md` (two `mv` lines, one `entry(...)` line in
   `lib/sim/documents.ts`, then `npm run sims:lint`, `npm test` and
   `npm run sim:cross-runtime -- engine-print`). It seeds as
   `needs_expert_review` like every sim.
5. Held: `sim-drafts/held/<COURSE>/<time>-<slug>/reasons.json` says which
   gate failed on each attempt. `check_did_not_run` means the fact-check
   call failed (not a verdict): run the same command again. `budget` means
   the next call could have passed `--max-usd`.
6. After each batch: `npm run sims:generate -- --cost-summary` (drafts,
   ready, held, mean, median and highest cost per draft, cost per ready
   sim). Every draft's own report is in `sim-drafts/reports/`.

`sim-drafts/` is git-ignored; nothing in it is committed until a ready draft
is moved into the seed.

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
