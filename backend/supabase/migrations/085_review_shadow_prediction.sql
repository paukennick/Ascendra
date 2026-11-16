-- REQ-301 (mastery decay, step 1: shadow mode; Nick approved the design
-- 2026-11-14, docs/mastery-decay-design.md): store, on every review_log row,
-- what the proposed memory model (lib/memory-model.ts, FSRS-6 with one
-- personal clock k) predicted the learner's recall to be at the moment of the
-- review, and the model state it used, beside the real outcome that
-- review_log already holds (verdict, assisted). Nothing reads these columns to
-- decide anything: scheduling stays fixed_v1, readiness is unchanged and no
-- learner sees a new number. They exist so step 2 can compare predicted with
-- observed recall on Ascendra's own data before anything is shown.
--
-- Columns on review_log (not a side table): one row per review already, the
-- same owner, the same deletion (cascade with the learner), the same account
-- export (`select *`), and the same grants -- every privilege on review_log is
-- table-level (app_runtime_sync(), 071), so the new columns need no grant and
-- the post-restore script (scripts/restore/02-recheck-grants-after-restore.sql)
-- needs nothing: the re-check role does not read review_log.
--
--   predicted_recall   the model's probability of recall at review time (0..1).
--                      Null when the review was not predicted (not enrolled,
--                      the model failed, or the switch DECAY_SHADOW is off).
--   model_stability    S the model held for the objective just before the
--                      review, in model days (days / k)
--   model_difficulty   D, 1..10
--   model_k            the learner's memory clock for this course: the
--                      posterior median of the fit on every earlier unaided
--                      review in the course
--   model_fit_stage    starting (< 8 unaided reviews), learning (< 64) or
--                      fitted -- what k rests on
--   model_goal         the course goal the prior used ('none' = not answered)
--   model_level        the course level the prior used
--   model_version      which parameter set made the prediction
--                      (lib/decay-shadow.ts MEMORY_MODEL_VERSION; a test pins
--                      it to the constants, so calibration never mixes two
--                      parameter sets under one label). The scheduler that
--                      actually ran is review_log.scheduler, as before.
--   model_source       'live' (computed in the review's own transaction) or
--                      'backfill' (replayed afterwards by
--                      scripts/decay-shadow-backfill.ts, with the course's
--                      CURRENT goal and level, which may differ from the ones
--                      in force then: report the two apart)
--
-- Additive only: nine nullable columns, no default, no rewrite; every
-- existing row reads as "no prediction". One check, added NOT VALID (no scan
-- of 1.2M rows under the lock; every existing row is null, so it would pass;
-- a quiet moment can run `alter table review_log validate constraint
-- review_log_shadow_085`): all of the model columns are set together or not
-- at all, and in range.
--
-- ORDER. Either way round is safe. The backend writes the prediction in a
-- separate statement inside a savepoint and carries on when it fails, so the
-- code can run before this migration (nothing is stored until it is applied)
-- and after it. /api/health probes the columns (lib/schema-status.ts).
--
-- LOCKING. ACCESS EXCLUSIVE on review_log for the catalog-only ALTERs, held to
-- commit (the tool runs the file in one transaction); lock_timeout 5 s: a busy
-- moment fails the migration cleanly, nothing applied, run it again.
--
-- ROLLBACK (deploy the earlier backend first; the earlier backend never reads
-- the columns, so dropping them while the new one runs only stops it storing):
--   alter table review_log drop constraint if exists review_log_shadow_085;
--   alter table review_log
--     drop column if exists predicted_recall, drop column if exists model_stability,
--     drop column if exists model_difficulty, drop column if exists model_k,
--     drop column if exists model_fit_stage, drop column if exists model_goal,
--     drop column if exists model_level, drop column if exists model_version,
--     drop column if exists model_source;
--
-- Safe to run twice: add column if not exists, guarded DO block.
set local lock_timeout = '5s';

alter table review_log
  add column if not exists predicted_recall numeric,
  add column if not exists model_stability numeric,
  add column if not exists model_difficulty numeric,
  add column if not exists model_k numeric,
  add column if not exists model_fit_stage varchar(10),
  add column if not exists model_goal varchar(20),
  add column if not exists model_level varchar(12),
  add column if not exists model_version varchar(24),
  add column if not exists model_source varchar(10);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'review_log_shadow_085' and conrelid = 'review_log'::regclass) then
    alter table review_log add constraint review_log_shadow_085 check (
      (predicted_recall is null and model_stability is null and model_difficulty is null and model_k is null
        and model_fit_stage is null and model_goal is null and model_level is null
        and model_version is null and model_source is null)
      or
      (predicted_recall between 0 and 1
        and model_stability > 0
        and model_difficulty between 1 and 10
        and model_k > 0
        and model_fit_stage in ('starting', 'learning', 'fitted')
        and model_goal in ('work', 'current', 'program', 'career_change', 'interest', 'none')
        and model_level in ('new', 'some', 'experienced')
        and model_version is not null
        and model_source in ('live', 'backfill'))
    ) not valid;
  end if;
end $$;

-- No new table, view or function, so nothing for the least-privilege role to
-- gain; run anyway so the role stays complete (REQ-207).
select app_runtime_sync();
