-- FAIL-1160: run AFTER pg_restore and after migration 071 is re-applied, with
-- psql --single-transaction.
--
-- A dump is taken with --no-acl and restored with --no-privileges, so
-- content_recheck comes back with the policies (they are in the dump) but none
-- of its grants: the re-check, sandbox and eval jobs would be refused on every
-- table. This is migration 064's grant block, verbatim, and nothing else of
-- 064: the whole file would also re-issue 064's `recheck_read ... using (true)`
-- policies on objectives and course_units, which 071 narrows to catalog
-- tracks (FAIL-954). lib/restore-roles.test.ts fails if this block and 064's
-- drift apart; the CI drill (scripts/ci/backup-drill-test.sh) compares the
-- restored role's privileges with the source's.
--
-- Safe to run twice (GRANT repeats harmlessly).
set local lock_timeout = '5s';

grant usage on schema public to content_recheck;

-- Read: the shared content and the catalog context the checker's prompt uses.
grant select on
    lesson_content, review_items, coach_quiz_items, exam_items, discrimination_items,
    concept_set_members, objectives, course_units, subject_tracks,
    education_subcategories, education_categories, credential_exams, credentials,
    credential_providers, item_status, item_holdbacks, exec_checks, exec_check_runs
  to content_recheck;
-- A learner's regenerated lesson, without whose it is.
grant select (objective_id, fade_problem, fade_choices, fade_correct_index, solo_check, solo_choices,
              solo_correct_index, model, generated_at)
  on lesson_content_overrides to content_recheck;

-- Write: staging only.
grant insert on item_holdbacks, exec_check_runs to content_recheck;
