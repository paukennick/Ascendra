// Seed script: writes every catalog track with its real units/objectives.
//
// REQ-082: catalog tracks are shared -- user_id NULL, visible to every
// account -- rather than copied under one user. If DEFAULT_USER_EMAIL names
// an existing account that still owns a private copy of a catalog track
// (the pre-REQ-082 layout), that copy is adopted into the shared catalog
// in place: same row id, so every mastery/attempt/favorite/acknowledgement
// row pointing at it keeps working. The script no longer creates or
// renames any user.
// Idempotent: safe to re-run (uses ON CONFLICT / existence checks throughout), so it
// won't duplicate rows on a second run.
//
// Tracks that carry a `credential` (the AWS certification tracks) additionally
// seed the taxonomy records added by migration 007: the vendor, the credential,
// the specific exam version, and that exam's weighted domains. Run migration 007
// before seeding those, or the credential inserts will fail on missing tables.
//
// Usage:
//   cd backend
//   npm install
//   DATABASE_URL=postgres://... npm run seed
// (or set DATABASE_URL / DEFAULT_USER_EMAIL in a .env.local — this script loads it if present)

import { Pool } from "pg";
import "./env-local"; // must run before ./data so DEFAULT_USER_EMAIL is already set
import { SEED_USER_EMAIL } from "./data";
import { CATALOG_TRACKS } from "./catalog";
import { seedLabs, seedTrack } from "./seed-lib";
import { LAB_SETS } from "./labs";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (set it in backend/.env.local or the environment).");
  }
  const pool = new Pool({ connectionString, ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false } });

  try {
    // REQ-102: the seed writes retired_at (migration 033). Fail with the fix
    // rather than a bare "column does not exist" halfway through the catalog.
    const has033 = await pool.query<{ ok: boolean }>(
      `select count(*) = 2 as ok from information_schema.columns
        where table_schema = 'public' and column_name = 'retired_at'
          and table_name in ('course_units', 'objectives')`
    );
    if (!has033.rows[0]?.ok) {
      throw new Error("course_units/objectives.retired_at missing -- run `npm run migrate -- 033_exam_blueprints.sql` before seeding.");
    }
    // REQ-194: the seed writes subject_tracks.hidden_at (migration 065).
    const has065 = await pool.query<{ ok: boolean }>(
      `select count(*) = 1 as ok from information_schema.columns
        where table_schema = 'public' and table_name = 'subject_tracks' and column_name = 'hidden_at'`
    );
    if (!has065.rows[0]?.ok) {
      throw new Error("subject_tracks.hidden_at missing -- run `npm run migrate -- 065_track_hidden_at.sql` before seeding.");
    }

    // Legacy owner whose private catalog copies get adopted (see header).
    const legacy = await pool.query(`select id from app_users where email = $1`, [SEED_USER_EMAIL]);
    const userId: string | null = (legacy.rows[0]?.id as string | undefined) ?? null;
    console.log(
      userId
        ? `legacy catalog owner ${SEED_USER_EMAIL} -> ${userId} (private copies will be adopted into the shared catalog)`
        : `no legacy catalog owner for ${SEED_USER_EMAIL}; seeding shared catalog only`
    );

    // REQ-102: one list, shared with the blueprint tests (./catalog.ts).
    for (const track of CATALOG_TRACKS) {
      await seedTrack(pool, userId, track);
    }

    // REQ-123: authored labs, after every track so their objectives exist.
    const hasLabs = await pool.query<{ ok: boolean }>(`select to_regclass('public.labs') is not null as ok`);
    if (!hasLabs.rows[0]?.ok) {
      throw new Error("labs table missing -- run `npm run migrate -- 050_lab_engine.sql` before seeding.");
    }
    for (const set of LAB_SETS) {
      const n = await seedLabs(pool, set);
      console.log(`labs: ${set.trackCode} -> ${n} authored lab(s)`);
    }

    console.log("Seed complete.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
