// REQ-168: release backup housekeeping against a real Postgres. Only tables
// and schemas whose names the rest of the suite can never use are created,
// and all of them are dropped again afterwards.
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
const SCHEMAS = [
  "backup_release_20200103", // expired, two tables: dropped (CASCADE)
  "backup_release_20200104", // expired, but a public view depends on it: refused
  "backup_release_20991230", // future: kept
  "backup_release_20200103_old", // bad name: survives
  "backup_release_20200231", // malformed date: survives
  OTHER_SCHEMA, // holds a backup-named table: never touched
];

async function relExists(schema: string, name: string): Promise<boolean> {
  const [r] = await query<{ ok: boolean }>(`select to_regclass($1) is not null as ok`, [`"${schema}"."${name}"`]);
  return r.ok;
}
async function schemaExists(name: string): Promise<boolean> {
  const [r] = await query<{ ok: boolean }>(`select exists(select 1 from pg_namespace where nspname = $1) as ok`, [name]);
  return r.ok;
}

async function cleanup() {
  await query(`drop view if exists public.req168_report`);
  for (const t of PUBLIC_TABLES) await query(`drop table if exists public."${t}"`);
  for (const s of SCHEMAS) await query(`drop schema if exists "${s}" cascade`);
}

describe("backup housekeeping (database)", () => {
  before(async () => {
    await cleanup();
    for (const t of PUBLIC_TABLES) await query(`create table public."${t}" (id int)`);
    await query(`insert into public."backup_release_20200101" select generate_series(1, 7)`);
    for (const s of SCHEMAS) await query(`create schema "${s}"`);
    await query(`create table "backup_release_20200103".app_users (id int)`);
    await query(`create table "backup_release_20200103".attempts (id int)`);
    await query(`insert into "backup_release_20200103".app_users select generate_series(1, 3)`);
    await query(`insert into "backup_release_20200103".attempts select generate_series(1, 25)`);
    await query(`create table "backup_release_20200104".app_users (id int)`);
    await query(`create view public.req168_report as select count(*) as n from "backup_release_20200104".app_users`);
    await query(`create table "backup_release_20991230".app_users (id int)`);
    await query(`create table "backup_release_20200103_old".app_users (id int)`);
    await query(`create table "backup_release_20200231".app_users (id int)`);
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
    const mine = r.dropped.filter((d) => PUBLIC_TABLES.includes(d.name) || SCHEMAS.includes(d.name));
    assert.deepEqual(mine.map((d) => [d.kind, d.name, d.rows]), [
      ["table", "backup_release_20200101", 7],
      ["table", "backup_release_20200102", 0],
      ["schema", "backup_release_20200103", 28],
    ]);
    for (const t of PUBLIC_TABLES) assert.ok(await relExists("public", t), t);
    for (const s of SCHEMAS) assert.ok(await schemaExists(s), s);
    assert.ok(lines.includes("would drop table public.backup_release_20200101: dated 2020-01-01, 2533 day(s) old, 7 row(s)"));
    assert.ok(lines.includes("  backup_release_20200103.attempts: 25 row(s)"));
    assert.ok(lines.includes("would drop schema backup_release_20200103: dated 2020-01-03, 2531 day(s) old, 2 table(s), 28 row(s) in all"));
  });

  test("apply drops only expired exact-named tables and schemas", async () => {
    const lines: string[] = [];
    const r = await run(false, lines);
    assert.equal(await relExists("public", "backup_release_20200101"), false);
    assert.equal(await relExists("public", "backup_release_20200102"), false);
    assert.ok(await relExists("public", "backup_release_20991231"));
    assert.ok(await relExists("public", "backup_release_20201332"));
    assert.ok(await relExists("public", "backup_release_20200101_old"));
    assert.equal(await schemaExists("backup_release_20200103"), false, "expired schema dropped");
    assert.ok(await schemaExists("backup_release_20991230"), "future schema kept");
    assert.ok(await schemaExists("backup_release_20200103_old"), "non-matching schema survives");
    assert.ok(await relExists("backup_release_20200103_old", "app_users"));
    assert.ok(await schemaExists("backup_release_20200231"), "malformed-date schema survives");
    assert.ok(await relExists(OTHER_SCHEMA, "backup_release_20200101"), "another schema is never touched");
    // Refused, and the public view CASCADE would have taken survives.
    assert.ok(await schemaExists("backup_release_20200104"));
    assert.ok(await relExists("public", "req168_report"));
    assert.deepEqual(r.refused, [{ name: "backup_release_20200104", dependents: ["public.req168_report"] }]);
    assert.ok(lines.includes("dropped schema backup_release_20200103: dated 2020-01-03, 2531 day(s) old, 2 table(s), 28 row(s) in all"));
  });
});
