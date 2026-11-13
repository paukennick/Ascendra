// REQ-256 (learner levels follow-ups), against a real Postgres with every
// migration applied (080 included). No model call is made in this suite.
//
//   1. The move-down suggestion: asked at the level check only when nothing
//      moved up and the app can show it, from 3 of the last 5 first-try solo
//      answers missed or every guess off; at most once per unit per week;
//      never below New; only on a course with the level-aware flow. Yes moves
//      the unit down one level with a 'suggested' change Undo can reverse;
//      Not now snoozes it for that unit for a week.
//   2. The lesson goal card: counted per lesson on the server, recorded
//      dismissed (via lesson, reason auto) after two lessons unanswered.
//   3. The goal question metrics query on real rows.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { GET as levelGet, PUT as levelPut } from "../app/api/courses/[id]/level/route";
import { POST as checkPost } from "../app/api/courses/[id]/level/check/route";
import { POST as changePost } from "../app/api/courses/[id]/level/changes/[changeId]/route";
import { POST as suggestionPost } from "../app/api/courses/[id]/level/suggestion/route";
import { POST as goalCardPost } from "../app/api/courses/[id]/level/goal-card/route";
import { goalQuestionSummary } from "./metrics";

const run = Date.now().toString(36);
const users: string[] = [];
const trackId = randomUUID(); // level flow on
const plainTrack = randomUUID(); // level flow off
const units = [randomUUID(), randomUUID()];
const plainUnit = randomUUID();
const objectives: string[] = []; // 7 in unit 0, 1 in unit 1, 3 in the plain course

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
const check = (u: string, unitId: string, suggest = true, t = trackId) =>
  call(checkPost, `/api/courses/${t}/level/check`, u, "POST", suggest ? { unitId, suggest: true } : { unitId }, { id: t });
const answer = (u: string, unitId: string, a: string, t = trackId) =>
  call(suggestionPost, `/api/courses/${t}/level/suggestion`, u, "POST", { unitId, answer: a }, { id: t });
const act = (u: string, changeId: string, action: string) =>
  call(changePost, `/api/courses/${trackId}/level/changes/${changeId}`, u, "POST", { action }, { id: trackId, changeId });
const goalCard = (u: string, objectiveId: string, t = trackId) =>
  call(goalCardPost, `/api/courses/${t}/level/goal-card`, u, "POST", { objectiveId }, { id: t });

async function newUser(experience: string | null = null): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `lvldown-${run}-${users.length}@example.test`]);
  if (experience) await query(`insert into learner_intake (user_id, experience) values ($1, $2)`, [u, experience]);
  return u;
}

async function solo(u: string, i: number, verdict: string, assisted = false, minutesAgo = 0) {
  await query(
    `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, assisted, created_at)
     values ($1, (select unit_id from objectives where id = $2), $2, 'lesson', 'solo', 'open', 'q', 'a', $3, $4, now() - make_interval(mins => $5))`,
    [u, objectives[i], verdict, assisted, minutesAgo]
  );
}
async function guess(u: string, i: number, match: string, minutesAgo = 0) {
  await query(
    `insert into learner_events (user_id, event, track_id, objective_id, detail, created_at)
     values ($1, 'guess_matched', (select cu.track_id from objectives o join course_units cu on cu.id = o.unit_id where o.id = $2), $2,
             jsonb_build_object('match', $3::text), now() - make_interval(mins => $4))`,
    [u, objectives[i], match, minutesAgo]
  );
}
// Moves the learner's suggestion clock back, as if it were asked `days` ago.
async function age(u: string, days: number) {
  await query(
    `update learner_events set created_at = created_at - make_interval(days => $2)
      where user_id = $1 and event in ('level_down_suggested', 'level_down_declined')`,
    [u, days]
  );
}
const events = (u: string, event: string) =>
  query<{ detail: any }>(`select detail from learner_events where user_id = $1 and event = $2 order by id`, [u, event]).then((r) =>
    r.map((x) => x.detail)
  );

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, level_flow) values ($1, $2, 'Down test', 'graduate', true)`, [
    trackId,
    `LDN${run}`,
  ]);
  await query(`insert into subject_tracks (id, code, title, track_type) values ($1, $2, 'Down plain', 'graduate')`, [plainTrack, `LDP${run}`]);
  for (const [i, u] of units.entries()) {
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, $3, $4)`, [u, trackId, `Unit ${i + 1}`, i]);
  }
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Plain unit', 0)`, [plainUnit, plainTrack]);
  for (let i = 0; i < 11; i++) {
    const id = randomUUID();
    objectives.push(id);
    const unit = i < 7 ? units[0] : i < 8 ? units[1] : plainUnit;
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [id, unit, `Objective ${i}`, i]);
  }
});

after(async () => {
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[trackId, plainTrack]]);
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("move-down suggestion", () => {
  test("3 of the last 5 first tries missed suggests one level down; nothing changes until Yes", async () => {
    const u = await newUser("experienced");
    await solo(u, 0, "incorrect", false, 50);
    await solo(u, 1, "correct", false, 40);
    await solo(u, 2, "partial", false, 30);
    let r = await json(await check(u, units[0]));
    assert.equal(r.change, null);
    assert.equal(r.suggestion, null, "two misses are not enough");
    await solo(u, 3, "incorrect", false, 20);
    r = await json(await check(u, units[0]));
    assert.equal(r.change, null);
    assert.deepEqual(r.suggestion, { unitId: units[0], unitTitle: "Unit 1", fromLevel: "experienced", toLevel: "some", why: "missed" });
    const s = await json(await getLevel(u, units[0]));
    assert.equal(s.effective, "experienced", "a suggestion never moves the level");
    assert.equal(s.notices.length, 0);
    assert.deepEqual(await events(u, "level_down_suggested"), [{ unit: units[0], from: "experienced", to: "some", why: "missed" }]);
    // At most once per unit per week, even before it is answered.
    assert.equal((await json(await check(u, units[0]))).suggestion, null);
  });

  test("Yes moves the unit down one level, recorded so Undo puts it back exactly", async () => {
    const u = await newUser("experienced");
    for (let i = 0; i < 3; i++) await solo(u, i, "incorrect", false, 30 - i);
    assert.ok((await json(await check(u, units[0]))).suggestion);
    const r = await json(await answer(u, units[0], "yes"));
    assert.equal(r.change.fromLevel, "experienced");
    assert.equal(r.change.toLevel, "some");
    assert.equal(r.change.reason, "suggested");
    assert.equal(r.state.effective, "some");
    assert.equal(r.state.units.find((x: any) => x.unitId === units[0]).source, "self");
    assert.equal(r.state.notices.length, 0, "the learner chose it: no notice on the course page");
    assert.equal((await json(await getLevel(u, units[1]))).effective, "experienced", "other units unchanged");
    // A double tap does not move it twice.
    const again = await json(await answer(u, units[0], "yes"));
    assert.equal(again.change.id, r.change.id);
    assert.equal(again.state.effective, "some");
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from learner_level_changes where user_id = $1`, [u]);
    assert.equal(n?.n, 1);
    assert.deepEqual(await events(u, "level_changed"), [{ from: "experienced", to: "some", reason: "suggested", scope: "unit" }]);
    // Undo restores the unit as it was (no own level before).
    const s = await json(await act(u, r.change.id, "undo"));
    assert.equal(s.effective, "experienced");
    assert.equal(s.units.find((x: any) => x.unitId === units[0]).level, null);
    // "Not now" after Yes is refused.
    await json(await answer(u, units[0], "not_now"), 409);
  });

  test("Yes keeps a unit's own earlier level for Undo", async () => {
    const u = await newUser("new");
    await json(await putLevel(u, { unitId: units[0], unitLevel: "some" }));
    for (let i = 0; i < 3; i++) await solo(u, i, "incorrect", false, 0); // after that change
    const r = await json(await check(u, units[0]));
    assert.equal(r.suggestion.toLevel, "new");
    const y = await json(await answer(u, units[0], "yes"));
    assert.equal(y.state.effective, "new");
    const s = await json(await act(u, y.change.id, "undo"));
    const unit = s.units.find((x: any) => x.unitId === units[0]);
    assert.deepEqual([unit.level, unit.source], ["some", "self"]);
  });

  test("Not now snoozes it for that unit for a week; then it may ask again", async () => {
    const u = await newUser("experienced");
    for (let i = 0; i < 3; i++) await solo(u, i, "incorrect", false, 30 - i);
    assert.ok((await json(await check(u, units[0]))).suggestion);
    let r = await json(await answer(u, units[0], "not_now"));
    assert.equal(r.change, null);
    assert.equal(r.state.effective, "experienced");
    await json(await answer(u, units[0], "not_now")); // repeat: no-op
    assert.deepEqual(await events(u, "level_down_declined"), [{ unit: units[0] }]);
    await json(await answer(u, units[0], "yes"), 409); // declined: Yes is gone with it
    await age(u, 6);
    assert.equal((await json(await check(u, units[0]))).suggestion, null, "six days later: still snoozed");
    await age(u, 1);
    r = await json(await check(u, units[0]));
    assert.equal(r.suggestion?.toLevel, "some", "a week later the same evidence may ask again");
  });

  test("every guess off suggests; one close guess among them does not", async () => {
    const u = await newUser("some");
    await guess(u, 0, "off", 30);
    await guess(u, 1, "off", 20);
    assert.equal((await json(await check(u, units[0]))).suggestion, null, "two guesses are not every guess");
    await guess(u, 2, "close", 10);
    await guess(u, 2, "off", 5); // a later guess on the same objective replaces the earlier
    const r = await json(await check(u, units[0]));
    assert.equal(r.suggestion?.why, "guesses");
    assert.equal(r.suggestion?.toLevel, "new");
    const v = await newUser("some");
    for (const [i, m] of ["off", "close", "off"].entries()) await guess(v, i, m, 10 - i);
    assert.equal((await json(await check(v, units[0]))).suggestion, null);
  });

  test("never below New, never on a course without the level-aware flow, never for an app that cannot show it", async () => {
    const u = await newUser("new");
    for (let i = 0; i < 3; i++) await solo(u, i, "incorrect", false, 3 - i);
    assert.equal((await json(await check(u, units[0]))).suggestion, null);
    await json(await answer(u, units[0], "yes"), 409);
    const p = await newUser("experienced");
    for (let i = 8; i < 11; i++) await solo(p, i, "incorrect", false, 11 - i);
    assert.equal((await json(await check(p, plainUnit, true, plainTrack))).suggestion, null);
    const old = await newUser("experienced");
    for (let i = 0; i < 3; i++) await solo(old, i, "incorrect", false, 3 - i);
    const r = await json(await check(old, units[0], false));
    assert.equal(r.suggestion, null);
    assert.deepEqual(await events(old, "level_down_suggested"), [], "nothing recorded for an older app");
  });

  test("only evidence after the unit's last level change counts", async () => {
    const u = await newUser("experienced");
    for (let i = 0; i < 3; i++) await solo(u, i, "incorrect", false, 30 - i);
    await json(await putLevel(u, { unitId: units[0], unitLevel: "experienced" }));
    assert.equal((await json(await check(u, units[0]))).suggestion, null, "the learner's own change resets the evidence");
    for (let i = 3; i < 6; i++) await solo(u, i, "incorrect", false, 0);
    assert.ok((await json(await check(u, units[0]))).suggestion);
  });

  test("the level-up check still wins: a unit that moves up is not also asked to move down", async () => {
    const u = await newUser("new");
    for (let i = 0; i < 5; i++) await solo(u, i, "correct", false, 10 - i);
    for (let i = 0; i < 3; i++) await guess(u, i, "off", 10 - i);
    const r = await json(await check(u, units[0]));
    assert.equal(r.change?.toLevel, "some");
    assert.equal(r.suggestion, null);
  });

  test("an answer without an open suggestion, bad input and another learner's unit are refused", async () => {
    const u = await newUser("experienced");
    await json(await answer(u, units[0], "yes"), 409);
    await json(await answer(u, units[0], "maybe"), 400);
    await json(await call(suggestionPost, `/x`, u, "POST", { answer: "yes" }, { id: trackId }), 400);
    await json(await answer(u, plainUnit, "yes"), 404); // a unit of another course
  });

  test("two Yes taps at once move the unit once", async () => {
    const u = await newUser("experienced");
    for (let i = 0; i < 3; i++) await solo(u, i, "incorrect", false, 3 - i);
    assert.ok((await json(await check(u, units[0]))).suggestion);
    const rs = await Promise.all([answer(u, units[0], "yes"), answer(u, units[0], "yes"), answer(u, units[0], "yes")]);
    const bodies = await Promise.all(rs.map((r) => json(r)));
    assert.equal(new Set(bodies.map((b) => b.change.id)).size, 1);
    assert.equal(bodies[0].state.effective, "some");
  });
});

describe("lesson goal card showings", () => {
  test("shown in two lessons, then recorded dismissed (via lesson, reason auto) and never shown again", async () => {
    const u = await newUser();
    assert.deepEqual(await json(await goalCard(u, objectives[0])), { show: true, autoDismissed: false });
    // The same lesson again (a restart, a reload) is not a second showing.
    assert.deepEqual(await json(await goalCard(u, objectives[0])), { show: true, autoDismissed: false });
    assert.deepEqual(await json(await goalCard(u, objectives[1])), { show: true, autoDismissed: false });
    assert.deepEqual(await json(await goalCard(u, objectives[1])), { show: true, autoDismissed: false });
    assert.deepEqual(await json(await goalCard(u, objectives[2])), { show: false, autoDismissed: true });
    assert.deepEqual(await json(await goalCard(u, objectives[0])), { show: false, autoDismissed: false });
    const s = await json(await getLevel(u, units[0]));
    assert.equal(s.answered, true);
    assert.equal(s.goal, null);
    assert.deepEqual(await events(u, "course_goal_set"), [{ outcome: "dismissed", via: "lesson", reason: "auto" }]);
    const shown = await query<{ objective_id: string }>(
      `select objective_id from learner_events where user_id = $1 and event = 'goal_card_shown' order by id`,
      [u]
    );
    assert.deepEqual(shown.map((r) => r.objective_id), [objectives[0], objectives[1]]);
    // A later "Not now" from an older card records nothing more.
    await json(await putLevel(u, { dismiss: true, via: "lesson" }));
    assert.equal((await events(u, "course_goal_set")).length, 1);
  });

  test("an answer or Not now stops it at once; the count is per course", async () => {
    const u = await newUser();
    await json(await goalCard(u, objectives[0]));
    await json(await putLevel(u, { goal: "work", via: "lesson" }));
    assert.deepEqual(await json(await goalCard(u, objectives[1])), { show: false, autoDismissed: false });
    const v = await newUser();
    await json(await goalCard(v, objectives[0]));
    await json(await goalCard(v, objectives[1]));
    assert.deepEqual(await json(await goalCard(v, objectives[8], plainTrack)), { show: true, autoDismissed: false });
    await json(await putLevel(v, { dismiss: true, via: "lesson" }));
    assert.deepEqual(await json(await goalCard(v, objectives[2])), { show: false, autoDismissed: false });
    assert.deepEqual(await events(v, "course_goal_set"), [{ outcome: "dismissed", via: "lesson" }]);
  });

  test("an objective of another course or a bad id is refused", async () => {
    const u = await newUser();
    await json(await goalCard(u, objectives[8]), 404);
    await json(await call(goalCardPost, `/x`, u, "POST", { objectiveId: "nope" }, { id: trackId }), 400);
  });
});

describe("goal question metrics", () => {
  test("drop-off after the start sheet and skip/dismiss rates by where it was asked", async () => {
    const a = await newUser();
    const b = await newUser();
    const c = await newUser();
    // a: answered on the start sheet and started a lesson; b: skipped there and never started;
    // c: auto-dismissed in lessons.
    await json(await putLevel(a, { goal: "work", via: "start" }));
    await json(await putLevel(b, { skip: true, via: "start" }));
    await query(`update learner_events set created_at = now() - interval '2 hours' where user_id = any($1::uuid[]) and event = 'course_goal_set'`, [[a, b]]);
    await query(`insert into learner_events (user_id, event, track_id, objective_id) values ($1, 'lesson_started', $2, $3)`, [a, trackId, objectives[0]]);
    await json(await goalCard(c, objectives[0]));
    await json(await goalCard(c, objectives[1]));
    await json(await goalCard(c, objectives[2]));
    const mine = [a, b, c];
    const rows = await goalQuestionSummary(async (sql, p) => {
      // Only this suite's learners: the same query, scoped for the test.
      const scoped = sql.replace("where e.event = 'course_goal_set'", "where e.event = 'course_goal_set' and e.user_id = any($2::uuid[])");
      return query(scoped, [...p, mine]);
    }, 30);
    const start = rows.find((r) => r.via === "start")!;
    assert.deepEqual(
      [start.total, start.answered, start.skipped, start.startSettled, start.startNoLesson],
      [2, 1, 1, 2, 1]
    );
    const lesson = rows.find((r) => r.via === "lesson")!;
    assert.deepEqual([lesson.total, lesson.dismissed, lesson.dismissedAuto], [1, 1, 1]);
  });
});
