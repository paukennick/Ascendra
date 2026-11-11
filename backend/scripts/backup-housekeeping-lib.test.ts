// REQ-168: the name/date filter for release backup housekeeping.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { backupDate, classifyBackup, parseHousekeepingArgs, quoteIdent, runHousekeeping, RETENTION_DAYS, type Query } from "./backup-housekeeping-lib";

const at = (iso: string) => new Date(iso);

describe("backupDate", () => {
  test("reads a real date", () => {
    assert.equal(backupDate("backup_release_20261107")?.toISOString(), "2026-11-07T00:00:00.000Z");
    assert.equal(backupDate("backup_release_20240229")?.toISOString(), "2024-02-29T00:00:00.000Z");
  });
  test("rejects malformed dates", () => {
    for (const n of [
      "backup_release_20261332", // month 13
      "backup_release_20261300",
      "backup_release_20260001", // month 0
      "backup_release_20261100", // day 0
      "backup_release_20261131", // November 31
      "backup_release_20260230", // February 30
      "backup_release_20250229", // not a leap year
    ]) {
      assert.equal(backupDate(n), null, n);
    }
  });
});

describe("classifyBackup", () => {
  test("bad names are ignored, never dropped", () => {
    const now = at("2030-01-01T00:00:00Z");
    for (const n of [
      "backup_release_2026110", // 7 digits
      "backup_release_202611070", // 9 digits
      "backup_release_2026-11-07",
      "backup_release_20261107_old",
      "backup_release_20261107 ",
      " backup_release_20261107",
      "xbackup_release_20261107",
      "Backup_release_20261107",
      "BACKUP_RELEASE_20261107",
      "backup_release_",
      "backup_release_abcdefgh",
      "backup_release_２０２６１１０７", // full-width digits
      "backup_release_20261107\n",
      "mastery_backup_029",
      "error_log_backup_029",
      "backup_20261107",
      "app_users",
    ]) {
      assert.equal(classifyBackup(n, now).action, "ignore", JSON.stringify(n));
    }
  });

  test("malformed dates are ignored", () => {
    assert.deepEqual(classifyBackup("backup_release_20261332", at("2030-01-01T00:00:00Z")), {
      name: "backup_release_20261332",
      action: "ignore",
      reason: "the 8 digits are not a calendar date",
    });
  });

  test("future dates are kept", () => {
    const d = classifyBackup("backup_release_20261210", at("2026-11-09T12:00:00Z"));
    assert.equal(d.action, "keep");
    assert.equal(d.action === "keep" && d.ageDays, -31);
  });

  test("today is kept", () => {
    assert.equal(classifyBackup("backup_release_20261109", at("2026-11-09T23:59:59Z")).action, "keep");
  });

  test("exactly 30 days old is kept; 31 is dropped", () => {
    assert.equal(RETENTION_DAYS, 30);
    const kept = classifyBackup("backup_release_20261107", at("2026-12-07T23:59:59.999Z"));
    assert.deepEqual(kept, { name: "backup_release_20261107", action: "keep", date: "2026-11-07", ageDays: 30 });
    const dropped = classifyBackup("backup_release_20261107", at("2026-12-08T00:00:00Z"));
    assert.deepEqual(dropped, { name: "backup_release_20261107", action: "drop", date: "2026-11-07", ageDays: 31 });
  });

  test("the run date is the UTC date, whatever the time of day", () => {
    // 2026-12-07 23:30 in Seattle is already 2026-12-08 in UTC.
    assert.equal(classifyBackup("backup_release_20261107", at("2026-12-07T23:30:00-08:00")).action, "drop");
    assert.equal(classifyBackup("backup_release_20261107", at("2026-12-07T15:59:00-08:00")).action, "keep");
  });

  test("the first weekly run that drops the Nov 7 backup is Tuesday Dec 8 2026; Dec 1 does not", () => {
    assert.equal(classifyBackup("backup_release_20261107", at("2026-12-08T09:17:00Z")).action, "drop");
    assert.equal(classifyBackup("backup_release_20261107", at("2026-12-01T09:17:00Z")).action, "keep");
  });

  test("across month and leap-year boundaries", () => {
    // 2024-02-29 + 30 days = 2024-03-30.
    assert.equal(classifyBackup("backup_release_20240229", at("2024-03-30T12:00:00Z")).action, "keep");
    assert.equal(classifyBackup("backup_release_20240229", at("2024-03-31T00:00:00Z")).action, "drop");
    // 2026-12-15 + 30 days = 2027-01-14.
    assert.equal(classifyBackup("backup_release_20261215", at("2027-01-14T00:00:00Z")).action, "keep");
    assert.equal(classifyBackup("backup_release_20261215", at("2027-01-15T00:00:00Z")).action, "drop");
  });
});

describe("quoteIdent", () => {
  test("doubles embedded quotes", () => {
    assert.equal(quoteIdent("app_users"), '"app_users"');
    assert.equal(quoteIdent('we"ird'), '"we""ird"');
  });
});

describe("runHousekeeping (fake database)", () => {
  // tables: public tables -> rows. schemas: schema -> (table -> rows).
  // dependents: schema -> outside objects that depend on it.
  function fakeDb(tables: Record<string, number>, schemas: Record<string, Record<string, number>> = {}, dependents: Record<string, string[]> = {}) {
    const calls: string[] = [];
    const q: Query = async (text, params = []) => {
      calls.push(text);
      if (text.includes("from pg_tables where schemaname = 'public'")) return Object.keys(tables).sort().map((tablename) => ({ tablename }));
      if (text.includes("from pg_namespace")) return Object.keys(schemas).sort().map((nspname) => ({ nspname }));
      if (text.includes("from pg_depend")) return (dependents[String(params[0])] ?? []).map((dependent) => ({ dependent }));
      if (text.includes("from pg_tables where schemaname = $1")) return Object.keys(schemas[String(params[0])] ?? {}).sort().map((tablename) => ({ tablename }));
      let m = /^select count\(\*\)::bigint as n from public\."([a-z0-9_]+)"$/.exec(text);
      if (m) return [{ n: String(tables[m[1]]) }];
      m = /^select count\(\*\)::bigint as n from "([a-z0-9_]+)"\."([a-z0-9_]+)"$/.exec(text);
      if (m) return [{ n: String(schemas[m[1]][m[2]]) }];
      m = /^drop table public\."([a-z0-9_]+)"$/.exec(text);
      if (m) {
        delete tables[m[1]];
        return [];
      }
      m = /^drop schema "([a-z0-9_]+)" cascade$/.exec(text);
      if (m) {
        delete schemas[m[1]];
        return [];
      }
      throw new Error(`unexpected SQL: ${text}`);
    };
    return { q, calls, tables, schemas };
  }

  const fixture = () => ({
    backup_release_20261001: 12,
    backup_release_20261107: 3456,
    backup_release_20261332: 1,
    backup_release_20261107_old: 2,
    backup_release_20270101: 5,
  });
  const schemaFixture = () => ({
    backup_release_20261107: { app_users: 3, attempts: 25 },
    backup_release_20261201: { app_users: 4 },
    backup_release_20261107_old: { app_users: 1 },
    backup_release_20261131: { app_users: 1 },
  });

  test("dry run counts and logs but drops nothing", async () => {
    const db = fakeDb(fixture(), schemaFixture());
    const lines: string[] = [];
    const r = await runHousekeeping({ query: db.q, now: at("2026-12-08T09:17:00Z"), dryRun: true, log: (l) => lines.push(l) });
    assert.equal(db.calls.filter((c) => c.startsWith("drop")).length, 0);
    assert.equal(Object.keys(db.tables).length, 5);
    assert.equal(Object.keys(db.schemas).length, 4);
    assert.deepEqual(r.dropped.map((d) => [d.kind, d.name, d.rows, d.date]), [
      ["table", "backup_release_20261001", 12, "2026-10-01"],
      ["table", "backup_release_20261107", 3456, "2026-11-07"],
      ["schema", "backup_release_20261107", 28, "2026-11-07"],
    ]);
    assert.ok(lines.includes("would drop table public.backup_release_20261107: dated 2026-11-07, 31 day(s) old, 3456 row(s)"));
    assert.ok(lines.includes("  backup_release_20261107.attempts: 25 row(s)"));
    assert.ok(lines.includes("would drop schema backup_release_20261107: dated 2026-11-07, 31 day(s) old, 2 table(s), 28 row(s) in all"));
    assert.ok(lines[0].includes("DRY RUN"));
  });

  test("apply drops only expired, well-formed backup tables and schemas", async () => {
    const db = fakeDb(fixture(), schemaFixture());
    const lines: string[] = [];
    const r = await runHousekeeping({ query: db.q, now: at("2026-12-08T09:17:00Z"), dryRun: false, log: (l) => lines.push(l) });
    assert.deepEqual(Object.keys(db.tables).sort(), ["backup_release_20261107_old", "backup_release_20261332", "backup_release_20270101"]);
    assert.deepEqual(Object.keys(db.schemas).sort(), ["backup_release_20261107_old", "backup_release_20261131", "backup_release_20261201"]);
    assert.deepEqual(r.kept.map((k) => `${k.kind}:${k.name}`), ["table:backup_release_20270101", "schema:backup_release_20261201"]);
    assert.deepEqual(r.ignored.map((k) => `${k.kind}:${k.name}`), [
      "table:backup_release_20261107_old",
      "table:backup_release_20261332",
      "schema:backup_release_20261107_old",
      "schema:backup_release_20261131",
    ]);
    assert.ok(lines.includes("dropped table public.backup_release_20261001: dated 2026-10-01, 68 day(s) old, 12 row(s)"));
    // Tables never CASCADE; only the exact-named schema does.
    assert.ok(db.calls.filter((c) => c.startsWith("drop table")).every((c) => !/cascade/i.test(c)));
    assert.deepEqual(db.calls.filter((c) => /cascade/i.test(c)), ['drop schema "backup_release_20261107" cascade']);
    // Nothing but names, dates and counts reach the log.
    assert.ok(lines.every((l) => !/postgres(ql)?:\/\//i.test(l)));
  });

  test("the Nov 7 schema is kept by the weekly runs before Dec 8 and dropped on Dec 8", async () => {
    for (const [day, dropped] of [
      ["2026-11-10", false],
      ["2026-11-17", false],
      ["2026-11-24", false],
      ["2026-12-01", false],
      ["2026-12-08", true],
    ] as const) {
      const db = fakeDb({}, { backup_release_20261107: { app_users: 3 } });
      await runHousekeeping({ query: db.q, now: at(`${day}T09:17:00Z`), dryRun: false, log: () => {} });
      assert.equal(!("backup_release_20261107" in db.schemas), dropped, day);
    }
  });

  test("an expired schema with outside dependents is refused, not dropped", async () => {
    const db = fakeDb({}, { backup_release_20261001: { app_users: 3 } }, { backup_release_20261001: ["public.report_view"] });
    const lines: string[] = [];
    const r = await runHousekeeping({ query: db.q, now: at("2026-12-08T09:17:00Z"), dryRun: false, log: (l) => lines.push(l) });
    assert.ok("backup_release_20261001" in db.schemas);
    assert.deepEqual(r.refused, [{ name: "backup_release_20261001", dependents: ["public.report_view"] }]);
    assert.equal(db.calls.filter((c) => c.startsWith("drop")).length, 0);
    assert.ok(lines.some((l) => l.startsWith("REFUSED schema backup_release_20261001")));
  });
});

describe("parseHousekeepingArgs", () => {
  test("dry run is the default", () => {
    assert.deepEqual(parseHousekeepingArgs([]), { dryRun: true });
    assert.deepEqual(parseHousekeepingArgs(["--dry-run"]), { dryRun: true });
    assert.deepEqual(parseHousekeepingArgs(["--apply"]), { dryRun: false });
  });
  test("rejects both or unknown flags", () => {
    assert.equal(typeof parseHousekeepingArgs(["--apply", "--dry-run"]), "string");
    assert.equal(typeof parseHousekeepingArgs(["--force"]), "string");
  });
});
