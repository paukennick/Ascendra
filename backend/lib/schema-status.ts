// REQ-128: does the live database have the schema this code needs?
//
// Migrations are applied by hand (`npm run migrate`), separately from the
// Vercel deploy, so code can go live ahead of its migration. When that
// happened nothing said so: routes just returned 500s (a missing
// course_favorites breaks the course list; a missing
// attempts.client_attempt_id breaks every graded answer). /api/health now
// runs these probes and fails loudly instead, which turns the daily
// keepalive workflow red.
//
// Probes check objects, not the schema_migrations ledger, because the
// ledger only exists for migrations applied through `npm run migrate`;
// earlier ones were pasted into the SQL editor and never recorded.
//
// WHEN YOU ADD A MIGRATION that new code depends on, add a probe for it
// here. The database CI job applies every migration to a fresh Postgres
// and then requires every probe to pass, so a probe that names the wrong
// object fails CI rather than production.

export interface SchemaProbe {
  migration: string;
  what: string;
  sql: string; // must return one row with a boolean column "ok"
}

export const SCHEMA_PROBES: SchemaProbe[] = [
  {
    migration: "023_shared_catalog.sql",
    what: "course_favorites table (course list, favorites, export)",
    sql: `select to_regclass('public.course_favorites') is not null as ok`,
  },
  {
    migration: "023_shared_catalog.sql",
    what: "shared-catalog unique code index",
    sql: `select to_regclass('public.subject_tracks_catalog_code_unique') is not null as ok`,
  },
  {
    migration: "024_health_informatics_taxonomy.sql",
    what: "Health Informatics subcategory (seed)",
    sql: `select exists(select 1 from education_subcategories where slug = 'health-informatics') as ok`,
  },
  {
    // Line B (REQ-093). Production already has it; listed so a fresh or
    // restored database that lacks it is reported.
    migration: "027_legal_acceptances_and_content_reports.sql",
    what: "legal_acceptances table and support_requests.objective_id / lesson_stage (sign-up, Terms prompt, Report a problem with this lesson, export)",
    sql: `select to_regclass('public.legal_acceptances') is not null
             and (select count(*) from information_schema.columns
                   where table_schema = 'public' and table_name = 'support_requests'
                     and column_name in ('objective_id', 'lesson_stage')) = 2 as ok`,
  },
  {
    // Release 2026-11-07 reconcile: one legal-acceptance table with A's
    // source column, one per-option explanation column, RLS everywhere.
    migration: "052_release_reconcile.sql",
    what: "legal_acceptances.source, terms_acceptances folded in, *_choice_feedback folded into *_option_reasons, RLS on every public table",
    sql: `select exists(select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'legal_acceptances' and column_name = 'source')
             and to_regclass('public.terms_acceptances') is null
             and not exists(select 1 from information_schema.columns
                             where table_schema = 'public' and column_name like '%\\_choice\\_feedback')
             and not exists(select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                             where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity) as ok`,
  },
  {
    // REQ-096 (PR #12): the Try it step's "I did it" writes format 'lab'.
    migration: "053_attempt_format_lab.sql",
    what: "attempt format 'lab' (the lesson's Try it step, POST /api/objectives/:id/lab)",
    sql: `select exists(select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                     where t.typname = 'attempt_format' and e.enumlabel = 'lab') as ok`,
  },
  {
    // REQ-140: sign-up writes it, GET/POST /api/whats-new read and move it.
    migration: "054_whats_new_seen.sql",
    what: "app_users.whats_new_seen_id (sign-up, the What's new sheet)",
    sql: `select exists(select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'app_users' and column_name = 'whats_new_seen_id') as ok`,
  },
  {
    // REQ-143: the daily content-signals cron writes it; npm run items and
    // npm run review-queue resolve entries in it.
    migration: "055_content_review_queue.sql",
    what: "content_review_queue and its one-open-entry index, signal thresholds in item_quality_params (learner-signal review queue)",
    sql: `select to_regclass('public.content_review_queue') is not null
             and to_regclass('public.content_review_queue_one_open') is not null
             and (select count(*) from item_quality_params where name like 'signal\\_%') = 11 as ok`,
  },
  {
    // REQ-143: the daily job's date index on attempts. Production builds it
    // with CREATE INDEX CONCURRENTLY first (runbook), and a failed concurrent
    // build leaves an INVALID index that to_regclass still finds, so this
    // probe asks for a valid one.
    migration: "055_content_review_queue.sql",
    what: "attempts_answered_created, a valid date index for the content-signals job's 194-day scan",
    sql: `select coalesce((select i.indisvalid from pg_index i
                          where i.indexrelid = to_regclass('public.attempts_answered_created')), false) as ok`,
  },
  {
    // REQ-144: every gated route reads account_access once billing is on, and
    // the AI budget reads it for anyone over the daily budget.
    migration: "056_account_access.sql",
    what: "account_access and account_access_events tables (unrestricted access, Settings > Access, the AI safety ceiling)",
    sql: `select to_regclass('public.account_access') is not null
             and to_regclass('public.account_access_events') is not null
             and to_regclass('public.account_access_live_email_unique') is not null as ok`,
  },
  {
    // REQ-164: the containers and Kubernetes tracks hang off these rows; the
    // seed resolves them by slug and fails without them.
    migration: "057_containers_kubernetes_taxonomy.sql",
    what: "Cloud Native & Kubernetes category and its three subcategories (seed)",
    sql: `select (select count(*) from education_subcategories s join education_categories c on c.id = s.category_id
                  where c.slug = 'cloud-native-certifications'
                    and s.slug in ('cncf-certifications', 'container-tooling', 'red-hat-openshift')) = 3 as ok`,
  },
  {
    // REQ-166: GET /api/discounts, checkout and the account export read
    // these (the export always; the rest only once verified discounts are on).
    migration: "058_verified_discounts.sql",
    what: "verified_discounts and discount_offer_codes tables (verified group discounts, App Store offer-code pool)",
    sql: `select to_regclass('public.verified_discounts') is not null
             and to_regclass('public.verified_discounts_subject_unique') is not null
             and to_regclass('public.discount_offer_codes') is not null as ok`,
  },
  {
    // REQ-194: GET /api/courses and the start routes read it; the seed writes it.
    migration: "065_track_hidden_at.sql",
    what: "subject_tracks.hidden_at (course list, starting a course, seed)",
    sql: `select exists(select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'subject_tracks' and column_name = 'hidden_at') as ok`,
  },
  {
    migration: "027a_lesson_progress.sql",
    what: "lesson_progress table (resume lessons across devices)",
    sql: `select to_regclass('public.lesson_progress') is not null as ok`,
  },
  {
    migration: "027a_lesson_progress.sql",
    what: "attempts.client_attempt_id column (every graded answer)",
    sql: `select exists(
            select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'attempts' and column_name = 'client_attempt_id'
          ) as ok`,
  },
  {
    migration: "027b_chat_client_message_id.sql",
    what: "chat_messages.client_message_id unique index (every chat message)",
    sql: `select to_regclass('public.chat_messages_user_client_message_unique') is not null as ok`,
  },
  {
    migration: "027c_lesson_overrides.sql",
    what: "lesson_content_overrides table (per-learner regenerated lessons)",
    sql: `select to_regclass('public.lesson_content_overrides') is not null as ok`,
  },
  {
    migration: "027c_lesson_overrides.sql",
    what: "lesson_generation_claims table (lesson generation across servers)",
    sql: `select to_regclass('public.lesson_generation_claims') is not null as ok`,
  },
  {
    migration: "028_ai_calls.sql",
    what: "ai_calls table (AI call log; calls still work without it, but cost and latency go unrecorded)",
    sql: `select to_regclass('public.ai_calls') is not null as ok`,
  },
  {
    // The 027a probe above only checks the column. Without this unique index
    // a retried answer would insert a second attempt silently instead of
    // replaying the first (REQ-127). The CLI applies 027a in one transaction,
    // so this can only be missing if 027a was pasted by hand and half-applied.
    migration: "027a_lesson_progress.sql",
    what: "attempts (user_id, client_attempt_id) unique index (retried answers count once)",
    sql: `select to_regclass('public.attempts_user_client_attempt_unique') is not null as ok`,
  },
  {
    migration: "029_mastery_recompute.sql",
    what: "attempts.assisted / assist_reason columns (every graded answer)",
    sql: `select count(*) = 2 as ok from information_schema.columns
           where table_schema = 'public' and table_name = 'attempts'
             and column_name in ('assisted', 'assist_reason')`,
  },
  {
    migration: "029_mastery_recompute.sql",
    // Checks the current version, not just the name: the first version of
    // 029 returned no row for "no evidence" and trusted attempts.assisted for
    // repeats (FAIL-110/111); the second counted attempts of any kind
    // (FAIL-182).
    // Once 031's rule is installed the 031 probes below judge the function:
    // re-applying 029 would put the old rule back, so this one doesn't ask for it.
    what: "mastery_from_attempts() function, current version (every graded answer)",
    sql: `select exists(select 1 from pg_proc where proname = 'mastery_from_attempts' and prosrc like '%mastery_detail%')
             or coalesce((select status = 'Not started'
                             from mastery_from_attempts('00000000-0000-0000-0000-000000000000'::uuid,
                                                        '00000000-0000-0000-0000-000000000000'::uuid)), false)
                 and position('x.kind = ''lesson''' in
                              pg_get_functiondef('public.mastery_from_attempts(uuid,uuid)'::regprocedure)) > 0 as ok`,
  },
  {
    migration: "029_mastery_recompute.sql",
    what: "recompute_mastery_batched() procedure and grade_lock_key() (post-deploy recompute, FAIL-118)",
    sql: `select to_regprocedure('public.recompute_mastery_batched(integer,uuid)') is not null
                 and to_regprocedure('public.grade_lock_key(uuid,uuid)') is not null as ok`,
  },
  {
    migration: "029_mastery_recompute.sql",
    what: "lesson_hint_reveals table (Solo choices hint)",
    sql: `select to_regclass('public.lesson_hint_reveals') is not null as ok`,
  },
  {
    migration: "029_mastery_recompute.sql",
    what: "error_log.pbq_scenario_id column (graded PBQ answers, Review)",
    sql: `select exists(
            select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'error_log' and column_name = 'pbq_scenario_id'
          ) as ok`,
  },
  {
    migration: "031_weighted_mastery.sql",
    what: "mastery_model_params and assessment_types tables, seeded (mastery weights and thresholds)",
    sql: `select exists(select 1 from mastery_model_params where name = 'transfer_accuracy')
             and exists(select 1 from assessment_types where type_name = 'pbq') as ok`,
  },
  {
    migration: "031_weighted_mastery.sql",
    what: "mastery_detail() function (course readiness, every graded answer)",
    sql: `select to_regprocedure('public.mastery_detail(uuid,uuid)') is not null as ok`,
  },
  {
    // Re-running an older migration file (029) would put its rule back while
    // every object still exists; this catches that.
    migration: "031_weighted_mastery.sql",
    what: "mastery_from_attempts() uses the weighted model (031), not the 029 rule",
    sql: `select coalesce(bool_and(prosrc like '%mastery_detail%'), false) as ok
            from pg_proc where proname = 'mastery_from_attempts'`,
  },
  {
    // Checks the current version of 031, not just the name: the first version
    // trusted a stored assisted = false (so attempts written by pre-029 code
    // in the deploy gap earned full credit) and returned no row for "no
    // evidence", so self-set levels survived the recompute (FAIL-082/083).
    migration: "031_weighted_mastery.sql",
    what: "mastery_detail() / mastery_from_attempts(), current 031 version (history-derived assists, Not started)",
    sql: `select coalesce((select status = 'Not started'
                             from mastery_from_attempts('00000000-0000-0000-0000-000000000000'::uuid,
                                                        '00000000-0000-0000-0000-000000000000'::uuid)), false)
             and exists(select 1 from pg_proc where proname = 'mastery_detail'
                          and prosrc like '%lesson_hint_reveals%') as ok`,
  },
  {
    // 031 creates the backup table empty and adds the assessment_type key NOT
    // VALID; only 031b fills the backup, recomputes and validates the key. The
    // validated key is the durable sign 031b ran (an empty backup is normal on
    // a database that had no mastery rows yet), so skipping 031b is reported.
    migration: "031b_weighted_mastery_backfill.sql",
    what: "mastery_backup_031 taken and every learner recomputed under the weighted model (031b)",
    sql: `select to_regclass('public.mastery_backup_031') is not null
             and exists(select 1 from pg_constraint
                         where conname = 'attempts_assessment_type_fkey' and convalidated) as ok`,
  },
  {
    migration: "031_weighted_mastery.sql",
    what: "attempts.assessment_type column (new assessment types)",
    sql: `select exists(
            select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'attempts' and column_name = 'assessment_type'
          ) as ok`,
  },
  {
    migration: "033_exam_blueprints.sql",
    what: "course_units.retired_at / objectives.retired_at columns (course view, progress, seed)",
    sql: `select count(*) = 2 as ok from information_schema.columns
           where table_schema = 'public' and column_name = 'retired_at'
             and table_name in ('course_units', 'objectives')`,
  },
  {
    migration: "038_exam_practice.sql",
    what: "exam_items / exam_sessions / exam_session_items tables and the new assessment types (sprints, mock exams)",
    sql: `select to_regclass('public.exam_session_items') is not null
             and exists(select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'exam_items' and column_name = 'source')
             and (select count(*) from assessment_types
                   where type_name in ('multiple_response', 'ordering', 'matching')) = 3 as ok`,
  },
  {
    migration: "047_exam_save_sequence.sql",
    what: "exam_session_items.save_seq column (every exam answer save and the exam session view, REQ-113)",
    sql: `select exists(select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'exam_session_items' and column_name = 'save_seq') as ok`,
  },
  {
    migration: "048_product_basics.sql",
    // terms_acceptances is not probed: 052 moves its rows into
    // legal_acceptances (027) and drops it (release 2026-11-07).
    what: "learner_onboarding, learner_events (+ triggers) and exam_outcomes (launch, first run, exam results, export)",
    sql: `select to_regclass('public.learner_onboarding') is not null
             and to_regclass('public.exam_outcomes') is not null
             and to_regclass('public.learner_events_lesson_once') is not null
             and (select count(*) from pg_trigger where tgname in ('learner_events_attempt', 'learner_events_lesson_progress',
                    'learner_events_review_session', 'learner_events_exam_session', 'learner_events_placement')) = 5 as ok`,
  },
  {
    migration: "049_billing.sql",
    what: "entitlements, billing_events, free_course_choice, allowance_uses (paid tiers; read only when BILLING_ENABLED is on, written by the billing webhooks, in the export)",
    sql: `select to_regclass('public.entitlements') is not null
             and to_regclass('public.billing_events') is not null
             and to_regclass('public.free_course_choice') is not null
             and to_regclass('public.allowance_uses_user_kind_idx') is not null as ok`,
  },
  {
    // REQ-123: the lab routes, the coach guard's open lab steps, the export
    // and "Report a problem" on a lab all read these.
    migration: "050_lab_engine.sql",
    what: "labs / lab_runs / lab_run_steps, attempts.lab_id, kind 'labtask', the lab_build and lab_case types and the 'lab' item kind (verifiable labs)",
    sql: `select to_regclass('public.labs') is not null
             and to_regclass('public.lab_runs') is not null
             and to_regclass('public.lab_run_steps') is not null
             and exists(select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'attempts' and column_name = 'lab_id')
             and exists(select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                         where t.typname = 'attempt_kind' and e.enumlabel = 'labtask')
             and (select count(*) from assessment_types where type_name in ('lab_build', 'lab_case')) = 2
             and exists(select 1 from pg_constraint where conname = 'item_flags_item_kind_050') as ok`,
  },
  {
    // REQ-125: starting or grading a clinical or fitness lab, the lab view
    // and the export read it.
    migration: "051_lab_disclaimer_ack.sql",
    what: "lab_disclaimer_acknowledgements (the one-time clinical / fitness lab disclaimer acknowledgement)",
    sql: `select to_regclass('public.lab_disclaimer_acknowledgements') is not null
             and exists(select 1 from pg_constraint where conname = 'lab_disclaimer_ack_family_051') as ok`,
  },
  {
    // REQ-165: recording the study notice (POST /api/onboarding/notice).
    migration: "059_study_notice.sql",
    what: "legal_acceptances accepts the 'study_notice' document (the one-time study notice)",
    sql: `select exists(select 1 from pg_constraint where conname = 'legal_acceptances_document_059') as ok`,
  },
  {
    // REQ-174: the NREMT (EMR, EMT, AEMT, Paramedic) tracks hang off this
    // row; the seed resolves it by slug and fails without it.
    migration: "061_ems_taxonomy.sql",
    what: "Emergency Medical Services subcategory under Healthcare & Nursing (seed)",
    sql: `select exists(select 1 from education_subcategories s join education_categories c on c.id = s.category_id
                     where c.slug = 'healthcare-nursing' and s.slug = 'emergency-medical-services') as ok`,
  },
  {
    // REQ-197: Settings > Email, the unsubscribe links, the daily
    // /api/cron/service-emails run and the account export read these.
    migration: "063_service_emails.sql",
    what: "email_preferences and service_email_log (service email choices and the once-per-period send log)",
    sql: `select to_regclass('public.email_preferences') is not null
             and to_regclass('public.service_email_log') is not null
             and to_regclass('public.service_email_log_once') is not null as ok`,
  },
  {
    // REQ-196: lesson generation queues a writer's verification program in
    // exec_checks (fail closed: no table, the lesson is held back), and the
    // sandbox / re-check jobs connect as a member of content_recheck.
    migration: "064_recheck_role.sql",
    what: "exec_checks / exec_check_runs (sandboxed verify-by-execution) and the content_recheck role",
    sql: `select to_regclass('public.exec_checks') is not null
             and to_regclass('public.exec_check_runs') is not null
             and exists(select 1 from pg_roles where rolname = 'content_recheck') as ok`,
  },
  {
    migration: "032_lesson_progress_tombstone.sql",
    what: "lesson_progress_tombstones table (saving and finishing a lesson position)",
    sql: `select to_regclass('public.lesson_progress_tombstones') is not null as ok`,
  },
  {
    migration: "034_rich_feedback.sql",
    what: "lesson option reasons, attempts model answer / retry_of (every graded answer and lesson save)",
    sql: `select (select count(*) from information_schema.columns
                   where table_schema = 'public'
                     and ((table_name in ('lesson_content', 'lesson_content_overrides')
                           and column_name in ('fade_option_reasons', 'solo_option_reasons'))
                       or (table_name = 'attempts' and column_name in ('model_answer', 'fix_next', 'retry_of')))) = 7
              and to_regclass('public.attempts_retry_of_unique') is not null as ok`,
  },
  {
    migration: "035_lesson_experience.sql",
    what: "lesson teach cards, lab report questions, attempts.lab_objective_id (every lesson save and lab report)",
    sql: `select (select count(*) from information_schema.columns
                   where table_schema = 'public'
                     and ((table_name in ('lesson_content', 'lesson_content_overrides') and column_name = 'teach_cards')
                       or (table_name = 'attempts' and column_name = 'lab_objective_id'))) = 3
              and to_regclass('public.lab_report_questions') is not null
              and exists(select 1 from pg_constraint where conname = 'attempts_lab_not_mastery_evidence') as ok`,
  },
  {
    migration: "030_hardening_indexes.sql",
    what: "chat_messages (user_id, track_id, created_at) index (chat history and replay)",
    sql: `select to_regclass('public.idx_chat_messages_user_track_created') is not null as ok`,
  },
  {
    migration: "030_hardening_indexes.sql",
    what: "study_sessions (user_id, track_id, started_at) index (sessions, Continue studying)",
    sql: `select to_regclass('public.idx_study_sessions_user_track_started') is not null as ok`,
  },
  {
    migration: "036_pbq_generation_claims.sql",
    what: "pbq_generation_claims table (new PBQ scenarios; serving stored ones still works without it)",
    sql: `select to_regclass('public.pbq_generation_claims') is not null as ok`,
  },
  {
    migration: "040_deep_understanding.sql",
    what: "comparison cards, prerequisite map and misconception tables (REQ-111 deep understanding)",
    sql: `select to_regclass('public.course_insights') is not null
             and to_regclass('public.concept_sets') is not null
             and to_regclass('public.concept_set_members') is not null
             and to_regclass('public.discrimination_items') is not null
             and to_regclass('public.learned_set_attempts') is not null
             and to_regclass('public.objective_prerequisites') is not null
             and to_regclass('public.learner_misconceptions') is not null
             and to_regclass('public.prerequisite_refreshers') is not null as ok`,
  },
  {
    // Without these rows a discrimination or explain-back attempt fails the
    // attempts.assessment_type foreign key.
    migration: "040_deep_understanding.sql",
    what: "discrimination and explain_back assessment types (comparison-card and explain-it-back answers)",
    sql: `select count(*) = 2 as ok from assessment_types where type_name in ('discrimination', 'explain_back')`,
  },
  {
    migration: "039_coach_plan.sql",
    what: "coach_quiz and placement assessment types (Quiz me, placement check)",
    sql: `select (select cognitive_weight = 0 and not application_level from assessment_types where type_name = 'coach_quiz')
             and (select not application_level from assessment_types where type_name = 'placement') as ok`,
  },
  {
    migration: "039_coach_plan.sql",
    what: "study_plans, placement_checks/placement_items, coach_quiz_items/coach_quiz_turns tables (study plan, placement, Quiz me)",
    sql: `select to_regclass('public.study_plans') is not null and to_regclass('public.placement_checks') is not null
             and to_regclass('public.coach_quiz_items') is not null and to_regclass('public.coach_quiz_turns') is not null
             and exists(select 1 from information_schema.columns where table_schema = 'public'
                          and table_name = 'placement_items' and column_name = 'correct_index') as ok`,
  },
  {
    migration: "037_review_loop.sql",
    what: "review loop tables (Today's review, schedule, terms, unit checks)",
    sql: `select to_regclass('public.review_schedule') is not null and to_regclass('public.review_log') is not null
             and to_regclass('public.review_items') is not null and to_regclass('public.review_sessions') is not null
             and to_regclass('public.review_session_items') is not null and to_regclass('public.objective_terms') is not null
             and to_regclass('public.learner_term_coverage') is not null and to_regclass('public.unit_check_items') is not null as ok`,
  },
  {
    migration: "037_review_loop.sql",
    what: "attempt kind 'review', assessment type 'unit_check' and attempts.unit_check_item_id (review answers, unit checks)",
    sql: `select exists(select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                      where t.typname = 'attempt_kind' and e.enumlabel = 'review')
             and exists(select 1 from assessment_types where type_name = 'unit_check')
             and exists(select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'attempts' and column_name = 'unit_check_item_id') as ok`,
  },
  {
    migration: "037_review_loop.sql",
    what: "mastery trigger that schedules objectives reaching Guided for review",
    sql: `select exists(select 1 from pg_trigger where tgname = 'mastery_review_enrol' and not tgisinternal) as ok`,
  },
  {
    // 037 adds the key NOT VALID; only 037b validates it (and enrols existing
    // learners), so a validated key is the sign 037b ran.
    migration: "037b_review_loop_backfill.sql",
    what: "existing Guided+ objectives scheduled for review (037b)",
    sql: `select exists(select 1 from pg_constraint where conname = 'attempts_unit_check_item_fkey' and convalidated) as ok`,
  },
  {
    // REQ-112: the integration rule (unit-scope types, zero-weight and
    // non-spacing types left out, min_format_wins), not just its name.
    migration: "041_mastery_rule_integration.sql",
    what: "assessment_types.spacing_evidence / min_format_wins and the 041 mastery_detail() (every graded answer)",
    sql: `select (select count(*) from information_schema.columns
                   where table_schema = 'public' and table_name = 'assessment_types'
                     and column_name in ('spacing_evidence', 'min_format_wins')) = 2
             and exists(select 1 from pg_proc where proname = 'mastery_detail' and prosrc like '%min_format_wins%')
             and to_regprocedure('public.attempt_spaced(uuid)') is not null as ok`,
  },
  {
    migration: "041_mastery_rule_integration.sql",
    what: "attempts.part_scores column (PBQ per-part scores on a replayed answer)",
    sql: `select exists(select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'attempts' and column_name = 'part_scores') as ok`,
  },
  {
    // REQ-114: shared-item quality (flags, quarantine, holdbacks, voided
    // answers) and the one-line voided filter in mastery_detail().
    migration: "042_item_quality.sql",
    what: "item_flags / item_status / item_holdbacks / item_quality_params, attempts.voided_at, and mastery_detail() leaving voided answers out",
    sql: `select to_regclass('public.item_flags') is not null
             and to_regclass('public.item_status') is not null
             and to_regclass('public.item_holdbacks') is not null
             and exists(select 1 from item_quality_params where name = 'quarantine_flag_threshold')
             and exists(select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'attempts' and column_name = 'voided_at')
             and exists(select 1 from pg_proc where proname = 'mastery_detail' and prosrc like '%a.voided_at is null%') as ok`,
  },
  {
    // 041b is data, not schema: its backup table is the one object it
    // creates. Remove this probe when the backup is dropped (runbook).
    migration: "041b_mastery_rule_backfill.sql",
    what: "mastery_backup_041 table (041b backup and recompute under the integration rule ran)",
    sql: `select to_regclass('public.mastery_backup_041') is not null as ok`,
  },
  {
    // REQ-116: requireUser reads token_version on every authenticated
    // request, so without it every signed-in route fails.
    migration: "044_auth_hardening.sql",
    what: "app_users.token_version, totp_pending_reauth_at, email-change cancel and set-password columns (every signed-in request)",
    sql: `select (select count(*) from information_schema.columns
                   where table_schema = 'public'
                     and ((table_name = 'app_users' and column_name in ('token_version', 'totp_pending_reauth_at'))
                       or (table_name = 'email_change_tokens' and column_name in ('cancel_token_hash', 'token_version', 'cancelled_at'))
                       or (table_name = 'email_verification_tokens' and column_name = 'set_password'))) = 6 as ok`,
  },
  {
    // REQ-117: the Audit 3 rule (unit-wide answers accuracy only, help lowers
    // weight, comparison cards never open Independent, spaced Transfer-ready),
    // the kept / re-check definition and the grading lease.
    migration: "045_mastery_honesty.sql",
    what: "assessment_types.opens_independent / win_needs_spacing, the 045 mastery_detail(), review_state() and grading_claims",
    sql: `select (select count(*) from information_schema.columns
                   where table_schema = 'public' and table_name = 'assessment_types'
                     and column_name in ('opens_independent', 'win_needs_spacing')) = 2
             and exists(select 1 from pg_proc where proname = 'mastery_detail' and prosrc like '%opens_independent%')
             and to_regprocedure('public.review_state(uuid, uuid, date)') is not null
             and to_regclass('public.grading_claims') is not null
             and exists(select 1 from mastery_model_params where name = 'readiness_min_kept_share') as ok`,
  },
  {
    // Remove this probe when the backup is dropped (runbook).
    migration: "045b_mastery_honesty_backfill.sql",
    what: "mastery_backup_045 table (045b backup and recompute under the 045 rule ran)",
    sql: `select to_regclass('public.mastery_backup_045') is not null as ok`,
  },
  {
    // FAIL-119: 029b is data, not schema, so no object above notices if it
    // was skipped -- and skipping it leaves every learner on the old levels.
    // Its backup table is the one object it creates. (When the backups are
    // dropped after 30 days -- docs/deploy-runbook-mastery.md -- remove this
    // probe in the same change.)
    migration: "029b_mastery_backfill.sql",
    what: "mastery_backup_029 table (029b backup, backfill and first recompute ran)",
    sql: `select to_regclass('public.mastery_backup_029') is not null as ok`,
  },
  {
    migration: "043_ai_budget_index.sql",
    what: "ai_calls (user_id, created_at) index (daily AI budget per learner; the check runs without it, slowly)",
    sql: `select to_regclass('public.ai_calls_user_created_idx') is not null as ok`,
  },
  {
    // REQ-118 (Audit 3 performance): without these the code still works, but
    // review/today, account deletion and the history screen read whole
    // tables or a learner's whole history. Kept last so the merge with other
    // branches' probes (044, 045) stays clean.
    migration: "046_perf_indexes.sql",
    what: "performance indexes on attempts, item_flags, review items and the attempt_id foreign keys (account deletion)",
    sql: `select to_regclass('public.attempts_user_unit_created') is not null
             and to_regclass('public.attempts_unit') is not null
             and to_regclass('public.item_flags_user') is not null
             and to_regclass('public.review_session_items_answered') is not null
             and to_regclass('public.error_log_attempt') is not null
             and to_regclass('public.review_log_attempt') is not null
             and to_regclass('public.review_session_items_attempt') is not null
             and to_regclass('public.exam_session_items_attempt') is not null
             and to_regclass('public.placement_items_attempt') is not null as ok`,
  },
];

export interface SchemaStatus {
  current: boolean;
  missing: { migration: string; what: string }[];
}

type QueryFn = (sql: string) => Promise<Array<{ ok: boolean }>>;

// Takes the query function as an argument so the health route, the
// migrate CLI and the tests can each pass their own connection.
export async function checkSchema(run: QueryFn, probes: SchemaProbe[] = SCHEMA_PROBES): Promise<SchemaStatus> {
  const missing: SchemaStatus["missing"] = [];
  for (const p of probes) {
    let ok = false;
    try {
      ok = (await run(p.sql))[0]?.ok === true;
    } catch (err) {
      // A lost connection is an outage, not a missing migration: rethrow so
      // /api/health answers 500 instead of naming migrations to apply.
      if (isConnectionError(err)) throw err;
      ok = false; // e.g. the probe's table itself doesn't exist yet
    }
    if (!ok) missing.push({ migration: p.migration, what: p.what });
  }
  return { current: missing.length === 0, missing };
}

// SQLSTATE classes 08 (connection exception), 57P (operator intervention,
// e.g. admin shutdown) and 53300 (too many connections), plus Node socket
// errors. Anything else -- undefined_table above all -- means the object
// the probe looks for is missing.
export function isConnectionError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code !== "string") return false;
  return code.startsWith("08") || code.startsWith("57P") || code === "53300" || code.startsWith("E");
}

// Migrations named by the missing probes, deduplicated, in apply order.
export function migrationsToApply(status: SchemaStatus): string[] {
  return [...new Set(status.missing.map((m) => m.migration))].sort();
}

// FAIL-119: how many stored mastery levels differ from what
// mastery_from_attempts() gives now (rows that would change), plus pairs with
// graded lesson attempts and no mastery row. Informational, for
// `npm run migrate -- --status` and the deploy runbook: not 0 straight after
// 029b means the old code graded in the deploy gap, or the batched recompute
// has not run yet. Reads every mastery row, so it is not part of /api/health.
export const MASTERY_DRIFT_SQL = `
  select (select count(*) from mastery m
            cross join lateral mastery_from_attempts(m.user_id, m.objective_id) f
           where (m.status, m.score_0_4, m.evidence) is distinct from (f.status, f.score, f.evidence))::int as differing,
         -- REQ-112: the recompute's own pair list (mastery_pairs, 029/041), so
         -- pairs with only exam, review or comparison answers are seen too.
         (select count(*) from mastery_pairs() p
           where not exists (select 1 from mastery m where m.user_id = p.user_id and m.objective_id = p.objective_id)
         )::int as missing`;

export interface MasteryDrift {
  differing: number;
  missing: number;
}

export async function masteryDrift(
  run: (sql: string) => Promise<Array<Record<string, unknown>>>
): Promise<MasteryDrift | null> {
  try {
    const r = (await run(MASTERY_DRIFT_SQL))[0];
    return { differing: Number(r?.differing ?? 0), missing: Number(r?.missing ?? 0) };
  } catch {
    return null; // 029 not applied yet: there is no rule to compare against
  }
}

export function formatMasteryDrift(d: MasteryDrift | null): string {
  if (!d) return "Mastery vs. rule: not checked (mastery_from_attempts() is missing; apply 029 first).";
  if (d.differing === 0 && d.missing === 0) return "Mastery vs. rule: every stored level matches mastery_from_attempts().";
  return (
    `Mastery vs. rule: ${d.differing} stored level(s) differ from mastery_from_attempts(), ` +
    `${d.missing} graded pair(s) have no mastery row. Run \`call recompute_mastery_batched();\` ` +
    `(docs/deploy-runbook-mastery.md). Informational; does not fail --status.`
  );
}
