// REQ-118 (Audit 3 LOW-11 / HIGH-1): informational lines for
// `npm run migrate -- --status`, so routine upkeep is seen where the deploy
// runbook already sends you.
//
//   - Rollback backups (mastery_backup_029/031/041/..., error_log_backup_029)
//     are meant to be dropped after 30 days (they ran 53-87 MB each on the
//     audit fixture) but nothing reminded anyone. Their age comes from the
//     schema_migrations row of the backfill that made them.
//   - Postgres jit (Audit 3 HIGH-1).
// Neither changes the exit code.

export const BACKUP_DROP_AFTER_DAYS = 30;

export const BACKUPS_SQL = `
  select c.relname as name,
         pg_total_relation_size(c.oid)::bigint as bytes,
         (select floor(extract(epoch from now() - min(m.applied_at)) / 86400)::int
            from schema_migrations m
           where to_regclass('public.schema_migrations') is not null
             and m.filename like substring(c.relname from '_backup_(\\d+)$') || 'b\\_%') as age_days
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relname ~ '^(mastery|error_log)_backup_\\d+$'
   order by c.relname`;

export interface BackupRow {
  name: string;
  bytes: number;
  age_days: number | null;
}

export function formatBackups(rows: BackupRow[], dropAfter = BACKUP_DROP_AFTER_DAYS): string[] {
  if (!rows.length) return ["Rollback backups: none."];
  const mb = (b: number) => `${(Number(b) / 1024 / 1024).toFixed(0)} MB`;
  const due = rows.filter((r) => r.age_days !== null && r.age_days >= dropAfter);
  const lines = rows.map(
    (r) =>
      `  ${r.name}: ${mb(r.bytes)}, ${r.age_days === null ? "age unknown" : `${r.age_days} day(s) old`}` +
      (r.age_days !== null && r.age_days >= dropAfter ? "  <- past 30 days" : "")
  );
  return [
    `Rollback backups (${rows.length}):`,
    ...lines,
    due.length
      ? `  ${due.length} past ${dropAfter} days: drop them and remove their probes (docs/deploy-runbook-integration.md, "Cleanup").`
      : `  None is past ${dropAfter} days yet.`,
  ];
}

export function formatJit(jitOn: boolean | null): string {
  if (jitOn === null) return "Postgres jit: not checked.";
  return jitOn
    ? "Postgres jit: ON -- course readiness runs 10-100x slower. Run `alter role <app role> set jit = off` (docs/operations-runbook.md, \"Postgres settings\")."
    : "Postgres jit: off.";
}
