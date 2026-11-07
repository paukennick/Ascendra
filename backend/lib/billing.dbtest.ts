// REQ-122: paid tiers, OFF behind BILLING_ENABLED. Against a real Postgres
// with every migration applied (049 included); the model is a fake client
// and Stripe is a fake fetch -- no key, no network.
//
//   1. Switch off: representative gated routes behave exactly as before, for
//      a learner with no entitlement, and nothing is read from or written to
//      the 049 tables.
//   2. Switch on, per tier: Free (one course, MC grading, 3 graded typed
//      answers a day, no AI extras), Plus (counted coach and regenerate,
//      1 mock a month, monthly AI cap pauses chat but never grading), Pro.
//   3. Webhooks: RevenueCat and Stripe -- authentication, idempotency,
//      out-of-order events, purchase / renewal / cancel / expiry / refund /
//      billing issue.
//   4. Grants, web checkout, /api/billing/me and the export.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { stripeSignatureHeader } from "./billing-webhooks";
import { consumeAllowance, grantEntitlement, revokeGrants, tierFor, AllowanceReachedError } from "./entitlements";
import { parseGrantArgs, runGrant } from "./billing-grant";
import { buildAccountExport } from "./account-export";
import { GET as configGet } from "../app/api/billing/config/route";
import { GET as meGet } from "../app/api/billing/me/route";
import { PUT as freeCoursePut } from "../app/api/billing/free-course/route";
import { POST as checkoutPost } from "../app/api/billing/checkout/route";
import { POST as portalPost } from "../app/api/billing/portal/route";
import { POST as rcPost } from "../app/api/billing/webhooks/revenuecat/route";
import { POST as stripePost } from "../app/api/billing/webhooks/stripe/route";
import { POST as chatPost } from "../app/api/chat/route";
import { POST as gradePost } from "../app/api/grade/route";
import { GET as lessonGet, POST as regenPost } from "../app/api/objectives/[id]/lesson/route";
import { GET as explainGet, POST as explainPost } from "../app/api/objectives/[id]/explain-back/route";
import { GET as labGet } from "../app/api/objectives/[id]/lab/route";
import { POST as labQuestionsPost } from "../app/api/objectives/[id]/lab/questions/route";
import { GET as unitCheckGet } from "../app/api/units/[id]/check/route";
import { GET as comparisonsGet } from "../app/api/courses/[id]/comparisons/route";
import { POST as quizPost } from "../app/api/coach/quiz/route";
import { GET as pbqGet } from "../app/api/pbq/route";
import { POST as examPost } from "../app/api/exam/sessions/route";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { GET as reviewToday } from "../app/api/review/today/route";

const run = Date.now().toString(36);
const track = randomUUID(), unit = randomUUID(), obj = randomUUID(), obj2 = randomUUID(), scen = randomUUID();
const track2 = randomUUID(), unit2 = randomUUID(), objB = randomUUID();
const emptyTrack = randomUUID();
const users: string[] = [];
const BILLING_ENV = [
  "BILLING_ENABLED",
  "BILLING_ALLOWANCE_COACH_MESSAGE_PLUS",
  "BILLING_ALLOWANCE_REGENERATION_PLUS",
  "AI_DAILY_BUDGET_USD",
  "AI_MONTHLY_CAP_PLUS_USD",
  "REVENUECAT_WEBHOOK_AUTH",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_PLUS_MONTHLY",
  "STRIPE_PRICE_PRO_YEARLY",
  "BILLING_WEB_RETURN_URL",
];

const usage = { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
let modelCalls = 0;
let failGrading = false;
const gradeOut = { verdict: "correct", feedback: "f", classification: "none", missedParts: [], modelAnswer: "m", fixNext: "n", misconception: "", confusedWith: "" };

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const call = (fn: any, url: string, u: string, method = "GET", body?: unknown, params?: unknown) =>
  fn(new Request(`http://t${url}`, { method, headers: auth(u), body: body === undefined ? undefined : JSON.stringify(body) }), params ? { params: Promise.resolve(params) } : undefined) as Promise<Response>;
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `bill-${run}-${users.length}@example.test`]);
  return u;
}
const billingRows = async (u: string) =>
  Number(
    (
      await queryOne<{ n: number }>(
        `select (select count(*) from entitlements where user_id = $1) + (select count(*) from free_course_choice where user_id = $1)
              + (select count(*) from allowance_uses where user_id = $1) + (select count(*) from billing_events where user_id = $1) as n`,
        [u]
      )
    )!.n
  );
const chat = (u: string, message = "What is CTR mode?", trackId = track) => call(chatPost, "/api/chat", u, "POST", { trackId, message });
const gradeOpen = (u: string, answer = "It adds authentication to the counter mode cipher.") =>
  call(gradePost, "/api/grade", u, "POST", { format: "open", objectiveId: obj, stage: "fade", answer });
const gradeMc = (u: string, objectiveId = obj) => call(gradePost, "/api/grade", u, "POST", { format: "mc", objectiveId, stage: "fade", chosenIndex: 0 });
const lesson = (u: string, o = obj) => call(lessonGet, `/api/objectives/${o}/lesson`, u, "GET", undefined, { id: o });
const plus = async () => {
  const u = await newUser();
  await grantEntitlement({ userId: u, tier: "plus" });
  return u;
};
const pro = async () => {
  const u = await newUser();
  await grantEntitlement({ userId: u, tier: "pro" });
  return u;
};
async function guidedOn(u: string, o = obj) {
  for (const q of ["q1", "q2"]) {
    await recordAttemptAndUpdateMastery({
      userId: u, unitId: unit, objectiveId: o, kind: "lesson", stage: "solo", format: "open", question: `${q} ${randomUUID()}`, answer: "a", verdict: "correct", classification: "none",
    });
  }
}

before(async () => {
  setAiCallSink(async () => {});
  __setClientForTest({
    messages: {
      async create() {
        modelCalls++;
        return { content: [{ type: "text", text: "What do you think, and why?" }], stop_reason: "end_turn", usage };
      },
      async parse(body: any) {
        modelCalls++;
        if (JSON.stringify(body).includes("coach_reply")) {
          return { parsed_output: body.output_config.format.parse(JSON.stringify({ givenAway: [] })), stop_reason: "end_turn", usage };
        }
        if (failGrading) throw Object.assign(new Error("overloaded"), { status: 529 });
        return { parsed_output: body.output_config.format.parse(JSON.stringify(gradeOut)), stop_reason: "end_turn", usage };
      },
    },
  });
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1,$2,'Billing Crypto','certification',null), ($3,$4,'Billing Networks','certification',null),
       ($5,$6,'Billing Empty','certification',null)`,
    [track, `BILL-${run}`, track2, `BILL2-${run}`, emptyTrack, `BILL3-${run}`]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1,$2,'Ciphers',1), ($3,$4,'Ports',1)`, [unit, track, unit2, track2]);
  await query(`insert into objectives (id, unit_id, title, sort_order, lab_prompt) values ($1,$2,'Block cipher modes',1,'Try it'), ($3,$2,'Hashes',2,null), ($4,$5,'Ports',1,null)`, [
    obj, unit, obj2, objB, unit2,
  ]);
  for (const o of [obj, obj2, objB]) {
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1,'g','CTR mode uses a counter per block.','Fade: GCM adds what on top of CTR?',$2,1,'w','Solo q',$2,2,'w','test')`,
      [o, JSON.stringify(["Compression", "Authentication", "Padding", "Key stretching"])]
    );
  }
  await query(`insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1,$2,'Pick modes','1) choose 2) justify','["choose","justify"]','t')`, [scen, unit]);
});

after(async () => {
  __setClientForTest(null);
  setAiCallSink(null);
  for (const k of BILLING_ENV) delete process.env[k];
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from billing_events where event_id like $1`, [`%${run}%`]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, track2, emptyTrack]]);
  await closePool();
});

beforeEach(() => {
  for (const k of BILLING_ENV) delete process.env[k];
  modelCalls = 0;
  failGrading = false;
});

// ---------------------------------------------------------------------------
// 1. The switch off
// ---------------------------------------------------------------------------

describe("BILLING_ENABLED off (the default): nothing changes", () => {
  test("representative gated routes answer as before, with no lock, no count and no 049 read or write", async () => {
    for (const v of [undefined, "", "0", "false", "off"]) {
      if (v === undefined) delete process.env.BILLING_ENABLED;
      else process.env.BILLING_ENABLED = v;
      const u = await newUser();
      assert.equal(await tierFor(u), "pro");

      // AI features a Free learner would not have.
      assert.equal((await chat(u)).status, 200);
      const ex = await json(await call(explainGet, `/api/objectives/${obj}/explain-back`, u, "GET", undefined, { id: obj }));
      assert.equal(ex.locked, undefined);
      const lab = await json(await call(labGet, `/api/objectives/${obj}/lab`, u, "GET", undefined, { id: obj }));
      assert.deepEqual(lab.lab, { prompt: "Try it" });
      assert.equal(lab.locked, undefined);
      const uc = await json(await call(unitCheckGet, `/api/units/${unit}/check`, u, "GET", undefined, { id: unit }));
      assert.equal(uc.locked, undefined);
      const cmp = await json(await call(comparisonsGet, `/api/courses/${track}/comparisons`, u, "GET", undefined, { id: track }));
      assert.equal(cmp.locked, undefined);
      assert.equal((await json(await call(quizPost, "/api/coach/quiz", u, "POST", { trackId: track }))).reason, "no_weak_spots");
      assert.equal((await json(await call(pbqGet, `/api/pbq?scenarioId=${scen}`, u))).scenario.id, scen);

      // Every typed answer graded (more than Free's three), in two courses.
      for (let i = 0; i < 4; i++) assert.equal((await gradeOpen(u, `It adds authentication, take ${i}.`)).status, 200);
      assert.equal((await lesson(u, obj)).status, 200);
      assert.equal((await lesson(u, objB)).status, 200);
      assert.equal((await gradeMc(u, objB)).status, 200);

      // Readiness is shown, as before.
      const course = await json(await call(courseGet, `/api/courses/${track}`, u, "GET", undefined, { id: track }));
      assert.notEqual(course.readiness, null);
      assert.equal(course.readinessLocked, undefined);

      // A mock on a course with nothing to practise fails as it always did (not 402).
      assert.equal((await call(examPost, "/api/exam/sessions", u, "POST", { trackId: emptyTrack, mode: "mock", timed: true })).status, 400);

      assert.equal(await billingRows(u), 0, "no entitlement, free-course, allowance or event row");
      assert.deepEqual(await json(await call(meGet, "/api/billing/me", u)), { enabled: false, tier: "pro" });
      assert.equal((await json(await configGet())).enabled, false);
      assert.equal((await call(freeCoursePut, "/api/billing/free-course", u, "PUT", { trackId: track })).status, 404);
      assert.equal((await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "plus_monthly" })).status, 404);
    }
  });

  test("the existing $0.50 daily AI budget still applies", async () => {
    const u = await newUser();
    await query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok) values ($1,'chat','claude-haiku-5-5',0,1000000,1,true)`, [u]);
    const res = await chat(u);
    assert.equal(res.status, 429);
    assert.equal(modelCalls, 0);
  });
});

// ---------------------------------------------------------------------------
// 2. The switch on, per tier
// ---------------------------------------------------------------------------

describe("BILLING_ENABLED on: Free", () => {
  beforeEach(() => {
    process.env.BILLING_ENABLED = "true";
  });

  test("one course: the first opened becomes the free course; another is a kind 402; an auto choice switches once, then weekly", async () => {
    const u = await newUser();
    assert.equal(await tierFor(u), "free");
    assert.equal((await lesson(u, obj)).status, 200);
    const locked = await json(await lesson(u, objB), 402);
    assert.equal(locked.upgrade.feature, "all_courses");
    assert.equal(locked.upgrade.requiredTier, "plus");
    assert.equal(locked.freeCourse.trackId, track);
    assert.match(locked.error, /one course at a time, and yours is Billing Crypto/);
    assert.equal((await gradeMc(u, objB)).status, 402);
    assert.equal((await call(examPost, "/api/exam/sessions", u, "POST", { trackId: track2, mode: "sprint", timed: false })).status, 402);

    // Switch the automatic choice at once...
    const sw = await json(await call(freeCoursePut, "/api/billing/free-course", u, "PUT", { trackId: track2 }));
    assert.equal(sw.freeCourse.trackId, track2);
    assert.ok(sw.freeCourse.canSwitchAt);
    assert.equal((await lesson(u, objB)).status, 200);
    assert.equal((await lesson(u, obj)).status, 402);
    // ...but not straight back.
    const again = await json(await call(freeCoursePut, "/api/billing/free-course", u, "PUT", { trackId: track }), 409);
    assert.match(again.error, /switch again on/);
    // A week later it can.
    await query(`update free_course_choice set chosen_at = now() - interval '8 days' where user_id = $1`, [u]);
    assert.equal((await call(freeCoursePut, "/api/billing/free-course", u, "PUT", { trackId: track })).status, 200);
    assert.equal((await call(freeCoursePut, "/api/billing/free-course", u, "PUT", { trackId: randomUUID() })).status, 404);
  });

  test("multiple choice always graded; 3 graded typed answers a day, then a kind 429 naming when more open; a failed grading is given back", async () => {
    const u = await newUser();
    for (let i = 0; i < 5; i++) assert.equal((await gradeMc(u)).status, 200);
    failGrading = true;
    assert.ok((await gradeOpen(u, "It adds authentication, first try.")).status >= 500);
    failGrading = false;
    for (let i = 0; i < 3; i++) assert.equal((await gradeOpen(u, `It adds authentication, take ${i}.`)).status, 200);
    const calls = modelCalls;
    const res = await json(await gradeOpen(u, "It adds authentication, take 4."), 429);
    assert.equal(modelCalls, calls, "no model call");
    assert.equal(res.allowance.kind, "graded_answer");
    assert.equal(res.allowance.limit, 3);
    assert.ok(Date.parse(res.allowance.resetsAt) > Date.now());
    assert.match(res.error, /You've used today's 3 graded typed answers\. More open up in about 2\d hours\. .*multiple-choice/);
    assert.equal((await gradeMc(u)).status, 200, "multiple choice still graded");
    // An answer counted yesterday has left the window.
    await query(`update allowance_uses set used_at = now() - interval '25 hours' where user_id = $1`, [u]);
    assert.equal((await gradeOpen(u, "It adds authentication, tomorrow.")).status, 200);
  });

  test("the AI extras answer 402 with what they need; read-only screens say so without erroring; review stays open", async () => {
    const u = await newUser();
    await guidedOn(u);
    const c = await json(await chat(u), 402);
    assert.deepEqual(c.upgrade, { feature: "coach", requiredTier: "plus", currentTier: "free" });
    assert.match(c.error, /The AI coach comes with Plus/);
    assert.equal((await call(explainPost, `/api/objectives/${obj}/explain-back`, u, "POST", { answer: "x" }, { id: obj })).status, 402);
    assert.equal((await call(regenPost, `/api/objectives/${obj}/lesson`, u, "POST", {}, { id: obj })).status, 402);
    assert.equal((await call(quizPost, "/api/coach/quiz", u, "POST", { trackId: track })).status, 402);
    assert.equal((await call(pbqGet, `/api/pbq?scenarioId=${scen}`, u)).status, 402);
    assert.equal((await call(labQuestionsPost, `/api/objectives/${obj}/lab/questions`, u, "POST", {}, { id: obj })).status, 402);
    const mock = await json(await call(examPost, "/api/exam/sessions", u, "POST", { trackId: track, mode: "mock", timed: true }), 402);
    assert.equal(mock.upgrade.feature, "mock_exam");
    assert.equal(modelCalls, 0);

    const ex = await json(await call(explainGet, `/api/objectives/${obj}/explain-back`, u, "GET", undefined, { id: obj }));
    assert.equal(ex.eligible, false);
    assert.equal(ex.locked.requiredTier, "plus");
    assert.equal((await json(await call(labGet, `/api/objectives/${obj}/lab`, u, "GET", undefined, { id: obj }))).locked.requiredTier, "pro");
    assert.ok((await json(await call(unitCheckGet, `/api/units/${unit}/check`, u, "GET", undefined, { id: unit }))).locked);
    const cmp = await json(await call(comparisonsGet, `/api/courses/${track}/comparisons`, u, "GET", undefined, { id: track }));
    assert.deepEqual(cmp.sets, []);
    assert.ok(cmp.locked);
    const course = await json(await call(courseGet, `/api/courses/${track}`, u, "GET", undefined, { id: track }));
    assert.equal(course.readiness, null);
    assert.equal(course.readinessLocked.requiredTier, "pro");
    assert.equal((await reviewToday(new Request("http://t/api/review/today", { headers: auth(u) }))).status, 200);
  });

  test("/api/billing/me: plan, free course and allowances in counts, never dollars", async () => {
    const u = await newUser();
    await lesson(u, obj);
    await gradeOpen(u);
    const me = await json(await call(meGet, "/api/billing/me", u));
    assert.equal(me.enabled, true);
    assert.equal(me.tier, "free");
    assert.equal(me.entitlement, null);
    assert.equal(me.freeCourse.trackId, track);
    assert.equal(me.freeCourse.canSwitchAt, null, "an automatic choice can be switched now");
    assert.deepEqual(me.allowances.map((a: any) => [a.kind, a.limit, a.used, a.remaining]), [["graded_answer", 3, 1, 2]]);
    assert.ok(!JSON.stringify(me).includes("usd"));
  });
});

describe("BILLING_ENABLED on: Plus", () => {
  beforeEach(() => {
    process.env.BILLING_ENABLED = "1";
  });

  test("every course and every typed answer; coach counted a day; PBQ, labs and readiness are Pro", async () => {
    process.env.BILLING_ALLOWANCE_COACH_MESSAGE_PLUS = "2";
    const u = await plus();
    assert.equal(await tierFor(u), "plus");
    assert.equal((await lesson(u, obj)).status, 200);
    assert.equal((await lesson(u, objB)).status, 200);
    for (let i = 0; i < 5; i++) assert.equal((await gradeOpen(u, `It adds authentication, take ${i}.`)).status, 200);
    assert.equal((await chat(u, "first")).status, 200);
    assert.equal((await chat(u, "second")).status, 200);
    const third = await json(await chat(u, "third"), 429);
    assert.equal(third.allowance.kind, "coach_message");
    assert.match(third.error, /You've used today's 2 coach messages\. More open up in about 2\d hours/);
    assert.equal((await call(pbqGet, `/api/pbq?scenarioId=${scen}`, u)).status, 402);
    assert.equal((await call(labQuestionsPost, `/api/objectives/${obj}/lab/questions`, u, "POST", {}, { id: obj })).status, 402);
    // Open to Plus (it goes on to write a question, which this fake model can't).
    assert.notEqual((await call(quizPost, "/api/coach/quiz", u, "POST", { trackId: track })).status, 402);
    const course = await json(await call(courseGet, `/api/courses/${track}`, u, "GET", undefined, { id: track }));
    assert.equal(course.readiness, null);
    const me = await json(await call(meGet, "/api/billing/me", u));
    assert.equal(me.tier, "plus");
    assert.equal(me.entitlement.source, "grant");
    assert.equal(me.entitlement.manage, "grant");
  });

  test("a chat whose model call fails is not counted", async () => {
    process.env.BILLING_ALLOWANCE_COACH_MESSAGE_PLUS = "1";
    const u = await plus();
    __setClientForTest({ messages: { async create() { throw Object.assign(new Error("overloaded"), { status: 529 }); }, async parse() { throw new Error("x"); } } });
    try {
      assert.ok((await chat(u, "lost")).status >= 500);
    } finally {
      __setClientForTest(null);
    }
    // restore the fake used by the rest of the file
    __setClientForTest({
      messages: {
        async create() { modelCalls++; return { content: [{ type: "text", text: "Think it through." }], stop_reason: "end_turn", usage }; },
        async parse(body: any) {
          modelCalls++;
          if (JSON.stringify(body).includes("coach_reply")) return { parsed_output: body.output_config.format.parse(JSON.stringify({ givenAway: [] })), stop_reason: "end_turn", usage };
          if (failGrading) throw Object.assign(new Error("overloaded"), { status: 529 });
          return { parsed_output: body.output_config.format.parse(JSON.stringify(gradeOut)), stop_reason: "end_turn", usage };
        },
      },
    });
    assert.equal((await chat(u, "kept")).status, 200);
  });

  test("at the monthly AI cap the coach and regenerate pause kindly, grading never stops", async () => {
    process.env.AI_DAILY_BUDGET_USD = "off";
    const u = await plus();
    // 3M Haiku output tokens = $1.50, over Plus's $1.29.
    await query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok) values ($1,'chat','claude-haiku-5-5',0,3000000,1,true)`, [u]);
    const res = await json(await chat(u), 429);
    assert.ok(res.aiPaused.resetsAt);
    assert.equal(new Date(res.aiPaused.resetsAt).getUTCDate(), 1);
    assert.match(res.error, /You've used this month's AI coaching\. The coach and new lesson versions open again on [A-Z][a-z]+ 1\. Grading, practice and review keep working/);
    assert.equal((await call(regenPost, `/api/objectives/${obj}/lesson`, u, "POST", {}, { id: obj })).status, 429);
    assert.equal((await gradeOpen(u)).status, 200, "grading goes on");
    assert.equal((await json(await call(meGet, "/api/billing/me", u))).aiPaused.paused, true);
    process.env.AI_MONTHLY_CAP_PLUS_USD = "2";
    assert.equal((await chat(u)).status, 200);
  });

  test("one mock a month: counted atomically, given back when the mock can't be built", async () => {
    const u = await plus();
    // A course with nothing to practise: the build fails, so nothing is counted.
    assert.equal((await call(examPost, "/api/exam/sessions", u, "POST", { trackId: emptyTrack, mode: "mock", timed: true })).status, 400);
    assert.equal(Number((await queryOne<{ n: number }>(`select count(*)::int as n from allowance_uses where user_id = $1`, [u]))!.n), 0);
    // Parallel starts can't both get the month's one mock.
    const results = await Promise.allSettled([consumeAllowance(u, "mock_exam"), consumeAllowance(u, "mock_exam"), consumeAllowance(u, "mock_exam")]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.ok(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason instanceof AllowanceReachedError));
    const res = await json(await call(examPost, "/api/exam/sessions", u, "POST", { trackId: track, mode: "mock", timed: true }), 429);
    assert.match(res.error, /You've taken this month's mock exam\. The next one opens in (30|29) days\. .*Pro has unlimited mock exams/);
    // Sprints are not counted.
    assert.notEqual((await call(examPost, "/api/exam/sessions", u, "POST", { trackId: emptyTrack, mode: "sprint", timed: false })).status, 429);
  });

  test("regenerations are counted a week", async () => {
    process.env.BILLING_ALLOWANCE_REGENERATION_PLUS = "0";
    const u = await plus();
    const res = await json(await call(regenPost, `/api/objectives/${obj}/lesson`, u, "POST", {}, { id: obj }), 402);
    assert.equal(res.upgrade.feature, "regenerate");
  });
});

describe("BILLING_ENABLED on: Pro", () => {
  test("everything is open, readiness included; mocks are not counted", async () => {
    process.env.BILLING_ENABLED = "yes";
    const u = await pro();
    assert.equal((await call(pbqGet, `/api/pbq?scenarioId=${scen}`, u)).status, 200);
    assert.deepEqual((await json(await call(labGet, `/api/objectives/${obj}/lab`, u, "GET", undefined, { id: obj }))).lab, { prompt: "Try it" });
    const course = await json(await call(courseGet, `/api/courses/${track}`, u, "GET", undefined, { id: track }));
    assert.notEqual(course.readiness, null);
    assert.equal((await chat(u)).status, 200);
    for (let i = 0; i < 3; i++) await consumeAllowance(u, "mock_exam");
    assert.equal(Number((await queryOne<{ n: number }>(`select count(*)::int as n from allowance_uses where user_id = $1`, [u]))!.n), 0);
  });
});

// ---------------------------------------------------------------------------
// 3. Webhooks
// ---------------------------------------------------------------------------

const RC_SECRET = "rc-test-shared-secret";
const rc = (event: Record<string, unknown>, authz: string | null = RC_SECRET) =>
  rcPost(new Request("http://t/api/billing/webhooks/revenuecat", {
    method: "POST",
    headers: { "content-type": "application/json", ...(authz === null ? {} : { authorization: authz }) },
    body: JSON.stringify({ api_version: "1.0", event }),
  }));
const DAY = 86400_000;

describe("RevenueCat webhook", () => {
  beforeEach(() => {
    process.env.REVENUECAT_WEBHOOK_AUTH = RC_SECRET;
  });

  test("503 without a secret, 401 for a wrong or missing header, 400 for no event", async () => {
    delete process.env.REVENUECAT_WEBHOOK_AUTH;
    assert.equal((await rc({ id: "x", type: "TEST" })).status, 503);
    process.env.REVENUECAT_WEBHOOK_AUTH = RC_SECRET;
    assert.equal((await rc({ id: "x", type: "TEST" }, "wrong")).status, 401);
    assert.equal((await rc({ id: "x", type: "TEST" }, null)).status, 401);
    assert.equal((await rc({ id: "x", type: "TEST" }, `Bearer ${RC_SECRET}`)).status, 200);
    const bad = await rcPost(new Request("http://t/x", { method: "POST", headers: { authorization: RC_SECRET }, body: "{}" }));
    assert.equal(bad.status, 400);
  });

  test("purchase, duplicate, renewal to Pro, a late older event, cancellation to period end, billing issue, expiry", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await newUser();
    const otx = `otx-${run}-${randomUUID()}`;
    const t0 = Date.now() - 60_000;
    const base = { app_user_id: u, original_transaction_id: otx, store: "APP_STORE", environment: "SANDBOX" };
    const ev = (type: string, at: number, extra: Record<string, unknown> = {}) => ({ id: `rc-${run}-${randomUUID()}`, type, event_timestamp_ms: at, ...base, ...extra });

    const buy = ev("INITIAL_PURCHASE", t0, { product_id: "ascendra.plus.monthly", entitlement_ids: ["plus"], expiration_at_ms: Date.now() + 30 * DAY });
    assert.equal((await json(await rc(buy))).outcome, "applied");
    assert.equal(await tierFor(u), "plus");
    assert.equal((await json(await rc(buy))).outcome, "duplicate");
    assert.equal(Number((await queryOne<{ n: number }>(`select count(*)::int as n from billing_events where event_id = $1`, [buy.id]))!.n), 1);

    const renew = ev("RENEWAL", t0 + 2000, { product_id: "ascendra.pro.yearly", entitlement_ids: ["pro"], expiration_at_ms: Date.now() + 365 * DAY });
    assert.equal((await json(await rc(renew))).outcome, "applied");
    assert.equal(await tierFor(u), "pro");
    const row = await queryOne<{ plan: string; product_id: string }>(`select plan, product_id from entitlements where external_id = $1`, [otx]);
    assert.deepEqual(row, { plan: "yearly", product_id: "ascendra.pro.yearly" });

    // An expiry stamped before the renewal, delivered after it: ignored.
    assert.equal((await json(await rc(ev("EXPIRATION", t0 + 1000, { product_id: "ascendra.plus.monthly", expiration_at_ms: t0 })))).outcome, "stale");
    assert.equal(await tierFor(u), "pro");

    // Cancelled (auto-renew off): access until the period ends.
    assert.equal((await json(await rc(ev("CANCELLATION", t0 + 3000, { product_id: "ascendra.pro.yearly", entitlement_ids: ["pro"], cancel_reason: "UNSUBSCRIBE", expiration_at_ms: Date.now() + 10 * DAY })))).outcome, "applied");
    assert.equal(await tierFor(u), "pro");
    const me = await json(await call(meGet, "/api/billing/me", u));
    assert.equal(me.entitlement.status, "canceled");
    assert.equal(me.entitlement.willRenew, false);
    assert.equal(me.entitlement.manage, "app_store");

    // Billing issue: access continues through the grace period.
    await rc(ev("BILLING_ISSUE", t0 + 4000, { product_id: "ascendra.pro.yearly", entitlement_ids: ["pro"], expiration_at_ms: Date.now() - DAY * 2, grace_period_expiration_at_ms: Date.now() + 3 * DAY }));
    assert.equal(await tierFor(u), "pro");

    assert.equal((await json(await rc(ev("EXPIRATION", t0 + 5000, { product_id: "ascendra.pro.yearly", expiration_at_ms: Date.now() })))).outcome, "applied");
    assert.equal(await tierFor(u), "free");
  });

  test("a refund ends access at once; unknown users and products are logged, not applied; TEST is ignored", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await newUser();
    const otx = `otx-${run}-${randomUUID()}`;
    const at = Date.now() - 10_000;
    await rc({ id: `rc-${run}-${randomUUID()}`, type: "INITIAL_PURCHASE", event_timestamp_ms: at, app_user_id: u, original_transaction_id: otx, product_id: "ascendra_plus:monthly", expiration_at_ms: Date.now() + 30 * DAY, store: "PLAY_STORE" });
    assert.equal(await tierFor(u), "plus");
    assert.equal((await json(await call(meGet, "/api/billing/me", u))).entitlement.manage, "play_store");
    await rc({ id: `rc-${run}-${randomUUID()}`, type: "CANCELLATION", event_timestamp_ms: at + 1, app_user_id: u, original_transaction_id: otx, product_id: "ascendra_plus:monthly", cancel_reason: "CUSTOMER_SUPPORT", expiration_at_ms: Date.now() + 30 * DAY });
    assert.equal(await tierFor(u), "free");

    assert.equal((await json(await rc({ id: `rc-${run}-${randomUUID()}`, type: "INITIAL_PURCHASE", event_timestamp_ms: at, app_user_id: "$RCAnonymousID:abc", original_transaction_id: `o-${randomUUID()}`, product_id: "ascendra.plus.monthly" }))).outcome, "unmatched");
    assert.equal((await json(await rc({ id: `rc-${run}-${randomUUID()}`, type: "INITIAL_PURCHASE", event_timestamp_ms: at, app_user_id: u, original_transaction_id: `o-${randomUUID()}`, product_id: "someone.else" }))).outcome, "unmatched");
    assert.equal((await json(await rc({ id: `rc-${run}-${randomUUID()}`, type: "TEST", event_timestamp_ms: at }))).outcome, "ignored");
  });

  test("a transfer moves access off the old account", async () => {
    process.env.BILLING_ENABLED = "true";
    const a = await newUser();
    const b = await newUser();
    const at = Date.now() - 10_000;
    await rc({ id: `rc-${run}-${randomUUID()}`, type: "INITIAL_PURCHASE", event_timestamp_ms: at, app_user_id: a, original_transaction_id: `o-${randomUUID()}`, product_id: "ascendra.pro.monthly", expiration_at_ms: Date.now() + DAY * 30 });
    assert.equal(await tierFor(a), "pro");
    await rc({ id: `rc-${run}-${randomUUID()}`, type: "TRANSFER", event_timestamp_ms: at + 1, transferred_from: [a], transferred_to: [b] });
    assert.equal(await tierFor(a), "free");
  });
});

const WHSEC = "whsec_test_only_not_a_real_secret";
const stripe = (event: Record<string, unknown>, opts: { secret?: string; t?: number; tamper?: boolean } = {}) => {
  const raw = JSON.stringify(event);
  const sig = stripeSignatureHeader(raw, opts.secret ?? WHSEC, opts.t);
  return stripePost(new Request("http://t/api/billing/webhooks/stripe", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": sig },
    body: opts.tamper ? raw.replace("plus", "pro") : raw,
  }));
};
const sub = (u: string, id: string, extra: Record<string, unknown> = {}) => ({
  id,
  object: "subscription",
  customer: `cus_${id}`,
  status: "active",
  cancel_at_period_end: false,
  metadata: { user_id: u, tier: "plus", plan: "monthly" },
  items: { data: [{ price: { id: "price_plus_m" }, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
  ...extra,
});

describe("Stripe webhook", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = WHSEC;
    process.env.BILLING_ENABLED = "true";
  });

  test("signature: verified on the raw body; wrong secret, tampered body, old timestamp and no header are 400; no secret is 503", async () => {
    const e = { id: `evt_${run}_${randomUUID()}`, type: "checkout.session.completed", created: Math.floor(Date.now() / 1000), data: { object: { id: "cs_1" } } };
    assert.equal((await json(await stripe(e))).outcome, "ignored");
    assert.equal((await stripe({ ...e, id: `evt_${run}_${randomUUID()}` }, { secret: "whsec_other" })).status, 400);
    assert.equal((await stripe({ ...e, id: `evt_${run}_${randomUUID()}`, type: "plus" }, { tamper: true })).status, 400);
    assert.equal((await stripe({ ...e, id: `evt_${run}_${randomUUID()}` }, { t: Math.floor(Date.now() / 1000) - 600 })).status, 400);
    assert.equal((await stripePost(new Request("http://t/x", { method: "POST", body: JSON.stringify(e) }))).status, 400);
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal((await stripe(e)).status, 503);
  });

  test("subscription created, duplicate, out of order, cancel at period end, payment failed, deleted; a full refund ends access", async () => {
    const u = await newUser();
    const subId = `sub_${run}_${randomUUID()}`;
    const now = Math.floor(Date.now() / 1000) - 100;
    const evt = (type: string, created: number, object: Record<string, unknown>) => ({ id: `evt_${run}_${randomUUID()}`, type, created, data: { object } });

    const created = evt("customer.subscription.created", now, sub(u, subId));
    assert.equal((await json(await stripe(created))).outcome, "applied");
    assert.equal(await tierFor(u), "plus");
    assert.equal((await json(await stripe(created))).outcome, "duplicate");
    const me = await json(await call(meGet, "/api/billing/me", u));
    assert.equal(me.entitlement.manage, "stripe");
    assert.equal(me.entitlement.plan, "monthly");

    assert.equal((await json(await stripe(evt("customer.subscription.updated", now + 5, sub(u, subId, { cancel_at_period_end: true }))))).outcome, "applied");
    assert.equal(await tierFor(u), "plus", "paid up to the period end");
    assert.equal((await json(await stripe(evt("customer.subscription.updated", now + 1, sub(u, subId, { status: "canceled" }))))).outcome, "stale");

    assert.equal((await json(await stripe(evt("invoice.payment_failed", now + 6, { id: "in_1", subscription: subId })))).outcome, "applied");
    assert.equal((await queryOne<{ status: string }>(`select status from entitlements where external_id = $1`, [subId]))!.status, "billing_issue");
    assert.equal(await tierFor(u), "plus");

    assert.equal((await json(await stripe(evt("customer.subscription.deleted", now + 7, sub(u, subId, { status: "canceled" }))))).outcome, "applied");
    assert.equal(await tierFor(u), "free");

    // A second subscription, refunded in full.
    const sub2 = `sub_${run}_${randomUUID()}`;
    await stripe(evt("customer.subscription.created", now + 8, sub(u, sub2, { metadata: { user_id: u }, items: { data: [{ price: { id: "price_pro_y" }, current_period_end: now + 365 * 86400 }] } })));
    process.env.STRIPE_PRICE_PRO_YEARLY = "price_pro_y";
    const sub3 = `sub_${run}_${randomUUID()}`;
    await stripe(evt("customer.subscription.created", now + 9, sub(u, sub3, { customer: `cus_${sub3}`, metadata: { user_id: u }, items: { data: [{ price: { id: "price_pro_y" }, current_period_end: now + 365 * 86400 }] } })));
    assert.equal(await tierFor(u), "pro", "tier from the STRIPE_PRICE_* map");
    assert.equal((await json(await stripe(evt("charge.refunded", now + 10, { id: "ch_1", customer: `cus_${sub3}`, amount: 5999, amount_refunded: 1000, refunded: false })))).outcome, "ignored");
    assert.equal((await json(await stripe(evt("charge.refunded", now + 11, { id: "ch_1", customer: `cus_${sub3}`, amount: 5999, amount_refunded: 5999, refunded: true })))).outcome, "applied");
    assert.equal(await tierFor(u), "free");
  });
});

// ---------------------------------------------------------------------------
// 4. Grants, checkout, export
// ---------------------------------------------------------------------------

describe("grants (comps)", () => {
  test("a grant gives its tier until its end; revoking ends it; the CLI's all-existing mode skips the already comped", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await newUser();
    await grantEntitlement({ userId: u, tier: "pro", until: new Date(Date.now() + DAY), note: "founding learner" });
    assert.equal(await tierFor(u), "pro");
    assert.equal(await revokeGrants(u), 1);
    assert.equal(await tierFor(u), "free");
    await query(`insert into entitlements (user_id, tier, source, external_id, status, period_end) values ($1,'plus','grant',$2,'active', now() - interval '3 days')`, [u, `grant:${randomUUID()}`]);
    assert.equal(await tierFor(u), "free", "an ended grant gives nothing");

    const lines = await runGrant(parseGrantArgs(["--user", u, "--tier", "plus", "--until", "2099-12-31", "--note", "test"]));
    assert.match(lines[0], /granted plus/);
    assert.equal(await tierFor(u), "plus");
    const dry = await runGrant(parseGrantArgs(["--all-existing", "--tier", "plus", "--dry-run"]));
    assert.ok(!dry.some((l) => l.includes(u)), "already comped at plus");
  });
});

describe("web checkout and portal", () => {
  test("503 without the key or the price; with them, a Checkout session with the learner's id in the metadata; a Stripe error is a 502", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await newUser();
    assert.equal((await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "plus_monthly" })).status, 503);
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_not_real";
    process.env.BILLING_WEB_RETURN_URL = "https://app.example.test";
    assert.equal((await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "plus_monthly" })).status, 503, "price not set");
    process.env.STRIPE_PRICE_PLUS_MONTHLY = "price_plus_m";
    assert.equal((await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "gold_forever" })).status, 400);

    const realFetch = globalThis.fetch;
    const sent: Array<{ url: string; init: RequestInit }> = [];
    let fail = false;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      if (fail) return new Response(JSON.stringify({ error: { type: "invalid_request_error" } }), { status: 400 });
      return new Response(JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.test/cs_test_1" }), { status: 200 });
    }) as typeof fetch;
    try {
      const ok = await json(await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "plus_monthly", requestId: "req-12345678" }));
      assert.equal(ok.url, "https://checkout.stripe.test/cs_test_1");
      assert.equal(sent[0].url, "https://api.stripe.com/v1/checkout/sessions");
      const form = new URLSearchParams(String(sent[0].init.body));
      assert.equal(form.get("line_items[0][price]"), "price_plus_m");
      assert.equal(form.get("subscription_data[metadata][user_id]"), u);
      assert.equal(form.get("client_reference_id"), u);
      assert.equal(form.get("mode"), "subscription");
      assert.equal((sent[0].init.headers as Record<string, string>).Authorization, "Bearer sk_test_fake_not_real");
      assert.equal((sent[0].init.headers as Record<string, string>)["Idempotency-Key"], `checkout:${u}:req-12345678`);
      fail = true;
      assert.equal((await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "plus_monthly" })).status, 502);
      // Portal: only for a web subscriber.
      assert.equal((await call(portalPost, "/api/billing/portal", u, "POST", {})).status, 404);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("account export", () => {
  test("includes the plan, events, free course and allowance uses", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await newUser();
    await grantEntitlement({ userId: u, tier: "plus" });
    await consumeAllowance(u, "coach_message");
    const out = (await buildAccountExport(u, (sql, p) => query(sql, p))) as unknown as Record<string, unknown[]>;
    assert.equal(out.entitlements.length, 1);
    assert.equal(out.billingEvents.length, 1);
    assert.equal(out.allowanceUses.length, 1);
    assert.deepEqual(out.freeCourse, []);
    assert.ok(!("note" in (out.entitlements[0] as object)));
  });
});
