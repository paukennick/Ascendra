// REQ-201: AI access modes and the global daily AI ceiling, through the real
// routes against a real Postgres with every migration applied. The model is a
// fake client (no key, no network); model calls are recorded in ai_calls by
// the ordinary sink, so the ceiling sees them as it would in production.
//
//   1. AI_ACCESS_MODE=granted: an ordinary learner gets no coach and no
//      regenerate (403 limited_preview, no model call), Free's 3 graded
//      typed answers a day across grade_open / explain-back / PBQ, unlimited
//      multiple choice, and every course; an owner-granted account and an
//      owner get full AI with nothing counted.
//   2. The global ceiling: chat and regenerate pause (429 paused) for all
//      but owners; grading and open AI calls keep working and still count
//      toward the total; a lesson nobody has opened answers "being prepared"
//      without a model call.
//   3. AI_ACCESS_MODE unset (all) with no ceiling: exactly the behaviour
//      before REQ-201 -- no `ai` field, no counting, the same bodies as
//      AI_ACCESS_MODE=all.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { callCostUsd } from "./ai-pricing";
import { globalSpendTodayUsd, resetGlobalSpendCache } from "./ai-access";
import { COACH_PREVIEW_MESSAGE, GLOBAL_PAUSE_MESSAGE, LESSON_PREPARING_MESSAGE, REGENERATE_PREVIEW_MESSAGE } from "./ai-access-config";
import { POST as grantsPost } from "../app/api/access/grants/route";
import { GET as grantsGet } from "../app/api/access/grants/route";
import { GET as authMeGet } from "../app/api/auth/me/route";
import { POST as chatPost } from "../app/api/chat/route";
import { POST as gradePost } from "../app/api/grade/route";
import { GET as lessonGet, POST as regenPost } from "../app/api/objectives/[id]/lesson/route";
import { POST as explainPost } from "../app/api/objectives/[id]/explain-back/route";
import { POST as guessPost } from "../app/api/objectives/[id]/guess-feedback/route";
import { POST as pbqPost } from "../app/api/pbq/route";

const run = Date.now().toString(36);
const track = randomUUID(), unit = randomUUID(), obj = randomUUID(), scen = randomUUID();
const track2 = randomUUID(), unit2 = randomUUID(), objB = randomUUID(), objNew = randomUUID();
const users: string[] = [];
const ENV = ["BILLING_ENABLED", "OWNER_EMAILS", "AI_ACCESS_MODE", "AI_GLOBAL_DAILY_CEILING_USD", "AI_DAILY_BUDGET_USD", "AI_UNRESTRICTED_DAILY_CEILING_USD"];
const OWNER = `aimodes-owner-${run}@example.test`;

const usage = { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
let modelCalls = 0;
const gradeOut = {
  verdict: "correct", feedback: "f", classification: "none", missedParts: [], modelAnswer: "m", fixNext: "n", misconception: "", confusedWith: "",
  rubric: { correct: true, complete: true, keyTerms: true, noMisconception: true },
};
const pbqOut = { ...gradeOut, parts: [{ part: "choose", score: "met", comment: "c" }, { part: "justify", score: "met", comment: "c" }] };

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const call = (fn: any, url: string, u: string, method = "GET", body?: unknown, params?: unknown) =>
  fn(new Request(`http://t${url}`, { method, headers: auth(u), body: body === undefined ? undefined : JSON.stringify(body) }), params ? { params: Promise.resolve(params) } : undefined) as Promise<Response>;
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
async function newUser(opts: { email?: string; name?: string } = {}): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email, display_name, email_verified_at) values ($1, $2, $3, now())`, [
    u,
    opts.email ?? `aimodes-${run}-${users.length}@example.test`,
    opts.name ?? null,
  ]);
  return u;
}
const emailOf = async (u: string) => (await queryOne<{ email: string }>(`select email from app_users where id = $1`, [u]))!.email;
let ownerId = "";
async function grantedUser(): Promise<string> {
  const u = await newUser();
  await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: await emailOf(u), note: "AI pilot" }));
  return u;
}
const chat = (u: string) => call(chatPost, "/api/chat", u, "POST", { trackId: track, message: "What is CTR mode?" });
const regen = (u: string) => call(regenPost, `/api/objectives/${obj}/lesson`, u, "POST", {}, { id: obj });
let answerN = 0;
const gradeOpen = (u: string) => call(gradePost, "/api/grade", u, "POST", { format: "open", objectiveId: obj, stage: "fade", answer: `It adds authentication, take ${++answerN}.` });
const gradeMc = (u: string) => call(gradePost, "/api/grade", u, "POST", { format: "mc", objectiveId: obj, stage: "fade", chosenIndex: 1 });
const explain = (u: string) =>
  call(explainPost, `/api/objectives/${obj}/explain-back`, u, "POST", { answer: `CTR mode turns a block cipher into a stream with a counter, take ${++answerN}.` }, { id: obj });
const pbq = (u: string) => call(pbqPost, "/api/pbq", u, "POST", { scenarioId: scen, answer: `I would pick GCM for its authentication, take ${++answerN}.` });
const lesson = (u: string, o: string) => call(lessonGet, `/api/objectives/${o}/lesson`, u, "GET", undefined, { id: o });
const counted = async (u: string) => (await queryOne<{ n: number }>(`select count(*)::int as n from allowance_uses where user_id = $1 and kind = 'graded_answer'`, [u]))!.n;
const PER_TOKEN = callCostUsd("claude-haiku-5-5", { inputTokens: 0, outputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, { longContext: false }) / 1_000_000;
// Model spend today by nobody in particular (shared generation records user_id null).
const sharedSpend = (usd: number, purpose = "lesson_intro") =>
  query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok) values (null,$1,'claude-haiku-5-5',0,$2,1,true)`, [purpose, Math.round(usd / PER_TOKEN)]);

const fake = {
    messages: {
      async create() {
        modelCalls++;
        return { content: [{ type: "text", text: "What do you think, and why?" }], stop_reason: "end_turn", usage };
      },
      async parse(body: any) {
        modelCalls++;
        const fmt = body.output_config.format;
        const s = JSON.stringify(body);
        if (s.includes("coach_reply")) return { parsed_output: fmt.parse(JSON.stringify({ givenAway: [] })), stop_reason: "end_turn", usage };
        for (const out of [gradeOut, pbqOut, { feedback: "Close.", guessMatch: "close" }]) {
          try {
            return { parsed_output: fmt.parse(JSON.stringify(out)), stop_reason: "end_turn", usage };
          } catch {
            // try the next shape
          }
        }
        throw new Error("fake model: no output fits this schema");
      },
    },
  };

before(async () => {
  __setClientForTest(fake);
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, requires_acknowledgement) values
       ($1,$2,'AI Modes Crypto','certification',null,false), ($3,$4,'AI Modes Networks','certification',null,false)`,
    [track, `AIM-${run}`, track2, `AIM2-${run}`]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1,$2,'Ciphers',1), ($3,$4,'Ports',1)`, [unit, track, unit2, track2]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1,$2,'Block cipher modes',1), ($3,$4,'Ports',1), ($5,$2,'Not opened yet',2)`, [
    obj, unit, objB, unit2, objNew,
  ]);
  for (const o of [obj, objB]) {
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1,'g','CTR mode uses a counter per block.','Fade: GCM adds what on top of CTR?',$2,1,'w','Solo q',$2,2,'w','test')`,
      [o, JSON.stringify(["Compression", "Authentication", "Padding", "Key stretching"])]
    );
  }
  await query(`insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1,$2,'Pick modes','1) choose 2) justify','["choose","justify"]','t')`, [scen, unit]);
  ownerId = await newUser({ email: OWNER, name: "Nick" });
});

after(async () => {
  __setClientForTest(null);
  for (const k of ENV) delete process.env[k];
  resetGlobalSpendCache();
  await query(`delete from account_access where email like $1`, [`%${run}%`]);
  await query(`delete from ai_calls where user_id = any($1::uuid[])`, [users]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, track2]]);
  await closePool();
});

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  process.env.OWNER_EMAILS = OWNER;
  resetGlobalSpendCache();
  modelCalls = 0;
});

// ---------------------------------------------------------------------------
// 1. AI_ACCESS_MODE=granted
// ---------------------------------------------------------------------------

describe("AI_ACCESS_MODE=granted (billing off)", () => {
  test("an ordinary learner: no coach, no regenerate, no model call, honest words, structured bodies", async () => {
    process.env.AI_ACCESS_MODE = "granted";
    const u = await newUser();
    const c = await json(await chat(u), 403);
    assert.equal(c.error, COACH_PREVIEW_MESSAGE);
    assert.deepEqual(c.aiAccess, { state: "limited_preview", feature: "coach", mode: "granted", resetsAt: null });
    const r = await json(await regen(u), 403);
    assert.equal(r.error, REGENERATE_PREVIEW_MESSAGE);
    assert.equal(r.aiAccess.feature, "regenerate");
    assert.equal(modelCalls, 0, "nothing reached the model");
    for (const b of [c, r]) assert.equal(b.upgrade ?? b.allowance ?? b.aiPaused, undefined, "no plan sheet keys");
    const me = await json(await call(authMeGet, "/api/auth/me", u));
    assert.deepEqual(me.user.ai, { mode: "granted", full: false });
  });

  test("an ordinary learner: Free's 3 graded typed answers a day across grade_open, explain-back and PBQ; multiple choice unlimited", async () => {
    process.env.AI_ACCESS_MODE = "granted";
    const u = await newUser();
    assert.equal((await gradeOpen(u)).status, 200);
    assert.equal((await explain(u)).status, 200);
    assert.equal((await pbq(u)).status, 200);
    assert.equal(await counted(u), 3);
    const before = modelCalls;
    for (const attempt of [gradeOpen, explain, pbq]) {
      const res = await json(await attempt(u), 429);
      assert.equal(res.aiAccess.state, "graded_limit");
      assert.equal(res.aiAccess.limit, 3);
      assert.equal(res.aiAccess.used, 3);
      assert.ok(res.aiAccess.resetsAt);
      assert.match(res.error, /limited preview: 3 a day/);
      assert.equal(res.allowance, undefined, "not the plan sheet");
    }
    assert.equal(modelCalls, before, "no model call past the limit");
    assert.equal(await counted(u), 3);
    for (let i = 0; i < 5; i++) assert.equal((await gradeMc(u)).status, 200, "multiple choice is never counted");
    assert.equal(await counted(u), 3);
  });

  test("an ordinary learner keeps every course (no one-course rule) and its lessons", async () => {
    process.env.AI_ACCESS_MODE = "granted";
    const u = await newUser();
    assert.equal((await lesson(u, obj)).status, 200);
    assert.equal((await lesson(u, objB)).status, 200);
    assert.equal(await queryOne(`select 1 from free_course_choice where user_id = $1`, [u]), null);
  });

  test("a failed grading gives the use back", async () => {
    process.env.AI_ACCESS_MODE = "granted";
    const u = await newUser();
    __setClientForTest({ messages: { async create() { throw new Error("down"); }, async parse() { throw new Error("down"); } } });
    try {
      assert.notEqual((await gradeOpen(u)).status, 200);
    } finally {
      __setClientForTest(fake);
    }
    assert.equal(await counted(u), 0);
  });

  test("an owner-granted account and an owner: coach and regenerate open, grading not counted", async () => {
    process.env.AI_ACCESS_MODE = "granted";
    const g = await grantedUser();
    for (const who of [g, ownerId]) {
      assert.equal((await chat(who)).status, 200, "coach");
      const rg = await regen(who);
      assert.notEqual(rg.status, 403, "regenerate is not refused by the mode");
      assert.equal(((await rg.json()) as any).aiAccess, undefined);
      for (let i = 0; i < 5; i++) assert.equal((await gradeOpen(who)).status, 200);
      assert.equal(await counted(who), 0);
      assert.deepEqual((await json(await call(authMeGet, "/api/auth/me", who))).user.ai, { mode: "granted", full: true });
    }
  });
});

describe("Settings > Access: inviting a pilot group", () => {
  test("several addresses at once, one audited grant each; the list shows the mode", async () => {
    process.env.AI_ACCESS_MODE = "granted";
    const a = await newUser();
    const b = await newUser();
    const waiting = `aimodes-waiting-${run}@example.test`;
    const res = await json(
      await call(grantsPost, "/api/access/grants", ownerId, "POST", { emails: `${await emailOf(a)}, ${await emailOf(b)}\n${waiting}\n${OWNER}`, note: "AI pilot" })
    );
    assert.deepEqual(
      res.results.map((r: any) => [r.email, r.outcome, r.grant?.status ?? null]),
      [
        [await emailOf(a), "granted", "active"],
        [await emailOf(b), "granted", "active"],
        [waiting, "granted", "waiting"],
        [OWNER.toLowerCase(), "owner", null],
      ]
    );
    for (const u of [a, b]) assert.equal((await chat(u)).status, 200, "the invited learners have the coach");
    const list = await json(await call(grantsGet, "/api/access/grants", ownerId));
    assert.equal(list.aiMode, "granted");
    assert.ok(list.grants.filter((g: any) => g.note === "AI pilot").length >= 3);
    const bad = await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { emails: "ok@example.test, nope" }), 400);
    assert.match(bad.error, /Not an email address: nope/);
    const someone = await newUser();
    assert.equal((await call(grantsPost, "/api/access/grants", someone, "POST", { emails: "x@example.test" })).status, 403, "owners only");
  });
});

// ---------------------------------------------------------------------------
// 2. The global daily ceiling
// ---------------------------------------------------------------------------

describe("AI_GLOBAL_DAILY_CEILING_USD", () => {
  test("at the ceiling: chat and regenerate pause for everyone but owners; grading (guess feedback and explain-back included) keeps working and still counts; the writers are stopped in lib/ai-spend-ceiling.dbtest.ts", async () => {
    process.env.AI_DAILY_BUDGET_USD = "off"; // the per-learner budget out of the way
    const u = await newUser();
    const g = await grantedUser();
    const base = await globalSpendTodayUsd();
    process.env.AI_GLOBAL_DAILY_CEILING_USD = String(base + 1);
    resetGlobalSpendCache();
    assert.equal((await chat(u)).status, 200, "under the ceiling");

    await sharedSpend(1.5);
    // Cached for a minute: the next request may still see the old sum.
    resetGlobalSpendCache();
    for (const who of [u, g]) {
      const c = await json(await chat(who), 429);
      assert.equal(c.error, GLOBAL_PAUSE_MESSAGE);
      assert.equal(c.aiAccess.state, "paused");
      assert.equal(new Date(c.aiAccess.resetsAt).getUTCHours(), 0, "next midnight UTC");
      const r = await json(await regen(who), 429);
      assert.equal(r.aiAccess.state, "paused");
    }
    assert.equal((await chat(ownerId)).status, 200, "owners are not paused");

    // Grading never stops (guess feedback is in the grading pool). Calls that write
    // or re-check content stop too since REQ-202: lib/ai-spend-ceiling.dbtest.ts.
    const spentBefore = await globalSpendTodayUsd();
    assert.equal((await gradeOpen(u)).status, 200);
    assert.equal((await explain(u)).status, 200);
    assert.equal((await call(guessPost, `/api/objectives/${obj}/guess-feedback`, u, "POST", { guess: "A counter?" }, { id: obj })).status, 200);
    // The ai_calls row is written just after the response (lib/ai-calls.ts).
    let recorded = false;
    for (let i = 0; i < 40 && !recorded; i++) {
      const rows = await query<{ purpose: string }>(`select purpose from ai_calls where user_id = $1 and purpose = 'guess_feedback'`, [u]);
      recorded = rows.length > 0;
      if (!recorded) await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(recorded, "the open call is recorded");
    resetGlobalSpendCache();
    assert.ok((await globalSpendTodayUsd()) > spentBefore, "and counts toward the total");
  });

  test("a lesson nobody has opened yet: 'being prepared', no model call; a generated one is served", async () => {
    process.env.AI_DAILY_BUDGET_USD = "off";
    const u = await newUser();
    process.env.AI_GLOBAL_DAILY_CEILING_USD = "0.000001";
    await sharedSpend(0.01);
    resetGlobalSpendCache();
    const res = await json(await lesson(u, objNew), 429);
    assert.equal(res.error, LESSON_PREPARING_MESSAGE);
    assert.equal(res.aiAccess.state, "preparing");
    assert.equal(modelCalls, 0);
    assert.equal(await queryOne(`select 1 from lesson_content where objective_id = $1`, [objNew]), null);
    assert.equal((await lesson(u, obj)).status, 200, "an existing lesson still opens");
  });

  test("the sum is cached briefly: one read serves many requests", async () => {
    const first = await globalSpendTodayUsd();
    await sharedSpend(2);
    assert.equal(await globalSpendTodayUsd(), first, "within the cache window");
    resetGlobalSpendCache();
    assert.ok((await globalSpendTodayUsd()) >= first + 1.99);
  });
});

// ---------------------------------------------------------------------------
// 3. The default: exactly today's behaviour
// ---------------------------------------------------------------------------

describe("AI_ACCESS_MODE unset (all), no ceiling", () => {
  const strip = (b: any) => JSON.parse(JSON.stringify(b, (k, v) => (["requestId", "id", "createdAt", "created_at", "attempt", "attemptId", "at"].includes(k) ? undefined : v)));

  test("no `ai` field, everyone has the coach, nothing counted -- and the same bodies as AI_ACCESS_MODE=all", async () => {
    const results: Record<string, unknown[]> = {};
    for (const mode of [undefined, "all", ""]) {
      if (mode === undefined) delete process.env.AI_ACCESS_MODE;
      else process.env.AI_ACCESS_MODE = mode;
      const u = await newUser({ email: `aimodes-same-${String(mode)}-${run}@example.test` });
      const me = await json(await call(authMeGet, "/api/auth/me", u));
      assert.equal("ai" in me.user, false, "no new field on /api/auth/me");
      const out: unknown[] = [];
      out.push(Object.keys(me.user).sort());
      const c = await chat(u);
      out.push([c.status, strip(await c.json())]);
      for (let i = 0; i < 5; i++) {
        const gr = await call(gradePost, "/api/grade", u, "POST", { format: "open", objectiveId: obj, stage: "fade", answer: `The same answer number ${i}.` });
        out.push([gr.status, Object.keys(await gr.json()).sort()]);
      }
      const mc = await gradeMc(u);
      out.push([mc.status, Object.keys(await mc.json()).sort()]);
      assert.equal(await counted(u), 0, "nothing counted");
      results[String(mode)] = out;
    }
    assert.deepEqual(results["all"], results["undefined"]);
    assert.deepEqual(results[""], results["undefined"]);
    assert.equal((results["undefined"][1] as any)[0], 200);
  });
});
