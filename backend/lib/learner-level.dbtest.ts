// REQ-252 (levels phase 1A, migration 078), against a real Postgres with
// every migration applied. No model call is made anywhere in this suite.
//
//   1. The per-course goal question and level: suggestion from the goal and
//      the intake (experience wins), saving, skipping, course visibility.
//   2. Per-unit levels: set, clear, the lesson's effective level.
//   3. Automatic moves up from mastery evidence, with notice, seen and undo;
//      evidence before a change or an undo never counts again.
//   4. Lesson events: fixed detail only, taught objectives only.
//   5. Export, account deletion and course deletion.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { buildAccountExport } from "./account-export";
import { GET as levelGet, PUT as levelPut } from "../app/api/courses/[id]/level/route";
import { POST as checkPost } from "../app/api/courses/[id]/level/check/route";
import { POST as changePost } from "../app/api/courses/[id]/level/changes/[changeId]/route";
import { POST as eventPost } from "../app/api/objectives/[id]/lesson-event/route";

const run = Date.now().toString(36);
const users: string[] = [];
const trackId = randomUUID();
const otherTrack = randomUUID();
const privateTrack = randomUUID();
const units = [randomUUID(), randomUUID()];
const objectives: string[] = []; // 7 in unit 0, 1 in unit 1

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
async function call(fn: any, url: string, u: string, method: string, body: unknown, params: Record<string, string>) {
  return fn(
    new Request(`http://t${url}`, { method, headers: auth(u), body: body === undefined ? undefined : JSON.stringify(body) }),
    { params: Promise.resolve(params) }
  ) as Promise<Response>;
}
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
const getLevel = (u: string, unitId?: string, t = trackId) =>
  call(levelGet, `/api/courses/${t}/level${unitId ? `?unitId=${unitId}` : ""}`, u, "GET", undefined, { id: t });
const putLevel = (u: string, body: unknown, t = trackId) => call(levelPut, `/api/courses/${t}/level`, u, "PUT", body, { id: t });
const check = (u: string, unitId: string) => call(checkPost, `/api/courses/${trackId}/level/check`, u, "POST", { unitId }, { id: trackId });
const act = (u: string, changeId: string, action: string) =>
  call(changePost, `/api/courses/${trackId}/level/changes/${changeId}`, u, "POST", { action }, { id: trackId, changeId });

async function newUser(experience: string | null = null): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `levels-${run}-${users.length}@example.test`]);
  if (experience) await query(`insert into learner_intake (user_id, experience) values ($1, $2)`, [u, experience]);
  return u;
}

// A first solo answer on objective i, `minutesAgo` in the past.
async function solo(u: string, i: number, verdict: string, assisted = false, minutesAgo = 0) {
  await query(
    `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, assisted, created_at)
     values ($1, (select unit_id from objectives where id = $2), $2, 'lesson', 'solo', 'open', 'q', 'a', $3, $4, now() - make_interval(mins => $5))`,
    [u, objectives[i], verdict, assisted, minutesAgo]
  );
}

before(async () => {
  for (const [id, code, owner] of [
    [trackId, `LVL${run}`, null],
    [otherTrack, `LVLB${run}`, null],
  ] as const) {
    await query(`insert into subject_tracks (id, user_id, code, title, track_type) values ($1, $2, $3, 'Levels test', 'graduate')`, [id, owner, code]);
  }
  await query(`update subject_tracks set level_flow = true where id = $1`, [trackId]);
  for (const [i, u] of units.entries()) {
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, $3, $4)`, [u, trackId, `Unit ${i + 1}`, i]);
  }
  for (let i = 0; i < 8; i++) {
    const id = randomUUID();
    objectives.push(id);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [id, units[i < 7 ? 0 : 1], `Objective ${i}`, i]);
  }
});

after(async () => {
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[trackId, otherTrack, privateTrack]]);
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("goal question and course level", () => {
  test("a learner who has not answered gets the intake's suggestion and the question", async () => {
    const u = await newUser("experienced");
    const s = await json(await getLevel(u));
    assert.equal(s.answered, false);
    assert.equal(s.levelFlow, true);
    assert.deepEqual(s.suggestion, { level: "experienced", reason: "experience" });
    assert.equal(s.effective, "experienced");
    assert.equal(s.units.length, 2);
    assert.equal(s.trackCode, `LVL${run}`);
  });

  test("the goal answer sets the default level when no experience answer exists", async () => {
    const u = await newUser();
    const s = await json(await putLevel(u, { goal: "career_change" }));
    assert.equal(s.answered, true);
    assert.equal(s.goal, "career_change");
    assert.equal(s.courseLevel, "new");
    assert.equal(s.courseLevelSource, "default");
    const ev = await queryOne<{ detail: unknown }>(`select detail from learner_events where user_id = $1 and event = 'course_goal_set'`, [u]);
    assert.deepEqual(ev?.detail, { goal: "career_change" });
  });

  test("experience wins over the goal; the learner's own pick wins over both", async () => {
    const u = await newUser("some");
    let s = await json(await putLevel(u, { goal: "career_change" }));
    assert.equal(s.courseLevel, "some");
    s = await json(await putLevel(u, { goal: "career_change", level: "new" }));
    assert.equal(s.courseLevel, "new");
    assert.equal(s.courseLevelSource, "self");
    // A later goal change does not overwrite a level the learner chose.
    s = await json(await putLevel(u, { goal: "work" }));
    assert.equal(s.courseLevel, "new");
    const change = await queryOne<{ from_level: string; to_level: string; reason: string; seen_at: Date | null }>(
      `select from_level, to_level, reason, seen_at from learner_level_changes where user_id = $1`,
      [u]
    );
    assert.equal(change?.reason, "learner");
    assert.equal(change?.to_level, "new");
    assert.ok(change?.seen_at, "a learner's own change needs no notice");
  });

  test("skip marks the question answered and keeps the suggestion", async () => {
    const u = await newUser("new");
    const s = await json(await putLevel(u, { skip: true }));
    assert.equal(s.answered, true);
    assert.equal(s.goal, null);
    assert.equal(s.courseLevel, "new");
  });

  test("bad input is a 400; another learner's private course is a 404", async () => {
    const u = await newUser();
    await json(await putLevel(u, { goal: "fun" }), 400);
    await json(await putLevel(u, { level: "expert" }), 400);
    await json(await putLevel(u, {}), 400);
    const owner = await newUser();
    await query(`insert into subject_tracks (id, user_id, code, title, track_type) values ($1, $2, $3, 'Private', 'graduate')`, [
      privateTrack,
      owner,
      `LVLP${run}`,
    ]);
    await json(await getLevel(u, undefined, privateTrack), 404);
    await json(await putLevel(u, { goal: "work" }, privateTrack), 404);
    await json(await getLevel(owner, undefined, privateTrack));
  });

  test("the level flow flag is per course", async () => {
    const u = await newUser();
    const s = await json(await getLevel(u, undefined, otherTrack));
    assert.equal(s.levelFlow, false);
  });

  test("the seed's pilot courses have the flow on (applied by 078 or the seed)", async () => {
    const rows = await query<{ code: string; level_flow: boolean }>(
      `select code, level_flow from subject_tracks where user_id is null and code in ('PYTHON', 'JAVASCRIPT')`
    );
    for (const r of rows) assert.equal(r.level_flow, true, r.code);
  });
});

describe("per-unit levels", () => {
  test("a unit's own level is what its lesson uses; clearing it follows the course", async () => {
    const u = await newUser("new");
    await json(await putLevel(u, { skip: true }));
    let s = await json(await putLevel(u, { unitId: units[1], unitLevel: "experienced" }));
    assert.equal(s.effective, "experienced");
    assert.equal(s.units.find((x: any) => x.unitId === units[1]).source, "self");
    s = await json(await getLevel(u, units[0]));
    assert.equal(s.effective, "new");
    s = await json(await putLevel(u, { unitId: units[1], unitLevel: null }));
    assert.equal(s.effective, "new");
    assert.equal(s.units.find((x: any) => x.unitId === units[1]).level, null);
  });

  test("a unit from another course is a 404", async () => {
    const u = await newUser();
    await query(`insert into course_units (track_id, title, sort_order) values ($1, 'Other', 0)`, [otherTrack]);
    const other = await queryOne<{ id: string }>(`select id from course_units where track_id = $1`, [otherTrack]);
    await json(await putLevel(u, { unitId: other!.id, unitLevel: "new" }), 404);
    await json(await putLevel(u, { unitId: units[0], unitLevel: "expert" }), 400);
  });
});

describe("automatic level up, notice and undo", () => {
  test("4 of the last 5 first tries strong moves the unit up one level, with a notice", async () => {
    const u = await newUser("new");
    await json(await putLevel(u, { skip: true }));
    // Four strong answers: not enough yet (the window is not full).
    for (let i = 0; i < 4; i++) await solo(u, i, "correct", false, 50 - i);
    assert.equal((await json(await check(u, units[0]))).change, null);
    // A second answer on an objective is not a first try.
    await solo(u, 0, "incorrect", false, 30);
    assert.equal((await json(await check(u, units[0]))).change, null);
    await solo(u, 4, "incorrect", false, 20);
    const { change } = await json(await check(u, units[0]));
    assert.equal(change.fromLevel, "new");
    assert.equal(change.toLevel, "some");
    assert.equal(change.unitTitle, "Unit 1");
    let s = await json(await getLevel(u, units[0]));
    assert.equal(s.effective, "some");
    assert.equal(s.notices.length, 1, "shown until acknowledged");
    assert.equal(s.units.find((x: any) => x.unitId === units[0]).source, "auto");
    // The course and the other unit are unchanged.
    assert.equal(s.courseLevel, "new");
    assert.equal((await json(await getLevel(u, units[1]))).effective, "new");
    // The same evidence does not move it again.
    assert.equal((await json(await check(u, units[0]))).change, null);
    // OK hides the notice.
    s = await json(await act(u, change.id, "seen"));
    assert.equal(s.notices.length, 0);
    const ev = await query<{ detail: any }>(`select detail from learner_events where user_id = $1 and event = 'level_changed'`, [u]);
    assert.deepEqual(ev.map((e) => e.detail), [{ from: "new", to: "some", reason: "mastery", scope: "unit" }]);
  });

  test("hinted answers do not count", async () => {
    const u = await newUser("new");
    for (let i = 0; i < 5; i++) await solo(u, i, "correct", i >= 2, 50 - i);
    assert.equal((await json(await check(u, units[0]))).change, null);
  });

  test("undo puts the unit back exactly, and the evidence it saw never counts again", async () => {
    const u = await newUser("new");
    await json(await putLevel(u, { skip: true }));
    await json(await putLevel(u, { unitId: units[0], unitLevel: "some" }));
    for (let i = 0; i < 5; i++) await solo(u, i, "correct", false, 0); // after the learner's change
    const { change } = await json(await check(u, units[0]));
    assert.equal(change.fromLevel, "some");
    assert.equal(change.toLevel, "experienced");
    let s = await json(await act(u, change.id, "undo"));
    assert.equal(s.notices.length, 0);
    const unit = s.units.find((x: any) => x.unitId === units[0]);
    assert.equal(unit.level, "some");
    assert.equal(unit.source, "self", "the learner's own setting comes back, not a copy marked auto");
    // A repeat undo is a no-op; the old evidence does not promote again.
    await json(await act(u, change.id, "undo"));
    assert.equal((await json(await check(u, units[0]))).change, null);
    const ev = await query<{ detail: any }>(
      `select detail from learner_events where user_id = $1 and event = 'level_changed' order by id`,
      [u]
    );
    assert.deepEqual(ev.at(-1)?.detail, { from: "experienced", to: "some", reason: "undo", scope: "unit" });
  });

  test("undo removes an auto level that had no unit setting before", async () => {
    const u = await newUser("new");
    for (let i = 0; i < 5; i++) await solo(u, i, "correct", false, 10 - i);
    const { change } = await json(await check(u, units[0]));
    const s = await json(await act(u, change.id, "undo"));
    assert.equal(s.units.find((x: any) => x.unitId === units[0]).level, null);
    assert.equal((await json(await getLevel(u, units[0]))).effective, "new");
  });

  test("an older change cannot be undone over a newer one; a learner change cannot be undone", async () => {
    const u = await newUser("new");
    for (let i = 0; i < 5; i++) await solo(u, i, "correct", false, 10 - i);
    const { change } = await json(await check(u, units[0]));
    await json(await putLevel(u, { unitId: units[0], unitLevel: "new" }));
    await json(await act(u, change.id, "undo"), 409);
    const own = await queryOne<{ id: string }>(`select id from learner_level_changes where user_id = $1 and reason = 'learner'`, [u]);
    await json(await act(u, own!.id, "undo"), 409);
  });

  test("Experienced never moves; another learner's change is a 404", async () => {
    const u = await newUser("experienced");
    for (let i = 0; i < 5; i++) await solo(u, i, "correct", false, 10 - i);
    assert.equal((await json(await check(u, units[0]))).change, null);
    const v = await newUser("new");
    for (let i = 0; i < 5; i++) await solo(v, i, "correct", false, 10 - i);
    const { change } = await json(await check(v, units[0]));
    await json(await act(u, change.id, "undo"), 404);
    await json(await act(v, change.id, "dance"), 400);
  });

  test("voided answers do not count", async () => {
    const u = await newUser("new");
    for (let i = 0; i < 5; i++) await solo(u, i, "correct", false, 10 - i);
    await query(`update attempts set voided_at = now(), void_reason = 'test' where user_id = $1 and objective_id = any($2::uuid[])`, [
      u,
      objectives.slice(0, 2),
    ]);
    assert.equal((await json(await check(u, units[0]))).change, null);
  });

  test("two checks at once move the unit once", async () => {
    const u = await newUser("new");
    for (let i = 0; i < 5; i++) await solo(u, i, "correct", false, 10 - i);
    const results = await Promise.all([check(u, units[0]), check(u, units[0]), check(u, units[0])]);
    const changes = (await Promise.all(results.map((r) => json(r)))).filter((r) => r.change);
    assert.equal(changes.length, 1);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from learner_level_changes where user_id = $1`, [u]);
    assert.equal(n?.n, 1);
  });
});

describe("lesson events", () => {
  const post = (u: string, objectiveId: string, body: unknown) =>
    call(eventPost, `/api/objectives/${objectiveId}/lesson-event`, u, "POST", body, { id: objectiveId });

  test("records the event with the track, the objective and only the fixed detail keys", async () => {
    const u = await newUser();
    await json(await post(u, objectives[0], { event: "guess_answered", detail: { level: "new", kind: "option", seconds: 9, answer: "secret" } }));
    const row = await queryOne<{ track_id: string; objective_id: string; detail: unknown }>(
      `select track_id, objective_id, detail from learner_events where user_id = $1 and event = 'guess_answered'`,
      [u]
    );
    assert.equal(row?.track_id, trackId);
    assert.equal(row?.objective_id, objectives[0]);
    assert.deepEqual(row?.detail, { level: "new", kind: "option", seconds: 9 });
  });

  test("a milestone, an unknown event, a retired or invisible objective is refused", async () => {
    const u = await newUser();
    await json(await post(u, objectives[0], { event: "lesson_finished" }), 400);
    await json(await post(u, objectives[0], { event: "dance" }), 400);
    await json(await post(u, randomUUID(), { event: "guess_skipped" }), 404);
    await query(`update objectives set retired_at = now() - interval '1 day' where id = $1`, [objectives[7]]);
    await json(await post(u, objectives[7], { event: "guess_skipped" }), 404);
    await query(`update objectives set retired_at = null where id = $1`, [objectives[7]]);
  });

  test("an event with no detail stores null", async () => {
    const u = await newUser();
    await json(await post(u, objectives[1], { event: "guess_skipped" }));
    const row = await queryOne<{ detail: unknown }>(`select detail from learner_events where user_id = $1`, [u]);
    assert.equal(row?.detail, null);
  });

  test("the database refuses a detail over the cap", async () => {
    const u = await newUser();
    await assert.rejects(
      query(`insert into learner_events (user_id, event, detail) values ($1, 'guess_shown', $2::jsonb)`, [
        u,
        JSON.stringify({ x: "y".repeat(500) }),
      ])
    );
  });
});

describe("export and deletion", () => {
  test("the goal, levels and changes are in the export and go with the account", async () => {
    const u = await newUser("new");
    await json(await putLevel(u, { goal: "interest", level: "some" }));
    await json(await putLevel(u, { unitId: units[1], unitLevel: "new" }));
    const data = (await buildAccountExport(u, (sql, p) => query(sql, p))) as any;
    assert.equal(data.courseLevels.length, 1);
    assert.equal(data.courseLevels[0].goal, "interest");
    assert.equal(data.unitLevels.length, 1);
    assert.equal(data.levelChanges.length, 2);
    await query(`delete from app_users where id = $1`, [u]);
    for (const t of ["learner_course_profiles", "learner_unit_levels", "learner_level_changes"]) {
      const n = await queryOne<{ n: number }>(`select count(*)::int as n from ${t} where user_id = $1`, [u]);
      assert.equal(n?.n, 0, t);
    }
  });

  test("deleting a course removes its levels", async () => {
    const u = await newUser("new");
    const t = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type) values ($1, $2, 'Gone', 'graduate')`, [t, `LVLG${run}`]);
    const unit = randomUUID();
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 0)`, [unit, t]);
    await json(await putLevel(u, { goal: "work" }, t));
    await json(await putLevel(u, { unitId: unit, unitLevel: "new" }, t));
    await query(`delete from subject_tracks where id = $1`, [t]);
    for (const tbl of ["learner_course_profiles", "learner_unit_levels", "learner_level_changes"]) {
      const n = await queryOne<{ n: number }>(`select count(*)::int as n from ${tbl} where user_id = $1`, [u]);
      assert.equal(n?.n, 0, tbl);
    }
  });
});
