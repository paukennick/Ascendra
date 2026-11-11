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
- A hook one branch leaves for another (a no-op seam such as `setGlobalCeilingCheck`)
  is wired and tested on the merged tree, through the real call paths, not only
  stubbed (FAIL-964); every caller that special-cases one refusal class handles
  the new one the gate can now raise (FAIL-965); a purpose, option or map one
  branch made required is satisfied by every call site the other added (FAIL-966); a
  migration that adds roles, grants or other things a database dump does not
  hold names the step that restores them, and the restore drill runs it
  (FAIL-897) on a cluster that has never had the role, because roles belong
  to the cluster and the source's own cluster hides the gap (FAIL-1160;
  backend/scripts/restore/); a setting the code reads is in
  backend/.env.example and, if operational, in the runbook (FAIL-1163); and a
  field one branch reads as "who is charged" and another as "whose scope" is
  split, not shared (FAIL-967); and when one branch changes how a screen is
  entered (REQ-206: the MFA and verify-email handoffs), every caller another
  branch added is moved too (FAIL-895).
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
- Model spend (REQ-202, FAIL-840..847): a model call states its learner
  (`userId` is required on `callClaude` / `callClaudeStructured`; `null` only
  with a reason in lib/ai-spend-gate.test.ts) and is held to the spend gate
  in the call layer (lib/ai-spend-gate.ts) -- never a per-route check
  someone has to remember. Shared generation is charged to the learner whose
  request started it. A new purpose gets a pool in lib/ai-spend-ledger.ts
  (`PURPOSE_POOL`), a new route that can reach the model is added to
  `MODEL_ROUTES` in lib/ai-spend-gate.test.ts, and one that runs a call in
  the request exports `maxDuration` (at most 300, Hobby with Fluid compute).
  A spend read never ends in `.catch(() => 0)` on an enforcing path: it fails
  closed. Anything that loops over model calls looks at the budget first
  (`canAffordAiSpend`).
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
  never answer a version gate with a raw validation string. REQ-205
  (FAIL-901): a request's headers say which text its build carries
  (`legalContext`, lib/legal.ts): no `X-Ascendra-App` is the oldest
  generation, `X-Ascendra-App` without `X-Ascendra-Legal` is the next, and a
  build declaring `X-Ascendra-Legal` carries exactly that text. Each
  generation still installed can accept its own version, recorded as sent, and
  its launch gate is satisfied by it; a build declaring the current version
  must accept the current one (that is how an updated app is asked once).
  At the next bump move the old `LEGAL_VERSIONS` into
  `PREVIOUS_LEGAL_VERSIONS` and leave `UNDECLARED_LEGAL_VERSIONS` and
  `LEGACY_LEGAL_VERSIONS` frozen; a mobile test checks `TERMS_VERSION`.
- Legal and privacy text (REQ-205, FAIL-900..912): a sentence about what is
  kept, deleted or sent matches the code, the inventory
  (docs/legal/data-inventory.md, which a DB test checks names every table with
  a `user_id`) and the delete-account page, in the same change. A new
  per-learner table says what survives account deletion. A new route that sends
  learner text to the model calls `requireStudyNotice` (lib/study-notice.ts).
  No bracketed placeholder ships in legal text, and the contact address is the
  `support-contact.ts` constant.
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
- Account security (REQ-203, FAIL-860..871): a route that adds a sign-in
  method (authenticator, Google link) or deletes the account asks for proof
  whenever the account has one (`hasReauthProof`, then `checkReauth`), not
  only when MFA is on, mails the account address when a method is added, and ends other sessions
  (`endOtherSessions`) in the same transaction (the Google link, FAIL-871).
  A guess limit counts wrong answers: spend the budget while checking
  (`consumeRateLimit`), give a correct one back (`refundRateLimit`). A
  single-use code gets a try limit and is dropped after the last miss. Writes
  that change a credential and end sessions share one `withTransaction` (test
  it by making the last statement fail). Revoke by `family_id`, never one
  token. Reuse-detection tests say which side of the 10-second grace window
  (`REFRESH_REUSE_GRACE_SECONDS`) they exercise, and clear a cookie only when
  the cookie failed.
- Learning-data correctness (REQ-204, FAIL-880..893): a route keyed by an
  objective uses `taughtObjective` (lib/visibility.ts) unless it must read
  history, and every reader of a table with `retired_at` applies it, resumed
  state and triggers included (FAIL-889, FAIL-890). A pulled item is pulled
  with every copy of it (a lesson check copied into `exam_items`, FAIL-885),
  and a cleared one can be pulled again (FAIL-886). A cooldown names who it
  blocks (FAIL-882) and starts only on a verdict about the content, never on
  our own failure (FAIL-883). A message written for the learner goes out as a
  4xx, because the app hides a 5xx (FAIL-884). A one-open-row rule or a replay
  by client id is taken under a lock (FAIL-880, FAIL-881). Old state is
  destroyed only after the new state is stored, and a counted use is released
  on every path that stores nothing (FAIL-887, FAIL-888). A seed that rewrites
  a field generated content was made from invalidates that content
  (FAIL-893).
- Web screens and accessibility (REQ-206, FAIL-920..939): an overlay that
  hides the app (the lock) also makes it `inert` and hidden from assistive
  tech, takes focus and traps Tab -- covering it to the eye is not enough
  (FAIL-920). A "Back" control uses `useGoBack(parent)`, never
  `router.back()` (a reload leaves nothing to go back to; FAIL-921, enforced
  by mobile/src/lib/f5WebA11y.test.ts). A single-line form field passes
  `onSubmitEditing`. A checkbox is `Checkbox` from ui.tsx, with any links
  beside it, not inside it. Nothing sensitive (an email, a challenge token)
  goes in route params (src/lib/handoff.ts). A new route has an entry in
  src/lib/routeTitles.ts and in app/(app)/_layout.tsx; a change to a web
  screen's layout or controls is checked with mobile/e2e/tab-order.e2e.mjs
  (Tab order, focus ring, traps, hidden focus; see mobile/e2e/README.md). A
  result that appears without moving focus goes through `LiveAnnouncement`. A signed-in screen
  never sends a request before the session is restored.
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
<<<<<<< HEAD
- Generated learner-facing content (REQ-216, FAIL-1010..1025): a new kind of
  generated item goes through `lib/generation-gate.ts` (`generateGated`) or, in
  a batch, the same helpers (`lowConfidenceOf`, `verdictHolds`,
  `verdictUnchecked`, `steerText`): it is held back ONLY on the writer's low
  confidence or a fact-check that disagrees with the key; claims it lists are
  logged (`noteListedClaims`), never blocking; it is written once more steered
  with the claims; held twice, the learner gets a 409 whose words name the
  reason. A failed fact-check CALL is retryable and is never a holdback or a
  cooldown. A `UserFacingError` is always a 4xx (lib/generation-gate.test.ts
  scans every throw site), and the app keeps the server's words for 502/503.
  A counted use is released with `releaseOnce` on every path that stores
  nothing. A route that calls the model for a replayable id takes a
  `withGradingClaim` first.
=======
- Phone sessions and screens (REQ-217, FAIL-1040..1066): a silent refresh never
  writes the biometric-sealed key (Android prompts for every write); it is
  written at sign-in, unlock and when the app goes to the background, and a
  failed seal keeps the session on the plain key, never signs out. Only a 401
  from `/api/auth/refresh` signs the device out; any other failure keeps the
  token and shows a retry. Only signed-out `/api/auth/` routes are exempt from
  refresh-and-retry (`isSignedOutAuthRoute`, src/lib/sessionStore.ts); a new
  signed-out route is added there. A request that ends other sessions reports
  success only on a 200. A client id sent for replay is kept in a ref until the
  request succeeds (`pendingIdFor`). A screen a learner can leave with the back
  gesture flushes its work through a `beforeRemove` guard. A button that throws
  work away asks first. A catch on a load shows the error, never an empty state.
>>>>>>> origin/master
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
