-- REQ-327 (Nick, 2026-11-17): a per-SIM 18+ gate, so a simulation on suicide
-- or homicide risk or another behavioral emergency can live in a course
-- outside the mental health category (CEN, PCCN, the FNP courses, CCRN,
-- NCLEX-RN). A sim document marked `mature: true` (lib/sim/schema.ts) is
-- refused to a learner who has not acknowledged that course's 18+ sims, with
-- the same attestation and the same date of birth asked once (REQ-259,
-- migration 081). The rest of the course is not gated.
--
-- 1. mature_course_acknowledgements.scope: what a row acknowledges.
--      'course'  the whole mental health course (every row before 087; the
--                course gate reads only these);
--      'sims'    the 18+ simulations of that course, for a course outside the
--                mental health category (the sim gate reads 'course' and
--                'sims').
--    Constant default, so adding it is catalog-only (no rewrite); every
--    existing row is a course row. The primary key (user_id, track_id,
--    notice_version) is unchanged, so the backend before this migration keeps
--    its `on conflict (user_id, track_id, notice_version)` insert and never
--    sees a difference: a course is either mental health (course rows) or not
--    (sims rows). If a course moves into the mental health category later, the
--    course acknowledgement replaces the scope of its sims row
--    (lib/mature-content.ts acknowledgeMatureCourse).
--    The check is added NOT VALID and validated, like 081's.
--
-- No new personal data: the same row, attestation and date of birth as 081;
-- the scope says which content the attestation was for. In the account export
-- (lib/account-export.ts) and deleted with the account (cascade, 081).
--
-- ORDER. Apply BEFORE the backend that reads it: the gates
-- (lib/mature-content.ts) filter on scope, and /api/health probes it
-- (lib/schema-status.ts). The earlier backend never reads the column, so
-- applying early is safe. Needs 081.
--
-- LOCKING. One column with a constant default (catalog-only, brief ACCESS
-- EXCLUSIVE), one check added NOT VALID then validated. lock_timeout 5 s like
-- 081.
--
-- ROLLBACK (deploy the earlier backend first; it never reads the column):
--   delete from mature_course_acknowledgements where scope <> 'course';
--   alter table mature_course_acknowledgements
--     drop constraint if exists mature_course_acknowledgements_scope_087,
--     drop column if exists scope;
-- The delete comes first so no sims row is later read as a course row.
-- docs/deploy-runbook-integration.md lists it with the other down paths.
--
-- Safe to run twice: if not exists, guarded DO block.

set local lock_timeout = '5s';

alter table mature_course_acknowledgements add column if not exists scope varchar(10) not null default 'course';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'mature_course_acknowledgements_scope_087') then
    alter table mature_course_acknowledgements add constraint mature_course_acknowledgements_scope_087
      check (scope in ('course', 'sims')) not valid;
  end if;
end $$;
alter table mature_course_acknowledgements validate constraint mature_course_acknowledgements_scope_087;

comment on column mature_course_acknowledgements.scope is
  'REQ-327: course = the whole mental health course (REQ-259); sims = the 18+ simulations (documents marked mature) of a course outside the mental health category. Same attestation and date of birth rule.';

-- REQ-207: keep the least-privilege runtime role and hardened functions complete.
select app_runtime_sync();
