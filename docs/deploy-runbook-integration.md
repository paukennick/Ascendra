# Deploy runbook: integration release (migrations 029 to 041b)

This extends [deploy-runbook-mastery.md](deploy-runbook-mastery.md), which
covers 029/029b on their own. Use this page when production is behind more
than one of the migrations below, which is the case for the
`integration/all` release (REQ-097 through REQ-112). Everything in the
mastery runbook's "Before you start" still applies: a quiet window,
`CHOICE_ORDER_SECRET` set in Vercel before the backend deploy, and knowing
how your Vercel project promotes a deploy.

Every command runs from `backend/` with `DATABASE_URL` pointing at the
production database over the direct connection (port 5432), not the
transaction pooler.

## The migrations, in order

The runner (`npm run migrate -- --all`) applies them in this order, each in
its own transaction, and records each in `schema_migrations`. A `b` file runs
straight after its partner. Timings are from the 1.9-million-attempt,
320,000-mastery-row fixture on local Postgres 16, measured on 2026-11-07 with
a probe reading attempts, mastery and error_log and inserting an attempt
every half second throughout. "Reads" is the worst probe time in that window,
including `psql` start-up (about 50-80 ms of each figure).

| File | What it does | Fixture time | Quiet window? | Reads / inserts during it |
|---|---|---|---|---|
| 029 | assisted attempts, hint reveals, the 029 rule, recompute functions | 0.9 s | no | ≤ 120 ms / ≤ 340 ms |
| **029b** | backup, backfills, first recompute (one transaction) | **69 s** | **yes** | ≤ 180 ms / ≤ 380 ms, none failed |
| 030 | two indexes (chat, study sessions) | 0.3 s | no | (too short to sample) |
| 031 | weighted mastery: tuning tables, `attempts.assessment_type` (key NOT VALID) | 0.4 s | no | ≤ 100 ms |
| **031b** | backup, recompute under the weighted rule, validate the key | **283 s** | **yes** | ≤ 190 ms / ≤ 200 ms, none failed |
| 032 | lesson-position tombstones | 0.3 s | no | (too short to sample) |
| 033 | exam blueprints, `retired_at` | 0.4 s | no | ≤ 105 ms |
| 034 | option reasons, model answers, `retry_of` | 0.6 s | no | ≤ 100 ms |
| 035 | teach cards, lab questions, `lab_objective_id` (check NOT VALID) | 0.6 s | no | ≤ 100 ms |
| 036 | PBQ generation lease | 0.3 s | no | ≤ 80 ms |
| 037 | review loop tables, enrol trigger, `unit_check_item_id` (key NOT VALID) | 0.3 s | no | (too short to sample) |
| 037b | enrol existing Guided+ learners (spread over 7 days), validate the key | 3.7 s | no | ≤ 135 ms |
| 038 | exam practice tables and types | 0.3 s | no | (too short to sample) |
| 039 | study plan, placement, Quiz me | 0.4 s | no | ≤ 90 ms |
| 040 | comparison cards, explain-back, misconceptions | 0.4 s | no | ≤ 130 ms |
| 041 | integration mastery rule, `attempts.part_scores` | 0.3 s | no | (too short to sample) |
| **041b** | backup to `mastery_backup_041`, recompute under 041 | **145 s** | **yes** | ≤ 180 ms / ≤ 210 ms, none failed |

All of 029 through 041b on the fixture: about 8.5 minutes, nearly all of it
029b, 031b and 041b. No read or insert failed or timed out at any point. On
the fixture 041b changed no level (its history has only lesson answers, which
041 scores as 031 did); on production it changes the levels of learners with
unit checks, Quiz me, placement or comparison-card answers.

**Why the three `b` files need a quiet window.** Each is one transaction. It
holds a row lock on every mastery row it changes until it commits, so a grade
of one of those (learner, objective) pairs waits until the end -- up to the
whole file's run time. Reads of every table, and inserts, are not blocked
(measured above). Rows already equal to the rule are skipped before any lock,
so a re-run locks nothing. The schema files hold ACCESS EXCLUSIVE only for an
instant and give up after `lock_timeout` 5 s rather than queue reads behind a
long query: if one fails on a lock timeout, run `--all` again.

## Forward order

1. **Check the starting point.** `npm run migrate -- --status`. Expect the
   files above (from wherever production is) to be listed as missing, and
   nothing else.

2. **Apply every migration** in the quiet window:
   `npm run migrate -- --all`
   About nine minutes on the fixture; scale with your attempt count.

3. **Deploy the backend** straight after (merge the release; Vercel deploys
   `master`). Keep the gap short. Until it is live the old backend is still
   grading with its own rules (029 header, "The deploy gap"); step 4
   re-derives anything it writes.

4. **Run the batched recompute once the new backend is serving:**
   `psql "$DATABASE_URL" -c "call recompute_mastery_batched();"`
   Outside a transaction block (it commits every 500 pairs). It takes the
   grader's per-pair lock, so it never overwrites a grade made while it runs,
   and skips rows already current. Fixture: 131 s for 320,004 pairs with one
   row changing. Safe to stop and run again. This one call covers 029, 031
   and 041: they all recompute through `mastery_from_attempts()`, which is
   041's rule by now, and since 041 `mastery_pairs()` also visits pairs that
   only have exam, review or comparison-card answers.

5. **Publish the app update.** `cd mobile && npx eas update --channel production`
   (or a store build if native code changed; the mastery runbook explains the
   fingerprint policy). The new app needs the new backend.

6. **Verify.**
   - `GET /api/health` answers 200.
   - `npm run migrate -- --status` prints "Schema is current" and "Mastery vs.
     rule: every stored level matches mastery_from_attempts()". A handful of
     differing rows right after step 4 are grades in flight; a large number
     means step 4 did not finish -- run it again.
   - In the app: a lesson check, Today's review, a practice exam sprint, a
     comparison card and "Quiz me" each record an answer; the study plan's
     mock-exam step opens Practice exam.

## Rollback order (reverse)

1. **App first.** Roll the OTA back (`npx eas update:rollback`, or republish
   the previous update group). The new app cannot grade against an old
   backend.
2. **Backend.** Vercel "Instant Rollback" to the previous production
   deployment.
3. **Mastery levels, only if you are returning to older rules.** Restore
   newest first, each only together with putting that file's predecessor rule
   back, because the next graded answer recomputes from whatever rule is
   installed:
   - to undo 041: re-run section 3 of `031_weighted_mastery.sql` (031's
     `mastery_detail`) and the `mastery_pairs` definition from
     `029_mastery_recompute.sql`, then the RESTORE block in the
     `041b_mastery_rule_backfill.sql` header;
   - then, if going further back, the 031b RESTORE block, then the 029b one.
   Each RESTORE only touches rows nobody has changed since that backup, and
   each statement is safe to run on its own or again. Leave every schema
   change in place: all of 029 to 041 is additive and older code ignores it.
4. **Check.** `npm run migrate -- --status` and `GET /api/health`.

Rolling back only the 041 rule (keeping the rest of the release) is the same
step 3, first bullet, with the backend left as it is: 041's code works under
031's rule, except that a practice-exam answer then calls `attempt_spaced()`
(which stays installed) and the plan's kept view keeps using it.

## Cleanup (by hand, 30 days after the deploy)

Drop the backups once no rollback is planned, each in the same change that
removes its probe from `backend/lib/schema-status.ts` (otherwise
`/api/health` reports that `b` file as missing):

```sql
drop table if exists mastery_backup_029;   -- probe: 029b_mastery_backfill.sql
drop table if exists error_log_backup_029;
drop table if exists mastery_backup_031;   -- probe: 031b_weighted_mastery_backfill.sql (checks the table too)
drop table if exists mastery_backup_041;   -- probe: 041b_mastery_rule_backfill.sql
```

Not verified from this repo: production's real row counts (scale the times
above), whether the Vercel Git integration promotes on merge, and Supabase's
SQL editor with `CALL` and internal commits (use psql).
