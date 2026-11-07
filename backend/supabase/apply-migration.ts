// Applies one migration file from supabase/migrations against DATABASE_URL,
// inside a single transaction. Until now the documented path was pasting
// each file into the Supabase SQL editor by hand (README, "Getting
// Started"); this is the same thing without the copy-paste, and it refuses
// to run a file twice by recording what it applied in schema_migrations.
//
// Usage (from backend/):
//   npm run migrate -- 023_shared_catalog.sql
//   npm run migrate -- --all        # every file not yet recorded, in order
//   npm run migrate -- --status     # what this database is missing (REQ-090)
//
// Every migration in this repo is additive and written with IF NOT EXISTS /
// ON CONFLICT guards, so re-running one by hand remains safe; the ledger is
// a convenience, not a lock.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import "./seed/env-local";
import { checkSchema, formatMasteryDrift, masteryDrift, migrationsToApply } from "../lib/schema-status";

const MIGRATIONS_DIR = join(__dirname, "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (backend/.env.local).");
  const arg = process.argv[2];
  if (!arg) throw new Error("Pass a migration filename, --all, or --status.");

  const pool = new Pool({ connectionString, ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false } });
  try {
    // --status must not write anything, so it only reads the ledger if one
    // already exists; applying creates it.
    if (arg !== "--status") {
      await pool.query(
        `create table if not exists schema_migrations (
           filename text primary key,
           applied_at timestamptz not null default now()
         )`
      );
    }
    const hasLedger = (await pool.query<{ ok: boolean }>(
      `select to_regclass('public.schema_migrations') is not null as ok`
    )).rows[0]?.ok;
    const applied = new Set(
      hasLedger
        ? (await pool.query<{ filename: string }>(`select filename from schema_migrations`)).rows.map((r) => r.filename)
        : []
    );

    // REQ-090: read-only report. Probes the objects the code needs (see
    // lib/schema-status.ts) -- those are reliable even for migrations that
    // were pasted into the SQL editor and never recorded in the ledger --
    // and lists repo migrations the ledger hasn't seen, for context.
    if (arg === "--status") {
      const status = await checkSchema(async (sql) => (await pool.query<{ ok: boolean }>(sql)).rows);
      const unrecorded = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql") && !applied.has(f))
        .sort();
      if (status.current) {
        console.log("Schema is current: every object the code needs is present.");
      } else {
        console.log("Schema is MISSING objects the code needs:");
        for (const m of status.missing) console.log(`  - ${m.what}  (${m.migration})`);
        console.log(`Apply: ${migrationsToApply(status).map((f) => `npm run migrate -- ${f}`).join(" && ")}`);
      }
      // FAIL-119: informational -- levels the rule would change.
      console.log(formatMasteryDrift(await masteryDrift(async (sql) => (await pool.query(sql)).rows)));
      if (unrecorded.length) {
        console.log(
          `\nNot in the schema_migrations ledger (${unrecorded.length}). Normal for migrations applied ` +
            `through the SQL editor; the probes above are what decide.\n  ${unrecorded.join("\n  ")}`
        );
      }
      process.exitCode = status.current ? 0 : 2;
      return;
    }

    const files =
      arg === "--all"
        ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
        : [arg];

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip ${file} (already recorded)`);
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(`insert into schema_migrations (filename) values ($1)`, [file]);
        await client.query("commit");
        console.log(`applied ${file}`);
      } catch (err) {
        await client.query("rollback");
        throw new Error(`${file} failed and was rolled back: ${(err as Error).message}`);
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
