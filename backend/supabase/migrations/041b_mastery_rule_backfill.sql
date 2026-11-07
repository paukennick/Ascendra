-- REQ-112, part 2 of 041: back up mastery, then recompute every learner
-- under the rule in 041_mastery_rule_integration.sql. Same pattern as 029b
-- and 031b; read the 041 header and docs/deploy-runbook-integration.md.
--
-- RUN IT IN A QUIET WINDOW, straight before the backend deploy.
--
-- LOCKING. Kept apart from 041 so the slow part holds no lock that blocks
-- reads. The runner applies each file in its own transaction, so this runs
-- straight after 041 ('_' sorts before 'b') and is recorded as
-- 041b_mastery_rule_backfill.sql. Being one transaction it cannot commit in
-- batches; what it holds until it commits:
--   - mastery: a row lock on each row whose level, score or evidence text
--     changes (unchanged rows are skipped before any lock, FAIL-180). Reads
--     are not blocked; a grade of a changed pair waits for the commit.
--   - attempts, error_log: only read.
-- recompute_mastery() takes the grader's per-pair advisory lock for each pair
-- it writes (FAIL-118), so a grade committed during the run is never
-- overwritten with an older level. After the deploy, run
-- `call recompute_mastery_batched();` once: it commits every 500 pairs and
-- re-derives anything the old backend wrote in the gap.
-- Measured on the 1.9M-attempt fixture: see the runbook.
--
-- ORDER OF WORK, and why it is safe to run twice:
--   1. mastery_backup_041, then a BACKUP of every mastery row (ON CONFLICT DO
--      NOTHING: a second run never overwrites the original values). Backup
--      rows go with the account (user_id ON DELETE CASCADE).
--   2. recompute_mastery(): rewrites only rows that differ, so a re-run on
--      the same day changes nothing.
--   3. rows the recompute created are recorded with created_by_041 = true so
--      the restore can remove them.
-- The existence of mastery_backup_041 is the sign this file ran (probe in
-- backend/lib/schema-status.ts).
--
-- RESTORE (only together with putting 031's mastery_detail / 029's
-- mastery_pairs back -- re-run section 3 of 031_weighted_mastery.sql and the
-- mastery_pairs definition in 029_mastery_recompute.sql -- because the next
-- graded answer recomputes from whatever rule is installed). It touches only
-- rows nobody has changed since the backup; each statement is complete on
-- its own and safe to run again:
--
--   begin;
--   update mastery m
--      set status = b.status, score_0_4 = b.score_0_4,
--          evidence = b.evidence, updated_at = b.updated_at
--     from mastery_backup_041 b
--    where b.mastery_id = m.id and not b.created_by_041
--      and m.updated_at <= b.backed_up_at
--      and (m.status, m.score_0_4, m.evidence, m.updated_at)
--          is distinct from (b.status, b.score_0_4, b.evidence, b.updated_at);
--   delete from mastery m
--    using mastery_backup_041 b
--    where b.mastery_id = m.id and b.created_by_041
--      and m.updated_at <= b.backed_up_at;
--   commit;
--
-- DROP THE BACKUP after 30 days, by hand, in the same change that removes
-- the 041b probe: drop table if exists mastery_backup_041;
--
-- To see whose level changed:
--   select b.user_id, b.objective_id, b.status as before, m.status as after
--     from mastery_backup_041 b join mastery m on m.id = b.mastery_id
--    where b.status is distinct from m.status;

-- 1. Backup ---------------------------------------------------------------------

create table if not exists mastery_backup_041 (
    mastery_id uuid primary key,
    user_id uuid references app_users(id) on delete cascade,
    objective_id uuid,
    status mastery_status,          -- null when created_by_041
    score_0_4 int,
    evidence text,
    updated_at timestamptz,
    created_by_041 boolean not null default false,
    backed_up_at timestamptz not null default now()
);
create index if not exists idx_mastery_backup_041_user on mastery_backup_041(user_id);

insert into mastery_backup_041 (mastery_id, user_id, objective_id, status, score_0_4, evidence, updated_at)
select id, user_id, objective_id, status, score_0_4, evidence, updated_at from mastery
on conflict (mastery_id) do nothing;

-- 2. Recompute ---------------------------------------------------------------------

select recompute_mastery();

-- 3. Rows the recompute just created (now() is this transaction's start time).

insert into mastery_backup_041 (mastery_id, user_id, objective_id, updated_at, created_by_041)
select m.id, m.user_id, m.objective_id, m.updated_at, true
  from mastery m
 where m.updated_at = now()
   and not exists (select 1 from mastery_backup_041 b where b.mastery_id = m.id)
on conflict (mastery_id) do nothing;
