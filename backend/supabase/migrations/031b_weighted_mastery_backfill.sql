-- REQ-100, part 2 of 031: back up mastery, then recompute every learner's
-- mastery under the weighted model in 031_weighted_mastery.sql. Read that
-- header first, including the deploy order: after deploying the code, run
-- `select recompute_mastery()` once.
--
-- LOCKING. Kept apart from 031 so the slow part holds no lock that blocks
-- reads, as 029b is kept apart from 029. The runner (supabase/apply-migration.ts)
-- sorts file names and applies each file in its own transaction, so this
-- runs straight after 031 ('_' sorts before 'b') and is recorded in
-- schema_migrations as 031b_weighted_mastery_backfill.sql. What it holds:
--   - mastery: row locks on the rows the recompute changes; a live grade of
--     one of those pairs waits until this commits. Reads are not blocked.
--   - attempts: only read here, until the last statement, which validates
--     the assessment_type foreign key under SHARE UPDATE EXCLUSIVE (reads,
--     inserts and updates of attempts carry on; it waits for, and blocks,
--     only VACUUM and other schema changes on attempts).
-- Measured on the 1.9M-attempt / 320k-mastery review fixture (local
-- Postgres 16): see FAIL-084 in the failure ledger for the numbers.
--
-- ORDER OF WORK, and why it is safe to run twice:
--   1. BACKUP of mastery, before anything changes. ON CONFLICT DO NOTHING: a
--      second run never overwrites the original pre-031 values. 029's backup
--      tables are never read or written here.
--   2. recompute_mastery() (from 029): visits every pair with graded
--      attempts AND every existing mastery row, so a level with no direct
--      evidence (self-set, or PBQ-only) becomes Not started. A row is only
--      rewritten when its status, score or evidence differs, so a second run
--      on the same day changes nothing. (Evidence text carries the weighted
--      accuracy, which drifts as evidence ages, so a run on a later day may
--      refresh rows -- by design.)
--   3. rows the recompute created (graded attempts but no mastery row) are
--      recorded in the backup with created_by_031 = true, so the restore can
--      remove them.
--   4. validate the attempts.assessment_type foreign key (added NOT VALID in 031).
--
-- RESTORE (puts mastery back to what it was just before this migration;
-- only meaningful together with putting 029's mastery_from_attempts back --
-- re-run the "3. The rule" section of 029_mastery_recompute.sql -- because
-- the next graded answer recomputes from whatever rule is installed). It
-- only touches rows whose updated_at is not later than their backed_up_at. A
-- row changed after the backup holds real progress (a graded answer, or a
-- later recompute_mastery() call) and is left as it is. Rows the recompute
-- created are deleted if untouched since, which reads as Not started, as before.
--
--   begin;
--   update mastery m
--      set status = b.status, score_0_4 = b.score_0_4,
--          evidence = b.evidence, updated_at = b.updated_at
--     from mastery_backup_031 b
--    where b.mastery_id = m.id and not b.created_by_031
--      and m.updated_at <= b.backed_up_at;
--   delete from mastery m
--    using mastery_backup_031 b
--    where b.mastery_id = m.id and b.created_by_031
--      and m.updated_at <= b.backed_up_at;
--   commit;
--
-- To see whose level changed:
--   select b.user_id, b.objective_id, b.status as before, m.status as after
--     from mastery_backup_031 b join mastery m on m.id = b.mastery_id
--    where b.status is distinct from m.status;

-- 1. Backup, before any data changes ------------------------------------------

insert into mastery_backup_031 (mastery_id, user_id, objective_id, status, score_0_4, evidence, updated_at)
select id, user_id, objective_id, status, score_0_4, evidence, updated_at from mastery
on conflict (mastery_id) do nothing;

-- 2. Recompute ----------------------------------------------------------------

-- The one recompute, owned by 029. How it avoids overwriting a grade
-- committed while it runs (per-pair grader lock, batches) is decided there;
-- this file follows whatever 029 provides.
select recompute_mastery();

-- 3. Rows the recompute just created: not in the backup, and written by this
-- transaction (now() is the transaction's start time, so another
-- transaction's write can't carry the same updated_at).
insert into mastery_backup_031 (mastery_id, user_id, objective_id, updated_at, created_by_031)
select m.id, m.user_id, m.objective_id, m.updated_at, true
  from mastery m
 where m.updated_at = now()
   and not exists (select 1 from mastery_backup_031 b where b.mastery_id = m.id)
on conflict (mastery_id) do nothing;

-- 4. The foreign key 031 added NOT VALID ---------------------------------------

alter table attempts validate constraint attempts_assessment_type_fkey;
