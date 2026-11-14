// REQ-262 (migration 082), against a real Postgres with every migration
// applied. No model call is made anywhere in this suite.
//
//   1. Assignment: random on first read, stored once, stable, both arms
//      reachable, concurrent first reads settle on one arm.
//   2. Choice: recorded as chosen, keeps the assignment, any value but the
//      two orders is refused, 401 when signed out.
//   3. The test switched off: learners who have not chosen get the default
//      and nothing is stored; a choice still stands.
//   4. Lesson events carry the order and its source.
//   5. The results query runs on real rows and reads them the way the doc says.
//   6. Export and account deletion.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { buildAccountExport } from "./account-export";
import { chooseTeachOrder, getTeachOrder } from "./teach-order";
import { teachOrderResults } from "./teach-order-results";
import { GET as orderGet, PUT as orderPut } from "../app/api/account/teach-order/route";
import { POST as eventPost } from "../app/api/objectives/[id]/lesson-event/route";

const run = Date.now().toString(36);
const users: string[] = [];
const trackId = randomUUID();
const unitId = randomUUID();
const objectives: string[] = [];

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const get = (u: string) => orderGet(new Request("http://t/api/account/teach-order", { headers: auth(u) }));
const put = (u: string, body: unknown) =>
  orderPut(new Request("http://t/api/account/teach-order", { method: "PUT", headers: auth(u), body: JSON.stringify(body) }));
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `order-${run}-${users.length}@example.test`]);
  return u;
}
const post = (u: string, objectiveId: string, body: unknown) =>
  eventPost(new Request(`http://t/api/objectives/${objectiveId}/lesson-event`, { method: "POST", headers: auth(u), body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: objectiveId }),
  });

before(async () => {
  await query(`insert into subject_tracks (id, user_id, code, title, track_type) values ($1, null, $2, 'Order test', 'graduate')`, [trackId, `ORD${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Unit', 0)`, [unitId, trackId]);
  for (let i = 0; i < 12; i++) {
    const id = randomUUID();
    objectives.push(id);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [id, unitId, `Objective ${i}`, i]);
  }
});
after(async () => {
  await query(`delete from subject_tracks where id = $1`, [trackId]);
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("assignment", () => {
  test("the first read assigns an order, stores it once, and every later read gives the same", async () => {
    const u = await newUser();
    const first = await json(await get(u));
    assert.ok(["explain_first", "example_first"].includes(first.order));
    assert.equal(first.source, "assigned");
    assert.equal(first.testOn, true);
    for (let i = 0; i < 5; i++) assert.deepEqual(await json(await get(u)), first);
    const row = await queryOne<{ assigned_order: string; teach_order: string; chosen_at: Date | null }>(
      `select assigned_order, teach_order, chosen_at from learner_teach_order where user_id = $1`,
      [u]
    );
    assert.equal(row?.assigned_order, first.order);
    assert.equal(row?.teach_order, first.order);
    assert.equal(row?.chosen_at, null);
  });

  test("both arms are reachable and the draw is the injected coin", async () => {
    const a = await newUser();
    const b = await newUser();
    assert.equal((await getTeachOrder(a, { flip: () => 0 })).order, "explain_first");
    assert.equal((await getTeachOrder(b, { flip: () => 1 })).order, "example_first");
    // A second read with the opposite coin does not redraw.
    assert.equal((await getTeachOrder(a, { flip: () => 1 })).order, "explain_first");
  });

  test("real draws over many learners give both arms", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add((await getTeachOrder(await newUser())).order);
    assert.equal(seen.size, 2);
  });

  test("two first reads at once settle on one arm", async () => {
    const u = await newUser();
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => getTeachOrder(u, { flip: () => i % 2 })));
    assert.equal(new Set(results.map((r) => r.order)).size, 1);
    const rows = await queryOne<{ n: number }>(`select count(*)::int as n from learner_teach_order where user_id = $1`, [u]);
    assert.equal(rows?.n, 1);
  });
});

describe("choice", () => {
  test("a choice is recorded as chosen, keeps the assignment and replaces what lessons use", async () => {
    const u = await newUser();
    const assigned = await getTeachOrder(u, { flip: () => 0 });
    assert.equal(assigned.order, "explain_first");
    const res = await json(await put(u, { order: "example_first" }));
    assert.deepEqual(res, { order: "example_first", source: "chosen", testOn: true });
    assert.deepEqual(await json(await get(u)), { order: "example_first", source: "chosen", testOn: true });
    const row = await queryOne<{ assigned_order: string; teach_order: string; chosen_at: Date | null }>(
      `select assigned_order, teach_order, chosen_at from learner_teach_order where user_id = $1`,
      [u]
    );
    assert.equal(row?.assigned_order, "explain_first");
    assert.equal(row?.teach_order, "example_first");
    assert.ok(row?.chosen_at);
  });

  test("picking the order you were assigned still counts as a choice", async () => {
    const u = await newUser();
    const a = await getTeachOrder(u, { flip: () => 1 });
    assert.equal((await json(await put(u, { order: a.order }))).source, "chosen");
  });

  test("a learner who chooses before any lesson asked gets a row with an assignment kept", async () => {
    const u = await newUser();
    await json(await put(u, { order: "example_first" }));
    const row = await queryOne<{ assigned_order: string; teach_order: string }>(
      `select assigned_order, teach_order from learner_teach_order where user_id = $1`,
      [u]
    );
    assert.ok(["explain_first", "example_first"].includes(row!.assigned_order));
    assert.equal(row?.teach_order, "example_first");
  });

  test("anything but the two orders is a 400 and changes nothing", async () => {
    const u = await newUser();
    for (const body of [{}, { order: "" }, { order: "Example first" }, { order: 1 }, { order: null }, [], "example_first"]) {
      await json(await put(u, body), 400);
    }
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from learner_teach_order where user_id = $1`, [u]);
    assert.equal(n?.n, 0);
  });

  test("signed out is a 401 for both", async () => {
    assert.equal((await orderGet(new Request("http://t/api/account/teach-order"))).status, 401);
    assert.equal((await orderPut(new Request("http://t/api/account/teach-order", { method: "PUT", body: "{}" }))).status, 401);
  });

  test("the choice is only ever the caller's own row", async () => {
    const a = await newUser();
    const b = await newUser();
    await getTeachOrder(b, { flip: () => 0 });
    await json(await put(a, { order: "example_first" }));
    assert.equal((await getTeachOrder(b)).source, "assigned");
  });
});

describe("the test switched off", () => {
  test("a learner who has not chosen gets the default and nothing is stored", async () => {
    const u = await newUser();
    assert.deepEqual(await getTeachOrder(u, { testOn: false }), { order: "explain_first", source: "default", testOn: false });
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from learner_teach_order where user_id = $1`, [u]);
    assert.equal(n?.n, 0);
  });

  test("someone assigned earlier sees the default while it is off, and the assignment is kept", async () => {
    const u = await newUser();
    await getTeachOrder(u, { flip: () => 1 });
    assert.deepEqual(await getTeachOrder(u, { testOn: false }), { order: "explain_first", source: "default", testOn: false });
    assert.equal((await getTeachOrder(u, { testOn: true })).order, "example_first");
  });

  test("a choice still stands", async () => {
    const u = await newUser();
    await chooseTeachOrder(u, "example_first", { testOn: false });
    assert.deepEqual(await getTeachOrder(u, { testOn: false }), { order: "example_first", source: "chosen", testOn: false });
  });
});

describe("lesson events", () => {
  test("carry the order and where it came from, and drop an order with no source", async () => {
    const u = await newUser();
    await json(await post(u, objectives[0], { event: "lesson_step_reached", detail: { step: "teach", level: "new", flow: true, order: "example_first", order_source: "assigned" } }));
    await json(await post(u, objectives[0], { event: "teach_card_viewed", detail: { card: 1, order: "example_first" } }));
    const rows = await query<{ event: string; detail: unknown }>(
      `select event, detail from learner_events where user_id = $1 order by id asc`,
      [u]
    );
    assert.deepEqual(rows[0].detail, { step: "teach", level: "new", flow: true, order: "example_first", order_source: "assigned" });
    assert.deepEqual(rows[1].detail, { card: 1 });
  });
});

describe("results query", () => {
  // The results query is global by design, so start from no order-carrying
  // events (this file's earlier tests wrote some; no other suite does).
  before(async () => {
    await query(`delete from learner_events where detail->>'order' is not null`);
  });

  // One learner per lesson, each with a first lesson on one objective.
  async function lesson(opts: {
    arm: "explain_first" | "example_first";
    source: "assigned" | "chosen";
    guided?: string;
    solo?: string;
    assisted?: boolean;
    status?: string;
    startedHoursAgo: number;
    teachSeconds?: number;
    objective: number;
    assignedOrder?: "explain_first" | "example_first";
  }): Promise<string> {
    const u = await newUser();
    const o = objectives[opts.objective];
    if (opts.assignedOrder) {
      await query(`insert into learner_teach_order (user_id, assigned_order, teach_order) values ($1, $2, $2)`, [u, opts.assignedOrder]);
    }
    const ev = (event: string, detail: object, offsetSec: number) =>
      query(
        `insert into learner_events (user_id, event, track_id, objective_id, detail, created_at)
         values ($1, $2, $3, $4, $5::jsonb, now() - make_interval(hours => $6) + make_interval(secs => $7))`,
        [u, event, trackId, o, JSON.stringify({ ...detail, order: opts.arm, order_source: opts.source }), opts.startedHoursAgo, offsetSec]
      );
    await ev("lesson_step_reached", { step: "teach" }, 0);
    if (opts.teachSeconds !== undefined) await ev("lesson_step_reached", { step: "fade" }, opts.teachSeconds);
    for (const [stage, verdict] of [["fade", opts.guided], ["solo", opts.solo]] as const) {
      if (!verdict) continue;
      await query(
        `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, assisted, created_at)
         values ($1, $2, $3, 'lesson', $4, 'open', 'q', 'a', $5, $6, now())`,
        [u, unitId, o, stage, verdict, stage === "solo" && opts.assisted === true]
      );
    }
    if (opts.status) await query(`insert into mastery (user_id, objective_id, status) values ($1, $2, $3)`, [u, o, opts.status]);
    return u;
  }

  test("counts each arm's answers, mastery after 24h and time in Teach", async () => {
    await lesson({ arm: "example_first", source: "assigned", guided: "correct", solo: "correct", status: "Independent", startedHoursAgo: 48, teachSeconds: 60, objective: 0 });
    await lesson({ arm: "example_first", source: "assigned", guided: "incorrect", solo: "correct", assisted: true, status: "Guided", startedHoursAgo: 48, teachSeconds: 100, objective: 0 });
    // Started an hour ago (not settled) and left Teach open for 5000 s (ignored).
    await lesson({ arm: "example_first", source: "assigned", guided: "correct", startedHoursAgo: 1, teachSeconds: 5000, objective: 0 });
    await lesson({ arm: "explain_first", source: "assigned", guided: "correct", solo: "incorrect", status: "Guided", startedHoursAgo: 72, teachSeconds: 30, objective: 0 });
    await lesson({ arm: "example_first", source: "chosen", guided: "correct", solo: "correct", status: "Transfer-ready", startedHoursAgo: 72, objective: 1, assignedOrder: "explain_first" });

    const rows = await teachOrderResults((sql, p) => query(sql, p), 30);
    assert.equal(rows.length, 3, JSON.stringify(rows));
    const row = (arm: string, source: string) => rows.find((r) => r.arm === arm && r.source === source)!;

    assert.deepEqual(row("example_first", "assigned"), {
      arm: "example_first", source: "assigned", assignedOrder: null,
      lessons: 3, learners: 3,
      guidedAnswered: 3, guidedFirstTryCorrect: 2,
      soloAnswered: 2, soloFirstTryCorrect: 2, soloUnassistedCorrect: 1,
      settled24h: 2, independentAfter24h: 1,
      medianTeachSeconds: 80,
    });
    assert.deepEqual(row("explain_first", "assigned"), {
      arm: "explain_first", source: "assigned", assignedOrder: null,
      lessons: 1, learners: 1,
      guidedAnswered: 1, guidedFirstTryCorrect: 1,
      soloAnswered: 1, soloFirstTryCorrect: 0, soloUnassistedCorrect: 0,
      settled24h: 1, independentAfter24h: 0,
      medianTeachSeconds: 30,
    });
    // A chooser keeps the arm they were assigned beside what they were shown.
    assert.deepEqual(row("example_first", "chosen"), {
      arm: "example_first", source: "chosen", assignedOrder: "explain_first",
      lessons: 1, learners: 1,
      guidedAnswered: 1, guidedFirstTryCorrect: 1,
      soloAnswered: 1, soloFirstTryCorrect: 1, soloUnassistedCorrect: 1,
      settled24h: 1, independentAfter24h: 1,
      medianTeachSeconds: null,
    });
  });

  test("a voided answer does not count, and lessons outside the window do not appear", async () => {
    await query(`delete from learner_events where detail->>'order' is not null`);
    const u = await lesson({ arm: "explain_first", source: "assigned", guided: "correct", startedHoursAgo: 24 * 40, objective: 2 });
    assert.equal((await teachOrderResults((sql, p) => query(sql, p), 30)).length, 0);
    await query(`update attempts set voided_at = now() where user_id = $1`, [u]);
    const rows = await teachOrderResults((sql, p) => query(sql, p), 365);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].guidedAnswered, 0);
  });
});

describe("export and deletion", () => {
  test("the order is in the export and goes with the account", async () => {
    const u = await newUser();
    await getTeachOrder(u, { flip: () => 1 });
    await chooseTeachOrder(u, "explain_first");
    const data = (await buildAccountExport(u, (sql, p) => query(sql, p))) as any;
    assert.equal(data.teachOrder.length, 1);
    assert.equal(data.teachOrder[0].assigned_order, "example_first");
    assert.equal(data.teachOrder[0].teach_order, "explain_first");
    assert.ok(data.teachOrder[0].chosen_at);
    await query(`delete from app_users where id = $1`, [u]);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from learner_teach_order where user_id = $1`, [u]);
    assert.equal(n?.n, 0);
  });
});
