// REQ-194 (migration 065): a hidden catalog course (subject_tracks.hidden_at
// passed) is not listed, so no course search in the app finds it -- Explore,
// first-run and the free-course picker all filter GET /api/courses on the
// device -- and nobody new can start it. Learners who already studied it keep
// it in their list and keep using it. Calls the route handlers directly.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { startableTrack, visibleTrack } from "./visibility";
import { GET as listCourses } from "../app/api/courses/route";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { PUT as planPut } from "../app/api/courses/[id]/plan/route";
import { POST as sessionPost } from "../app/api/sessions/route";
import { POST as firstRunPost } from "../app/api/onboarding/first-run/route";
import { GET as unitGet } from "../app/api/units/[id]/route";
import { PUT as freeCoursePut } from "../app/api/billing/free-course/route";

const run = Date.now().toString(36);
const newcomer = randomUUID();
const sessionLearner = randomUUID(); // studied the hidden course (a session)
const masteryLearner = randomUUID(); // studied it (mastery only)
const attemptLearner = randomUUID(); // studied it (an answer only)
const pickLearner = randomUUID(); // picked it as their free course, nothing else
const users = [newcomer, sessionLearner, masteryLearner, attemptLearner, pickLearner];
const returning = [sessionLearner, masteryLearner, attemptLearner, pickLearner];

const hidden = randomUUID(); // hidden yesterday
const hiddenLater = randomUUID(); // hidden_at in the future: still listed
const listed = randomUUID();
const hiddenUnit = randomUUID();
const hiddenObjective = randomUUID();

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` });
const json = (u: string, method: string, body: unknown) =>
  new Request("http://t/x", { method, headers: { ...auth(u), "content-type": "application/json" }, body: JSON.stringify(body) });
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });

async function listedIds(u: string): Promise<Set<string>> {
  const res = await listCourses(new Request("http://t/api/courses", { headers: auth(u) }));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { tracks: Array<{ id: string }> };
  return new Set(body.tracks.map((t) => t.id));
}

before(async () => {
  for (const u of users) await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, hidden_at) values
       ($1, $4, 'Hidden', 'certification', null, now() - interval '1 day'),
       ($2, $5, 'Hidden later', 'certification', null, now() + interval '1 day'),
       ($3, $6, 'Listed', 'certification', null, null)`,
    [hidden, hiddenLater, listed, `HID-${run}`, `HIDL-${run}`, `LST-${run}`]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 0)`, [hiddenUnit, hidden]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 0)`, [hiddenObjective, hiddenUnit]);
  await query(`insert into study_sessions (user_id, track_id, started_at, ended_at) values ($1, $2, now() - interval '2 days', now() - interval '2 days')`, [
    sessionLearner,
    hidden,
  ]);
  await query(`insert into mastery (user_id, objective_id, status, score_0_4) values ($1, $2, 'Guided', 2)`, [masteryLearner, hiddenObjective]);
  await query(
    `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict)
     values ($1, $2, $3, 'lesson', 'solo', 'open', 'Q', 'A', 'correct')`,
    [attemptLearner, hiddenUnit, hiddenObjective]
  );
  await query(`insert into free_course_choice (user_id, track_id, chosen_by) values ($1, $2, 'learner')`, [pickLearner, hidden]);
});

after(async () => {
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[hidden, hiddenLater, listed]]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("hidden courses are out of the catalog and search", () => {
  test("a learner who never studied it doesn't get it in the course list", async () => {
    const ids = await listedIds(newcomer);
    assert.ok(!ids.has(hidden), "hidden course listed");
    assert.ok(ids.has(listed));
    assert.ok(ids.has(hiddenLater), "a future hidden_at is still listed");
  });

  test("learners who already studied it keep it in their list", async () => {
    for (const u of returning) assert.ok((await listedIds(u)).has(hidden), u);
  });
});

describe("hidden courses can't be newly started", () => {
  test("a new session, a plan and a first-run pick are 404 for a newcomer", async () => {
    assert.equal((await sessionPost(json(newcomer, "POST", { trackId: hidden }))).status, 404);
    assert.equal((await planPut(json(newcomer, "PUT", { examDate: null, weeklyHours: 5 }), idCtx(hidden))).status, 404);
    assert.equal((await firstRunPost(json(newcomer, "POST", { trackId: hidden }))).status, 404);
    const sessions = await query(`select 1 from study_sessions where user_id = $1`, [newcomer]);
    assert.equal(sessions.length, 0, "nothing written");
    assert.equal(await startableTrack(hidden, newcomer), null);
    assert.ok(await visibleTrack(hidden, newcomer), "still visible to the study routes");
  });

  test("the free-course pick is 404 for a newcomer while billing is on", async () => {
    const prev = process.env.BILLING_ENABLED;
    process.env.BILLING_ENABLED = "on";
    try {
      assert.equal((await freeCoursePut(json(newcomer, "PUT", { trackId: hidden }))).status, 404);
      const row = await query(`select 1 from free_course_choice where user_id = $1`, [newcomer]);
      assert.equal(row.length, 0);
    } finally {
      if (prev === undefined) delete process.env.BILLING_ENABLED;
      else process.env.BILLING_ENABLED = prev;
    }
  });

  test("a listed course still starts for a newcomer", async () => {
    assert.equal((await sessionPost(json(newcomer, "POST", { trackId: listed }))).status, 201);
  });
});

describe("learners already on a hidden course keep access", () => {
  test("they can open it and its units, start a session and set a plan", async () => {
    for (const u of returning) {
      assert.equal((await courseGet(new Request("http://t/x", { headers: auth(u) }), idCtx(hidden))).status, 200);
      assert.equal((await unitGet(new Request("http://t/x", { headers: auth(u) }), idCtx(hiddenUnit))).status, 200);
      assert.ok(await startableTrack(hidden, u), u);
      assert.ok([200, 201].includes((await sessionPost(json(u, "POST", { trackId: hidden }))).status));
      assert.equal((await planPut(json(u, "PUT", { examDate: null, weeklyHours: 5 }), idCtx(hidden))).status, 200);
    }
  });
});

// The seeded rows (the DB test run seeds the catalog first): exactly the
// three courses are hidden, and their content is still there.
describe("the seeded catalog", () => {
  const CODES = ["DCA", "EX188", "EX280"];
  test("EX188, EX280 and DCA are hidden with their units kept; no other shared course is", async (t) => {
    const seeded = await query<{ n: number }>(`select count(*)::int as n from subject_tracks where user_id is null and code = 'EX188'`);
    if (seeded[0].n === 0) return t.skip("catalog not seeded in this database");
    const rows = await query<{ code: string; units: number }>(
      `select st.code, (select count(*)::int from course_units cu where cu.track_id = st.id) as units
         from subject_tracks st
        where st.user_id is null and st.hidden_at is not null and not (st.code like 'HID%')
        order by st.code`
    );
    assert.deepEqual(rows.map((r) => r.code), CODES);
    for (const r of rows) assert.ok(r.units > 0, r.code);
  });
});
