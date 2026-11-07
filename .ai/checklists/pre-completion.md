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
- Blast radius checked (REQ-096): for every changed function, query, table,
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
  rule were updated, not deleted (FAIL-232).
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
- Stateful changes (SQL, migrations, auth, grading, anything with a retry or a
  race) have an integration test in `backend/lib/*.dbtest.ts` run against a
  real Postgres with every migration applied (`npm run test:db`), not only
  unit tests.
- A new migration the code depends on has a probe in
  `backend/lib/schema-status.ts`.
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
