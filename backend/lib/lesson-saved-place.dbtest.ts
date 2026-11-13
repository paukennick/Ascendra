// REQ-250 / FAIL-1642: the course page shows an objective with a saved place
// in its lesson as in progress. A place left at Teach has no mastery row, so
// before this the objective read "Not started" and the course offered "Start
// course". GET /api/courses/:id now reports lesson_saved_at per objective,
// only within the app's 7-day resume window, and only for the caller.
// Run with: DATABASE_URL=... PGSSLMODE=disable npm run test:db
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { PUT as progressPut, DELETE as progressDelete } from "../app/api/objectives/[id]/progress/route";

const learner = randomUUID();
const other = randomUUID();
const track = randomUUID();
const unit = randomUUID();
const saved = randomUUID();
const untouched = randomUUID();
const run = Date.now().toString(36);

const headers = (u: string) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
  "content-type": "application/json",
});
const position = { step: "teach", guess: "g", guessFeedback: null, confidence: null, lessonKey: "k1", checks: {}, savedAt: Date.now() };

async function objectivesFor(u: string): Promise<Record<string, { lesson_saved_at: string | null; mastery_status: string | null }>> {
  const res = await courseGet(new Request(`http://t/api/courses/${track}`, { headers: headers(u) }), { params: Promise.resolve({ id: track }) });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  const out: Record<string, { lesson_saved_at: string | null; mastery_status: string | null }> = {};
  for (const un of body.units) for (const o of un.objectives) out[o.id] = o;
  return out;
}

before(async () => {
  for (const u of [learner, other]) await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Saved place', 'certification', null)`,
    [track, `SAVED-${run}`]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [unit, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $3, 'Saved', 1), ($2, $3, 'Untouched', 2)`, [saved, untouched, unit]);
});

after(async () => {
  await query(`delete from subject_tracks where id = $1`, [track]);
  await query(`delete from app_users where id = any($1::uuid[])`, [[learner, other]]);
  await closePool();
});

describe("course page: a saved place in a lesson (REQ-250)", () => {
  test("a place saved at Teach, with no mastery yet, is reported for that objective only", async () => {
    const put = await progressPut(
      new Request("http://t/x", { method: "PUT", headers: headers(learner), body: JSON.stringify(position) }),
      { params: Promise.resolve({ id: saved }) }
    );
    assert.equal(put.status, 200);
    const objs = await objectivesFor(learner);
    assert.equal(objs[saved].mastery_status, null, "no graded check yet");
    assert.ok(objs[saved].lesson_saved_at, "the saved place is reported");
    assert.equal(objs[untouched].lesson_saved_at, null);
  });

  test("another learner never sees it", async () => {
    const objs = await objectivesFor(other);
    assert.equal(objs[saved].lesson_saved_at, null);
  });

  test("a place older than the 7-day resume window is not reported", async () => {
    await query(`update lesson_progress set updated_at = now() - interval '8 days' where user_id = $1 and objective_id = $2`, [learner, saved]);
    assert.equal((await objectivesFor(learner))[saved].lesson_saved_at, null);
    await query(`update lesson_progress set updated_at = now() where user_id = $1 and objective_id = $2`, [learner, saved]);
  });

  test("finishing the lesson (the app deletes the place) clears it", async () => {
    const del = await progressDelete(
      new Request("http://t/x", { method: "DELETE", headers: headers(learner), body: JSON.stringify({ clearedAt: Date.now() + 1000 }) }),
      { params: Promise.resolve({ id: saved }) }
    );
    assert.equal(del.status, 200);
    assert.equal((await objectivesFor(learner))[saved].lesson_saved_at, null);
  });
});
