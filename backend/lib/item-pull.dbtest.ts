// REQ-204 (FAIL-885, FAIL-886): a pulled item stays pulled. Real Postgres with
// every migration applied; no model.
//
//   FAIL-885  a lesson check confirmed wrong came back in mock exams: it is
//             copied into exam_items (source 'lesson') for learners who
//             answered it, the copy was not filtered and was not pulled, and
//             the answers given to the copy were not voided.
//   FAIL-886  an item a person cleared could never be pulled again: later
//             flags only bumped flag_count.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { bankItems, copyAnsweredLessonChecks } from "./exam-items";
import { clearItem, clearStaged, confirmItemWrong, itemStatus, lessonItemId, recordFlag, type ItemRef } from "./item-quality";
import { storedBefore } from "./recheck-stored";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = Array.from({ length: 5 }, () => randomUUID());
const users: string[] = [];
const CHOICES = ["80", "443", "8080", "22"];
const FADE = (o: string) => `Guided ${o}: which port does HTTPS use by default?`;
const SOLO = (o: string) => `Solo ${o}: name the default HTTPS port.`;

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `ip-${run}-${users.length}@example.test`]);
  return u;
}
async function insertLesson(o: string, generatedAt = "now()") {
  await query(
    `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
       solo_check, solo_choices, solo_correct_index, solo_why, model, generated_at)
     values ($1,'g','Teaching text.',$2,$4::jsonb,1,'w',$3,$4::jsonb,1,'w','test', ${generatedAt})`,
    [o, FADE(o), SOLO(o), JSON.stringify(CHOICES)]
  );
}
const answerLesson = (u: string, o: string, stage: "fade" | "solo", question: string) =>
  query(
    `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict) values ($1,$2,$3,'lesson',$4,'mc',$5,'443','correct')`,
    [u, unit, o, stage, question]
  );
const lessonRef = (o: string, stage: "fade" | "solo"): ItemRef => {
  const q = stage === "fade" ? FADE(o) : SOLO(o);
  return { kind: "lesson", itemId: lessonItemId(o, stage, q), objectiveId: o, question: q };
};
const copyOf = (o: string, q: string) => queryOne<{ id: string }>(`select id from exam_items where objective_id = $1 and source = 'lesson' and stem = $2`, [o, q]);

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Item pull', 'certification', null)`, [track, `IP${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [unit, track]);
  for (const [i, o] of objs.entries()) await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `O${i}`, i]);
});
after(async () => {
  await query(`delete from item_status where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from item_flags where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("FAIL-885: a wrong lesson key does not come back in a mock exam", () => {
  test("a pulled lesson check is not copied into the exam bank", async () => {
    const o = objs[0];
    await insertLesson(o);
    const u = await newUser();
    await answerLesson(u, o, "fade", FADE(o));
    await answerLesson(u, o, "solo", SOLO(o));
    await query(`insert into item_status (item_kind, item_id, objective_id, question, status, reason) values ('lesson', $1, $2, $3, 'quarantined', 'flags')`, [
      lessonItemId(o, "solo", SOLO(o)), o, SOLO(o),
    ]);
    assert.equal(await copyAnsweredLessonChecks(u, [o]), 1, "only the fade check, which is still served");
    assert.ok(await copyOf(o, FADE(o)));
    assert.equal(await copyOf(o, SOLO(o)), null);
  });

  test("an existing copy stops being served when its lesson check is quarantined", async () => {
    const o = objs[1];
    await insertLesson(o);
    const u = await newUser();
    await answerLesson(u, o, "fade", FADE(o));
    await copyAnsweredLessonChecks(u, [o]);
    assert.equal((await bankItems(u, [o], ["multiple_choice"])).length, 1);
    await query(`insert into item_status (item_kind, item_id, objective_id, question, status, reason) values ('lesson', $1, $2, $3, 'quarantined', 'flags')`, [
      lessonItemId(o, "fade", FADE(o)), o, FADE(o),
    ]);
    assert.equal((await bankItems(u, [o], ["multiple_choice"])).length, 0);
    // and served again when a person clears the lesson check
    assert.equal(await clearItem({ kind: "lesson", itemId: lessonItemId(o, "fade", FADE(o)) }, "fine"), true);
    assert.equal((await bankItems(u, [o], ["multiple_choice"])).length, 1);
  });

  test("confirming the lesson check wrong pulls its exam copy and voids the answers given to it", async () => {
    const o = objs[2];
    await insertLesson(o);
    const u = await newUser();
    await answerLesson(u, o, "fade", FADE(o));
    await copyAnsweredLessonChecks(u, [o]);
    const copy = (await copyOf(o, FADE(o)))!;
    // The learner answered the copy in a mock exam.
    const session = (await queryOne<{ id: string }>(`insert into exam_sessions (user_id, track_id, mode) values ($1, $2, 'mock') returning id`, [u, track]))!;
    const attempt = (await queryOne<{ id: string }>(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, assist_reason, assisted)
       values ($1,$2,$3,'quiz',null,'mc',$4,'443','correct','repeat',true) returning id`,
      [u, unit, o, FADE(o)]
    ))!;
    await query(`insert into exam_session_items (session_id, position, item_id, objective_id, unit_id, attempt_id) values ($1, 0, $2, $3, $4, $5)`, [session.id, copy.id, o, unit, attempt.id]);

    const voided = await confirmItemWrong(lessonRef(o, "fade"), "443 is not the key here");
    assert.equal(voided, 2, "the lesson answer and the mock answer");
    assert.equal(await itemStatus("exam", copy.id), "confirmed_wrong");
    const a = await queryOne<{ voided_at: Date | null }>(`select voided_at from attempts where id = $1`, [attempt.id]);
    assert.ok(a?.voided_at, "the mock answer is voided");
    assert.equal((await bankItems(u, [o], ["multiple_choice"])).length, 0, "the wrong key is not served again");
    assert.equal(await copyAnsweredLessonChecks(u, [o]), 0, "and not copied in again");
    assert.equal(await confirmItemWrong(lessonRef(o, "fade"), "again"), 0, "idempotent");
  });

  test("the stored re-check covers a lesson check copied into the exam bank", async () => {
    const o = objs[3];
    await insertLesson(o, "'2026-10-01'::timestamptz");
    const u = await newUser();
    await answerLesson(u, o, "solo", SOLO(o));
    await copyAnsweredLessonChecks(u, [o]);
    const copy = (await copyOf(o, SOLO(o)))!;
    const refs = (await storedBefore("2026-11-07", ["exam"])).filter((r) => r.ref.objectiveId === o);
    assert.deepEqual(refs.map((r) => r.ref.itemId), [copy.id]);
    // not for a lesson that is newer than the gate
    await query(`update lesson_content set generated_at = '2026-11-08' where objective_id = $1`, [o]);
    assert.equal((await storedBefore("2026-11-07", ["exam"])).filter((r) => r.ref.objectiveId === o).length, 0);
  });
});

describe("FAIL-886: a cleared item can be pulled again", () => {
  const ref = (o: string, id: string): ItemRef => ({ kind: "review", itemId: id, objectiveId: o, question: "Which port is HTTPS?" });
  async function reviewItem(o: string): Promise<string> {
    const r = await queryOne<{ id: string }>(
      `insert into review_items (objective_id, question, choices, correct_index, why, source_hash, model) values ($1,'Which port is HTTPS?',$2::jsonb,1,'w','h','t') returning id`,
      [o, JSON.stringify(CHOICES)]
    );
    return r!.id;
  }

  test("after a staged finding was cleared, independent flags reaching the threshold quarantine it", async () => {
    const o = objs[4];
    const id = await reviewItem(o);
    await clearStaged(ref(o, id), "looked fine");
    for (let i = 0; i < 2; i++) await recordFlag(ref(o, id), { userId: await newUser(), source: "learner", reason: "wrong_answer" });
    assert.equal(await itemStatus("review", id), "cleared", "two flags are under the threshold of 3");
    const last = await recordFlag(ref(o, id), { userId: await newUser(), source: "learner", reason: "wrong_answer" });
    assert.equal(last.quarantined, true);
    assert.equal(await itemStatus("review", id), "quarantined");
  });

  test("flags a person already weighed do not count: only those after the clear", async () => {
    const o = objs[4];
    const id = await reviewItem(o);
    for (let i = 0; i < 3; i++) await recordFlag(ref(o, id), { userId: await newUser(), source: "learner", reason: "wrong_answer" });
    assert.equal(await itemStatus("review", id), "quarantined");
    assert.equal(await clearItem({ kind: "review", itemId: id }, "checked, fine"), true);
    // one more learner after the clear: 4 flags in all, but 1 since
    const one = await recordFlag(ref(o, id), { userId: await newUser(), source: "learner", reason: "wrong_answer" });
    assert.equal(one.quarantined, false);
    assert.equal(await itemStatus("review", id), "cleared");
    for (let i = 0; i < 2; i++) await recordFlag(ref(o, id), { userId: await newUser(), source: "learner", reason: "wrong_answer" });
    assert.equal(await itemStatus("review", id), "quarantined");
    // a person can decide again
    assert.equal(await clearItem({ kind: "review", itemId: id }, "still fine"), true);
  });
});
