// REQ-168: rolling clean-up of release backup tables.
//
// A release backup is either a table public.backup_release_YYYYMMDD or a
// whole schema backup_release_YYYYMMDD (the 2026-11-07 release made the
// schema backup_release_20261107, 32 tables). Both are kept for
// RETENTION_DAYS days and then dropped by the weekly
// .github/workflows/backup-housekeeping.yml run (so within 7 days after).
//
// What may be dropped is deliberately narrow:
//   - a table in schema public, or a schema, whose name is exactly
//     backup_release_ followed by 8 digits;
//   - those digits are a real calendar date (UTC);
//   - that date is MORE than RETENTION_DAYS days before the run date (UTC).
//     Exactly RETENTION_DAYS days old is kept; a date in the future is kept.
// Every other table or schema -- mastery_backup_029,
// backup_release_20261107_old, backup_release_20261332, a backup-named table
// in another schema -- is never touched. Tables are dropped without CASCADE.
// A schema is dropped with CASCADE (its own contents), after logging each of
// its tables with its row count, and is refused if anything outside it
// depends on it.
//
// Pure filter first (unit tested in backup-housekeeping-lib.test.ts), then
// the database part, which takes the query function so the integration test
// (lib/backup-housekeeping.dbtest.ts) can run it against local Postgres.

export const RETENTION_DAYS = 30;
export const BACKUP_TABLE_PATTERN = /^backup_release_([0-9]{8})$/;

const DAY_MS = 86_400_000;

/** The calendar date in a backup table's name, or null if the name is not a release backup. */
export function backupDate(name: string): Date | null {
  const m = BACKUP_TABLE_PATTERN.exec(name);
  if (!m) return null;
  const y = Number(m[1].slice(0, 4));
  const mo = Number(m[1].slice(4, 6));
  const d = Number(m[1].slice(6, 8));
  const date = new Date(Date.UTC(y, mo - 1, d));
  // Date.UTC rolls 2026-02-30 over to March 2; a real date round-trips.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** Midnight UTC of the run date. */
export function runDate(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type BackupDecision =
  | { name: string; action: "drop"; date: string; ageDays: number }
  | { name: string; action: "keep"; date: string; ageDays: number }
  | { name: string; action: "ignore"; reason: string };

export function classifyBackup(name: string, now: Date, retentionDays = RETENTION_DAYS): BackupDecision {
  if (!BACKUP_TABLE_PATTERN.test(name)) return { name, action: "ignore", reason: "name is not backup_release_YYYYMMDD" };
  const date = backupDate(name);
  if (!date) return { name, action: "ignore", reason: "the 8 digits are not a calendar date" };
  const ageDays = Math.round((runDate(now).getTime() - date.getTime()) / DAY_MS);
  const iso = date.toISOString().slice(0, 10);
  return ageDays > retentionDays ? { name, action: "drop", date: iso, ageDays } : { name, action: "keep", date: iso, ageDays };
}

export type Query = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

/** A double-quoted SQL identifier (any name, quotes doubled). */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export interface HousekeepingResult {
  dryRun: boolean;
  runDate: string;
  dropped: { kind: "table" | "schema"; name: string; date: string; ageDays: number; rows: number; tables?: { name: string; rows: number }[] }[];
  kept: { kind: "table" | "schema"; name: string; date: string; ageDays: number }[];
  ignored: { kind: "table" | "schema"; name: string; reason: string }[];
  /** Expired schemas left in place because something outside them depends on them. */
  refused: { name: string; dependents: string[] }[];
}

// Objects OUTSIDE schema $1 that depend on a relation inside it: views (via
// their rewrite rule), foreign keys, and any other relation. DROP SCHEMA ...
// CASCADE would silently drop those too, so a schema with any is refused.
const OUTSIDE_DEPENDENTS_SQL = `
  select distinct dn.nspname || '.' || dc.relname as dependent
    from pg_depend d
    join pg_class src on d.refclassid = 'pg_class'::regclass and d.refobjid = src.oid
    join pg_namespace sn on sn.oid = src.relnamespace
    left join pg_rewrite rw on d.classid = 'pg_rewrite'::regclass and d.objid = rw.oid
    left join pg_constraint con on d.classid = 'pg_constraint'::regclass and d.objid = con.oid
    join pg_class dc on dc.oid = coalesce(rw.ev_class, con.conrelid, case when d.classid = 'pg_class'::regclass then d.objid end)
    join pg_namespace dn on dn.oid = dc.relnamespace
   where sn.nspname = $1 and dn.nspname <> $1
   order by 1`;

/**
 * Finds release backups -- tables in public named backup_release_YYYYMMDD and
 * schemas named backup_release_YYYYMMDD -- and drops the ones past retention
 * (or, with dryRun, only says it would). Logs one line per backup it looks at
 * and, for a schema, one per table in it with its row count. Never logs
 * connection details: it only ever sees names, dates and counts.
 */
export async function runHousekeeping(opts: {
  query: Query;
  now?: Date;
  dryRun: boolean;
  log?: (line: string) => void;
  retentionDays?: number;
}): Promise<HousekeepingResult> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? ((l: string) => console.log(l));
  const retention = opts.retentionDays ?? RETENTION_DAYS;
  const verb = opts.dryRun ? "would drop" : "dropped";
  const result: HousekeepingResult = {
    dryRun: opts.dryRun,
    runDate: runDate(now).toISOString().slice(0, 10),
    dropped: [],
    kept: [],
    ignored: [],
    refused: [],
  };
  log(`Release backup housekeeping, run date ${result.runDate} (UTC), retention ${retention} days, ${opts.dryRun ? "DRY RUN: nothing is dropped" : "dropping"}.`);

  const sort = (decisions: BackupDecision[], kind: "table" | "schema") => {
    const expired: Extract<BackupDecision, { action: "drop" }>[] = [];
    for (const d of decisions) {
      if (d.action === "ignore") {
        result.ignored.push({ kind, name: d.name, reason: d.reason });
        log(`ignore ${kind} ${d.name}: ${d.reason}; not touched`);
      } else if (d.action === "keep") {
        result.kept.push({ kind, name: d.name, date: d.date, ageDays: d.ageDays });
        log(`keep ${kind} ${d.name}: dated ${d.date}, ${d.ageDays} day(s) old (dropped once older than ${retention})`);
      } else expired.push(d);
    }
    return expired;
  };

  // 1. Tables in public. The LIKE only narrows the list; classifyBackup
  //    decides. Only ordinary and partitioned tables (pg_tables).
  const tables = await opts.query(
    `select tablename from pg_tables where schemaname = 'public' and tablename like 'backup\\_release\\_%' order by tablename`
  );
  for (const d of sort(tables.map((r) => classifyBackup(String(r.tablename), now, retention)), "table")) {
    // The name passed BACKUP_TABLE_PATTERN, so it is only [a-z0-9_].
    const ident = `public.${quoteIdent(d.name)}`;
    const [{ n }] = (await opts.query(`select count(*)::bigint as n from ${ident}`)) as { n: number | string }[];
    const rows = Number(n);
    // No CASCADE: if anything depends on a backup table, fail loudly instead.
    if (!opts.dryRun) await opts.query(`drop table ${ident}`);
    result.dropped.push({ kind: "table", name: d.name, date: d.date, ageDays: d.ageDays, rows });
    log(`${verb} table public.${d.name}: dated ${d.date}, ${d.ageDays} day(s) old, ${rows} row(s)`);
  }

  // 2. Whole schemas (the 2026-11-07 release backup is one). Same exact
  //    name and the same 30-day rule; public never matches.
  const schemas = await opts.query(
    `select nspname from pg_namespace where nspname like 'backup\\_release\\_%' order by nspname`
  );
  for (const d of sort(schemas.map((r) => classifyBackup(String(r.nspname), now, retention)), "schema")) {
    const schema = quoteIdent(d.name);
    const dependents = (await opts.query(OUTSIDE_DEPENDENTS_SQL, [d.name])).map((r) => String(r.dependent));
    if (dependents.length) {
      result.refused.push({ name: d.name, dependents });
      log(`REFUSED schema ${d.name}: dated ${d.date}, ${d.ageDays} day(s) old, but ${dependents.join(", ")} depend(s) on it and CASCADE would drop or change them too; not touched`);
      continue;
    }
    const inSchema = await opts.query(`select tablename from pg_tables where schemaname = $1 order by tablename`, [d.name]);
    const counted: { name: string; rows: number }[] = [];
    for (const t of inSchema) {
      const name = String(t.tablename);
      const [{ n }] = (await opts.query(`select count(*)::bigint as n from ${schema}.${quoteIdent(name)}`)) as { n: number | string }[];
      counted.push({ name, rows: Number(n) });
      log(`  ${d.name}.${name}: ${Number(n)} row(s)`);
    }
    const rows = counted.reduce((a, t) => a + t.rows, 0);
    // CASCADE only here, and only for a schema whose name matched exactly and
    // that nothing outside depends on: it removes the schema's own contents.
    if (!opts.dryRun) await opts.query(`drop schema ${schema} cascade`);
    result.dropped.push({ kind: "schema", name: d.name, date: d.date, ageDays: d.ageDays, rows, tables: counted });
    log(`${verb} schema ${d.name}: dated ${d.date}, ${d.ageDays} day(s) old, ${counted.length} table(s), ${rows} row(s) in all`);
  }

  log(
    `${opts.dryRun ? "Would drop" : "Dropped"} ${result.dropped.length}, kept ${result.kept.length}, ignored ${result.ignored.length}, refused ${result.refused.length}.`
  );
  return result;
}

export function parseHousekeepingArgs(argv: string[]): { dryRun: boolean } | string {
  const apply = argv.includes("--apply");
  const dry = argv.includes("--dry-run");
  if (apply && dry) return "Pass --dry-run or --apply, not both.";
  const unknown = argv.filter((a) => a !== "--apply" && a !== "--dry-run");
  if (unknown.length) return `Unknown argument(s): ${unknown.join(" ")}. Use --dry-run (the default) or --apply.`;
  return { dryRun: !apply };
}
