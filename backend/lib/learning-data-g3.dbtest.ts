// REQ-218 (batch G3, FAIL-1070..1089): learning-data integrity, on a real
// Postgres with every migration applied. Each race or hole below was
// reproduced here against the code before the fix. Run as the owner and as
// app_runtime (scripts/ci/db-tests-as-runtime.sh); nothing here needs owner
// rights.
//
//   FAIL-1070 H1   review prep picked pulled (quarantined, confirmed wrong) questions
//   FAIL-1071 H8   a review "due" minutes after the last one; an early correct answer climbed a rung
//   FAIL-1072      Independent after one sitting
//   FAIL-1073 M1/M5 exam submit read a snapshot while saves were accepted; an abandoned session's answers counted
//   FAIL-1074 M2   an attempt recorded for an item already confirmed wrong
//   FAIL-1075 M4   confirming an item wrong left its error_log rows and misconceptions
//   FAIL-1076      exam submit stuck after a partial failure
//   FAIL-1077      exam submit wrote evidence to an objective retired mid-session
//   FAIL-1078      an expired timed session was discarded by the next start
//   FAIL-1079      a re-check claim never expired
//   FAIL-1080      two first PBQ answers to one scenario were both "unassisted"
//   FAIL-1081      explain-back replay not bound to the answer text
// (FAIL-1082 lab restart: lib/labs.dbtest.ts; FAIL-1083 sim reasoning after the
//  run ended: lib/sims.dbtest.ts.)
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
process.env.ITEM_FACT_CHECK = "off";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { __setClientForTest } from "./anthropic";
import { confirmItemWrong, recheckItem, RECHECK_CLAIM_MINUTES, type ItemRef } from "./item-quality";
import { dueObjectives, nextDueOn, prepareContext } from "./review-store";
import { advanceDueSchedule } from "./review-step";
import { dueThrough } from "./reminder-plan-store";
import { MIN_REVIEW_GAP_HOURS } from "./review-scheduler";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { createSession, saveItem, submitSession } from "./exam-sessions";
import { withTransaction } from "./db";
import type { FactChecker } from "./fact-check";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const retiredUnit = randomUUID();
const objs = Array.from({ length: 8 }, () => randomUUID());
const retiredObj = randomUUID();
const users: string[] = [];
const TEACH = "G3 teaching text about ports.";
let dbPool: Pool;
let modelCalls = 0;

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `g3-${run}-${users.length}@example.test`]);
  return u;
}
const hours = (n: number) => `${n} hours`;

before(async () => {
  dbPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 4 });
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'G3', 'certification', null)`, [track, `G3${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [unit, track]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Gone', 2, 0)`, [retiredUnit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `G3 O${i}`, i]);
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', $2, 'f', '["a","b","c","d"]', 0, 'w', 's', '["a","b","c","d"]', 0, 'w', 'test')`,
      [o, TEACH]
    );
  }
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'G3 retired', 0)`, [retiredObj, unit]);
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async () => {
        const n = ++modelCalls;
        return {
          parsed_output: {
            items: [
              { format: "multiple_choice", stem: `G3 ${run} ${n} which?`, choices: ["w", "x", "y", "z"], correct: [2], steps: null, prompts: null, responses: null, matches: null, exhibit: null, explanation: "y." },
              { format: "multiple_choice", stem: `G3 ${run} ${n}b which?`, choices: ["p", "q", "r", "s"], correct: [0], steps: null, prompts: null, responses: null, matches: null, exhibit: null, explanation: "p." },
            ],
          },
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  } as never);
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from item_status where objective_id = any($1::uuid[])`, [[...objs, retiredObj]]);
  await query(`delete from item_flags where objective_id = any($1::uuid[])`, [[...objs, retiredObj]]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await dbPool.end();
  await closePool();
});

// ---------------------------------------------------------------------------
// FAIL-1070 (H1)
// ---------------------------------------------------------------------------

describe("FAIL-1070: review prep skips pulled questions", () => {
  test("a confirmed-wrong and a quarantined review question are not offered; a clean one is", async () => {
    const u = await newUser();
    const o = objs[0];
    const mk = async (q: string) =>
      (await queryOne<{ id: string }>(
        `insert into review_items (objective_id, source_hash, question, choices, correct_index, why, model)
         values ($1, md5($2), $3, '["a","b","c","d"]', 1, 'w', 'test') returning id`,
        [o, TEACH, q]
      ))!.id;
    const wrong = await mk("wrong key q");
    const held = await mk("quarantined q");
    const fine = await mk("fine q");
    const offered = async () => (await prepareContext(u, [o])).get(o)!.unseen.map((x) => x.id).sort();
    assert.deepEqual(await offered(), [wrong, held, fine].sort());
    await confirmItemWrong({ kind: "review", itemId: wrong, objectiveId: o, question: "wrong key q" }, "key is wrong");
    await query(
      `insert into item_status (item_kind, item_id, objective_id, question, status, reason) values ('review', $1, $2, 'quarantined q', 'quarantined', 'flag_and_recheck')`,
      [held, o]
    );
    assert.deepEqual(await offered(), [fine]);
  });
});

// ---------------------------------------------------------------------------
// FAIL-1071 (H8)
// ---------------------------------------------------------------------------

describe("FAIL-1071: a review needs 24 hours since the last one", () => {
  const enrol = async (u: string, o: string, ageHours: number, dueOn = "current_date") =>
    query(
      `insert into review_schedule (user_id, objective_id, due_on, enrolled_at) values ($1, $2, ${dueOn}, now() - ($3 || ' hours')::interval)
       on conflict (user_id, objective_id) do update set due_on = excluded.due_on, enrolled_at = excluded.enrolled_at, last_reviewed_at = null`,
      [u, o, String(ageHours)]
    );
  const track0 = () => null;

  test("an objective whose date has come but which was enrolled minutes ago is not due; it is after the floor", async () => {
    const u = await newUser();
    const o = objs[1];
    await query(`insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, 'Guided', 2, 'e') on conflict do nothing`, [u, o]);
    await enrol(u, o, 0.2);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    assert.deepEqual((await dueObjectives(u, today, null)).map((d) => d.objectiveId).filter((x) => x === o), [], "10 minutes after enrolment");
    const later = new Date(now.getTime() + (MIN_REVIEW_GAP_HOURS + 1) * 3_600_000);
    assert.deepEqual(
      (await dueObjectives(u, later.toISOString().slice(0, 10), null, query, later)).map((d) => d.objectiveId).filter((x) => x === o),
      [o],
      "25 hours later"
    );
    void track0;
  });

  test("the next-due day moves to when the floor ends", async () => {
    const u = await newUser();
    const o = objs[2];
    await query(`insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, 'Guided', 2, 'e') on conflict do nothing`, [u, o]);
    await enrol(u, o, 1, "current_date - 3");
    const d = await nextDueOn(u, track);
    // The floor ends 23 hours from now; the later of that day and the old date.
    const floorDay = (await queryOne<{ d: string }>(`select to_char(((now() - interval '1 hour' + make_interval(hours => $1::int)) at time zone 'UTC')::date, 'YYYY-MM-DD') as d`, [MIN_REVIEW_GAP_HOURS]))!.d;
    assert.equal(d, floorDay);
  });

  test("FAIL-1084: the reminder plan lists the objective on the day the floor ends, not the earlier date", async () => {
    const u = await newUser();
    const o = objs[2];
    await query(`insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, 'Guided', 2, 'e') on conflict do nothing`, [u, o]);
    // Enrolled "10 hours ahead" (a forward-dated row) so the floor ends at least 28 hours from now,
    // on a later date whatever the time of day, while the date column says today.
    await enrol(u, o, -10);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const floorDay = new Date(now.getTime() + (10 + MIN_REVIEW_GAP_HOURS) * 3_600_000).toISOString().slice(0, 10);
    assert.notEqual(floorDay, today);
    const mine = async (last: string) => (await dueThrough(u, today, last)).filter((d) => d.objectiveId === o);
    assert.deepEqual(await mine(today), [], "not announced for today: the review screen will not serve it yet");
    const next = await mine(floorDay);
    assert.equal(next.length, 1);
    assert.equal(next[0].dueOn, floorDay);
  });

  test("a correct review answer minutes after the last one does not climb a rung; a day later it does", async () => {
    const u = await newUser();
    const o = objs[3];
    await query(`insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, 'Guided', 2, 'e') on conflict do nothing`, [u, o]);
    await enrol(u, o, 0.1);
    const attempt = async () =>
      (await queryOne<{ id: string }>(
        `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict)
         values ($1, $2, $3, 'quiz', 'sprint', 'mc', $4, 'a', 'correct') returning id`,
        [u, unit, o, `rq-${randomUUID()}`]
      ))!.id;
    // Minutes after enrolment: not due, so nothing is stepped or logged (the attempt id is never reached).
    const early = await withTransaction((tx) => advanceDueSchedule(tx, u, o, randomUUID(), new Date()));
    assert.equal(early, false);
    const step = async () => (await queryOne<{ step: number }>(`select step from review_schedule where user_id = $1 and objective_id = $2`, [u, o]))!.step;
    assert.equal(await step(), 0, "no rung climbed");
    // 25 hours later the same call is a real review. The attempt id must exist (review_log foreign key).
    const aid = await attempt();
    const later = new Date(Date.now() + (MIN_REVIEW_GAP_HOURS + 1) * 3_600_000);
    const climbed = await withTransaction((tx) => advanceDueSchedule(tx, u, o, aid, later));
    assert.equal(climbed, true);
    assert.equal(await step(), 1);
  });
});

// ---------------------------------------------------------------------------
// FAIL-1072 (Independent needs a later sitting)
// ---------------------------------------------------------------------------

describe("FAIL-1072: Independent needs a confirming answer from a later sitting", () => {
  const win = (u: string, o: string, ago: string, q = `q-${randomUUID()}`) =>
    query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, created_at)
       values ($1, $2, $3, 'lesson', 'solo', 'open', $4, 'a', 'correct', now() - $5::interval)`,
      [u, unit, o, q, ago]
    );
  const level = async (u: string, o: string) => (await queryOne<{ status: string; evidence: string }>(`select status::text, evidence from mastery_detail($1, $2)`, [u, o]));

  test("two correct free responses in one sitting are Guided; 25 hours apart they are Independent", async () => {
    const one = await newUser();
    await win(one, objs[4], "3 hours");
    await win(one, objs[4], "10 minutes");
    const l1 = await level(one, objs[4]);
    assert.equal(l1!.status, "Guided");
    assert.match(l1!.evidence, /Independent needs a second correct unassisted answer/);
    const two = await newUser();
    await win(two, objs[4], "26 hours");
    await win(two, objs[4], "10 minutes");
    assert.equal((await level(two, objs[4]))!.status, "Independent");
    const edge = await newUser();
    await win(edge, objs[4], "23 hours");
    await win(edge, objs[4], "0 minutes");
    assert.equal((await level(edge, objs[4]))!.status, "Guided", "just under a day");
  });

  test("a hinted or repeated second answer does not confirm; a retry does not either", async () => {
    const u = await newUser();
    await win(u, objs[4], "3 days", "same q");
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, assisted, assist_reason, created_at)
       values ($1, $2, $3, 'lesson', 'solo', 'open', 'same q', 'a', 'correct', true, 'repeat', now() - interval '10 minutes')`,
      [u, unit, objs[4]]
    );
    assert.equal((await level(u, objs[4]))!.status, "Guided");
  });

  test("stored levels follow a recompute: an Independent from one sitting is brought down to Guided, a confirmed one stays", async () => {
    const stale = await newUser();
    const kept = await newUser();
    await win(stale, objs[5], "2 hours");
    await win(kept, objs[5], "3 days");
    await win(kept, objs[5], "2 hours");
    for (const u of [stale, kept]) {
      await query(`insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, 'Independent', 3, 'old rule')`, [u, objs[5]]);
      await query(`select recompute_mastery($1)`, [u]);
    }
    const st = async (u: string) => (await queryOne<{ status: string }>(`select status::text from mastery where user_id = $1 and objective_id = $2`, [u, objs[5]]))!.status;
    assert.equal(await st(stale), "Guided");
    assert.equal(await st(kept), "Independent");
  });
});

// ---------------------------------------------------------------------------
// Exam sessions
// ---------------------------------------------------------------------------

async function examItem(objectiveId: string, stem: string): Promise<string> {
  return (await queryOne<{ id: string }>(
    `insert into exam_items (objective_id, item_format, stem, body, answer_key, explanation)
     values ($1, 'multiple_choice', $2, '{"choices":["a","b","c","d"]}', '{"correct":[0]}', 'because a') returning id`,
    [objectiveId, stem]
  ))!.id;
}
// An in-progress session with one answered item per objective.
async function session(u: string, objectiveIds: string[], opts: { mode?: string; response?: unknown } = {}) {
  const s = (await queryOne<{ id: string }>(
    `insert into exam_sessions (user_id, track_id, mode) values ($1, $2, $3) returning id`,
    [u, track, opts.mode ?? "sprint"]
  ))!.id;
  const items: string[] = [];
  for (const [i, o] of objectiveIds.entries()) {
    const item = await examItem(o, `G3 exam ${randomUUID()}`);
    items.push(item);
    await query(
      `insert into exam_session_items (session_id, position, item_id, objective_id, unit_id, response, answered_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [s, i, item, o, unit, JSON.stringify(opts.response ?? { choice: 0 })]
    );
  }
  return { id: s, items };
}
const attemptsOf = (u: string) => query<{ client_attempt_id: string }>(`select client_attempt_id from attempts where user_id = $1 and client_attempt_id like 'exam:%'`, [u]);
const statusOf = async (s: string) => (await queryOne<{ status: string }>(`select status from exam_sessions where id = $1`, [s]))!.status;

describe("FAIL-1073: submit claims the session before reading it", () => {
  test("a save that arrives while the claim is held is refused once the claim commits; its answer is not acknowledged", async () => {
    const u = await newUser();
    const s = await session(u, [objs[0]]);
    // Hold the claim the way submitSession does: lock the row, flip the status, commit later.
    const c = await dbPool.connect();
    try {
      await c.query("begin");
      await c.query(`select status from exam_sessions where id = $1 for update`, [s.id]);
      await c.query(`update exam_sessions set status = 'submitted', submitted_at = now() where id = $1`, [s.id]);
      let settled = false;
      const save = saveItem(s.id, u, 0, { flagged: true }).then(
        (r) => ({ ok: true as const, r }),
        (e) => ({ ok: false as const, e })
      ).finally(() => (settled = true));
      await new Promise((r) => setTimeout(r, 300));
      assert.equal(settled, false, "the save waits for the claim");
      await c.query("commit");
      const out = await save;
      assert.equal(out.ok, false, "refused, not acknowledged");
      assert.match(String((out as { e: Error }).e.message), /already ended/);
    } finally {
      c.release();
    }
    const f = await queryOne<{ flagged: boolean }>(`select flagged from exam_session_items where session_id = $1 and position = 0`, [s.id]);
    assert.equal(f!.flagged, false);
  });

  test("a session a newer start abandoned records no attempts, and is refused", async () => {
    const u = await newUser();
    const s = await session(u, [objs[0], objs[1]]);
    await query(`update exam_sessions set status = 'abandoned' where id = $1`, [s.id]);
    await assert.rejects(submitSession(s.id, u), /replaced by a newer one/);
    assert.equal((await attemptsOf(u)).length, 0);
  });

  test("two submits at once record each answer once", async () => {
    const u = await newUser();
    const s = await session(u, [objs[0], objs[1], objs[2]]);
    await Promise.all([submitSession(s.id, u), submitSession(s.id, u), submitSession(s.id, u)]);
    assert.equal((await attemptsOf(u)).length, 3);
    assert.equal(await statusOf(s.id), "submitted");
    const graded = await query(`select verdict from exam_session_items where session_id = $1 and verdict is not null`, [s.id]);
    assert.equal(graded.length, 3);
  });
});

describe("FAIL-1074: nothing is recorded for an item confirmed wrong", () => {
  test("the confirmed-wrong item records no attempt; the others do", async () => {
    const u = await newUser();
    const s = await session(u, [objs[0], objs[1]]);
    await confirmItemWrong({ kind: "exam", itemId: s.items[0], objectiveId: objs[0], question: "q" }, "key wrong");
    await submitSession(s.id, u);
    const rows = await query<{ position: number; attempt_id: string | null }>(`select position, attempt_id from exam_session_items where session_id = $1 order by position`, [s.id]);
    assert.equal(rows[0].attempt_id, null);
    assert.ok(rows[1].attempt_id);
    assert.deepEqual((await attemptsOf(u)).map((a) => a.client_attempt_id), [`exam:${s.id}:1`]);
  });

  test("a confirm that is mid-flight when the submit starts is waited for, and decides the same way", async () => {
    const u = await newUser();
    const s = await session(u, [objs[0]]);
    const c = await dbPool.connect();
    try {
      await c.query("begin");
      // What confirmWrongIn does first, then the verdict, uncommitted.
      await c.query(`select 1 from exam_items where id = $1::uuid for no key update`, [s.items[0]]);
      await c.query(
        `insert into item_status (item_kind, item_id, objective_id, question, status, reason) values ('exam', $1, $2, 'q', 'confirmed_wrong', 'review')`,
        [s.items[0], objs[0]]
      );
      let done = false;
      const sub = submitSession(s.id, u).finally(() => (done = true));
      await new Promise((r) => setTimeout(r, 300));
      assert.equal(done, false, "the submit waits for the confirm");
      await c.query("commit");
      await sub;
    } finally {
      c.release();
    }
    assert.equal((await attemptsOf(u)).length, 0);
  });
});

describe("FAIL-1075: confirming an item wrong clears what it created", () => {
  test("error_log entries are resolved and misconceptions deleted for the voided attempts only", async () => {
    const u = await newUser();
    const o = objs[6];
    const q = `G3 lesson check ${randomUUID()}`;
    const mkAttempt = async (question: string) =>
      (await queryOne<{ id: string }>(
        `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict)
         values ($1, $2, $3, 'lesson', 'solo', 'open', $4, 'a', 'incorrect') returning id`,
        [u, unit, o, question]
      ))!.id;
    const bad = await mkAttempt(q);
    const other = await mkAttempt(`other ${randomUUID()}`);
    for (const a of [bad, other]) {
      await query(`insert into error_log (user_id, unit_id, objective_id, attempt_id, topic, error_text, next_review_at) values ($1, $2, $3, $4, 't', 'e', current_date)`, [u, unit, o, a]);
      await query(
        `insert into learner_misconceptions (user_id, objective_id, attempt_id, source, tag, sentence) values ($1, $2, $3, 'grader', 'T', 'You may think x.')`,
        [u, o, a]
      );
    }
    const md5 = (await queryOne<{ m: string }>(`select md5($1) as m`, [q]))!.m;
    await confirmItemWrong({ kind: "lesson", itemId: `${o}:solo:${md5}`, objectiveId: o, question: q }, "wrong key");
    const errs = await query<{ attempt_id: string; resolved: boolean }>(`select attempt_id, resolved from error_log where user_id = $1`, [u]);
    assert.equal(errs.find((e) => e.attempt_id === bad)!.resolved, true);
    assert.equal(errs.find((e) => e.attempt_id === other)!.resolved, false);
    const mis = await query<{ attempt_id: string }>(`select attempt_id from learner_misconceptions where user_id = $1`, [u]);
    assert.deepEqual(mis.map((m) => m.attempt_id), [other]);
    const due = await dueObjectives(u, new Date().toISOString().slice(0, 10), null);
    assert.ok(due.some((d) => d.objectiveId === o), "the other, still-valid miss is still due");
  });
});

describe("FAIL-1076: a failed submit leaves the session retryable", () => {
  test("a failure while recording rolls back the claim and every attempt; the retry succeeds after the answer is fixed", async () => {
    const u = await newUser();
    const s = await session(u, [objs[0], objs[1]]);
    // Position 1's answer points past the choices: recording it fails.
    await query(`update exam_session_items set response = '{"choice": 99}' where session_id = $1 and position = 1`, [s.id]);
    await assert.rejects(submitSession(s.id, u));
    assert.equal(await statusOf(s.id), "in_progress", "still open");
    assert.equal((await attemptsOf(u)).length, 0, "no half-recorded attempts");
    await query(`update exam_session_items set response = '{"choice": 1}' where session_id = $1 and position = 1`, [s.id]);
    await submitSession(s.id, u);
    assert.equal((await attemptsOf(u)).length, 2);
  });

  test("an attempt a failed submit of the old code already stored under the client id is reused, not a conflict", async () => {
    const u = await newUser();
    const s = await session(u, [objs[0]]);
    const stored = (await queryOne<{ id: string }>(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, client_attempt_id, assessment_type)
       values ($1, $2, $3, 'quiz', 'sprint', 'mc', 'old stem', 'old answer', 'incorrect', $4, 'multiple_choice') returning id`,
      [u, unit, objs[0], `exam:${s.id}:0`]
    ))!.id;
    await submitSession(s.id, u);
    const r = await queryOne<{ attempt_id: string }>(`select attempt_id from exam_session_items where session_id = $1 and position = 0`, [s.id]);
    assert.equal(r!.attempt_id, stored);
    assert.equal((await attemptsOf(u)).length, 1);
  });
});

describe("FAIL-1077: no evidence for an objective retired mid-session", () => {
  test("the answer is graded in the score but records no attempt", async () => {
    const u = await newUser();
    const s = await session(u, [objs[0], retiredObj]);
    await query(`update objectives set retired_at = now() - interval '1 minute' where id = $1`, [retiredObj]);
    try {
      await submitSession(s.id, u);
    } finally {
      await query(`update objectives set retired_at = null where id = $1`, [retiredObj]);
    }
    const rows = await query<{ position: number; attempt_id: string | null; verdict: string | null }>(
      `select position, attempt_id, verdict from exam_session_items where session_id = $1 order by position`,
      [s.id]
    );
    assert.ok(rows[0].attempt_id);
    assert.equal(rows[1].attempt_id, null);
    assert.ok(rows[1].verdict, "still graded for the score");
    assert.equal((await query(`select 1 from attempts where user_id = $1 and objective_id = $2`, [u, retiredObj])).length, 0);
  });
});

describe("FAIL-1078: an expired session is submitted, not discarded, by the next start", () => {
  test("starting again after the deadline grades the old session first", async () => {
    const u = await newUser();
    // Fill the bank through a real start, then end it.
    const first = await createSession({ userId: u, trackId: track, mode: "sprint", timed: false });
    await query(`update exam_sessions set time_limit_seconds = 600, deadline_at = now() - interval '1 hour' where id = $1`, [first.sessionId]);
    await query(`update exam_session_items set response = '{"choice": 0}', answered_at = now() where session_id = $1 and position = 0`, [first.sessionId]);
    const second = await createSession({ userId: u, trackId: track, mode: "sprint", timed: false, allowGeneration: false });
    assert.notEqual(second.sessionId, first.sessionId);
    assert.equal(await statusOf(first.sessionId), "submitted", "graded, not abandoned");
    assert.ok((await attemptsOf(u)).some((a) => a.client_attempt_id === `exam:${first.sessionId}:0`), "its answer counts");
    assert.equal(await statusOf(second.sessionId), "in_progress");
  });

  test("an unexpired open session is still replaced without grading", async () => {
    const u = await newUser();
    const first = await createSession({ userId: u, trackId: track, mode: "sprint", timed: false, allowGeneration: false });
    await query(`update exam_session_items set response = '{"choice": 0}', answered_at = now() where session_id = $1 and position = 0`, [first.sessionId]);
    await createSession({ userId: u, trackId: track, mode: "sprint", timed: false, allowGeneration: false });
    assert.equal(await statusOf(first.sessionId), "abandoned");
    assert.equal((await attemptsOf(u)).length, 0);
  });
});

// ---------------------------------------------------------------------------
// FAIL-1079 re-check claim expiry
// ---------------------------------------------------------------------------

describe("FAIL-1079: a re-check claim expires", () => {
  const agree: FactChecker & { calls: number } = Object.assign(
    async () => {
      agree.calls++;
      return [{ key: "k", publish: true, answer: [0], unsupportedClaims: [] } as never];
    },
    { calls: 0 }
  );
  const ref = async (): Promise<ItemRef> => ({ kind: "exam", itemId: await examItem(objs[7], `G3 recheck ${randomUUID()}`), objectiveId: objs[7], question: "q" });

  test("a fresh claim blocks a second re-check; one older than the expiry is taken over", async () => {
    // The fact-check is switched off for the rest of this file; this test needs it on.
    const saved = process.env.ITEM_FACT_CHECK;
    delete process.env.ITEM_FACT_CHECK;
    try {
      await body();
    } finally {
      if (saved !== undefined) process.env.ITEM_FACT_CHECK = saved;
    }
  });
  const body = async () => {
    const r = await ref();
    await query(`insert into item_flags (item_kind, item_id, objective_id, question, source) values ('exam', $1, $2, 'q', 'recheck')`, [r.itemId, r.objectiveId]);
    assert.deepEqual(await recheckItem(r, agree, null), { ran: false, agreed: null, quarantined: false });
    assert.equal(agree.calls, 0);
    await query(`update item_flags set created_at = now() - make_interval(mins => $2) where item_id = $1 and source = 'recheck'`, [r.itemId, RECHECK_CLAIM_MINUTES + 1]);
    const out = await recheckItem(r, agree, null);
    assert.equal(out.ran, true);
    assert.equal(agree.calls, 1);
    // The finished claim stays: a result is never re-run.
    await query(`update item_flags set created_at = now() - interval '1 day' where item_id = $1 and source = 'recheck'`, [r.itemId]);
    assert.equal((await recheckItem(r, agree, null)).ran, false);
  };
});

// ---------------------------------------------------------------------------
// FAIL-1080 first PBQ answer under a lock
// ---------------------------------------------------------------------------

describe("FAIL-1080: two first answers to one scenario", () => {
  test("racing PBQ answers: one is the first answer, the other a repeat", async () => {
    const u = await newUser();
    const scenario = (await queryOne<{ id: string }>(
      `insert into pbq_scenarios (unit_id, title, scenario, sub_parts, model) values ($1, 'S', 's', '[]', 't') returning id`,
      [unit]
    ))!.id;
    const answer = (cid: string) =>
      recordAttemptAndUpdateMastery({
        userId: u,
        unitId: unit,
        pbqScenarioId: scenario,
        kind: "pbq",
        format: "pbq",
        question: "PBQ",
        answer: `a-${cid}`,
        verdict: "correct",
        clientAttemptId: `g3-${run}-${cid}`,
      });
    await Promise.all([answer("1"), answer("2"), answer("3")]);
    const rows = await query<{ assist_reason: string | null }>(`select assist_reason from attempts where user_id = $1 and pbq_scenario_id = $2`, [u, scenario]);
    assert.equal(rows.length, 3);
    assert.equal(rows.filter((r) => r.assist_reason === null).length, 1, JSON.stringify(rows));
    assert.equal(rows.filter((r) => r.assist_reason === "repeat").length, 2);
  });
});
