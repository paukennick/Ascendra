# Pre-Completion Checklist

- Requirement status is known.
- Intended files changed only.
- Construction quality checklist considered for code/config changes.
- Testing quality checklist considered for validation-heavy changes.
- Maintenance impact checklist considered for released or depended-on behavior.
- SCM checklist considered for dependency, build, generated, release, or
  configuration artifact changes.
- Quality attribute checklist considered for quality-sensitive claims.
- Professional practice checklist considered before final reporting.
- Economics decision checklist considered for major tradeoff claims.
- Computing, mathematical, or engineering foundations checklist considered for
  relevant technical assumptions.
- Blast radius checked (REQ-137): for every changed function, query, table,
  type or route, its other callers and readers were found (grep the name) and
  each still behaves correctly. Changes beside existing code are where defects
  hide -- the account export broke when a query was added next to it.
- After merging another branch that adds a visibility or filter column (for
  example `retired_at`), every reader of that table on the merged tree applies
  it, including files the other branch never had (FAIL-200).
- After merging branches built in parallel (REQ-112), check the cross-branch
  contracts no text conflict shows: every route that calls the model uses
  `consumeRateLimit` (FAIL-230; lib/integration-static.test.ts), every attempt
  kind goes through `assistReasonFor` (FAIL-231), the coach guard lists every
  open item kind (FAIL-244), every per-learner table is exported or excluded
  with a reason (FAIL-236; lib/integration-guard.dbtest.ts), the app's
  long-timeout route list has every model route (FAIL-234), logout sweeps
  every per-user device key (FAIL-235), and tests written against an older
  rule were updated, not deleted (FAIL-232). With paid plans (REQ-124): a
  feature key one module hands another is typed `satisfies Feature`
  (FAIL-510), and every study route the other branch added is checked
  against the gated-route list in docs/billing.md, the Free one-course
  check included (FAIL-511).
- When two lines changed the same function, write down each side's rule and
  check both survived the merge, not only the text (REQ-139): the parallel
  lesson calls kept the speed and dropped "practice sees the teaching text"
  (FAIL-527); two lab entry points on one lesson showed one lab twice
  (FAIL-526). A retention window applies to every reader of the rows it
  deletes, including links mailed earlier that still need them (FAIL-528).
- Shared generated content (REQ-114): a new kind of shared item asks for
  `confidence`/`uncertainClaims`, holds uncertain output back
  (`recordHoldback`), passes the fact-check gate (`factCheckGate`) before it
  is stored, filters pulled items when serving (`servableSql`), and is
  reachable from "Report a problem". Any migration that restates
  `mastery_detail()` keeps `a.voided_at is null` in its attempt selection
  (lib/item-quality.dbtest.ts).
- Auth and abuse (REQ-116, FAIL-310..329): an action that changes a
  credential, the email address or a sign-in method asks the learner to
  confirm it's them (lib/auth/reauth.ts) and ends other sessions
  (lib/auth/sessionControl.ts); a route that replays by client id checks
  the stored attempt is for the same item (lib/replay-binding.ts or
  sameAttempt); request bodies go through readJson, learner text through
  textField before any model call, and client-supplied ids through
  lib/visibility.ts; anything that mails an address the caller typed goes
  through mayEmail and escapes it.
- AI-layer changes (REQ-115, FAIL-290..307): text a learner or course author
  wrote goes into a prompt only escaped (`escapeLearnerText`, `fenceLearnerText`,
  `quoteTitle`), never stripped; a recorded verdict goes through
  `lib/grade-consistency.ts` (trivial answers, verdict vs the grader's own parts
  and rubric); shared generated content passes `lib/content-validator.ts`
  before it is stored; a per-learner model route that can run up cost is under
  `requireAiBudget` or says why not; per-request prompt blocks go after the
  cached history, never in the system blocks; a model route answers a bad or
  empty model reply with a 503, not a 500; a new grader gets a runner in
  `scripts/eval/live.ts`.
- A change to the mastery rule, readiness, the review schedule or the plan
  (REQ-117) is run through the persona simulation (crammer, spaced, guesser,
  hinter, struggler, returning, expert ...; Audit 3 teaching harness) before
  and after, and the rule is timed on a learner with 26k attempts
  (lib/mastery-honesty.dbtest.ts FAIL-360): any correlated subquery over
  attempts uses a full index key, never an OR of keys (FAIL-360).
- Stateful changes (SQL, migrations, auth, grading, anything with a retry or a
  race) have an integration test in `backend/lib/*.dbtest.ts` run against a
  real Postgres with every migration applied (`npm run test:db`), not only
  unit tests.
- A new migration the code depends on has a probe in
  `backend/lib/schema-status.ts`.
- A new foreign key into `app_users` or `attempts` has an index led by its
  column (FAIL-393; account deletion otherwise scans the table per row).
- A new check, key or column rule on `attempts` still holds after every
  ON DELETE action on attempts' existing keys (objective_id, unit_id and the
  item keys are SET NULL): test deleting a course that has the new rows
  (FAIL-480). No deferrable constraint on `attempts` -- it queues an event
  per insert and breaks later DDL in the same transaction (FAIL-481).
  Hot paths keep their query budgets (REQ-118, `lib/perf-audit3.dbtest.ts`).
- Bumping a legal, notice or protocol version (REQ-175, FAIL-560): installed
  builds keep sending the old one until they update, and no OTA may be
  possible. Move the old value to `PREVIOUS_LEGAL_VERSIONS` (lib/legal.ts) so
  legacy clients (no `X-Ascendra-App`) can still accept what they show, and
  never answer a version gate with a raw validation string.
- A 401 that means "what you typed is wrong" (a reauth refusal) carries
  `reauthRequired: true`; the app never refreshes and resends it (REQ-177,
  FAIL-562). A lock or sign-out added to the app keeps in-progress screens
  mounted (an overlay, not a navigation) and cannot be skipped by a restart.
- Sessions (REQ-192, FAIL-690..692): every sign-out path revokes on the
  server before clearing local state, whatever the device stores (a
  biometric-sealed token included). The web app never stores a refresh
  token: sign-in and refresh routes answer through `sessionResponse`
  (lib/auth/refreshCookie.ts), and anything that reads the cookie checks
  `cookieRequestAllowed` (Origin + platform header). A dialog or sheet uses
  `SheetModal`, never React Native's `Modal`, so it hides under the lock.
- Database roles and exposure (REQ-207, FAIL-940..956): a migration that adds
  a table, view, sequence or function, or restates a function with CREATE OR
  REPLACE (which drops its `search_path`), ends with `select
  app_runtime_sync();` so the least-privilege `app_runtime` role and the
  hardened functions stay complete (lib/app-runtime.dbtest.ts fails CI
  otherwise); `npm run test:db` also passes as `app_runtime`
  (scripts/ci/db-tests-as-runtime.sh), with owner-only steps going through
  lib/test-owner.ts. Nothing logs a whole error object (`describeError`,
  lib/error-summary.ts: Postgres `detail` can hold an e-mail address). A new
  public route says what its unauthenticated answer reveals. A new workflow
  declares top-level `permissions`, runs on Node 24, and pins third-party
  actions (lib/workflow-hardening.test.ts). A new page rendered by Next is
  added to security-headers.js. No session-level state in app code (session
  SET, `pg_advisory_lock`, named prepared statements, temp tables, LISTEN):
  production connects through a transaction pooler
  (docs/ops/2026-11-10-transaction-pooler-session-state.md).
- Tests or validation run, or skipped with reason.
- New test frameworks, test directories or check scripts are registered as test
  suites (`omni test detect`); `omni test check` passes.
- Every defect, failed check or regression fixed in this task is in the failure
  ledger with its root cause, regression test (or reason), and prevention;
  `omni failure check` passes.
- Any rule, playbook or checklist that should have prevented a failure was
  changed in this task.
- Docs updated when behavior or workflow changed.
- Changelog updated when public release notes are desired.
- Local-only notes remain ignored.
- Risks and follow-ups are stated.
- Final response includes commit sentence and PR information when applicable.
