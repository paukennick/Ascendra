# Deploy runbook: mastery integrity (REQ-134, migrations 029 and 029b)

Follow this in order, one step at a time. The headers of
`backend/supabase/migrations/029_mastery_recompute.sql` and
`029b_mastery_backfill.sql` explain the rule, the locking and the restore in
full; this page is only the order of operations.

Every command below runs from `backend/` with `DATABASE_URL` pointing at the
production database. Use the direct connection (port 5432) for steps 2 and 4,
not the transaction pooler (port 6543): the batched recompute commits inside
one `CALL`, and a long-running statement is easier to watch on a direct
connection.

## Before you start

- Pick a quiet window (low traffic). 029b holds a row lock on every mastery
  row it changes until it commits, about a minute on a 1.9M-attempt fixture.
  A grade of one of those rows waits for that commit.
- Set `CHOICE_ORDER_SECRET` in Vercel (Project Settings, Environment
  Variables, Production) before the backend deploy. The new backend refuses
  to order lesson choices in production without it, so every lesson and grade
  would fail. Generate it with `openssl rand -base64 48`.
- Know how your Vercel project deploys. If the project is connected to GitHub
  (the README's setup imports the repo), Vercel builds and promotes a
  production deployment when the PR merges into `master`. That is why the
  migrations come first: run steps 1 to 2 *before* merging PR #22, then merge.
  If you need to hold a deploy that has already been triggered, cancel it in
  the Vercel dashboard (Deployments) before it is promoted, or use Vercel's
  "Instant Rollback" to the previous production deployment. (Not verified from
  this repo: whether the Git integration is connected, and the project's
  production branch. Check Project Settings, Git, before the window.)

## Forward order

1. **Check the starting point.**
   `npm run migrate -- --status`
   Expect 029 and 029b listed as missing. Nothing else should be missing.

2. **Apply 029, then 029b.**
   `npm run migrate -- --all`
   The runner applies `029_mastery_recompute.sql` (schema and the rule, about
   1 s) and then `029b_mastery_backfill.sql` (backup, backfills, first
   recompute, one transaction) and records both in `schema_migrations`.
   Measured on the fixture (local Postgres 16, 1.9M attempts, 320k mastery
   rows, every row needing a change): 029b took 58 s. Reads of attempts,
   error_log and mastery answered in 21 ms or less throughout, and attempt and
   review-entry inserts in 135 ms or less. A write to a mastery row 029b had
   changed waited until 029b committed (the probe's 30 s statement timeout
   fired once). The old backend is still grading during this step and does not
   take the per-pair grading lock; step 4 re-derives anything it writes.

3. **Deploy the backend.** Merge PR #22 (Vercel deploys `master`), or promote
   the build by hand. Keep the gap between step 2 and this step short
   (minutes). Until it is live, the old code grades with its old rule and
   trusts the question and kind the app sends. Pre-029 history and lesson
   rows the old code writes in the gap are trusted as they are (see the 029
   header, "The deploy gap"); only `kind = 'lesson'` rows count.

4. **Run the batched recompute**, once the new backend is serving:
   `psql "$DATABASE_URL" -c "call recompute_mastery_batched();"`
   Run it outside a transaction block (`CALL` with `COMMIT` inside fails in
   one). It re-derives every pair under the same per-pair lock the grader
   takes, commits every 500 pairs, skips rows that are already current, and
   prints progress as NOTICEs. It is safe to stop and run again. Measured on
   the fixture: 33 s with every row changing, 12 s when nothing changes (no
   row is locked then). During it, 400 live-style grades all committed, the
   slowest in 46 ms, and none lost its level. (Not verified: Supabase's SQL
   editor wraps what it runs, which may break the `CALL`'s internal commits;
   use psql.)

5. **Publish the app update.** `cd mobile && npx eas update --channel production`
   (OTA). The app's `runtimeVersion` policy is `fingerprint`: if this release
   changed native code or native dependencies, the OTA will not reach existing
   installs and a store build is needed instead (`npx eas build`). The new app
   needs the new backend (an old backend answers 400 to every grade from it),
   which is why this comes after step 3.

6. **Verify.**
   - `GET /api/health` answers 200 with `{"status":"ok"}`.
   - `npm run migrate -- --status` says "Schema is current" and
     "Mastery vs. rule: every stored level matches mastery_from_attempts()".
     A small number of differing rows right after step 4 can be grades in
     flight; run it again. A large number means step 4 did not finish: run it
     again.
   - Open a lesson in the app, answer the Guided and Solo checks, and confirm
     the level shown.

## Rollback order (reverse)

1. **App first.** Roll the OTA back to the previous update
   (`npx eas update:rollback`, or republish the previous update group to the
   `production` channel). The new app cannot grade against the old backend.
2. **Backend.** Vercel "Instant Rollback" to the previous production
   deployment.
3. **Mastery levels, only if you are returning to the old rules.** Run the
   RESTORE block from the 029b header. It only touches rows nobody has graded
   since the backup, skips rows that already hold the backed-up values, and
   each statement is safe to run on its own or again. Leave the 029 schema in
   place: it is additive and the old code ignores it.
4. **Check.** `npm run migrate -- --status` and `GET /api/health`. The old
   backend's health probes do not know about 029, so it reports current.

## Cleanup (by hand, 30 days after the deploy)

The backups exist only for the rollback above. After 30 days, if no rollback
is planned, drop them in one change that also removes the
`029b_mastery_backfill.sql` probe from `backend/lib/schema-status.ts` (or
`/api/health` will report 029b as missing):

```sql
drop table if exists mastery_backup_029;
drop table if exists error_log_backup_029;
```

Nothing drops them automatically.
