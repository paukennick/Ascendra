# Deploy runbook: integration release (migrations 027a to 054)

This extends [deploy-runbook-mastery.md](deploy-runbook-mastery.md), which
covers 029/029b on their own. Use this page when production is behind more
than one of the migrations below, which is the case for the
`integration/all` release (REQ-100 through REQ-112, plus REQ-134 to REQ-136, which were REQ-097 to REQ-099 before the 2026-11-07 merge). Everything in the
mastery runbook's "Before you start" still applies: a quiet window,
`CHOICE_ORDER_SECRET` set in Vercel before the backend deploy, and knowing
how your Vercel project promotes a deploy.

**Shipping `release/2026-11-07`** (line A + line B, docs/release-2026-11-07.md):
follow the next section from top to bottom. The sections after it explain
individual migrations and stay true; where they give an order, the next
section's order wins.

## Release 2026-11-07: the ordered deploy, and the way back

**Shipped 2026-11-08 (UTC) / 2026-11-07 evening (Pacific).** See "What was
actually run" at the end of this section for the record; the steps below
are the plan as written, kept for reference and for any re-run.

Production before the release: master @ c3e13ab's code on Vercel; a database with
001-024 plus line B's 025/026/027, whose `schema_migrations` lists only
023-027; 3 accounts and about 25 attempts. Times below are for that size;
the 1.9-million-attempt fixture timings further down are for scale only.
Every step was rehearsed end to end on a copy of that state
(`backend/scripts/rehearse-production-migration.sh`, CI job "Database
(production-state rehearsal and rollback)") before it ran in production.
That rehearsal and `scripts/rollback-release-2026-11-07.sql` are historical
since 2026-11-10 (REQ-214): they apply only to the 11-07 release.

`$DATABASE_URL` is the production database over the Supabase **Session
pooler** (`postgres.<project-ref>@aws-...pooler.supabase.com:5432`). The
"direct" host (`db.<project-ref>.supabase.co`) is IPv6-only and GitHub's
runners cannot reach it; never use the transaction pooler (port 6543) for
migrations. Every command runs from `backend/`. Since the release, steps 3,
5 and 6 run from GitHub Actions instead of a laptop -- see
[Routine deploys](#routine-deploys-after-2026-11-07).

### 0. Before the window (any time, ~10 min)

- Write down the deployment Vercel would roll back to: Vercel -> the backend
  project -> Deployments -> filter "Production" -> the one marked Current,
  whose commit is **c3e13ab** ("Merge pull request #4 from
  paukennick/catalog/ccrn-health-informatics"). Note its deployment URL
  (`<project>-<hash>-<team>.vercel.app`) and ID; that is "previous" in
  step 7.
- Vercel environment variables (Production): `CHOICE_ORDER_SECRET` (new, a
  long random value; mastery runbook), `CRON_SECRET` (new, a long random
  value; the daily purge in `vercel.json` refuses to run without it). Check
  no variable still has its `.env.example` placeholder: the new backend
  refuses to start if one does (`lib/env-check.ts`).
- `psql` and `pg_dump` 16 or newer on the machine you run from.

### 1. Backup (~1 min at this size)

Supabase's Free plan has no point-in-time recovery and its daily backups
cannot be downloaded, so take your own, of the app's schema only:

```sh
pg_dump "$DATABASE_URL" -Fc --no-owner --no-privileges --schema=public \
  -f ascendra-pre-20261107.dump
pg_restore --list ascendra-pre-20261107.dump | grep -c 'TABLE DATA'   # one per table: 32 before the release
```

Keep the file off the laptop as well (it holds password hashes and
learners' answers: encrypted storage only, delete after 30 days).

### 2. Baseline the ledger and check the starting point (~1 min)

```sh
npm ci
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/release-2026-11-07-baseline-ledger.sql
npm run migrate -- --status
```

The baseline records 001-027 as applied -- only if the database really has
the objects through 024 and 027, otherwise it stops with an error and
changes nothing. Without it, `--all` would try to re-run 001-022, which
were pasted into the SQL editor and never recorded. `--status` must then end
with "Not in the schema_migrations ledger (35)" listing exactly
027a_lesson_progress.sql through 054_whats_new_seen.sql (exit code 2,
"Schema is MISSING ..."). Anything else listed: stop and ask.

### 3. Migrate (~1 min at this size; 1 s on the local copy)

```sh
npm run migrate -- --all
npm run migrate -- --status    # "Schema is current" and "every stored level matches"
```

Each file is its own transaction; a failure rolls that file back and stops
(re-run `--all` after fixing the cause; recorded files are skipped). At
this size step 1a (building 046's indexes concurrently) and the quiet
window are not needed: the backfills touch nine mastery rows. The old
backend keeps working on the new schema (rehearsal step C: 39/39 of
master's routes), so there is no outage between steps 3 and 4.

### 4. Deploy the backend (~3-5 min; Vercel build time, not measured here)

Merge `release/2026-11-07` into master; Vercel builds and promotes it.
Check the new deployment is Current and its commit is the merge commit.

### 5. Seed the catalog (minutes over the network; 4 s locally)

```sh
npm run seed
```

Retitles the CompTIA courses, adds the new courses, units, objectives and
labs, and sets `retired_at` on the CS0-003 units. Safe to re-run.

### 6. Recompute and verify (~5 min)

```sh
psql "$DATABASE_URL" -c "call recompute_mastery_batched();"
npm run migrate -- --status    # current; every stored level matches
curl -fsS https://<backend>/api/health
```

In the app (signed in): you are asked once to agree to the updated Terms
and Privacy Policy; a lesson check grades; Today's review opens; Account ->
Export my data downloads and lists `legalAcceptances`; Support -> a ticket
sends. The mobile app needs a store build for the new native module
(section "Forward order" step 5 below); until learners install it the old
app keeps working against the new backend.

**Total: about 15-20 minutes planned; 25 minutes in practice (the seed alone took 22 from GitHub)**, most of it waiting for the Vercel build and
the seed.

### 7. Rollback, if needed (the way back, in order)

1. **Code (~1 min), always enough on its own.** Vercel -> Deployments ->
   the c3e13ab deployment noted in step 0 -> "..." -> Instant Rollback
   (or `vercel rollback <that deployment URL>`). Every release migration is
   additive and the old backend was tested on the migrated schema, so leave
   the database as it is. Vercel stops auto-promoting new master deploys
   after an Instant Rollback until you promote one again. The release's
   tables, columns and enum values stay and are ignored; the old code grades
   with its own mastery rule from then on (each graded answer re-derives
   that objective's level), so levels drift back toward master's rule.
   Rolling forward later: promote the release deployment, then step 6.
2. **Mastery levels (optional, ~1 min).** To put pre-release levels back on
   rows nobody has changed since, run the RESTORE blocks newest first (045b,
   041b, 031b, 029b headers) -- or run step 3, which does exactly that first.
3. **Schema (only if the release's schema itself must go; destroys the
   release's data).** After a fresh `pg_dump` (step 1 again, new file name):
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/rollback-release-2026-11-07.sql`.
   One transaction: restores levels, puts B's 025 columns and master's two
   rollup views back, drops the release's triggers, functions, 63 tables (055's review queue, 056's two access tables, 058's two discount tables and 060's two intake tables included) and
   the columns it added to pre-release tables, and removes 027a-054 from the
   ledger. Rehearsed: afterwards the schema equals the pre-release one apart
   from three enum values Postgres cannot drop (`attempt_kind` review and
   labtask, `attempt_format` lab; old code never writes them), and master's
   routes pass. To roll forward again: step 2's `--all`, then steps 5-6.
4. **Full restore to the moment of the backup (loses everything since).**
   Only after the code rollback and step 3:
   ```sh
   pg_restore --clean --if-exists --no-owner --no-privileges --schema=public \
     -d "$DATABASE_URL" ascendra-pre-20261107.dump
   ```
   Rehearsed: schema (enum values included) and row counts equal the
   backup, and master's routes pass.

Down path per migration group (what step 3 removes; each group is additive,
so leaving it in place is always safe for the old code):

| Group | Removes | Data lost |
|---|---|---|
| 027a-027c, 032 | lesson_progress (+tombstones), attempts.client_attempt_id, chat_messages.client_message_id, lesson_content_overrides, lesson_generation_claims | saved lesson positions, per-learner regenerated lessons |
| 028, 043 | ai_calls | AI call counts |
| 029-031b, 041-041b, 045-045b | assisted / assist_reason, error_log.pbq_scenario_id, lesson_hint_reveals, mastery_model_params, assessment_types, attempts.assessment_type, the rule functions and `recompute_mastery_batched`, grading_claims, the backups (after restoring levels from them) | hint reveals; levels revert where untouched |
| 030, 046 | performance indexes | none |
| 033 | retired_at on units and objectives (views put back first) | retirement dates (the old code lists retired units again) |
| 034-035 | option reasons, model_answer / fix_next / retry_of, teach_cards, lab_report_questions, lab_objective_id | rich feedback, revisions, lab reports |
| 036, 038, 047 | pbq_generation_claims, exam_items / exam_sessions / exam_session_items | practice exams |
| 037-037b | review loop tables, unit_check_items, the enrol trigger | Today's review history and schedule |
| 039-040 | study plans, placement, Quiz me, comparison cards, prerequisites, misconceptions | those learners' records |
| 042 | item_flags / item_status / item_holdbacks / item_quality_params, voided_at | question reports and quarantines |
| 044 | token_version, totp_pending_reauth_at, email-change cancel columns, set_password, two auth_events indexes | pending email-change cancel links |
| 048 | learner_onboarding, learner_events (+5 triggers), exam_outcomes | milestones, first-run state, reported exam results |
| 049 | entitlements, billing_events, free_course_choice, allowance_uses | plan records (none while billing is off) |
| 050-051, 053 | labs, lab_runs, lab_run_steps, attempts.lab_id, lab_disclaimer_acknowledgements (enum values stay) | lab runs and acknowledgements |
| 052 | legal_acceptances.source; B's *_choice_feedback columns come back, filled from option reasons | how each acceptance was given |
| 054 | app_users.whats_new_seen_id | which "What's new" note each learner dismissed |
| 055 | content_review_queue, eleven `signal_*` rows in item_quality_params, index attempts_answered_created | the learner-signal review queue and its history |
| 056 | account_access, account_access_events | unrestricted-access grants and their audit trail (owners come from `OWNER_EMAILS`, so they stay) |
| 057 | education_categories row cloud-native-certifications and its three education_subcategories rows (cncf-certifications, container-tooling, red-hat-openshift) | nothing learner-owned: the taxonomy rows the containers and Kubernetes tracks hang off |
| 058 | verified_discounts, discount_offer_codes | verified-discount results and the App Store offer-code pool (codes already handed out stay valid in the App Store; re-import the unissued ones after rolling forward) |
| 059 | `study_notice` rows in legal_acceptances; the document check returns to 027's `terms`/`privacy` | which learners accepted the study notice (they accept it again after rolling forward) |
| 060 | learner_intake, learner_intake_targets; entitlements.family and entitlements.scope (dropped with entitlements) | study-profile answers |
| 061 | education_subcategories row emergency-medical-services (delete the four NREMT tracks first: their subject_tracks rows point at it) | nothing learner-owned beyond the EMS courses' own progress: the taxonomy row the NREMT tracks hang off |
| 062 | sim tables (sims, sim_versions, sim_reviews, sim_runs, sim_run_commands, sim_run_reasoning), attempts.sim_id and attempts_simtask_shape, the sim_run assessment type (enum value `simtask` stays). Normal rollback is SIMS_ENABLED off and the schema left in place (docs/sims.md 6.1) | sim runs, their commands, reasoning grades and sim attempts |
| 065 | `subject_tracks.hidden_at` (`alter table subject_tracks drop column if exists hidden_at;`) | which courses are hidden: EX188, EX280 and DCA show in the catalog again for everyone until the column is back and `npm run seed` runs. The courses' content is untouched either way |
| 067 | the `sim` item kind on item_flags / item_status / item_holdbacks (050's checks come back as `*_item_kind_050`) and item_flags.context; 'sim' rows must be deleted first. Normal rollback is SIMS_ENABLED off and the schema left in place | learner reports on sims, sim versions pulled from rotation and the reports' context |
| 077 | mature_content_confirmations (`drop table if exists mature_content_confirmations;`), then the mental-health education_categories row and its three subcategories (delete the EPPP track first: its subject_tracks row points at psychology-licensure). The code before 077 never reads either | who confirmed they are 18+ for mental health courses (they confirm again after rolling forward); EPPP course progress if the track is deleted |
| 078 | learner_course_profiles, learner_unit_levels, learner_level_changes (`drop table if exists learner_level_changes, learner_unit_levels, learner_course_profiles;`), `subject_tracks.level_flow`, `learner_events.detail` and the phase 1 event names (delete those rows first; the full down path is in 078's header). The code before 078 never reads any of it | each learner's per-course goal answer, levels and level changes (asked again after rolling forward); the lesson step events |
| 079 | lesson_primers (`drop table if exists lesson_primers;`), then `delete from item_holdbacks where item_kind = 'primer';` and restate item_holdbacks' item_kind check without 'primer' (067's list). The code before 079 never reads either | the Key terms written so far (rewritten on first use after rolling forward) |
| 080 | the four REQ-256 events and reason 'suggested': `delete from learner_events where event in ('guess_matched','level_down_suggested','level_down_declined','goal_card_shown'); update learner_level_changes set reason = 'learner' where reason = 'suggested';`, then restate `learner_events_event_078` with 078's list and `learner_level_changes_reason_check` without 'suggested' (same names; full down path in 080's header). Roll the backend back first: the REQ-256 routes write these values | the guess-match labels, move-down suggestions and their Not now, goal-card showings (counting restarts from zero after rolling forward); accepted suggestions stay as level changes, relabeled 'learner' (no longer undoable) |

Every command runs from `backend/` with `DATABASE_URL` pointing at the
production database over the Session pooler (port 5432), not the
transaction pooler.

### What was actually run (2026-11-07/08)

Times are UTC on 2026-11-08 unless marked; Pacific is 8 hours behind.

1. **Backup (2026-11-07, before the window).** Not a `pg_dump` file: the
   tables were copied inside the database into schema
   `backup_release_20261107` (32 tables, 3 accounts, 25 attempts, and a copy
   of the 5-row ledger), through the Supabase connector. Restore from it with
   `insert ... select` per table; drop it 30 days after the deploy
   (see Cleanup).
2. **Ledger baseline and 027a-028 (2026-11-07).** The baseline recorded
   001-027 (27 rows), then 027a, 027b, 027c and 028 were applied, through the
   Supabase connector. All additive; the live c3e13ab code was unaffected.
3. **029-054 (04:33).** GitHub Actions, "Migrate production database"
   (run 42445625782, attempt 5), from the release head 04246c7: 31 files
   applied, `--status` "Schema is current", "every stored level matches
   mastery_from_attempts()", five rollback backups present, JIT off.
4. **Backend (04:35).** PR #40 merged to master as 4080462; Vercel built and
   promoted it. `/api/health` answered `{"status":"ok","schema":"current"}`.
5. **Seed and recompute.** GitHub Actions, run 42447459047 on
   `ops/post-deploy-production`, 04:36-04:58: seed complete in 21.6 minutes (all courses updated, the 80 authored labs loaded: AWSSAA 10, PMP 9, NCLEXRN 14, NASMCPT 11, CCRN Adult/Peds/Neo 12 each); `recompute_mastery_batched` checked 8 of 8 pairs, 0 rows changed; `--status` current, every stored level matches.
6. **Still to do:** the in-app checks in step 6 and the mobile store build.

What went wrong on the way, so the next deploy avoids it:

- **The database password was reset during the window** (Supabase ->
  Database -> Settings), because Vercel's `DATABASE_URL` is a "Sensitive"
  variable and its value can never be read back. Resetting it broke the live
  app (`password authentication failed for user "postgres"`) for about
  15 minutes, until `DATABASE_URL` in Vercel held the new string and the
  c3e13ab deployment was redeployed to pick it up. A password with symbols
  (`@ # / ? % :`) breaks a connection URL unless percent-encoded; use letters
  and digits only.
- **The GitHub secret was first saved as `PROD_DATABSE_URL`** (typo); the
  workflow then saw an empty value and stopped at its first step, before
  touching the database. GitHub cannot rename a secret: create the right
  name and delete the wrong one.

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
| 025, 026, 027 | line B (REQ-089, REQ-092, REQ-093): `*_choice_feedback`, RLS lock-out, legal_acceptances and lesson reports. **Already in production**; the ledger baseline (release step 2) records them | -- | -- | -- |
| 027a, 027b, 027c, 028 | line A's lesson positions, chat message ids, per-learner lessons and claims, AI call log (were 025-028 on integration/all) | instant at production's size | no | new tables, two partial unique indexes |
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
| 042 | item flags and quality, `attempts.voided_at` (REQ-114) | 0.8 s | no | (too short to sample) |
| 043 | `ai_calls (user_id, created_at)` index for the daily AI budget (REQ-115) | not timed on the fixture | no | builds an index on `ai_calls`; on a large table use CREATE INDEX CONCURRENTLY by hand first |
| 044 | auth hardening columns and two `auth_events` indexes (REQ-116); apply BEFORE the backend deploy (see below) | not timed on the fixture | no | builds indexes on `auth_events` |
| 045 | Audit 3 mastery rule, `review_state()`, `grading_claims`, two partial indexes on attempts (REQ-117) | 3.7 s | no | reads ≤ 13 ms; attempt inserts waited up to 2.5 s while the indexes built |
| **045b** | backup to `mastery_backup_045`, recompute under 045 | **370 s** | **yes** | ≤ 54 ms / ≤ 770 ms, none failed |
| 046 | nine performance indexes (REQ-118). **Build them CONCURRENTLY first** (step 1a); then the migration only records the file | under 1 s after step 1a (6 s of index builds on the fixture) | no, after step 1a | a plain build blocks attempt inserts while it runs |
| 047 | `exam_session_items.save_seq` (REQ-113, ordered exam saves); NOT NULL with a constant default, catalog-only | not timed on the fixture | no | (instant ACCESS EXCLUSIVE, 5 s lock_timeout) |
| 048 | REQ-119: `terms_acceptances`, `learner_onboarding` (existing accounts marked past first run), `learner_events` with AFTER triggers on attempts, lesson_progress, review_sessions, exam_sessions, placement_checks, and `exam_outcomes` | not timed on the fixture (one insert per account for the backfill) | no | (instant SHARE ROW EXCLUSIVE per trigger, 5 s lock_timeout) |
| 049 | REQ-122: paid tiers, built but off -- `entitlements`, `billing_events`, `free_course_choice`, `allowance_uses` (four new tables, nothing existing altered). Apply BEFORE the backend deploy: the account export reads these tables, and `/api/health` probes them, even while `BILLING_ENABLED` is off (docs/billing.md) | not timed on the fixture (empty tables, no backfill) | no | (new tables only, 5 s lock_timeout) |
| 050 | REQ-123: verifiable labs -- `labs`, `lab_runs`, `lab_run_steps`, attempt kind `labtask`, assessment types `lab_build` / `lab_case`, `attempts.lab_id` (no foreign key) with a NOT VALID check, the `lab` item kind. No rule change, no recompute. See "Migration 050" below | not timed on the fixture (new tables; one partial index on attempts) | no, if its index is built CONCURRENTLY first | the partial index `idx_attempts_user_lab` blocks attempt inserts while it builds inside the migration; build it first (below) and the migration skips it |
| (REQ-124, no migration) | Plans and labs combined with Nick's decisions: no schema change -- a downgrade's kept paid period is an extra `entitlements` row (`external_id` `held:...`); 80 authored labs come from `npm run seed` (22 new CCRN Pediatric and Neonatal labs, all `needs_expert_review`). Deploy after 049 and 050. With `BILLING_ENABLED` off nothing a learner sees changes except that labs on clinical and fitness courses are never served unreviewed, even with `LABS_SERVE_UNREVIEWED` on, and a first-try lab run now moves the objective's review schedule. At switch-on run `npm run billing:grant -- --launch-comp` (dry run), then `--apply` (docs/billing.md, "Turning it on") | not applicable | no | none |
| 051 | REQ-125: `lab_disclaimer_acknowledgements` (learner, family `clinical`/`fitness`, version, time; on delete cascade) -- the one-time practice-lab disclaimer acknowledgement before a learner's first clinical or fitness lab. One new empty table, additive. Deploy with the backend that reads it: from this backend on, unreviewed labs are served by default in every subject (`LABS_SERVE_UNREVIEWED` defaults on; set it `off` to keep serving approved labs only), and starting a clinical or fitness lab returns 403 until the learner accepts the disclaimer. Schema probe `051_lab_disclaimer_ack.sql` in `lib/schema-status.ts` | instant (empty table) | no | none |
| 052 | Release 2026-11-07 reconcile (REQ-138): `legal_acceptances.source`, `terms_acceptances` folded in and dropped, `*_choice_feedback` folded into `*_option_reasons` and dropped, RLS on and anon/authenticated stripped for every table | instant at production's size | no | catalog changes and a few rows |
| 053 | REQ-096 (#12, was 028 on its branch): attempt format `lab` for the Try it self-report | instant | no | enum value |
| 054 | REQ-140: `app_users.whats_new_seen_id` (nullable, no default, no rewrite) -- the newest "What's new" note each learner dismissed. Apply BEFORE the backend deploy: sign-up writes it. Existing accounts start NULL and see the newest note once | instant | no | instant ACCESS EXCLUSIVE on app_users (5 s lock_timeout) |
| 055 | REQ-143: `content_review_queue` (new table, RLS on) with a one-open-entry-per-item-and-signal unique index, and the detection thresholds as `signal_*` rows in `item_quality_params`. Apply BEFORE the backend deploy: the daily `/api/cron/content-signals` writes it and `/api/health` probes it. Nothing is backfilled. Also `attempts_answered_created`, the job's partial date index on attempts: **build it CONCURRENTLY first** ([operations-runbook.md](operations-runbook.md), "055 attempts index"); then the migration only records it | instant after the concurrent build (2.7 s build on a 3M-attempt fixture) | no, after the concurrent build | a plain build blocks attempt inserts while it runs |
| 056 | REQ-144: `account_access` (unrestricted-access grants: email, account, granted by, until, note, revoked) and `account_access_events` (audit trail), RLS on. Additive; apply BEFORE the backend deploy: `/api/auth/me` and the gating helpers read it, and `/api/health` probes it. Merge after #44 (055) | instant (empty tables) | no | none |
| 057 | REQ-164: the Cloud Native & Kubernetes category and its `cncf-certifications`, `container-tooling` and `red-hat-openshift` subcategories (upserts into education_categories and education_subcategories, same shape as 019). Apply BEFORE `npm run seed`: the containers and Kubernetes tracks resolve `container-tooling` / `cncf-certifications` / `red-hat-openshift` by slug and the seed fails without them. Nothing is backfilled | instant | no | taxonomy rows only |
| 058 | REQ-166: `verified_discounts` (only the result of a group verification: account, group, provider, verified, expires, the provider's opaque subject id) and `discount_offer_codes` (the App Store one-time offer-code pool), RLS on. Additive; apply BEFORE the backend deploy: the account export reads both and `/api/health` probes them, even while `VERIFIED_DISCOUNTS_ENABLED` is off. 057 is the Kubernetes taxonomy migration (#66); either order applies cleanly | instant (empty tables) | no | none |
| 059 | REQ-165: widens the `legal_acceptances` document check to add `study_notice` (named `legal_acceptances_document_059`, added NOT VALID then validated). Apply BEFORE the backend deploy: the launch flow records the notice and `/api/health` probes the constraint. Nothing is backfilled | instant | no | ACCESS EXCLUSIVE on legal_acceptances for the constraint swap only (5 s lock_timeout) |
| 060 | REQ-169/REQ-170: `learner_intake` and `learner_intake_targets` (the study-profile answers: goal, experience, weekly hours, use; up to five courses with exam dates), and two nullable columns `entitlements.family` / `entitlements.scope` (which category plan a subscription is for; null = every course, as for grants), RLS on. Additive; apply BEFORE the backend deploy: the first run and Settings > Study profile write the intake tables whatever `BILLING_ENABLED` says, the account export reads both, and `/api/health` probes them. 059 (study notice, #67) and 061/062 (reserved) are independent; any order applies cleanly | instant (empty tables; two ADD COLUMN without defaults) | no | instant ACCESS EXCLUSIVE on entitlements for the ADD COLUMNs (5 s lock_timeout; the table is empty while billing is off) |
| 061 | REQ-174: the `emergency-medical-services` subcategory under Healthcare & Nursing (one upsert into education_subcategories, same shape as 020). Apply BEFORE `npm run seed`: the NREMT tracks (EMR, EMT, AEMT, Paramedic) resolve it by slug and the seed fails without it; `/api/health` probes it. 060 (#73, pricing) and 062 (#64, sim engine) are other branches' numbers; any order applies cleanly. Nothing is backfilled | instant | no | taxonomy row only |
| 062 | REQ-190: sim engine -- `sims`, `sim_versions`, `sim_reviews`, `sim_runs`, `sim_run_commands`, `sim_run_reasoning`, attempt kind `simtask`, assessment type `sim_run` (family `simulation`, weight 1.5), `attempts.sim_id` (no foreign key) with the NOT VALID check `attempts_simtask_shape`, RLS on the new tables. No rule change, no recompute. Idempotent; rollback notes in its header. Apply before a backend that serves sims; `/api/health` probes it. `npm run seed` then loads the sims | not timed on the fixture (new tables; one partial index on attempts) | no, if its index is built CONCURRENTLY first: `create index concurrently if not exists idx_attempts_user_sim on attempts (user_id, sim_id) where sim_id is not null;` | the partial index `idx_attempts_user_sim` blocks attempt inserts while it builds inside the migration |
| 063 | REQ-197: `email_preferences` (one row per learner once they change a switch: `exam_changes` default true, `exam_countdown` default true, `weekly_digest` default false, `updated_at`; `user_id` PK, on delete cascade) and `service_email_log` (learner, `kind` in exam_change/exam_countdown/weekly_digest, `period_key`, `status` sending/sent/failed, `attempts`, `created_at`, `sent_at`; unique (`user_id`, `kind`, `period_key`) is the once-per-period guard; on delete cascade). RLS on, anon/authenticated revoked. Additive, safe to run twice. Apply BEFORE the backend deploy: Settings > Email, the unsubscribe links, the account export and `/api/health` read them. 060-062 are taken by other branches; 063 applies cleanly before or after them. The daily `/api/cron/service-emails` (16:10 UTC, `CRON_SECRET`) does nothing until `SERVICE_EMAILS_ENABLED=true`, which ships with the Privacy Policy update; the digest also needs `MAIL_POSTAL_ADDRESS` and `DIGEST_EMAIL_FROM`. Rollback: Vercel Instant Rollback; the tables can stay (older code ignores them). To remove them, `drop table if exists service_email_log, email_preferences;` in the same change that removes the 063 probe from `lib/schema-status.ts` (also listed in `scripts/rollback-release-2026-11-07.sql` step 4) | instant (empty tables) | no | none |
| 065 | REQ-194: `subject_tracks.hidden_at` (nullable timestamptz, no default, no rewrite, column comment gives the reason). A course whose `hidden_at` has passed is not listed by `GET /api/courses` and can't be newly started (free-course pick, new study session, first-run pick, setting a plan); learners with activity on it keep it. Apply BEFORE the backend deploy: the course list and start routes read it and `/api/health` probes it; the seed refuses to run without it. Nothing is backfilled: `npm run seed` sets it on EX188, EX280 and DCA. Safe to run twice (`add column if not exists`). The number 065 was assigned for this branch; 060-064 are not in this tree | instant | no | instant ACCESS EXCLUSIVE on subject_tracks (5 s lock_timeout) |
| 067 | REQ-199: "Report a problem" on a sim -- adds `sim` to the item_kind checks on `item_flags`, `item_status` and `item_holdbacks` (replaced by `*_item_kind_067`, added NOT VALID then validated) and the nullable `item_flags.context` jsonb (at most 2000 bytes, check `item_flags_context_067`) for the report's machine data. A sim report's item id is the `sim_versions.id`, so a pulled report takes that version out of rotation. Number 067 because 066 is held for the PT study-path work. Apply BEFORE a backend that serves sims with reporting; `/api/health` probes it. Idempotent; rollback notes in its header | instant (small tables) | no | ACCESS EXCLUSIVE on item_flags, item_status and item_holdbacks for the check swap and validation (5 s lock_timeout) |
| 077 | REQ-224: the `mental-health` category with `psychology-licensure`, `counseling-licensure` and `social-work-licensure` subcategories (upserts, same shape as 057), and `mature_content_confirmations` (per account, category and notice version: confirmed_at, min_age 18, source; PK led by user_id, cascade on account delete, RLS on, ends with `select app_runtime_sync();`). Apply BEFORE the backend deploy and BEFORE `npm run seed`: the EPPP track needs the subcategory, the mental-health course routes read the table, and `/api/health` probes both. Safe to run twice | instant | no | none beyond a new table (5 s lock_timeout) |
| 078 | REQ-252: `learner_course_profiles` (per learner and course: the goal answer, the level new/some/experienced and its source, answered_at), `learner_unit_levels` (optional per-unit level, source self/auto), `learner_level_changes` (each change with what it replaced, seen_at and undone_at, for the notice and Undo), `subject_tracks.level_flow` (default false; set true here for the catalog PYTHON and JAVASCRIPT tracks, and by the seed for tracks marked `levelFlow`), and `learner_events.detail` (jsonb, at most 400 bytes) with the phase 1 lesson events added to the event check (replaced by `learner_events_event_078`, NOT VALID then validated). Every new table is led by user_id, cascades on account and course delete, ends with `select app_runtime_sync();`. Apply BEFORE the backend deploy: the level routes and the lesson event route read them, `/api/health` probes them, and the seed sets `level_flow`. Safe to run twice. Widen the pilot later with `update subject_tracks set level_flow = true where user_id is null and code = '...';` | instant (empty tables; validating the check scans learner_events once) | no | instant ACCESS EXCLUSIVE on subject_tracks and learner_events for the ADD COLUMNs and the constraint swap (5 s lock_timeout) |
| 079 | REQ-253: `lesson_primers` (one shared row per objective: terms jsonb of 1 to 12, source_lesson_hash sha256 hex, model, generated_at; cascade on objective delete; RLS on, API roles revoked, ends with `select app_runtime_sync();`) and `item_holdbacks_item_kind_067` restated under the same name with 'primer' added (NOT VALID, then validated; FAIL-1720). Independent of 078. Apply BEFORE the backend deploy: GET /api/objectives/:id/primer reads and writes the table and `/api/health` probes it. Safe to run twice | instant | no | brief lock on item_holdbacks to swap the check (5 s lock_timeout) |
| 080 | REQ-256: `learner_events_event_078` restated under the same name with four more events (`guess_matched`, `level_down_suggested`, `level_down_declined`, `goal_card_shown`), and `learner_level_changes_reason_check` restated under the same name with 'suggested' added (both NOT VALID, then validated; same names so a replay of 078 keeps them, FAIL-1793). No table, column or function, so no `app_runtime_sync()`. Needs 078. Apply BEFORE the backend deploy: the level check, `POST /api/courses/:id/level/suggestion`, `POST /api/courses/:id/level/goal-card` and the guess-feedback route write these values (a write before 080 fails its check), and `/api/health` probes 080. Safe to run twice | instant (one scan of learner_events and of learner_level_changes to validate) | no | brief ACCESS EXCLUSIVE on learner_events and learner_level_changes for the swap (5 s lock_timeout) |

All of 029 through 041b on the fixture: about 8.5 minutes, nearly all of it
029b, 031b and 041b; 042 to 045b add about 6.3 minutes.

No read or insert failed or timed out at any point. On
the fixture 041b changed no level (its history has only lesson answers, which
041 scores as 031 did); on production it changes the levels of learners with
unit checks, Quiz me, placement or comparison-card answers.

045 and 045b (REQ-117) were measured on the same fixture plus two heavy
learners (5,000 and 26,000 attempts on a 259-objective course, a tenth of
them PBQs and unit checks) with the same probe running. 045 builds two
partial indexes on attempts inside its transaction: reads go on, and an
attempt insert waits while they build (up to 2.5 s on the fixture; scale with
the size of attempts). 045b changes many levels on real data -- on the
fixture 102,622 of 320,523 rows, mostly Guided to Independent (the old
fixture history is all repeats of two Solo items, which 045 no longer
counts as wrong) and Needs review to Guided (Needs review now needs answers
on two different days) -- so its row locks cover most graded pairs until it
commits: keep the quiet window. The 045 rule is also what makes heavy
learners fast again (perf audit HIGH-2): one objective for the
26,000-attempt learner took 6.8 s under 041 and 15 ms under 045 (5,000
attempts: 335 ms -> 12 ms). Measured on 2026-11-07 with nothing else
running; a first run while other load shared the machine took 428 s for
045b (reads ≤ 32 ms, inserts ≤ 844 ms, none failed).

**Why the recomputing `b` files (029b, 031b, 041b, 045b) need a quiet window.** Each is one transaction. It
holds a row lock on every mastery row it changes until it commits, so a grade
of one of those (learner, objective) pairs waits until the end -- up to the
whole file's run time. Reads of every table, and inserts, are not blocked
(measured above). Rows already equal to the rule are skipped before any lock,
so a re-run locks nothing. The schema files hold ACCESS EXCLUSIVE only for an
instant and give up after `lock_timeout` 5 s rather than queue reads behind a
long query: if one fails on a lock timeout, run `--all` again.

## Forward order (integration/all before the merge; the release follows the section above)

1. **Check the starting point.** `npm run migrate -- --status`. Expect the
   files above (from wherever production is) to be listed as missing, and
   nothing else.

1a. **Build 046's indexes without blocking writes** (any time before step
   2, no quiet window needed): run the `create index concurrently` statements
   in [operations-runbook.md](operations-runbook.md), "046 indexes without
   blocking writes", over the direct connection. While there, run
   `show jit;` and follow that page's "Postgres settings" if it says `on`.
   For a release that carries 055, build its attempts index the same way
   ("055 attempts index" on that page).

2. **Apply every migration** in the quiet window:
   `npm run migrate -- --all`
   About 15 minutes on the fixture; scale with your attempt count. 044 and
   047 must be in before the backend deploys (every signed-in route reads
   044's column; exam saves read 047's).

3. **Deploy the backend** straight after (merge the release; Vercel deploys
   `master`). Keep the gap short. Until it is live the old backend is still
   grading with its own rules (029 header, "The deploy gap"); step 4
   re-derives anything it writes.

4. **Run the batched recompute once the new backend is serving:**
   `psql "$DATABASE_URL" -c "call recompute_mastery_batched();"`
   Outside a transaction block (it commits every 500 pairs). It takes the
   grader's per-pair lock, so it never overwrites a grade made while it runs,
   and skips rows already current. Fixture: 131 s for 320,004 pairs with one
   row changing (after 045b: 150 s for 320,523 pairs, 1 changed). Safe to stop and run again. This one call covers 029, 031,
   041 and 045: they all recompute through `mastery_from_attempts()`, which is
   045's rule by now, and since 041 `mastery_pairs()` also visits pairs that
   only have exam, review or comparison-card answers.

5. **Publish the app update.** This release needs a **store build**, not an
   over-the-air update: REQ-119 added a native module (`expo-notifications`),
   and `runtimeVersion` uses the fingerprint policy (the mastery runbook
   explains it), so `eas update` cannot reach installed binaries.
   `cd mobile && npm ci && npx eas build --platform all --profile production`,
   then submit. Until learners install it, the old app runs against the new
   backend. Known and accepted for that window:
   - the mobile fixes (ordered exam saves, per-part unit checks, terms
     prompt, first run, reminders, Report a problem) aren't on their phones;
   - a learner with nothing new left sees a plan step labelled
     "undefined: <title>" (the new `stretch` step kind); tapping it still
     opens the lesson;
   - the error-log list shows at most 200 entries per page.
   Every old-app request keeps working: the backend changes are additive.

6. **Verify.**
   - `GET /api/health` answers 200.
   - `npm run migrate -- --status` prints "Schema is current" and "Mastery vs.
     rule: every stored level matches mastery_from_attempts()". A handful of
     differing rows right after step 4 are grades in flight; a large number
     means step 4 did not finish -- run it again.
   - In the app: a lesson check, Today's review, a practice exam sprint, a
     comparison card and "Quiz me" each record an answer; the study plan's
     mock-exam step opens Practice exam.

## Rollback order (reverse; for the release, step 7 above)

1. **App first.** Roll the OTA back (`npx eas update:rollback`, or republish
   the previous update group). The new app cannot grade against an old
   backend.
2. **Backend.** Vercel "Instant Rollback" to the previous production
   deployment.
3. **Mastery levels, only if you are returning to older rules.** Restore
   newest first, each only together with putting that file's predecessor rule
   back, because the next graded answer recomputes from whatever rule is
   installed:
   - to undo 045: re-run section 3 of `041_mastery_rule_integration.sql`
     (041's `mastery_detail`), then the `do $$` block at the end of
     `042_item_quality.sql` (it re-adds the voided-answer filter), set the
     six tuning values back (`update mastery_model_params set value = ...`:
     assist_credit_hint 0.5, assist_credit_repeat 0.25, independent_accuracy
     0.60, transfer_accuracy 0.75, transfer_min_gap_hours 24,
     recency_half_life_days 60), then the RESTORE block in the
     `045b_mastery_honesty_backfill.sql` header. Deploy the previous backend
     first: the REQ-117 code reads `review_state()` and the 045 tuning rows,
     which stay installed and are harmless to the old code;
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
drop table if exists mastery_backup_045;   -- probe: 045b_mastery_honesty_backfill.sql
drop schema if exists backup_release_20261107 cascade;   -- the pre-release copy (no probe); REQ-168's weekly job drops it on 2026-12-08
```

Confirmed by the 2026-11-07 release: production's size (3 accounts, ~25
attempts, so every step took seconds except the seed), and that the Vercel
Git integration builds and promotes master on merge. Still not verified:
Supabase's SQL editor with `CALL` and internal commits (use psql or the
workflow).

## Routine deploys (after 2026-11-07)

The production ledger is now complete, so an update only applies what is
new. Three steps, all from GitHub, no laptop and no database password:

1. **Migrations first** (only if the release adds files under
   `backend/supabase/migrations/`): push the release commit to
   `ops/migrate-production`:
   `git push origin <release-commit>:refs/heads/ops/migrate-production --force`.
   The "Migrate production database" workflow shows `--status`, applies
   `--all`, and shows `--status` again; it must end "Schema is current".
   Every migration must keep the live code working (additive), because the
   old backend runs on the new schema until step 2 finishes.
2. **Deploy**: merge the release PR into master. Vercel builds and promotes
   it; check `/api/health` answers `"schema":"current"`.
3. **After the deploy** (only if the seed or the mastery rule changed): push
   the same commit to `ops/post-deploy-production`. The workflow repeats
   step 1 (a no-op), then runs `npm run seed`, `call
   recompute_mastery_batched()` and `--status`. The seed takes 15+
   minutes from GitHub (network round trips); it is safe to re-run.

Both branches only trigger the workflow; nothing merges them.

### Per batch, as run for releases 2026-11-10 and 2026-11-11

A release is cut into batches, one pull request each, shipped in order.
For every batch:

1. **Release branch.** The batch's work is merged into the release branch
   (for example `release/2026-11-11`); CI must be green on its head.
2. **`ops/migrate-production`** (only if the batch adds a migration): push
   the release branch head, approve the run once the reviewer gate exists,
   and wait for "Schema is current".
3. **Merge the PR** into `master` with a merge commit (not squash), so the
   release head stays an ancestor of `master`. Vercel deploys; check
   `/api/health` answers `"status":"ok","schema":"current"` and the new
   `commit`.
4. **`ops/post-deploy-production`** (only if the seed or the mastery rule
   changed): push the merge commit on `master`. It re-runs migrate (a
   no-op), then the seed and the mastery recompute.

The release notes list which batches needed steps 2 and 4
([release-2026-11-10.md](release-2026-11-10.md),
[release-2026-11-11.md](release-2026-11-11.md)).

**Pushing the ops branches.** Until the `protect-ops` ruleset exists the
`--force` form above works. Once it exists (lockdown guide step 1.4), force
pushes are blocked: push without `--force`,
`git push origin <commit>:refs/heads/ops/migrate-production`. That is a
fast-forward whenever `<commit>` descends from the branch's last commit,
which holds when you deploy forward from `master` with merge commits (on
2026-11-11 both ops branches pointed at ancestors of `master`). If a push is
refused as non-fast-forward, push a newer commit that contains the old one;
don't disable the ruleset.

### Where the database secret lives

The workflows read **`PROD_DATABASE_URL`** from the GitHub environment
`production-database` (migrate, seed, lesson fixes, pre-generation) or
`production-backup` (nightly backup, weekly clean-up), since the
2026-11-10 lockdown ([ops/2026-11-10-lockdown-and-db-rotation.md](ops/2026-11-10-lockdown-and-db-rotation.md)).
Both hold the Session pooler URI (port 5432). Vercel's `DATABASE_URL` holds
the Transaction pooler URI (port 6543) with the same password. The old
repository-level `PROD_DATABASE_URL` still exists until lockdown step 4
deletes it.

When the password changes, update all three, then redeploy the current
production deployment in Vercel so it picks the new value up -- the live
app is down from the reset until that redeploy is Ready. Vercel's Sensitive
variables cannot be read back, so Supabase and the password manager are the
only places to get the string again.

Rollback stays as in step 7 above: Vercel Instant Rollback for code,
migrations are additive so the database can stay.

### Release backups: kept 30 days (REQ-168)

A release backup taken inside the database is either a table
`public.backup_release_YYYYMMDD` or a whole schema `backup_release_YYYYMMDD`
(the date the backup was taken, UTC; the 2026-11-07 backup is the schema
`backup_release_20261107`, 32 tables). It is kept 30 days and dropped within
7 days after that by the "Release backup housekeeping" workflow
(`.github/workflows/backup-housekeeping.yml`), which runs
`npm run backups:housekeeping -- --apply` every Tuesday at 09:17 UTC with
the same `PROD_DATABASE_URL` secret and `production-database` environment as
the migrate workflow. `backup_release_20261107` is dropped by the run on
Tuesday 2026-12-08; the runs before it keep it.

- It drops a backup only if its name is exactly `backup_release_` plus 8
  digits (a table must be in `public`), the digits are a real date, and that
  date is more than 30 days before the run date (UTC). Exactly 30 days old
  is kept; a future date is kept. Everything else -- `mastery_backup_*`,
  `error_log_backup_*`, `backup_release_20261107_old`, a malformed date, a
  backup-named table in another schema -- is never touched.
- Tables are dropped without `CASCADE`. A matching schema is dropped with
  `DROP SCHEMA ... CASCADE` after each of its tables is logged with its row
  count. If anything outside the schema depends on it (a view, a foreign
  key), the schema is refused, left in place, and the run fails so it shows
  red in Actions.
- Each backup it drops (or would drop) is logged with its date, age and row
  counts. Nothing else is printed.
- To see what the next run will do, run the workflow by hand from the
  Actions tab: `dry_run` is ticked by default and drops nothing. Untick it
  to drop now. Locally: `npm run backups:housekeeping` (dry run) or
  `-- --apply`.
- A backup you still need past 30 days: rename it out of the pattern before
  the next Tuesday run (for example `alter schema backup_release_20261201
  rename to keep_backup_release_20261201;`).
- The Supabase advisor lists the 32 tables in `backup_release_20261107` as
  "RLS disabled". Checked on production 2026-11-09: `anon`, `authenticated`,
  `authenticator` and `service_role` have no `USAGE` on the schema and no
  grants on its tables, so they are not reachable through the API; the flag
  is a false positive.

## Migration 050: verifiable labs (REQ-123)

Additive: no mastery rule change and no backfill, so nothing to recompute
and nothing to restore. Before applying it on a large `attempts` table, build
its one index without blocking writes (over the direct connection, outside a
transaction):

```sql
create index concurrently if not exists idx_attempts_user_lab
  on attempts (user_id, lab_id) where lab_id is not null;
```

The migration's `create index if not exists` then does nothing. A later
quiet moment can run `alter table attempts validate constraint
attempts_labtask_shape;` (nothing old can fail it).

**Unreviewed labs are served, with a disclaimer (REQ-125).** Every pilot
lab is seeded as `needs_expert_review`. Since REQ-125 the backend serves
them by default, in every subject, with an "Awaiting expert review" badge and
the practice-lab disclaimer; clinical and fitness labs need a one-time
acknowledgement (migration 051). Set `LABS_SERVE_UNREVIEWED=off` to serve
only `approved` labs again (takes effect without an app update). Approve a
lab after a subject expert has read it
(docs/labs.md, "Expert review before launch"):

```sql
update labs set review_status = 'approved', reviewed_by = '<name, credential>', reviewed_at = now(), review_note = '<what was checked>'
 where id = '<lab id>';
```

A seed run that changes an approved lab's content sends it back to
`needs_expert_review` by itself.

Rollback: deploy the previous backend; the tables, the enum value and the
assessment types stay and are ignored by older code. Lab answers already
recorded keep counting toward mastery under the current rule (they carry an
`assessment_type`); to stop that, set `cognitive_weight = 0` on `lab_build`
and `lab_case` and run `call recompute_mastery_batched();`.

## Migration 044: auth hardening (REQ-116, audit 3 security)

`044_auth_hardening.sql` is additive: `app_users.token_version` (integer,
default 0) and `totp_pending_reauth_at`, three columns and a partial unique
index on `email_change_tokens`, `email_verification_tokens.set_password`, and
two indexes on `auth_events` (`user_id`, `created_at`). Columns with a
constant default don't rewrite the table on Postgres 11+; the two
`auth_events` indexes are built without CONCURRENTLY, so they block writes to
`auth_events` (sign-ins, rate limits) for the build -- seconds at most on a
table the new retention purge keeps to 90 days, but run it in the same quiet
window. Not measured on the 1.9M-attempt fixture (it has no auth_events
volume); on the local test database it applies in well under a second.

**Order matters.** Apply 044 BEFORE deploying the backend: `requireUser`
reads `app_users.token_version` on every signed-in request, so code ahead of
the migration fails every authenticated route (`/api/health` reports the 044
probe). Tokens issued before the deploy carry no version and count as 0, so
nobody is signed out by it.

Before the deploy:

1. Set `CRON_SECRET` in the Vercel project's environment variables (a long
   random value). `vercel.json` now schedules `GET /api/cron/purge-auth-data`
   daily at 09:30 UTC; Vercel sends `Authorization: Bearer $CRON_SECRET`.
   Without it the route answers 503 and nothing is purged.
2. Check no secret in Vercel still has its `backend/.env.example`
   placeholder value: in production the server now refuses to start if one
   does (`instrumentation.ts`, `lib/env-check.ts`).
3. If the Expo web preview is ever pointed at the production backend from
   `http://localhost:8081`, add that origin to `ALLOWED_ORIGINS`: it is no
   longer a production default.

Rollback: the previous backend ignores every 044 object, so roll the code
back first and leave the schema. To drop it afterwards:

```sql
alter table app_users drop column if exists token_version, drop column if exists totp_pending_reauth_at;
alter table email_change_tokens drop column if exists cancel_token_hash, drop column if exists token_version,
  drop column if exists cancelled_at;
alter table email_verification_tokens drop column if exists set_password;
drop index if exists idx_auth_events_user;
drop index if exists idx_auth_events_created;
```
