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
