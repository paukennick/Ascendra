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
    // repeats (FAIL-110/111).
    // Once 031's rule is installed the 031 probes below judge the function:
    // re-applying 029 would put the old rule back, so this one doesn't ask for it.
    what: "mastery_from_attempts() function, current version (every graded answer)",
    sql: `select exists(select 1 from pg_proc where proname = 'mastery_from_attempts' and prosrc like '%mastery_detail%')
             or coalesce((select status = 'Not started'
                             from mastery_from_attempts('00000000-0000-0000-0000-000000000000'::uuid,
                                                        '00000000-0000-0000-0000-000000000000'::uuid)), false) as ok`,
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
    } catch {
      ok = false; // e.g. the probe's table itself doesn't exist yet
    }
    if (!ok) missing.push({ migration: p.migration, what: p.what });
  }
  return { current: missing.length === 0, missing };
}

// Migrations named by the missing probes, deduplicated, in apply order.
export function migrationsToApply(status: SchemaStatus): string[] {
  return [...new Set(status.missing.map((m) => m.migration))].sort();
}
