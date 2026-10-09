// Applies one migration file from supabase/migrations against DATABASE_URL,
// inside a single transaction. Until now the documented path was pasting
// each file into the Supabase SQL editor by hand (README, "Getting
// Started"); this is the same thing without the copy-paste, and it refuses
// to run a file twice by recording what it applied in schema_migrations.
//
// Usage (from backend/):
//   npm run migrate -- 023_shared_catalog.sql
//   npm run migrate -- --all        # every file not yet recorded, in order
//
// Every migration in this repo is additive and written with IF NOT EXISTS /
// ON CONFLICT guards, so re-running one by hand remains safe; the ledger is
// a convenience, not a lock.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import "./seed/env-local";

const MIGRATIONS_DIR = join(__dirname, "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (backend/.env.local).");
  const arg = process.argv[2];
  if (!arg) throw new Error("Pass a migration filename, or --all.");

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(
      `create table if not exists schema_migrations (
         filename text primary key,
         applied_at timestamptz not null default now()
       )`
    );
    const applied = new Set(
      (await pool.query<{ filename: string }>(`select filename from schema_migrations`)).rows.map((r) => r.filename)
    );

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
