// REQ-168: rolling clean-up of release backup tables.
//
// A release takes a full backup into public.backup_release_YYYYMMDD (the
// 2026-11-07 release made backup_release_20261107). Those tables are kept
// for RETENTION_DAYS days and then dropped by the monthly
// .github/workflows/backup-housekeeping.yml run.
//
// What may be dropped is deliberately narrow:
//   - schema public only;
//   - the name is exactly backup_release_ followed by 8 digits;
//   - those digits are a real calendar date (UTC);
//   - that date is MORE than RETENTION_DAYS days before the run date (UTC).
//     Exactly RETENTION_DAYS days old is kept; a date in the future is kept.
// Every other table -- mastery_backup_029, backup_release_20261107_old,
// backup_release_20261332, a table in another schema -- is never touched.
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

export interface HousekeepingResult {
  dryRun: boolean;
  runDate: string;
  dropped: { name: string; date: string; ageDays: number; rows: number }[];
  kept: { name: string; date: string; ageDays: number }[];
  ignored: { name: string; reason: string }[];
}

/**
 * Finds release backups in public and drops the ones past retention (or, with
 * dryRun, only says it would). Logs one line per table it looks at. Never logs
 * connection details: it only ever sees table names and counts.
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
  // The LIKE only narrows the list; classifyBackup decides. Only ordinary and
  // partitioned tables (pg_tables), only schema public.
  const rows = await opts.query(
    `select tablename from pg_tables where schemaname = 'public' and tablename like 'backup\\_release\\_%' order by tablename`
  );
  const result: HousekeepingResult = { dryRun: opts.dryRun, runDate: runDate(now).toISOString().slice(0, 10), dropped: [], kept: [], ignored: [] };
  log(`Release backup housekeeping, run date ${result.runDate} (UTC), retention ${retention} days, ${opts.dryRun ? "DRY RUN: nothing is dropped" : "dropping"}.`);
  for (const r of rows) {
    const d = classifyBackup(String(r.tablename), now, retention);
    if (d.action === "ignore") {
      result.ignored.push({ name: d.name, reason: d.reason });
      log(`ignore ${d.name}: ${d.reason}; not touched`);
      continue;
    }
    if (d.action === "keep") {
      result.kept.push({ name: d.name, date: d.date, ageDays: d.ageDays });
      log(`keep ${d.name}: dated ${d.date}, ${d.ageDays} day(s) old (dropped once older than ${retention})`);
      continue;
    }
    // The name passed BACKUP_TABLE_PATTERN, so it is only [a-z0-9_]; quoting
    // it is belt and braces.
    const ident = `public."${d.name}"`;
    const [{ n }] = (await opts.query(`select count(*)::bigint as n from ${ident}`)) as { n: number | string }[];
    const count = Number(n);
    if (!opts.dryRun) {
      // No CASCADE: if anything depends on a backup, fail loudly instead.
      await opts.query(`drop table ${ident}`);
    }
    result.dropped.push({ name: d.name, date: d.date, ageDays: d.ageDays, rows: count });
    log(`${opts.dryRun ? "would drop" : "dropped"} ${d.name}: dated ${d.date}, ${d.ageDays} day(s) old, ${count} row(s)`);
  }
  log(
    `${opts.dryRun ? "Would drop" : "Dropped"} ${result.dropped.length}, kept ${result.kept.length}, ignored ${result.ignored.length}.`
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
