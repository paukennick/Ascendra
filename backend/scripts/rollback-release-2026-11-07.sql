-- Release 2026-11-07: return the database to the PRE-RELEASE schema
-- (master @ c3e13ab's 001-024 plus line B's 025-027, which production ran
-- before this release). docs/release-2026-11-07.md, "Rollback", says when.
--
-- YOU PROBABLY DO NOT NEED THIS. Every migration in the release is additive
-- and the old backend (master @ c3e13ab) runs on the migrated schema --
-- the rehearsal (scripts/rehearse-production-migration.sh, step C) proves
-- it -- so rolling back the CODE (Vercel Instant Rollback) is enough. Use
-- this only to remove the release's schema entirely, e.g. before restoring
-- a different plan, and only after:
--   1. the code is already rolled back (the new backend fails without these
--      objects), and
--   2. a fresh pg_dump has been taken (runbook "Backup"): this DELETES every
--      row in the release's tables -- lesson positions, reviews, practice
--      exams, study plans, labs, item reports, learning milestones, plans,
--      the release's legal-acceptance `source` and AI call logs. Restoring
--      that dump is the only way back to them.
--
-- What it does, in one transaction (any error leaves everything as it was):
--   1. Mastery levels back to their pre-release values where nobody has
--      changed them since (the RESTORE blocks of 045b, 041b, 031b, 029b,
--      newest first). Rows changed since -- graded answers, the batched
--      recompute -- are real progress and are left.
--   2. Line B's 025 columns (*_choice_feedback) back, filled from the
--      per-option reasons 052 folded them into.
--   3. Triggers, functions and the procedure the release added.
--   4. The release's tables (each named; nothing pre-release is dropped),
--      and the two rollup views 033 redefined, back to master's text.
--   5. The release's columns, constraints and indexes on pre-release tables.
--   6. The release's rows in schema_migrations (027a-054). The 001-022 rows
--      the baseline step added stay: the schema does have those files.
-- What it cannot undo: enum values (attempt_kind 'review', 'labtask';
-- attempt_format 'lab'). Postgres cannot drop an enum value without
-- rewriting the type; old code never writes them, and rows that used them
-- are in the dropped tables or are attempts the old code reads like any
-- other. Catalog content the release seed wrote (new courses, objectives,
-- titles) is data and stays; old code lists it like any course.
--
-- Tested by the rehearsal: migrate up, run this, compare the schema with
-- the production-state schema (identical apart from those enum values),
-- run master's routes, migrate up again.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/rollback-release-2026-11-07.sql

begin;
set local lock_timeout = '5s';

-- 1. Mastery levels, newest backup first ---------------------------------------

do $$
declare
  b record;
begin
  for b in select * from (values ('045', 4), ('041', 3), ('031', 2), ('029', 1)) as v(tag, ord) order by ord desc loop
    if to_regclass('public.mastery_backup_' || b.tag) is not null then
      execute format(
        'update mastery m
            set status = b.status, score_0_4 = b.score_0_4, evidence = b.evidence, updated_at = b.updated_at
           from mastery_backup_%1$s b
          where b.mastery_id = m.id and not b.created_by_%1$s
            and m.updated_at <= b.backed_up_at
            and (m.status, m.score_0_4, m.evidence, m.updated_at)
                is distinct from (b.status, b.score_0_4, b.evidence, b.updated_at)', b.tag);
      execute format(
        'delete from mastery m using mastery_backup_%1$s b
          where b.mastery_id = m.id and b.created_by_%1$s and m.updated_at <= b.backed_up_at', b.tag);
    end if;
  end loop;
end $$;

-- 2. Line B's 025 columns -------------------------------------------------------

alter table lesson_content add column if not exists fade_choice_feedback jsonb;
alter table lesson_content add column if not exists solo_choice_feedback jsonb;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public'
              and table_name = 'lesson_content' and column_name = 'fade_option_reasons') then
    update lesson_content
       set fade_choice_feedback = coalesce(fade_choice_feedback, fade_option_reasons),
           solo_choice_feedback = coalesce(solo_choice_feedback, solo_option_reasons)
     where fade_option_reasons is not null or solo_option_reasons is not null;
  end if;
end $$;

-- 3. Triggers, functions, procedure ---------------------------------------------

drop trigger if exists learner_events_attempt on attempts;
drop trigger if exists mastery_review_enrol on mastery;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.prokind
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('attempt_spaced', 'attempt_type_of', 'grade_lock_key', 'learner_event_record',
                         'learner_event_track_of', 'learner_events_on_attempt', 'learner_events_on_exam_session',
                         'learner_events_on_lesson_progress', 'learner_events_on_placement',
                         'learner_events_on_review_session', 'lesson_item_key', 'mastery_detail',
                         'mastery_from_attempts', 'mastery_pairs', 'recompute_mastery', 'recompute_mastery_batched',
                         'recompute_mastery_pair', 'review_interval_days', 'review_schedule_enrol', 'review_state')
  loop
    execute format('drop %s if exists %s cascade', case when f.prokind = 'p' then 'procedure' else 'function' end, f.sig);
  end loop;
end $$;

-- 4. The release's tables -------------------------------------------------------
-- CASCADE removes only what depends on these tables: their own indexes,
-- constraints and sequences, and the release's foreign keys from attempts
-- (assessment_type, unit_check_item_id). No pre-release object depends on
-- them.

drop table if exists
  account_access, account_access_events, ai_calls, allowance_uses, assessment_types, billing_events, coach_quiz_items, coach_quiz_turns,
  concept_set_members, concept_sets, content_review_queue, course_insights, discount_offer_codes, discrimination_items, entitlements,
  error_log_backup_029, exam_items, exam_outcomes, exam_session_items, exam_sessions, free_course_choice,
  grading_claims, item_flags, item_holdbacks, item_quality_params, item_status,
  lab_disclaimer_acknowledgements, lab_report_questions, lab_run_steps, lab_runs, labs,
  learned_set_attempts, learner_events, learner_misconceptions, learner_onboarding, learner_term_coverage,
  lesson_content_overrides, lesson_generation_claims, lesson_hint_reveals, lesson_progress,
  lesson_progress_tombstones, mastery_backup_029, mastery_backup_031, mastery_backup_041, mastery_backup_045,
  mastery_model_params, objective_prerequisites, objective_terms, pbq_generation_claims, placement_checks,
  placement_items, prerequisite_refreshers, review_items, review_log, review_schedule, review_session_items,
  review_sessions, study_plans, unit_check_items, terms_acceptances,
  -- REQ-166 (058): verified group discounts and the App Store offer-code pool
  verified_discounts
  cascade;

-- 4b. The two rollup views 033 redefined, back to master's definitions
-- (view_unit_mastery from 001_init.sql, view_track_progress from
-- 022_track_progress_vs_mastery.sql): same columns, so they read no
-- retired_at and step 5 can drop it.

create or replace view view_unit_mastery as
select
    cu.id as unit_id,
    cu.track_id,
    cu.title as unit_title,
    count(o.id) as total_objectives,
    count(m.id) filter (where m.status in ('Independent', 'Transfer-ready')) as mastered_objectives,
    count(m.id) filter (where m.status = 'Needs review') as needs_review_objectives,
    round(
        avg(coalesce(m.score_0_4, 0))::numeric, 2
    ) as avg_score_0_4
from course_units cu
left join objectives o on o.unit_id = cu.id
left join mastery m on m.objective_id = o.id
group by cu.id, cu.track_id, cu.title;

create or replace view view_track_progress as
select
    st.id as track_id,
    st.title as track_title,
    st.track_type,
    count(distinct cu.id) as total_units,
    count(distinct o.id) as total_objectives,
    count(m.id) filter (where m.status in ('Independent', 'Transfer-ready')) as mastered_objectives,
    round(
        (count(m.id) filter (where m.status in ('Independent', 'Transfer-ready'))::numeric
        / greatest(count(distinct o.id), 1)) * 100, 1
    ) as percent_complete,
    count(m.id) as started_objectives,
    round(
        (count(m.id)::numeric
        / greatest(count(distinct o.id), 1)) * 100, 1
    ) as percent_progress
from subject_tracks st
left join course_units cu on cu.track_id = st.id
left join objectives o on o.unit_id = cu.id
left join mastery m on m.objective_id = o.id
group by st.id, st.title, st.track_type;

-- 5. Columns, constraints and indexes on pre-release tables --------------------
-- Dropping a column drops its indexes and constraints with it; the rest are
-- named.

alter table attempts drop constraint if exists attempts_lab_not_mastery_evidence;
alter table attempts drop constraint if exists attempts_labtask_shape;
drop index if exists attempts_unit;
drop index if exists attempts_user_unit_created;
drop index if exists attempts_answered_created;  -- 055 (REQ-143)
drop index if exists idx_attempts_user_objective;
drop index if exists idx_attempts_user_pbq_scenario;
drop index if exists error_log_attempt;
drop index if exists idx_auth_events_created;
drop index if exists idx_auth_events_user;
drop index if exists idx_chat_messages_user_track_created;
drop index if exists idx_study_sessions_user_track_started;

alter table attempts
  drop column if exists assessment_type,
  drop column if exists assist_reason,
  drop column if exists assisted,
  drop column if exists client_attempt_id,
  drop column if exists fix_next,
  drop column if exists lab_id,
  drop column if exists lab_objective_id,
  drop column if exists model_answer,
  drop column if exists part_scores,
  drop column if exists retry_of,
  drop column if exists unit_check_item_id,
  drop column if exists void_reason,
  drop column if exists voided_at;
alter table app_users drop column if exists token_version, drop column if exists totp_pending_reauth_at,
  drop column if exists whats_new_seen_id;
alter table chat_messages drop column if exists client_message_id;
alter table course_units drop column if exists retired_at;
alter table objectives drop column if exists retired_at;
alter table email_change_tokens
  drop column if exists cancel_token_hash,
  drop column if exists cancelled_at,
  drop column if exists token_version;
alter table email_verification_tokens drop column if exists set_password;
alter table error_log drop column if exists pbq_scenario_id;
alter table legal_acceptances drop constraint if exists legal_acceptances_source_052;
alter table legal_acceptances drop column if exists source;
-- 059 (REQ-165): the study notice rows go (the pre-release code has no
-- notice), and the document check returns to 027's unnamed one.
delete from legal_acceptances where document not in ('terms', 'privacy');
alter table legal_acceptances drop constraint if exists legal_acceptances_document_059;
alter table legal_acceptances drop constraint if exists legal_acceptances_document_check;
alter table legal_acceptances add constraint legal_acceptances_document_check check (document in ('terms', 'privacy'));
alter table lesson_content
  drop column if exists fade_option_reasons,
  drop column if exists solo_option_reasons,
  drop column if exists teach_cards;

-- 6. Ledger ---------------------------------------------------------------------

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    delete from schema_migrations where filename collate "C" > '027_legal_acceptances_and_content_reports.sql';
  end if;
end $$;

commit;
