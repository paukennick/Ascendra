-- REQ-097, part 2 of 029: back up mastery and review state, backfill the new
-- columns from history, and recompute every learner's mastery under the rule
-- in 029_mastery_recompute.sql. Read that header first. Deploy and rollback
-- order: docs/deploy-runbook-mastery.md (after deploying the backend, run
-- `call recompute_mastery_batched();`).
--
-- RUN IT IN A QUIET WINDOW (low traffic), straight before the backend deploy
-- (FAIL-181: the lock description and timing below were re-measured).
--
-- LOCKING. Kept apart from 029 so the slow part holds no lock that blocks
-- reads. The runner (supabase/apply-migration.ts) sorts file names and
-- applies each file in its own transaction, so this runs straight after 029
-- ('_' sorts before 'b') and before 030, and is recorded in
-- schema_migrations as 029b_mastery_backfill.sql. /api/health and
-- `npm run migrate -- --status` report it missing until mastery_backup_029
-- exists (FAIL-119). Being one transaction, it cannot commit in batches; what
-- it holds until it commits:
--   - attempts, error_log: ROW EXCLUSIVE and row locks on the rows the
--     backfills update. Reads of every table, and inserts, are not blocked.
--   - mastery: a row lock on every row whose level, score or evidence text
--     changes. Rows already equal to the rule are skipped before any lock
--     (FAIL-180). On the FIRST run on real data that is still nearly every
--     row with graded history: the evidence text is new, so every row the old
--     code wrote differs. A grade of a locked pair waits until this commits
--     (the new grader takes the pair's advisory lock, released per pair here,
--     then waits on the row). The old code, still live during this run, does
--     not take the advisory lock; a grade it writes in this window is
--     re-derived by the batched recompute after the deploy.
-- Measured on a 1.9M-attempt / 320k-mastery fixture (local Postgres 16), every
-- mastery row needing a change: 58 s in all (the recompute about half of it).
-- Concurrent reads of attempts, error_log and mastery answered in 21 ms or
-- less, attempt and review-entry inserts in 135 ms or less; a write to a
-- mastery row the run had already changed waited until the commit (a 30 s
-- statement timeout fired once). A re-run changes and locks nothing. Before
-- the split, 029 took 44 s holding ACCESS EXCLUSIVE on attempts, and those
-- reads timed out.
--
-- ORDER OF WORK, and why it is safe to run twice:
--   1. BACKUP of mastery and review state, before anything changes. One row
--      per mastery / error_log row, ON CONFLICT DO NOTHING: a second run never
--      overwrites the original values (rows created after the first run are
--      added with their state at the second run). Backup rows go with the
--      account: user_id references app_users ON DELETE CASCADE.
--   2. backfill attempts.assisted from history (only rows not yet classified)
--      and error_log.pbq_scenario_id (only rows still null). The rule no
--      longer depends on this backfill (it reads repeats from history); it
--      keeps the stored flag, which a replayed grade returns, truthful.
--   3. recompute mastery; a row is only rewritten when its status, score or
--      evidence differs, so a second run changes nothing. Rows with no graded
--      evidence (self-set levels, rows whose only evidence was a PBQ) become
--      Not started. Rows the recompute creates (graded attempts but no
--      mastery row before) are then recorded in the backup with
--      created_by_029 = true, so the restore can remove them.
-- Review entries (error_log) are backed up but not changed, and the restore
-- leaves them alone: this migration doesn't alter review state, so putting
-- the backup back would only rewind "Got it" taps made since.
--
-- What history cannot show: a pre-029 hint that was opened and then answered
-- in free response left no trace, so such answers stay unassisted.
--
-- RESTORE (puts mastery back to what it was just before this migration;
-- only meaningful together with rolling the code back, because the next
-- graded answer recomputes from the new rules -- runbook, "Rollback"). It
-- only touches rows whose updated_at is not later than their backed_up_at. A
-- row changed after the backup holds real progress (a graded answer, or a
-- later recompute) and is left as it is. Rows the recompute created are
-- deleted if untouched since, which reads as Not started, as before.
-- Each statement below is complete on its own: safe to run one at a time (in
-- either order), to stop between them, and to run again. Rows that already
-- hold the backed-up values are skipped (FAIL-185).
--
--   begin;
--   update mastery m
--      set status = b.status, score_0_4 = b.score_0_4,
--          evidence = b.evidence, updated_at = b.updated_at
--     from mastery_backup_029 b
--    where b.mastery_id = m.id and not b.created_by_029
--      and m.updated_at <= b.backed_up_at
--      and (m.status, m.score_0_4, m.evidence, m.updated_at)
--          is distinct from (b.status, b.score_0_4, b.evidence, b.updated_at);
--   delete from mastery m
--    using mastery_backup_029 b
--    where b.mastery_id = m.id and b.created_by_029
--      and m.updated_at <= b.backed_up_at;
--   commit;
--
-- DROP THE BACKUPS after 30 days (by hand, never automatic; runbook step
-- "Cleanup"), once a rollback is no longer on the table:
--   drop table if exists mastery_backup_029;
--   drop table if exists error_log_backup_029;
-- Dropping them makes /api/health report 029b as missing; remove the
-- 029b probe in backend/lib/schema-status.ts in the same change.
--
-- To see whose level changed:
--   select b.user_id, b.objective_id, b.status as before, m.status as after
--     from mastery_backup_029 b join mastery m on m.id = b.mastery_id
--    where b.status is distinct from m.status;

-- 1. Backup, before any data changes ------------------------------------------

create table if not exists mastery_backup_029 (
    mastery_id uuid primary key,
    user_id uuid references app_users(id) on delete cascade,
    objective_id uuid,
    status mastery_status,          -- null when created_by_029
    score_0_4 int,
    evidence text,
    updated_at timestamptz,
    created_by_029 boolean not null default false,
    backed_up_at timestamptz not null default now()
);
create index if not exists idx_mastery_backup_029_user on mastery_backup_029(user_id);

insert into mastery_backup_029 (mastery_id, user_id, objective_id, status, score_0_4, evidence, updated_at)
select id, user_id, objective_id, status, score_0_4, evidence, updated_at from mastery
on conflict (mastery_id) do nothing;

create table if not exists error_log_backup_029 (
    error_log_id uuid primary key,
    user_id uuid references app_users(id) on delete cascade,
    review_stage int,
    next_review_at date,
    resolved boolean,
    backed_up_at timestamptz not null default now()
);
create index if not exists idx_error_log_backup_029_user on error_log_backup_029(user_id);

insert into error_log_backup_029 (error_log_id, user_id, review_stage, next_review_at, resolved)
select id, user_id, review_stage, next_review_at, resolved from error_log
on conflict (error_log_id) do nothing;

-- 2. Backfills ----------------------------------------------------------------

-- Multiple choice on the Solo step means the choices were on screen.
update attempts
   set assisted = true, assist_reason = 'hint'
 where kind = 'lesson' and stage = 'solo' and format = 'mc' and assist_reason is null;

-- A second (or later) answer to the same item, after the first had been graded
-- and its answer shown.
update attempts a
   set assisted = true, assist_reason = 'repeat'
 where a.kind = 'lesson' and a.stage in ('fade', 'solo') and a.objective_id is not null
   and a.assist_reason is null
   and exists (
     select 1 from attempts p
      where p.user_id = a.user_id and p.objective_id = a.objective_id
        and p.stage = a.stage and p.question = a.question
        and (p.created_at, p.id) < (a.created_at, a.id)
   );

update error_log e
   set pbq_scenario_id = a.pbq_scenario_id
  from attempts a
 where e.attempt_id = a.id and a.pbq_scenario_id is not null and e.pbq_scenario_id is null;

-- 3. Recompute ----------------------------------------------------------------

select recompute_mastery();

-- Rows the recompute just created: not in the backup, and written by this
-- transaction (now() is the transaction's start time, so another
-- transaction's write can't carry the same updated_at).
insert into mastery_backup_029 (mastery_id, user_id, objective_id, updated_at, created_by_029)
select m.id, m.user_id, m.objective_id, m.updated_at, true
  from mastery m
 where m.updated_at = now()
   and not exists (select 1 from mastery_backup_029 b where b.mastery_id = m.id)
on conflict (mastery_id) do nothing;
