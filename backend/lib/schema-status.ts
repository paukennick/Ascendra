// REQ-090: does the live database have the schema this code needs?
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
    migration: "025_lesson_progress.sql",
    what: "lesson_progress table (resume lessons across devices)",
    sql: `select to_regclass('public.lesson_progress') is not null as ok`,
  },
  {
    migration: "025_lesson_progress.sql",
    what: "attempts.client_attempt_id column (every graded answer)",
    sql: `select exists(
            select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'attempts' and column_name = 'client_attempt_id'
          ) as ok`,
  },
  {
    migration: "026_chat_client_message_id.sql",
    what: "chat_messages.client_message_id unique index (every chat message)",
    sql: `select to_regclass('public.chat_messages_user_client_message_unique') is not null as ok`,
  },
  {
    migration: "027_lesson_overrides.sql",
    what: "lesson_content_overrides table (per-learner regenerated lessons)",
    sql: `select to_regclass('public.lesson_content_overrides') is not null as ok`,
  },
  {
    migration: "027_lesson_overrides.sql",
    what: "lesson_generation_claims table (lesson generation across servers)",
    sql: `select to_regclass('public.lesson_generation_claims') is not null as ok`,
  },
  {
    migration: "028_ai_calls.sql",
    what: "ai_calls table (AI call log; calls still work without it, but cost and latency go unrecorded)",
    sql: `select to_regclass('public.ai_calls') is not null as ok`,
  },
  {
    // The 025 probe above only checks the column. Without this unique index
    // a retried answer would insert a second attempt silently instead of
    // replaying the first (REQ-089). The CLI applies 025 in one transaction,
    // so this can only be missing if 025 was pasted by hand and half-applied.
    migration: "025_lesson_progress.sql",
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
    // 041b is data, not schema: its backup table is the one object it
    // creates. Remove this probe when the backup is dropped (runbook).
    migration: "041b_mastery_rule_backfill.sql",
    what: "mastery_backup_041 table (041b backup and recompute under the integration rule ran)",
    sql: `select to_regclass('public.mastery_backup_041') is not null as ok`,
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
