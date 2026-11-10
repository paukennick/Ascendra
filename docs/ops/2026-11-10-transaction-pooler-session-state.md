# Does this app work through the transaction pooler (port 6543)?

REQ-207, written 2026-11-09 for the port switch in
[the lockdown guide](2026-11-10-lockdown-and-db-rotation.md), step 3.2.

Answer: yes by code reading, not yet by test. Nothing the app does depends on
state that outlives one transaction. It was not run through a real
Supavisor/pgbouncer here (none available), so the first live checks in
step 3.4 are the proof.

## What transaction mode changes

In transaction mode the pooler hands your connection a database backend only
for the length of one transaction (or one statement outside a transaction).
Anything stored on the backend between those, such as a session `SET`, a
session advisory lock, a temp table, a `LISTEN`, or a named prepared
statement, may be gone on the next statement or visible to someone else.

## What the code does (observed by search on the base `batch-9`, and on the
F1 and F3 branches as they stood on 2026-11-09)

Advisory locks
- Transaction-level (`pg_advisory_xact_lock`, `pg_try_advisory_xact_lock`):
  safe. All of them run on `tx.query` inside `withTransaction`: exam-outcomes,
  entitlements (x2), rate limiting, review-store, labs, study-sessions,
  lesson-progress-store, verified-discounts (x2), content-review-queue,
  account-access, grading-service (lines 425 and 501, `query` there is bound to
  the transaction in `recordAttemptTx`). F1 adds `aispend:<user>` and F3 adds
  one more, both `pg_advisory_xact_lock` on `tx.query`.
- Session-level (`pg_advisory_lock`, `pg_advisory_unlock`,
  `pg_advisory_unlock_all`): exactly one place, migration 029's
  `recompute_mastery_pair()` and `recompute_mastery()`. The lock is taken and
  released inside the one function call, so it lives and dies on one backend
  within one statement. Safe through a pooler. The app calls it from
  `lib/item-quality.ts:431` inside a transaction. The batched recompute
  (`call recompute_mastery_batched()`) also creates a temp table and COMMITs,
  so it needs a real session: it only ever runs from the migration workflow
  on the session pooler (5432), and stays there.
- Nothing in F1 or F3 uses a session-level lock.

Other session state
- Session `SET`: none in app code. `SET LOCAL` (statement_timeout,
  lock_timeout, idle_in_transaction_session_timeout) and
  `set_config('jit', 'off', true)` are transaction-scoped: safe.
- Named prepared statements: none (no query passes a `name`). node-postgres
  uses the unnamed extended protocol, sent as one batch, which a transaction
  pooler handles.
- Temp tables, `LISTEN`/`NOTIFY`, cursors, `COPY`: none in app code. Temp
  tables appear only in the batched recompute and CI scripts (session pooler).
- Plain `query()` takes a fresh pool client per call, so no code assumes two
  calls hit the same backend. Anything that must be atomic is already in
  `withTransaction`.
- No runtime DDL.

Connection options
- `?pgbouncer=true` is a Prisma convention. node-postgres parses it into a
  config key it never uses (checked with `pg-connection-string`), so adding it
  does nothing. Do not add it.
- The startup `statement_timeout` (FAIL-943) is NOT sent when the URL's port is
  6543 or the host contains `.pooler.`, because a pooler might refuse an
  unknown startup parameter. The server-side limit there comes from the
  `app_runtime` role setting (step 5), or set `DB_STATEMENT_TIMEOUT_MS` in
  Vercel if you want the startup value and have checked it connects.
  Until step 5, plain queries on a pooler URL have only the driver's 30 s
  client timeout (transactions keep their `SET LOCAL` 20 s).

Pool size: `max: 5` per serverless instance is unchanged. Port 6543 is what
makes many instances affordable: backends are lent per transaction.

## Not verified

- A real run through Supavisor. The step 3.4 checks are the test: answer a
  lesson question (transaction + lock) and read the Vercel log for
  `prepared statement` or `lock` errors.
- Whether Supavisor accepts a `statement_timeout` startup parameter. Not
  needed for the plan above.

## If it fails

Put the Session pooler string (port 5432) in Vercel `DATABASE_URL` and
redeploy. That is the setup that ran before.
