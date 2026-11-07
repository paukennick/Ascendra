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
    what: "mastery_from_attempts() function (every graded answer)",
    sql: `select to_regprocedure('public.mastery_from_attempts(uuid,uuid)') is not null as ok`,
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
    migration: "030_hardening_indexes.sql",
    what: "chat_messages (user_id, track_id, created_at) index (chat history and replay)",
    sql: `select to_regclass('public.idx_chat_messages_user_track_created') is not null as ok`,
  },
  {
    migration: "030_hardening_indexes.sql",
    what: "study_sessions (user_id, track_id, started_at) index (sessions, Continue studying)",
    sql: `select to_regclass('public.idx_study_sessions_user_track_started') is not null as ok`,
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
