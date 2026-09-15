// Seed script: creates the single app user (if missing) and the two starting tracks
// (MSCS Foundations Coach, Security+ Coach) with their real units/objectives.
// Idempotent: safe to re-run (uses ON CONFLICT / existence checks throughout), so it
// won't duplicate rows on a second run.
//
// Usage:
//   cd backend
//   npm install
//   DATABASE_URL=postgres://... npm run seed
// (or set DATABASE_URL / DEFAULT_USER_EMAIL in a .env.local — this script loads it if present)

import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { MSCS_TRACK, SECPLUS_TRACK, SEED_USER_EMAIL, type SeedTrack } from "./data";

// Minimal .env.local loader so `npm run seed` works without extra tooling.
function loadDotEnvLocal() {
  const envPath = path.resolve(__dirname, "../../.env.local");
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotEnvLocal();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (set it in backend/.env.local or the environment).");
  }
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const userRes = await pool.query(
      `insert into app_users (email, display_name)
       values ($1, $2)
       on conflict (email) do update set display_name = excluded.display_name
       returning id`,
      [SEED_USER_EMAIL, "Pak"]
    );
    const userId = userRes.rows[0].id as string;
    console.log(`app_users: ${SEED_USER_EMAIL} -> ${userId}`);

    await seedTrack(pool, userId, MSCS_TRACK);
    await seedTrack(pool, userId, SECPLUS_TRACK);

    console.log("Seed complete.");
  } finally {
    await pool.end();
  }
}

async function seedTrack(pool: Pool, userId: string, track: SeedTrack) {
  const existing = await pool.query(
    `select id from subject_tracks where user_id = $1 and code = $2`,
    [userId, track.code]
  );

  let trackId: string;
  if (existing.rows[0]) {
    trackId = existing.rows[0].id;
    await pool.query(
      `update subject_tracks set title = $1, description = $2, track_type = $3 where id = $4`,
      [track.title, track.description, track.trackType, trackId]
    );
    console.log(`subject_tracks: ${track.code} already exists -> ${trackId} (updated title/description)`);
  } else {
    const res = await pool.query(
      `insert into subject_tracks (user_id, code, title, description, track_type)
       values ($1,$2,$3,$4,$5) returning id`,
      [userId, track.code, track.title, track.description, track.trackType]
    );
    trackId = res.rows[0].id;
    console.log(`subject_tracks: created ${track.code} -> ${trackId}`);
  }

  for (let i = 0; i < track.units.length; i++) {
    const unit = track.units[i];
    const existingUnit = await pool.query(
      `select id from course_units where track_id = $1 and sort_order = $2`,
      [trackId, i]
    );

    let unitId: string;
    if (existingUnit.rows[0]) {
      unitId = existingUnit.rows[0].id;
      await pool.query(
        `update course_units set title = $1, range_label = $2, weight = $3, gate_description = $4 where id = $5`,
        [unit.title, unit.rangeLabel ?? null, unit.weight ?? null, unit.gate ?? null, unitId]
      );
    } else {
      const res = await pool.query(
        `insert into course_units (track_id, title, range_label, weight, sort_order, gate_description)
         values ($1,$2,$3,$4,$5,$6) returning id`,
        [trackId, unit.title, unit.rangeLabel ?? null, unit.weight ?? null, i, unit.gate ?? null]
      );
      unitId = res.rows[0].id;
    }

    for (let j = 0; j < unit.objectives.length; j++) {
      const objTitle = unit.objectives[j];
      const lab = unit.labs?.[j] ?? null;
      const existingObj = await pool.query(
        `select id from objectives where unit_id = $1 and sort_order = $2`,
        [unitId, j]
      );
      if (existingObj.rows[0]) {
        await pool.query(`update objectives set title = $1, lab_prompt = $2 where id = $3`, [
          objTitle,
          lab,
          existingObj.rows[0].id,
        ]);
      } else {
        await pool.query(
          `insert into objectives (unit_id, title, sort_order, lab_prompt) values ($1,$2,$3,$4)`,
          [unitId, objTitle, j, lab]
        );
      }
    }
  }

  console.log(`  seeded ${track.units.length} units for ${track.code}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
