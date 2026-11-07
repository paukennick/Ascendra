// Audit 2 regression: the lesson routes (GET/POST lesson, prefetch-next) must
// 404 for an objective in someone else's private course, before any lesson is
// read or any model call is made. Calls the route handlers directly.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { GET as lessonGet, POST as lessonPost } from "../app/api/objectives/[id]/lesson/route";
import { POST as prefetchPost } from "../app/api/objectives/[id]/lesson/prefetch-next/route";

const owner = randomUUID();
const other = randomUUID();
const track = randomUUID();
const unit = randomUUID();
const objective = randomUUID();
const run = Date.now().toString(36);

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` });
const ctx = { params: Promise.resolve({ id: objective }) };

before(async () => {
  for (const u of [owner, other]) await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Private', 'certification', $3)`,
    [track, `PRIV-${run}`, owner]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [unit, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 1)`, [objective, unit]);
  await query(
    `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
       solo_check, solo_choices, solo_correct_index, solo_why, model)
     values ($1, 'private guess', 'private teach', 'f', '["a","b","c","d"]', 0, 'w', 's', '["a","b","c","d"]', 1, 'w', 'test')`,
    [objective]
  );
});

after(async () => {
  await query(`delete from subject_tracks where id = $1`, [track]);
  await query(`delete from app_users where id = any($1::uuid[])`, [[owner, other]]);
  await closePool();
});

describe("lesson routes check access first", () => {
  test("another user's private objective is 404 on GET, POST and prefetch, and leaks nothing", async () => {
    for (const call of [
      () => lessonGet(new Request("http://t/x", { headers: auth(other) }), ctx),
      () => lessonPost(new Request("http://t/x", { method: "POST", headers: auth(other) }), ctx),
      () => prefetchPost(new Request("http://t/x", { method: "POST", headers: auth(other) }), ctx),
    ]) {
      const res = await call();
      assert.equal(res.status, 404);
      assert.doesNotMatch(await res.text(), /private teach/);
    }
  });

  test("the owner still gets their lesson", async () => {
    const res = await lessonGet(new Request("http://t/x", { headers: auth(owner) }), ctx);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /private teach/);
  });
});
