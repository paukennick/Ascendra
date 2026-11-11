// FAIL-894: the placement check draws its questions from lesson_content (the
// shared Guided item) and must skip a lesson check that was pulled, like every
// other reader of lesson_content (lessonServableSql). Against a real Postgres.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { query, closePool } from "./db";
import { answerPlacement, placementView, startPlacement } from "./placement";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = Array.from({ length: 7 }, () => randomUUID());
let user: string;
const md5 = (s: string) => createHash("md5").update(s).digest("hex");
const fade = (i: number) => `Which port does HTTPS use? (${i})`;
const solo = (i: number) => `Which port does SSH use? (${i})`;

before(async () => {
  user = randomUUID();
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `placement-${run}@example.test`]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Placement track', 'certification', null)`, [track, `PS${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Unit', 1, 100)`, [unit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `Objective ${i + 1}`, i + 1]);
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', 't', $2, '["a","b","c","d"]', 1, 'w', $3, '["a","b","c","d"]', 1, 'w', 'x')`,
      [o, fade(i), solo(i)]
    );
  }
  const pull = (o: string, i: number, key: "fade" | "solo", status: string) =>
    query(
      `insert into item_status (item_kind, item_id, objective_id, question, status, reason, flag_count)
       values ('lesson', $1, $2, 'q', $3, 'flag_and_recheck', 1)`,
      [`${o}:${key}:${md5(key === "fade" ? fade(i) : solo(i))}`, o, status]
    );
  await pull(objs[0], 0, "fade", "quarantined");
  await pull(objs[1], 1, "solo", "quarantined"); // either check pulls the lesson
  await pull(objs[2], 2, "fade", "cleared"); // cleared again: served
});

after(async () => {
  await query(`delete from item_status where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from attempts where user_id = $1`, [user]);
  await query(`delete from app_users where id = $1`, [user]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("FAIL-894: placement skips a pulled lesson check", () => {
  test("the check is offered only the five servable objectives, and never asks a pulled one", async () => {
    const started = await startPlacement(user, track);
    assert.ok(!("error" in started), "enough servable objectives to start");
    const asked: string[] = [];
    for (let guard = 0; guard < 10; guard++) {
      const v = await placementView(user, track);
      if (v.status !== "active" || !v.current) break;
      asked.push(v.current.objectiveId);
      const r = await answerPlacement(user, track, v.current.seq, 0, randomUUID());
      assert.equal(r.status, "ok");
    }
    assert.ok(asked.length >= 1);
    assert.ok(!asked.includes(objs[0]), "a quarantined Guided check is not asked");
    assert.ok(!asked.includes(objs[1]), "a lesson with a quarantined Solo check is not asked");
    for (const a of asked) assert.ok((objs as string[]).includes(a));
    const done = await placementView(user, track);
    assert.equal(done.status, "done");
    assert.ok(done.asked <= 5, "at most the five servable objectives");
  });

  test("a course whose servable objectives fall below the minimum has no placement check", async () => {
    const t2 = randomUUID();
    const u2 = randomUUID();
    const os = [randomUUID(), randomUUID(), randomUUID()];
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Small', 'certification', null)`, [t2, `PT${run}`]);
    await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [u2, t2]);
    try {
      for (const [i, o] of os.entries()) {
        await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, u2, `O${i}`, i + 1]);
        await query(
          `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
           values ($1, 'g', 't', $2, '["a","b","c","d"]', 1, 'w', $3, '["a","b","c","d"]', 1, 'w', 'x')`,
          [o, `fade small ${i}`, `solo small ${i}`]
        );
      }
      assert.equal((await placementView(user, t2)).available, true);
      await query(
        `insert into item_status (item_kind, item_id, objective_id, question, status, reason, flag_count)
         values ('lesson', $1, $2, 'q', 'quarantined', 'flag_and_recheck', 1)`,
        [`${os[0]}:fade:${md5("fade small 0")}`, os[0]]
      );
      assert.equal((await placementView(user, t2)).available, false, "two servable objectives are not enough");
      assert.deepEqual(await startPlacement(user, t2), { error: "unavailable" });
    } finally {
      await query(`delete from item_status where objective_id = any($1::uuid[])`, [os]);
      await query(`delete from subject_tracks where id = $1`, [t2]);
    }
  });
});
