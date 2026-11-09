// REQ-168: release backup housekeeping against a real Postgres. Only tables
// whose names the rest of the suite can never use are created, and all of
// them are dropped again afterwards.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { query, closePool } from "./db";
import { runHousekeeping } from "../scripts/backup-housekeeping-lib";

const OTHER_SCHEMA = "req168_other";
const PUBLIC_TABLES = [
  "backup_release_20200101", // expired: dropped
  "backup_release_20200102", // expired: dropped
  "backup_release_20991231", // future: kept
  "backup_release_20201332", // malformed date: ignored
  "backup_release_20200101_old", // bad name: ignored
];

async function exists(schema: string, name: string): Promise<boolean> {
  const [r] = await query<{ ok: boolean }>(`select to_regclass($1) is not null as ok`, [`${schema}."${name}"`]);
  return r.ok;
}

async function cleanup() {
  for (const t of PUBLIC_TABLES) await query(`drop table if exists public."${t}"`);
  await query(`drop schema if exists ${OTHER_SCHEMA} cascade`);
}

describe("backup housekeeping (database)", () => {
  before(async () => {
    await cleanup();
    for (const t of PUBLIC_TABLES) await query(`create table public."${t}" (id int)`);
    await query(`insert into public."backup_release_20200101" select generate_series(1, 7)`);
    await query(`create schema ${OTHER_SCHEMA}`);
    await query(`create table ${OTHER_SCHEMA}."backup_release_20200101" (id int)`);
  });
  after(async () => {
    await cleanup();
    await closePool();
  });

  const run = (dryRun: boolean, lines: string[]) =>
    runHousekeeping({
      query: (text, params) => query(text, params ?? []),
      now: new Date("2026-12-08T09:17:00Z"),
      dryRun,
      log: (l) => lines.push(l),
    });

  test("dry run reports with row counts and drops nothing", async () => {
    const lines: string[] = [];
    const r = await run(true, lines);
    const mine = r.dropped.filter((d) => PUBLIC_TABLES.includes(d.name));
    assert.deepEqual(mine.map((d) => [d.name, d.rows]), [
      ["backup_release_20200101", 7],
      ["backup_release_20200102", 0],
    ]);
    for (const t of PUBLIC_TABLES) assert.ok(await exists("public", t), t);
    assert.ok(lines.includes("would drop backup_release_20200101: dated 2020-01-01, 2533 day(s) old, 7 row(s)"));
  });

  test("apply drops only expired public.backup_release_YYYYMMDD tables", async () => {
    const lines: string[] = [];
    await run(false, lines);
    assert.equal(await exists("public", "backup_release_20200101"), false);
    assert.equal(await exists("public", "backup_release_20200102"), false);
    assert.ok(await exists("public", "backup_release_20991231"));
    assert.ok(await exists("public", "backup_release_20201332"));
    assert.ok(await exists("public", "backup_release_20200101_old"));
    assert.ok(await exists(OTHER_SCHEMA, "backup_release_20200101"), "another schema is never touched");
    assert.ok(lines.includes("dropped backup_release_20200101: dated 2020-01-01, 2533 day(s) old, 7 row(s)"));
  });
});
