// REQ-101 / FAIL-092: a save overtaken on the network by the delete that
// finished the lesson must not bring the position back (migration 032).
// Calls the progress route handlers directly. Run with:
//   DATABASE_URL=... PGSSLMODE=disable npm run test:db
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { GET, PUT, DELETE } from "../app/api/objectives/[id]/progress/route";

const user = randomUUID();
const track = randomUUID();
const unit = randomUUID();
const objective = randomUUID();
const run = Date.now().toString(36);

const headers = {
  authorization: `Bearer ${signAccessToken({ sub: user, email: `${user}@example.test` })}`,
  "content-type": "application/json",
};
const ctx = () => ({ params: Promise.resolve({ id: objective }) });
const position = (savedAt: number | undefined) => ({
  step: "solo",
  guess: "g",
  guessFeedback: null,
  confidence: 3,
  lessonKey: "k1",
  checks: {},
  ...(savedAt === undefined ? {} : { savedAt }),
});
const put = (savedAt: number | undefined) =>
  PUT(new Request("http://t/x", { method: "PUT", headers, body: JSON.stringify(position(savedAt)) }), ctx());
const del = (clearedAt?: number) =>
  DELETE(
    new Request("http://t/x", {
      method: "DELETE",
      headers,
      body: clearedAt === undefined ? undefined : JSON.stringify({ clearedAt }),
    }),
    ctx()
  );
const row = () =>
  queryOne<{ step: string }>(`select step from lesson_progress where user_id = $1 and objective_id = $2`, [user, objective]);

before(async () => {
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `${user}@example.test`]);
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Private', 'certification', $3)`,
    [track, `TOMB-${run}`, user]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [unit, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 1)`, [objective, unit]);
});

after(async () => {
  await query(`delete from subject_tracks where id = $1`, [track]);
  await query(`delete from app_users where id = $1`, [user]);
  await closePool();
});

describe("lesson position: delete then a stale save", () => {
  test("a save older than the delete is ignored and the position stays deleted", async () => {
    const t = Date.now();
    assert.equal((await put(t - 2000)).status, 200);
    assert.ok(await row(), "first save stored");

    assert.equal((await del(t)).status, 200);
    assert.equal(await row(), null);

    // The save sent just before the lesson finished arrives after the delete.
    const late = await put(t - 500);
    assert.equal(late.status, 200);
    assert.deepEqual(await late.json(), { saved: false });
    assert.equal(await row(), null, "stale save must not resurrect the position");

    const got = await GET(new Request("http://t/x", { headers }), ctx());
    assert.deepEqual(await got.json(), { progress: null });
  });

  test("a save from after the delete (a new attempt) is stored", async () => {
    const t = Date.now() + 1000;
    await del(t);
    const res = await put(t + 1);
    assert.deepEqual(await res.json(), { saved: true });
    assert.equal((await row())?.step, "solo");
  });

  test("an older delete never moves the tombstone backwards", async () => {
    const t = Date.now() + 5000;
    await del(t);
    await del(t - 4000);
    assert.deepEqual(await (await put(t - 1000)).json(), { saved: false });
    assert.equal(await row(), null);
  });

  test("a delete with no clearedAt (older app) uses the server's time", async () => {
    await query(`delete from lesson_progress_tombstones where user_id = $1`, [user]);
    await del();
    assert.deepEqual(await (await put(Date.now() - 60_000)).json(), { saved: false });
    assert.equal(await row(), null);
  });
});
