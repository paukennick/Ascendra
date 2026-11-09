// REQ-143 against a real Postgres with every migration applied: the content
// review queue opens on learner signals, stays quiet at low volume, is
// idempotent across runs (and two runs at once), keeps resolved entries as
// history, re-opens only on evidence after a resolution, and respects
// decisions made through `npm run items`. No API key.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { lessonItemId } from "./item-quality";
import { listQueue, resolveQueueEntry, resolveQueueForItem, runContentSignals } from "./content-review-queue";
import { GET as cronGet } from "../app/api/cron/content-signals/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const obj = randomUUID();
const users: string[] = [];
const DAY = 86_400_000;
// Each run looks a few seconds ahead so rows inserted just before it are
// inside its window (the window ends at `now`, exclusive).
const soon = () => new Date(Date.now() + 5_000);

async function newUsers(n: number): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const u = randomUUID();
    users.push(u);
    out.push(u);
    await query(`insert into app_users (id, email) values ($1, $2)`, [u, `crq-${run}-${users.length}@example.test`]);
  }
  return out;
}

async function examItem(): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `insert into exam_items (objective_id, item_format, stem, body, answer_key, explanation)
     values ($1, 'multiple_choice', $2, '{"choices":["a","b","c","d"]}', '{"correct":[1]}', 'e') returning id`,
    [obj, `Stem ${randomUUID()}`]
  );
  return r!.id;
}

async function flag(itemId: string, us: string[], reason = "wrong_answer", note: string | null = null) {
  for (const u of us) {
    await query(
      `insert into item_flags (item_kind, item_id, objective_id, question, user_id, source, reason, note)
       values ('exam', $1, $2, 'stem', $3, 'learner', $4, $5)`,
      [itemId, obj, u, reason, note]
    );
  }
}

const openRows = (kind: string, itemId: string) =>
  query<{ id: string; signal: string; evidence: any; first_detected_at: Date; last_detected_at: Date }>(
    `select id, signal, evidence, first_detected_at, last_detected_at from content_review_queue
      where item_kind = $1 and item_id = $2 and status = 'open'`,
    [kind, itemId]
  );
const allRows = (kind: string, itemId: string) =>
  query<{ status: string; resolution: string | null }>(
    `select status, resolution from content_review_queue where item_kind = $1 and item_id = $2 order by first_detected_at`,
    [kind, itemId]
  );

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Signals', 'certification', null)`, [track, `CRQ-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [unit, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Signals objective', 1)`, [obj, unit]);
});

after(async () => {
  await query(`delete from content_review_queue where objective_id = $1`, [obj]);
  await query(`delete from item_flags where objective_id = $1`, [obj]);
  await query(`delete from item_status where objective_id = $1`, [obj]);
  await query(`delete from support_requests where user_id = any($1::uuid[])`, [users]);
  await query(`delete from attempts where user_id = any($1::uuid[])`, [users]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("learner reports", () => {
  test("three learners' reports open one entry with the evidence; a re-run refreshes it instead of adding one", async () => {
    const item = await examItem();
    await flag(item, await newUsers(3), "wrong_answer", "Option B is also right");
    const first = await runContentSignals({ now: soon() });
    assert.equal(first.skipped, false);
    let rows = await openRows("exam", item);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].signal, "learner_reports");
    assert.equal(rows[0].evidence.reporters, 3);
    assert.deepEqual(rows[0].evidence.rules, ["burst"]);
    assert.deepEqual(rows[0].evidence.reasons, { wrong_answer: 3 });
    assert.deepEqual(rows[0].evidence.recentNotes, ["Option B is also right", "Option B is also right", "Option B is also right"]);
    assert.equal(rows[0].evidence.window.days, 30);
    const firstSeen = rows[0].first_detected_at.getTime();

    await runContentSignals({ now: new Date(Date.now() + 60_000) });
    rows = await openRows("exam", item);
    assert.equal(rows.length, 1, "no second entry for the same item and signal");
    assert.equal(rows[0].first_detected_at.getTime(), firstSeen);
    assert.ok(rows[0].last_detected_at.getTime() > firstSeen);
  });

  test("low volume stays quiet: two reports from the only three learners", async () => {
    const item = await examItem();
    await flag(item, await newUsers(2));
    await runContentSignals({ now: soon() });
    assert.equal((await openRows("exam", item)).length, 0);
  });

  test("reports older than the window do not count", async () => {
    const item = await examItem();
    await flag(item, await newUsers(3));
    await query(`update item_flags set created_at = now() - interval '31 days' where item_kind = 'exam' and item_id = $1`, [item]);
    await runContentSignals({ now: soon() });
    assert.equal((await openRows("exam", item)).length, 0);
  });

  test("after a resolution the same reports do not re-open it; three NEW learners do, and the resolved entry stays as history", async () => {
    const item = await examItem();
    await flag(item, await newUsers(3));
    await runContentSignals({ now: soon() });
    const [row] = await openRows("exam", item);
    assert.ok(row);
    assert.equal(await resolveQueueEntry(row.id, "dismissed", "Key is right; stem reworded.", "test"), true);
    assert.equal(await resolveQueueEntry(row.id, "fixed", "again", "test"), false, "only an open entry resolves");

    await runContentSignals({ now: soon() });
    assert.equal((await openRows("exam", item)).length, 0, "old evidence does not re-open it");

    await flag(item, await newUsers(2));
    await runContentSignals({ now: soon() });
    assert.equal((await openRows("exam", item)).length, 0, "two new learners are not enough");

    await flag(item, await newUsers(1));
    await runContentSignals({ now: soon() });
    const reopened = await openRows("exam", item);
    assert.equal(reopened.length, 1);
    assert.equal(reopened[0].evidence.reporters, 3, "only reports after the resolution are counted");
    assert.deepEqual((await allRows("exam", item)).map((r) => [r.status, r.resolution]), [["resolved", "dismissed"], ["open", null]]);
  });

  test("an item confirmed wrong is not queued; a cleared item counts only reports after the clearing", async () => {
    const wrong = await examItem();
    await query(
      `insert into item_status (item_kind, item_id, objective_id, question, status, reason, resolved_at)
       values ('exam', $1, $2, 'stem', 'confirmed_wrong', 'review', now())`,
      [wrong, obj]
    );
    await flag(wrong, await newUsers(3));
    const cleared = await examItem();
    await flag(cleared, await newUsers(3));
    await query(
      `insert into item_status (item_kind, item_id, objective_id, question, status, reason, resolved_at)
       values ('exam', $1, $2, 'stem', 'cleared', 'flags', now())`,
      [cleared, obj]
    );
    await runContentSignals({ now: soon() });
    assert.equal((await openRows("exam", wrong)).length, 0);
    assert.equal((await openRows("exam", cleared)).length, 0);
  });

  test("npm run items decisions resolve the item's open entries", async () => {
    const item = await examItem();
    await flag(item, await newUsers(3));
    await runContentSignals({ now: soon() });
    assert.equal((await openRows("exam", item)).length, 1);
    assert.equal(await resolveQueueForItem("exam", item, "confirmed_wrong", "Key was B, should be C."), 1);
    assert.deepEqual((await allRows("exam", item)).map((r) => [r.status, r.resolution]), [["resolved", "confirmed_wrong"]]);
  });

  test("'Report a problem with this lesson' on one step from three learners opens a lesson_step entry", async () => {
    for (const u of await newUsers(3)) {
      await query(
        `insert into support_requests (user_id, kind, subject, body, objective_id, lesson_stage)
         values ($1, 'content_report', 'Teach card is wrong', 'The port is 443, not 80.', $2, 'teach')`,
        [u, obj]
      );
    }
    await runContentSignals({ now: soon() });
    const rows = await openRows("lesson_step", `${obj}:teach`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].evidence.reporters, 3);
    assert.equal(rows[0].evidence.learnersAnswered, null);
  });
});

describe("correct-rate drop", () => {
  const Q = `Solo ${run}: which port does HTTPS use?`;
  const item = () => lessonItemId(obj, "solo", Q);
  async function answer(u: string, correct: boolean, daysAgo: number, extra: Record<string, unknown> = {}) {
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, created_at, assisted, voided_at)
       values ($1, $2, $3, 'lesson', 'solo', 'mc', $4, 'x', $5, now() - make_interval(days => $6), $7, $8)`,
      [u, unit, obj, Q, correct ? "correct" : "incorrect", daysAgo, extra.assisted ?? false, extra.voided ?? null]
    );
  }

  test("three learners answering everything wrong is never enough to flag", async () => {
    const few = await newUsers(3);
    for (const u of few) {
      await answer(u, true, 40);
      await answer(u, false, 2);
    }
    await runContentSignals({ now: soon() });
    assert.equal((await openRows("lesson", item())).length, 0);
  });

  test("80% -> 30% over 30 and 20 learners opens one entry; retries, assisted and voided answers are not counted", async () => {
    const learners = await newUsers(30);
    // Baseline: 24 of 30 right, 30-60 days ago (the 3 low-volume learners above add 3 more, all right).
    for (const [i, u] of learners.entries()) await answer(u, i < 24, 30 + (i % 30));
    // Recent: 20 learners, 6 right on their FIRST answer in the window.
    for (const [i, u] of learners.slice(0, 20).entries()) {
      await answer(u, i < 6, 3);
      // Later retries in the window (right) must not lift the rate.
      await answer(u, true, 1);
    }
    // Help-assisted and voided answers are left out entirely.
    for (const u of learners.slice(20, 30)) {
      await answer(u, true, 2, { assisted: true });
      await answer(u, true, 2, { voided: new Date() });
    }
    await runContentSignals({ now: soon() });
    const rows = await openRows("lesson", item());
    assert.equal(rows.length, 1);
    const e = rows[0].evidence;
    assert.equal(rows[0].signal, "correct_rate_drop");
    // The 3 learners from the previous test are in both windows too: 27/33 -> 6/23.
    assert.deepEqual([e.baseline.learners, e.baseline.correct, e.recent.learners, e.recent.correct], [33, 27, 23, 6]);
    assert.ok(e.drop >= 0.2 && e.z >= 3.09, JSON.stringify(e));
  });
});

describe("two runs at once", () => {
  test("concurrent runs open exactly one entry for a new item", async () => {
    const item = await examItem();
    await flag(item, await newUsers(3));
    const now = soon();
    const [a, b] = await Promise.all([runContentSignals({ now }), runContentSignals({ now })]);
    assert.equal((await openRows("exam", item)).length, 1);
    // Either the second found the lock taken and skipped, or it ran after the
    // first and refreshed; never two opens.
    const opensForBoth = [a, b].filter((r) => !r.skipped).length;
    assert.ok(opensForBoth >= 1);
    const listed = (await listQueue({ status: "open", limit: 500 })).filter((r) => r.item_id === item);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].course, `CRQ-${run}`);
    assert.equal(listed[0].objective, "Signals objective");
  });

  test("the unique index refuses a second open entry even without the lock", async () => {
    const item = await examItem();
    const ins = `insert into content_review_queue (item_kind, item_id, objective_id, label, signal, evidence) values ('exam', $1, $2, 'x', 'learner_reports', '{}')`;
    await query(ins, [item, obj]);
    await assert.rejects(query(ins, [item, obj]), /content_review_queue_one_open/);
  });
});

describe("cron route", () => {
  test("refuses without CRON_SECRET (503) or with a wrong one (401), runs with the right one", async () => {
    const saved = process.env.CRON_SECRET;
    try {
      delete process.env.CRON_SECRET;
      assert.equal((await cronGet(new Request("http://t/api/cron/content-signals"))).status, 503);
      process.env.CRON_SECRET = "cron-test-secret";
      const wrong = await cronGet(new Request("http://t/api/cron/content-signals", { headers: { authorization: "Bearer nope" } }));
      assert.equal(wrong.status, 401);
      const res = await cronGet(new Request("http://t/api/cron/content-signals", { headers: { authorization: "Bearer cron-test-secret" } }));
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(typeof body.opened, "number");
      assert.equal(body.skipped, false);
    } finally {
      if (saved === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = saved;
    }
  });
});
