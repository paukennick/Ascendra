-- REQ-097, part 2 of 029: back up mastery and review state, backfill the new
-- columns from history, and recompute every learner's mastery under the rule
-- in 029_mastery_recompute.sql. Read that header first, including the deploy
-- order: after deploying the code, run `select recompute_mastery()` once.
--
-- LOCKING. Kept apart from 029 so the slow part holds no lock that blocks
-- reads. The runner (supabase/apply-migration.ts) sorts file names and
-- applies each file in its own transaction, so this runs straight after 029
-- ('_' sorts before 'b') and before 030, and is recorded in
-- schema_migrations as 029b_mastery_backfill.sql. Being one transaction, it
-- cannot commit in batches; what it holds instead:
--   - attempts, error_log: ROW EXCLUSIVE and row locks on the rows it
--     updates. Reads of every table, and inserts, are not blocked.
--   - mastery: row locks on the rows the recompute changes; a live grade of
--     one of those pairs waits until this commits.
-- Measured on a 1.9M-attempt / 320k-mastery fixture (local Postgres 16):
-- about 52-61 s over two runs, with reads of attempts, error_log and mastery, and attempts
-- inserts, all answering within 0.5 s throughout. Before the split, 029 took
-- 44 s holding ACCESS EXCLUSIVE on attempts, and those reads timed out.
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
-- graded answer recomputes from the new rules). It only touches rows whose
-- updated_at is not later than their backed_up_at. A row changed after the
-- backup holds real progress (a graded answer, or a later recompute_mastery()
-- call) and is left as it is. Rows the recompute created are deleted if
-- untouched since, which reads as Not started, as before.
--
--   begin;
--   update mastery m
--      set status = b.status, score_0_4 = b.score_0_4,
--          evidence = b.evidence, updated_at = b.updated_at
--     from mastery_backup_029 b
--    where b.mastery_id = m.id and not b.created_by_029
--      and m.updated_at <= b.backed_up_at;
--   delete from mastery m
--    using mastery_backup_029 b
--    where b.mastery_id = m.id and b.created_by_029
--      and m.updated_at <= b.backed_up_at;
--   commit;
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
