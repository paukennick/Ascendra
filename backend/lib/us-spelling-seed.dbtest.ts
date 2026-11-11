// REQ-220 (FAIL-1138): moving the seed to US spelling retitles hundreds of
// objectives in place. A retitle that only changes British to US spelling is
// the same objective, so the seed keeps its stored lessons and items (a real
// retitle still deletes them, learning-data-f3.dbtest.ts).
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { seedTrack } from "../supabase/seed/seed-lib";
import type { SeedTrack } from "../supabase/seed/data";

const run = Date.now().toString(36).toUpperCase();
const code = `USSP${run}`;
let pool: Pool;

before(() => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
});
after(async () => {
  await query(`delete from subject_tracks where code = $1`, [code]);
  await pool.end();
  await closePool();
});

const mk = (titles: string[]): SeedTrack => ({
  code,
  title: "Spelling retitle",
  description: "REQ-220",
  trackType: "certification",
  units: [{ title: "Unit", objectives: titles }],
});

describe("US-spelling retitles keep generated content (REQ-220)", () => {
  test("British -> US spelling keeps the lesson and items; a real retitle still removes them", async () => {
    await seedTrack(pool, null, mk(["Recognise the organisation's behaviour", "Prioritise care"]));
    const rows = await query<{ id: string }>(
      `select o.id from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
        where st.code = $1 order by o.sort_order`,
      [code]
    );
    for (const { id } of rows) {
      await query(
        `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
         values ($1,'g','t','f','["a","b","c","d"]',0,'w','s','["a","b","c","d"]',0,'w','test')`,
        [id]
      );
      await query(`insert into review_items (objective_id, question, choices, correct_index, why, source_hash, model) values ($1,'RQ','["a","b","c","d"]',0,'w','h','t')`, [id]);
    }
    await seedTrack(pool, null, mk(["Recognize the organization's behavior", "Prioritize triage, not care"]));
    const state = async (id: string) => ({
      title: (await queryOne<{ title: string }>(`select title from objectives where id = $1`, [id]))!.title,
      lessons: (await queryOne<{ n: number }>(`select count(*)::int as n from lesson_content where objective_id = $1`, [id]))!.n,
      pulled: (await queryOne<{ n: number }>(`select count(*)::int as n from item_status where objective_id = $1 and reason = 'objective_retitled'`, [id]))!.n,
    });
    assert.deepEqual(await state(rows[0].id), { title: "Recognize the organization's behavior", lessons: 1, pulled: 0 });
    assert.deepEqual(await state(rows[1].id), { title: "Prioritize triage, not care", lessons: 0, pulled: 1 });
  });
});
