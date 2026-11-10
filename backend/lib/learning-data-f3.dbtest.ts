// REQ-204 (FAIL-891, FAIL-892, FAIL-893, and FAIL-890's seed half). Real
// Postgres with every migration applied; no model.
//
//   FAIL-891  answering a Solo item the learner had already seen counted as a
//             spaced review of the objective's due entries.
//   FAIL-892  GET /api/attempts?limit=-1 was a 500.
//   FAIL-893  the seed matches objectives by sort_order, so an objective
//             retitled in place kept the lesson and items written for the old
//             title.
//   FAIL-890  when the seed retires a unit its learners' open review entries
//             are resolved.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { signAccessToken } from "./auth/tokens";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { seedTrack } from "../supabase/seed/seed-lib";
import type { SeedTrack } from "../supabase/seed/data";
import { GET as attemptsGet } from "../app/api/attempts/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objective = randomUUID();
const users: string[] = [];
let pool: Pool;

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
  return u;
}

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Misc', 'certification', null)`, [track, `LD${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [unit, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 1)`, [objective, unit]);
});
after(async () => {
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1 or code like $2`, [track, `LDS${run}%`]);
  await pool.end();
  await closePool();
});

describe("FAIL-891: a repeated Solo answer is not spaced review", () => {
  const solo = (u: string, q: string, verdict: "correct" | "incorrect") =>
    recordAttemptAndUpdateMastery({ userId: u, unitId: unit, objectiveId: objective, kind: "lesson", stage: "solo", format: "open", question: q, answer: "my answer", verdict, classification: "none" });
  const stage = async (u: string) => (await queryOne<{ review_stage: number }>(`select review_stage from error_log where id = $1`, [due.get(u)]))!.review_stage;
  const due = new Map<string, string>();

  test("a correct answer to a question already answered leaves a due entry where it was; a new question moves it", async () => {
    const u = await newUser();
    await solo(u, `Q1 ${run}`, "incorrect");
    const e = await queryOne<{ id: string }>(
      `insert into error_log (user_id, unit_id, objective_id, topic, error_text, review_stage, next_review_at) values ($1,$2,$3,'t','e',0,current_date) returning id`,
      [u, unit, objective]
    );
    due.set(u, e!.id);
    const repeat = await solo(u, `Q1 ${run}`, "correct");
    assert.equal((repeat as { assist_reason: string }).assist_reason, "repeat");
    assert.equal(await stage(u), 0, "re-answering a seen question is not a review");
    await solo(u, `Q2 ${run}`, "correct");
    assert.equal(await stage(u), 1, "a first answer to a new question is");
  });
});

describe("FAIL-892: /api/attempts validates limit", () => {
  const get = async (qs: string) => {
    const u = users[0] ?? (await newUser());
    const res = await attemptsGet(new Request(`http://t/api/attempts${qs}`, { headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` } }));
    return { status: res.status, body: (await res.json()) as { error?: string; attempts?: unknown[] } };
  };
  test("-1, 0, 1.5, text and empty are 400; none, 1 and a huge number are 200", async () => {
    for (const bad of ["-1", "0", "1.5", "abc", "", "1e999", "NaN"]) {
      const r = await get(`?limit=${bad}`);
      assert.equal(r.status, 400, `limit=${bad} -> ${r.status} ${JSON.stringify(r.body)}`);
      assert.match(r.body.error ?? "", /limit/);
    }
    for (const good of ["", "?limit=1", "?limit=100000"]) assert.equal((await get(good)).status, 200, good);
  });
});

describe("FAIL-893 / FAIL-890: the seed", () => {
  const code = `LDS${run}`;
  const mk = (titles: string[], retiredAt?: string): SeedTrack => ({
    code,
    title: "Seed retitle",
    description: "REQ-204",
    trackType: "certification",
    units: [
      { title: "Kept", objectives: titles },
      { title: "Other", objectives: ["Other objective"], ...(retiredAt ? { retiredAt } : {}) },
    ],
  });
  const ids = async () =>
    query<{ id: string; title: string; unit_title: string }>(
      `select o.id, o.title, cu.title as unit_title from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
        where st.code = $1 and st.user_id is null order by cu.sort_order, o.sort_order`,
      [code]
    );
  const generated = async (o: string) => ({
    lesson: (await queryOne<{ n: number }>(`select count(*)::int as n from lesson_content where objective_id = $1`, [o]))!.n,
    override: (await queryOne<{ n: number }>(`select count(*)::int as n from lesson_content_overrides where objective_id = $1`, [o]))!.n,
    pulled: (await query<{ item_kind: string }>(`select item_kind from item_status where objective_id = $1 and reason = 'objective_retitled' order by item_kind`, [o])).map((r) => r.item_kind),
  });

  test("retitling an objective in place deletes its stored lessons and pulls its items; an unchanged one keeps them", async () => {
    await seedTrack(pool, null, mk(["Alpha", "Beta"]));
    const [alpha, beta] = await ids();
    const u = await newUser();
    for (const o of [alpha.id, beta.id]) {
      await query(
        `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
         values ($1,'g','t','f','["a","b","c","d"]',0,'w','s','["a","b","c","d"]',0,'w','test')`,
        [o]
      );
      await query(
        `insert into lesson_content_overrides (user_id, objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
         values ($1,$2,'g','t','f','["a","b","c","d"]',0,'w','s','["a","b","c","d"]',0,'w','test')`,
        [u, o]
      );
      await query(`insert into review_items (objective_id, question, choices, correct_index, why, source_hash, model) values ($1,'RQ','["a","b","c","d"]',0,'w','h','t')`, [o]);
      await query(`insert into exam_items (objective_id, item_format, stem, body, answer_key, source) values ($1,'multiple_choice','EQ',$2::jsonb,$3::jsonb,'generated')`, [o, JSON.stringify({ choices: ["a", "b", "c", "d"] }), JSON.stringify({ correct: [0] })]);
    }
    await seedTrack(pool, null, mk(["Alpha", "Beta, renamed"]));
    assert.deepEqual(await generated(alpha.id), { lesson: 1, override: 1, pulled: [] }, "same title: untouched");
    assert.deepEqual(await generated(beta.id), { lesson: 0, override: 0, pulled: ["exam", "review"] });
    const after = await ids();
    assert.equal(after[1].id, beta.id, "same row, so learner history stays attached");
    assert.equal(after[1].title, "Beta, renamed");
    // A third seed run with the same titles changes nothing more.
    await seedTrack(pool, null, mk(["Alpha", "Beta, renamed"]));
    assert.deepEqual(await generated(beta.id), { lesson: 0, override: 0, pulled: ["exam", "review"] });
  });

  test("a lesson a person corrected is kept when the title changes", async () => {
    const [alpha] = await ids();
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1,'g','t','f','["a","b","c","d"]',0,'w','s','["a","b","c","d"]',0,'w','corrected:fix-1') on conflict (objective_id) do update set model = excluded.model`,
      [alpha.id]
    );
    await seedTrack(pool, null, mk(["Alpha v2", "Beta, renamed"]));
    assert.equal((await generated(alpha.id)).lesson, 1);
  });

  test("retiring a unit resolves its learners' open review entries (and only those)", async () => {
    const [, , other] = await ids();
    const [alpha] = await ids();
    const u = await newUser();
    const mkEntry = (unitTitle: string, objectiveId: string) =>
      query(
        `insert into error_log (user_id, unit_id, objective_id, topic, error_text, review_stage, next_review_at)
         select $1, o.unit_id, o.id, $3, 'e', 0, current_date from objectives o where o.id = $2`,
        [u, objectiveId, unitTitle]
      );
    await mkEntry("retired-one", other.id);
    await mkEntry("kept-one", alpha.id);
    await seedTrack(pool, null, mk(["Alpha v2", "Beta, renamed"], "2026-01-01T00:00:00Z"));
    const rows = await query<{ topic: string; resolved: boolean; next_review_at: Date | null }>(`select topic, resolved, next_review_at from error_log where user_id = $1 order by topic`, [u]);
    assert.deepEqual(rows.map((r) => [r.topic, r.resolved, r.next_review_at === null]), [
      ["kept-one", false, false],
      ["retired-one", true, true],
    ]);
  });
});
