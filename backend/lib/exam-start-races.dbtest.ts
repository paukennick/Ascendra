// REQ-204 (FAIL-880, FAIL-881): starting an exam session twice at once.
// Real Postgres with every migration applied; the model is a fake.
//
//   FAIL-880  a start sent twice with the same clientSessionId (a double tap,
//             a retry) returned a 500 for the slower one: the insert hit
//             exam_sessions_user_client_unique. It now returns the session the
//             first one made.
//   FAIL-881  five starts at once with different clientSessionIds each
//             abandoned "the" open session before any other insert was
//             visible, and left three sessions in progress. Starts for one
//             learner, course and mode now take turns.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
process.env.ITEM_FACT_CHECK = "off";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { POST as sessionsPost } from "../app/api/exam/sessions/route";
import { createSession } from "./exam-sessions";
import { examError, SESSION_ALREADY_STARTED } from "./exam-route-errors";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objectives = Array.from({ length: 3 }, () => randomUUID());
const users: string[] = [];
let modelCalls = 0;

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
  return u;
}
const start = (u: string, body: Record<string, unknown>) =>
  sessionsPost(new Request("http://t/x", { method: "POST", headers: auth(u), body: JSON.stringify({ trackId: track, timed: false, ...body }) }));

// Two multiple-choice items per call, with stems that differ per call.
function fakeItems() {
  const n = ++modelCalls;
  return {
    items: [
      { format: "multiple_choice", stem: `ES ${run} ${n} which?`, choices: ["w", "x", "y", "z"], correct: [2], steps: null, prompts: null, responses: null, matches: null, exhibit: null, explanation: "y." },
      { format: "multiple_choice", stem: `ES ${run} ${n}b which?`, choices: ["p", "q", "r", "s"], correct: [0], steps: null, prompts: null, responses: null, matches: null, exhibit: null, explanation: "p." },
    ],
  };
}

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Exam start races', 'certification', null)`, [track, `ES${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [unit, track]);
  for (const [i, o] of objectives.entries()) await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `O${i}`, i]);
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async () => ({ parsed_output: fakeItems(), stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }),
    },
  } as never);
  // Fill the bank once, so the races below spend no model calls.
  const seeder = await newUser();
  const r = await start(seeder, { mode: "sprint" });
  assert.equal(r.status, 201, JSON.stringify(await r.json()));
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("FAIL-880: the same start sent at once", () => {
  test("five starts with one clientSessionId all answer 201 with the one session", async () => {
    const u = await newUser();
    const cid = `cs-${run}-same`;
    const rs = await Promise.all(Array.from({ length: 5 }, () => start(u, { mode: "sprint", clientSessionId: cid })));
    const bodies = await Promise.all(rs.map(async (r) => ({ status: r.status, body: (await r.json()) as { session?: { id: string }; error?: string } })));
    assert.deepEqual(bodies.map((b) => b.status), [201, 201, 201, 201, 201], JSON.stringify(bodies.find((b) => b.status !== 201)?.body));
    assert.equal(new Set(bodies.map((b) => b.body.session?.id)).size, 1);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from exam_sessions where user_id = $1`, [u]);
    assert.equal(n!.n, 1);
  });

  test("createSession says which call made the session and which replayed it", async () => {
    const u = await newUser();
    const cid = `cs-${run}-flag`;
    const settled = await Promise.allSettled(
      Array.from({ length: 5 }, () => createSession({ userId: u, trackId: track, mode: "sprint", timed: false, clientSessionId: cid, allowGeneration: false }))
    );
    const failed = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    assert.deepEqual(failed.map((f) => String(f.reason?.message ?? f.reason)), [], "no start fails");
    const rs = settled.map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof createSession>>>).value);
    assert.equal(rs.filter((r) => !r.replayed).length, 1);
    assert.equal(new Set(rs.map((r) => r.sessionId)).size, 1);
  });

  test("the database's refusal of a second insert is a 409, not a 500", async () => {
    const res = examError(Object.assign(new Error('duplicate key value violates unique constraint "exam_sessions_user_client_unique"'), { code: "23505", constraint: "exam_sessions_user_client_unique" }));
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { error: string }).error, SESSION_ALREADY_STARTED);
    // Any other unique violation is still a server fault.
    assert.equal(examError(Object.assign(new Error("dup"), { code: "23505", constraint: "something_else" })).status, 500);
  });
});

describe("FAIL-881: different starts at once", () => {
  test("five starts with different clientSessionIds leave one session in progress", async () => {
    const u = await newUser();
    const rs = await Promise.all(Array.from({ length: 5 }, (_, i) => start(u, { mode: "sprint", clientSessionId: `cs-${run}-d${i}` })));
    assert.deepEqual(rs.map((r) => r.status), [201, 201, 201, 201, 201]);
    const rows = await query<{ status: string }>(`select status from exam_sessions where user_id = $1`, [u]);
    assert.equal(rows.length, 5);
    assert.equal(rows.filter((r) => r.status === "in_progress").length, 1, JSON.stringify(rows.map((r) => r.status)));
  });

  test("a sprint and a mock stay open side by side (the lock is per mode)", async () => {
    const u = await newUser();
    const [a, b] = await Promise.all([start(u, { mode: "sprint" }), start(u, { mode: "mock" })]);
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    const open = await query<{ mode: string }>(`select mode from exam_sessions where user_id = $1 and status = 'in_progress' order by mode`, [u]);
    assert.deepEqual(open.map((r) => r.mode), ["mock", "sprint"]);
  });
});
