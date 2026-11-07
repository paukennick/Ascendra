// REQ-118 (Audit 3 performance / infra) against a real Postgres with every
// migration applied. Query budgets are counted on the pg client, so a change
// that slips a per-item query back into a hot path fails here.
//   DATABASE_URL=postgresql://postgres@localhost:55432/<db> PGSSLMODE=disable npm run test:db
process.env.AUTH_JWT_SECRET ??= "perf-audit3-test-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { Client } from "pg";
import { query, closePool, withTransaction } from "./db";
import { signAccessToken } from "./auth/tokens";
import { consumeRateLimit, RateLimitError } from "./auth/rateLimit";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { dueObjectives } from "./review-store";
import { utcDay } from "./review-scheduler";
import { buildAccountExport, exportSectionPage, EXPORT_PAGE_ROWS } from "./account-export";
import { checkSchema, SCHEMA_PROBES } from "./schema-status";
import { clearCourseViewCaches } from "./readiness-cache";
import { POST as sessionsPost } from "../app/api/review/sessions/route";
import { GET as coursesGet } from "../app/api/courses/[id]/route";
import { GET as exportGet } from "../app/api/account/export/route";
import { GET as errorsGet } from "../app/api/errors/route";

const run = Date.now().toString(36);
const users: string[] = [];
const tracks: string[] = [];
const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");
const N_OBJ = 12;

// ---- query counter: every statement any pool client sends ---------------
const proto = Client.prototype as unknown as { query: (...a: unknown[]) => unknown };
const origQuery = proto.query;
let counting = false;
let counted: string[] = [];
proto.query = function (this: unknown, ...args: unknown[]) {
  if (counting) {
    const a = args[0] as string | { text?: string };
    counted.push(typeof a === "string" ? a : a?.text ?? "");
  }
  return origQuery.apply(this, args);
};
async function countQueries<T>(fn: () => Promise<T>): Promise<{ result: T; n: number; sql: string[] }> {
  counted = [];
  counting = true;
  try {
    const result = await fn();
    return { result, n: counted.length, sql: counted };
  } finally {
    counting = false;
  }
}

async function newUser(tag: string): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email, email_verified_at) values ($1, $2, now())`, [u, `pa3-${run}-${tag}@example.test`]);
  return u;
}
const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` });
const get = (u: string, url: string) => new Request(url, { headers: auth(u) });

// A private course: two weighted units, N_OBJ objectives, each with a shared
// lesson and two cached review questions written from it.
async function makeCourse(owner: string) {
  const track = randomUUID();
  tracks.push(track);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Perf', 'certification', $3)`, [
    track,
    `PA3-${run}-${tracks.length}`,
    owner,
  ]);
  const units = [randomUUID(), randomUUID()];
  for (const [i, u] of units.entries()) {
    await query(`insert into course_units (id, track_id, title, weight, sort_order) values ($1, $2, $3, 50, $4)`, [u, track, `U${i}`, i]);
  }
  const objectives: { id: string; unit: string }[] = [];
  for (let i = 0; i < N_OBJ; i++) {
    const id = randomUUID();
    const unit = units[i % 2];
    objectives.push({ id, unit });
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [id, unit, `Objective ${i}: alpha, beta`, i]);
    const teach = `Teaching text for objective ${i}.`;
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', $2, 'f', '["a","b","c","d"]', 0, 'w', 's', '["a","b","c","d"]', 0, 'w', 'test')`,
      [id, teach]
    );
    for (let k = 0; k < 2; k++) {
      await query(
        `insert into review_items (objective_id, source_hash, question, choices, correct_index, why, terms, model)
         values ($1, $2, $3, '["r","w1","w2","w3"]', 0, 'why', '["alpha"]', 'test')`,
        [id, md5(teach), `Q${k} on ${i}`]
      );
    }
  }
  return { track, units, objectives };
}

before(() => {
  // Nothing in this file may call the model.
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("model called");
      },
      parse: async () => {
        throw new Error("model called");
      },
    },
  } as never);
  setAiCallSink(async () => {});
});

after(async () => {
  proto.query = origQuery;
  __setClientForTest(null);
  setAiCallSink(null);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [tracks]);
  await query(`delete from auth_events where user_id = any($1::uuid[]) or identifier = any($1::text[])`, [users]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

// ------------------------------------------------------------ MEDIUM-4
describe("review session start (FAIL-374, FAIL-375)", () => {
  test("a fresh plan of 12 cached questions takes at most 10 queries and no model call", async () => {
    const u = await newUser("review");
    const { objectives } = await makeCourse(u);
    const today = utcDay(new Date());
    for (const o of objectives) {
      await query(`insert into review_schedule (user_id, objective_id, step, due_on) values ($1, $2, 1, $3::date)`, [u, o.id, today]);
    }
    const req = () => new Request("http://t/x", { method: "POST", headers: { ...auth(u), "content-type": "application/json" }, body: "{}" });
    const { result, n, sql } = await countQueries(() => sessionsPost(req()));
    assert.equal(result.status, 200);
    const body = await result.json();
    assert.equal(body.session.total, 12, JSON.stringify(body));
    assert.equal(body.unavailable, 0);
    assert.ok(n <= 10, `fresh plan used ${n} queries (was 65 before REQ-118):\n${sql.map((s) => s.slice(0, 80)).join("\n")}`);
    // Every item got an unseen cached question, one per objective.
    const items = await query<{ review_item_id: string | null; objective_id: string }>(
      `select si.review_item_id, si.objective_id from review_session_items si where si.session_id = $1`,
      [body.session.id]
    );
    assert.equal(items.length, 12);
    assert.ok(items.every((i) => i.review_item_id));
    assert.equal(new Set(items.map((i) => i.objective_id)).size, 12);

    // A second start resumes the same session.
    const again = await (await sessionsPost(req())).json();
    assert.equal(again.session.id, body.session.id);
  });

  test("a question already answered is not served again; an objective answered today is not due", async () => {
    const u = await newUser("seen");
    const { objectives } = await makeCourse(u);
    const today = utcDay(new Date());
    const o = objectives[0];
    // An earlier session (yesterday) answered Q0 on objective 0; today's answer on objective 1.
    const s1 = (await query<{ id: string }>(`insert into review_sessions (user_id, day, size_cap) values ($1, $2::date - 1, 12) returning id`, [u, today]))[0].id;
    const q0 = (await query<{ id: string }>(`select id from review_items where objective_id = $1 and question like 'Q0%'`, [o.id]))[0].id;
    await query(
      `insert into review_session_items (session_id, position, objective_id, review_item_id, answered_at, verdict)
       values ($1, 0, $2, $3, now() - interval '1 day', 'correct'), ($1, 1, $4, null, now(), 'correct')`,
      [s1, o.id, q0, objectives[1].id]
    );
    for (const x of objectives.slice(0, 3)) {
      await query(`insert into review_schedule (user_id, objective_id, step, due_on) values ($1, $2, 1, $3::date)`, [u, x.id, today]);
    }
    const due = await dueObjectives(u, today, null);
    assert.deepEqual(due.map((d) => d.objectiveId).sort(), [objectives[0].id, objectives[2].id].sort());
    const res = await (await sessionsPost(new Request("http://t/x", { method: "POST", headers: auth(u), body: "{}" }))).json();
    const served = await query<{ review_item_id: string; objective_id: string }>(
      `select review_item_id, objective_id from review_session_items where session_id = $1`,
      [res.session.id]
    );
    const forO = served.find((s) => s.objective_id === o.id)!;
    assert.notEqual(forO.review_item_id, q0, "an answered question is served again");
  });
});

// ------------------------------------------------------------ MEDIUM-5
describe("course view (FAIL-376, FAIL-377)", () => {
  test("warm view is 3 queries; a new answer invalidates the cached readiness", async () => {
    clearCourseViewCaches();
    const u = await newUser("course");
    const { track, objectives } = await makeCourse(u);
    const view = () => coursesGet(get(u, "http://t/x"), { params: Promise.resolve({ id: track }) });
    const cold = await countQueries(view);
    const coldBody = await cold.result.json();
    assert.equal(cold.result.status, 200);
    assert.equal(coldBody.readiness.practiced, 0);
    assert.equal(coldBody.track.__attempt_stamp, undefined, "internal columns leak into the response");
    assert.equal(coldBody.track.__acknowledged, undefined);
    assert.deepEqual(coldBody.acknowledgement, { required: false, acknowledged: true });
    assert.equal(coldBody.units.length, 2);
    assert.equal(coldBody.units[0].objectives.length, N_OBJ / 2);

    const warm = await countQueries(view);
    assert.ok(warm.n <= 3, `warm course view used ${warm.n} queries (was 9)`);
    assert.deepEqual((await warm.result.json()).readiness, coldBody.readiness);

    await recordAttemptAndUpdateMastery({
      userId: u,
      unitId: objectives[0].unit,
      objectiveId: objectives[0].id,
      kind: "lesson",
      stage: "fade",
      format: "mc",
      question: "f",
      answer: "a",
      verdict: "correct",
    });
    const after1 = await (await view()).json();
    assert.equal(after1.readiness.practiced, 1, "readiness was served stale after a grade");
  });

  test("a required disclaimer is reported from the same first query", async () => {
    clearCourseViewCaches();
    const u = await newUser("ack");
    const { track } = await makeCourse(u);
    await query(`update subject_tracks set requires_acknowledgement = true, disclaimer_version = 2 where id = $1`, [track]);
    const view = async () => (await coursesGet(get(u, "http://t/x"), { params: Promise.resolve({ id: track }) })).json();
    assert.deepEqual((await view()).acknowledgement, { required: true, acknowledged: false });
    await query(`insert into track_acknowledgements (user_id, track_id, disclaimer_version, disclaimer_key) values ($1, $2, 1, 'k')`, [u, track]);
    assert.deepEqual((await view()).acknowledgement, { required: true, acknowledged: false }, "an old version counts");
    await query(`insert into track_acknowledgements (user_id, track_id, disclaimer_version, disclaimer_key) values ($1, $2, 2, 'k')`, [u, track]);
    assert.deepEqual((await view()).acknowledgement, { required: true, acknowledged: true });
  });
});

// ------------------------------------------------------------ HIGH-3
describe("account export stays small per response (FAIL-370)", () => {
  test("a 6000-attempt learner: compact JSON and 500-row pages keep every response well under 4.5 MB with nothing lost", async () => {
    const u = await newUser("export");
    const { objectives } = await makeCourse(u);
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, feedback, created_at)
       select $1, $2, $3, 'lesson', 'fade', 'mc', repeat('q', 300), repeat('a', 300), 'correct', repeat('f', 400),
              now() - make_interval(secs => g)
         from generate_series(1, 6000) g`,
      [u, objectives[0].unit, objectives[0].id]
    );
    // The route's rate limit counts pages; the hourly cap must allow this export.
    const first = await exportGet(get(u, "http://t/x"));
    assert.equal(first.status, 200);
    const text = await first.text();
    assert.ok(!text.includes("\n  "), "export is pretty-printed");
    assert.ok(Buffer.byteLength(text) < 2.5 * 1024 * 1024, `first page is ${Buffer.byteLength(text)} bytes`);
    const body = JSON.parse(text);
    assert.equal(body.attempts.length, EXPORT_PAGE_ROWS);
    let ids = body.attempts.map((a: { id: string }) => a.id);
    let offset = body.more.attempts.nextOffset;
    let pages = 1;
    let largest = Buffer.byteLength(text);
    while (offset !== null) {
      const res = await exportGet(get(u, `http://t/x?section=attempts&offset=${offset}`));
      assert.equal(res.status, 200);
      const t = await res.text();
      largest = Math.max(largest, Buffer.byteLength(t));
      const page = JSON.parse(t);
      ids = ids.concat(page.rows.map((a: { id: string }) => a.id));
      offset = page.nextOffset;
      pages++;
    }
    assert.equal(ids.length, 6000);
    assert.equal(new Set(ids).size, 6000);
    assert.equal(pages, 12);
    assert.ok(largest < 2.5 * 1024 * 1024);
  });

  test("past the response budget whole sections are deferred with nextOffset 0 and a page ends at the byte budget", async () => {
    const u = await newUser("export-budget");
    const { track } = await makeCourse(u);
    for (let i = 0; i < 5; i++) {
      await query(`insert into study_sessions (user_id, track_id, started_at, ended_at) values ($1, $2, now() - make_interval(hours => $3), now())`, [u, track, 10 - i]);
    }
    const runQ = (sql: string, params: unknown[]) => query<Record<string, unknown>>(sql, params);
    // A tiny response budget: after profile + tracks the rest are deferred.
    const out = await buildAccountExport(u, runQ, 500, { pageBytes: 1_000_000, responseBytes: 1 });
    assert.ok(out.profile);
    const more = out.more as Record<string, { nextOffset: number }>;
    assert.equal(out.studySessions, undefined);
    assert.deepEqual(more.studySessions, { nextOffset: 0 });
    // A tiny page budget: one row per page, at least one row each time.
    const ids: string[] = [];
    let offset: number | null = 0;
    while (offset !== null) {
      const page: { rows: Record<string, unknown>[]; nextOffset: number | null } = await exportSectionPage(u, "studySessions", runQ, offset, 500, 1);
      assert.equal(page.rows.length, 1);
      ids.push(page.rows[0].id as string);
      offset = page.nextOffset;
    }
    assert.equal(new Set(ids).size, 5);
  });
});

// ------------------------------------------------------------ MEDIUM-6
describe("GET /api/errors is paged (FAIL-378)", () => {
  test("limit and offset paging with total and nextOffset; bad values are 400", async () => {
    const u = await newUser("errors");
    for (let i = 0; i < 7; i++) {
      await query(
        `insert into error_log (user_id, topic, error_text, review_stage, next_review_at) values ($1, 't', $2, 0, current_date - $3::int)`,
        [u, `e${i}`, i]
      );
    }
    const page = async (qs: string) => {
      const r = await errorsGet(get(u, `http://t/x?${qs}`));
      return { status: r.status, body: await r.json() };
    };
    const p1 = await page("due=1&limit=3");
    assert.equal(p1.body.errors.length, 3);
    assert.equal(p1.body.total, 7);
    assert.equal(p1.body.nextOffset, 3);
    assert.equal(p1.body.errors[0].__total, undefined);
    const last = await page("due=1&limit=3&offset=6");
    assert.equal(last.body.errors.length, 1);
    assert.equal(last.body.nextOffset, null);
    const all = await page("due=1");
    assert.equal(all.body.errors.length, 7);
    assert.equal(all.body.nextOffset, null);
    assert.equal((await page("limit=0")).status, 400);
    assert.equal((await page("offset=-1")).status, 400);
    assert.equal((await page("limit=abc")).status, 400);
    // Pages are disjoint and cover everything.
    const ids = new Set<string>();
    for (let off = 0; off < 7; off += 3) for (const e of (await page(`due=1&limit=3&offset=${off}`)).body.errors) ids.add(e.id);
    assert.equal(ids.size, 7);
  });
});

// ------------------------------------------------------------ MEDIUM-8
describe("rate limiter: fewer round trips, still atomic (FAIL-383)", () => {
  test("an allowed call is 4 statements; a refused call records nothing; 20 at once allow exactly the limit", async () => {
    const u = await newUser("rate");
    const one = await countQueries(() => consumeRateLimit("pa3_test", u, { max: 5, windowMinutes: 10 }, { userId: u }));
    assert.equal(one.n, 4, one.sql.join("\n"));
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => consumeRateLimit("pa3_test", u, { max: 5, windowMinutes: 10 }, { userId: u }))
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 4);
    assert.ok(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason instanceof RateLimitError));
    const n = await query<{ n: number }>(`select count(*)::int as n from auth_events where event_type = 'pa3_test' and identifier = $1`, [u]);
    assert.equal(n[0].n, 5);
  });
});

// ------------------------------------------------------------ MEDIUM-6/7
describe("046 indexes (FAIL-379, FAIL-380)", () => {
  test("the schema probe passes and the planner uses the indexes for a learner-scoped read", async () => {
    const status = await checkSchema((sql) => query(sql), SCHEMA_PROBES.filter((p) => p.migration === "046_perf_indexes.sql"));
    assert.deepEqual(status.missing, []);
    // enable_seqscan off (transaction-local): the tables are tiny in a test
    // database, so ask whether an index CAN serve the lookup, not whether it
    // is the cheapest plan here.
    const plans = await withTransaction(async (tx) => {
      await tx.query(`set local enable_seqscan = off`);
      const p = async (sql: string) => (await tx.query<{ "QUERY PLAN": string }>(`explain ${sql}`)).map((r) => r["QUERY PLAN"]).join("\n");
      return {
        auth: await p(`select 1 from auth_events where user_id = '${users[0]}'`),
        ai: await p(`select 1 from ai_calls where user_id = '${users[0]}' and created_at > now() - interval '1 day'`),
        unit: await p(`select 1 from attempts where unit_id = '${randomUUID()}'`),
        userUnit: await p(`select verdict from attempts where user_id = '${users[0]}' and unit_id = '${randomUUID()}' order by created_at desc limit 1`),
      };
    });
    assert.match(plans.auth, /auth_events_user/);
    assert.match(plans.ai, /ai_calls_user_created/);
    assert.match(plans.unit, /attempts_unit|attempts_user_unit_created/);
    assert.match(plans.userUnit, /attempts_user_unit_created/);
  });
});

// ------------------------------------------------------------ MEDIUM-7
describe("account deletion stays indexed (FAIL-393)", () => {
  // Deleting an account deletes its rows in every table that points at
  // app_users, and its attempts set null in every table that points at
  // attempts. A foreign key with no index whose first column is the key makes
  // each of those a whole-table scan per deleted row (13+ minutes for one
  // 26k-attempt account on the fixture). A new table with such a key must
  // add the index in its own migration.
  test("every foreign key into app_users or attempts has an index led by its column", async () => {
    const missing = await query<{ tbl: string; col: string }>(
      `select c.conrelid::regclass::text as tbl, a.attname as col
         from pg_constraint c
         join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
        where c.contype = 'f' and c.confrelid in ('public.app_users'::regclass, 'public.attempts'::regclass)
          and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])
        order by 1`
    );
    assert.deepEqual(missing, []);
  });
});
