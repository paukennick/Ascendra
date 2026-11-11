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
import { recordStudyNoticeAcceptance } from "./study-notice";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { labPromptHash } from "./lesson-experience";
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
import { POST as labReportPost } from "../app/api/objectives/[id]/lab/report/route";
import { POST as labQuestionsPost } from "../app/api/objectives/[id]/lab/questions/route";
import { GET as unitCheckGet } from "../app/api/units/[id]/check/route";
import { GET as comparisonsGet } from "../app/api/courses/[id]/comparisons/route";
import { POST as quizPost } from "../app/api/coach/quiz/route";
import { GET as pbqGet, POST as pbqPost } from "../app/api/pbq/route";
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
  "BILLING_ALLOWANCE_GRADED_ANSWER_PRO",
  "AI_DAILY_BUDGET_USD",
  "AI_MONTHLY_CAP_PLUS_USD",
  "REVENUECAT_WEBHOOK_AUTH",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_IT_CLOUD_PLUS_MONTHLY",
  "STRIPE_PRICE_IT_CLOUD_PRO_YEARLY",
  "BILLING_WEB_RETURN_URL",
];

const usage = { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
let modelCalls = 0;
let failGrading = false;
const gradeOut = {
  verdict: "correct", feedback: "f", classification: "none", missedParts: [], modelAnswer: "m", fixNext: "n", misconception: "", confusedWith: "",
  // REQ-124: explain-back's four checks, so the explain-back grader can run here too.
  rubric: { correct: true, complete: true, keyTerms: true, noMisconception: true },
};

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
  await recordStudyNoticeAcceptance(u); // REQ-205: model routes need the notice
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
      assert.deepEqual(lab.lab, { prompt: "Try it" }); // REQ-165: no per-lab disclaimer
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
      // REQ-124 (decision 7): nothing but the switch's state while it is off.
      assert.deepEqual(await json(await configGet()), { enabled: false });
      assert.equal((await call(freeCoursePut, "/api/billing/free-course", u, "PUT", { trackId: track })).status, 404);
      assert.equal((await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "it_cloud_plus_monthly" })).status, 404);
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
    // REQ-170: the upgrade names the plan for this course's category (the
    // test course has no catalog category, so all-access is the plan).
    assert.deepEqual(c.upgrade, { feature: "coach", requiredTier: "plus", currentTier: "free", scope: "all_access" });
    assert.match(c.error, /The AI coach comes with All access/);
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
    // REQ-124 (decision 5): readiness is in Plus; Free reads Nick's one line.
    assert.equal(course.readinessLocked.requiredTier, "plus");
    assert.equal(course.readinessLocked.message, "Readiness: unconfirmed \u2014 prove it with typed answers in Plus");
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

  test("every course and every typed answer; coach counted a day; readiness shown; PBQ and labs are Pro", async () => {
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
    // REQ-124 (decision 5): Plus sees the readiness score (was Pro-only).
    const course = await json(await call(courseGet, `/api/courses/${track}`, u, "GET", undefined, { id: track }));
    assert.notEqual(course.readiness, null);
    assert.equal(course.readinessLocked, undefined);
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
    // 7M Haiku output tokens = $3.50, over a Plus grant's cap (REQ-170: like
    // IT and cloud Plus, $2.95; was $1.29 at the first prices).
    await query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok) values ($1,'chat','claude-haiku-5-5',0,7000000,1,true)`, [u]);
    const res = await json(await chat(u), 429);
    assert.ok(res.aiPaused.resetsAt);
    assert.equal(new Date(res.aiPaused.resetsAt).getUTCDate(), 1);
    assert.match(res.error, /You've used this month's AI coaching\. The coach and new lesson versions open again on [A-Z][a-z]+ 1\. Grading, practice and review keep working/);
    assert.equal((await call(regenPost, `/api/objectives/${obj}/lesson`, u, "POST", {}, { id: obj })).status, 429);
    assert.equal((await gradeOpen(u)).status, 200, "grading goes on");
    assert.equal((await json(await call(meGet, "/api/billing/me", u))).aiPaused.paused, true);
    process.env.AI_MONTHLY_CAP_PLUS_USD = "4";
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
  test("everything is open, readiness included; mocks are not counted; the coach is about 60 a day", async () => {
    process.env.BILLING_ENABLED = "yes";
    const u = await pro();
    assert.equal((await call(pbqGet, `/api/pbq?scenarioId=${scen}`, u)).status, 200);
    assert.deepEqual((await json(await call(labGet, `/api/objectives/${obj}/lab`, u, "GET", undefined, { id: obj }))).lab, { prompt: "Try it" });
    const course = await json(await call(courseGet, `/api/courses/${track}`, u, "GET", undefined, { id: track }));
    assert.notEqual(course.readiness, null);
    assert.equal((await chat(u)).status, 200);
    for (let i = 0; i < 3; i++) await consumeAllowance(u, "mock_exam");
    assert.equal(Number((await queryOne<{ n: number }>(`select count(*)::int as n from allowance_uses where user_id = $1 and kind = 'mock_exam'`, [u]))!.n), 0);
    // REQ-124 (decision 2): Pro's coach is counted, 60 a day by default
    // (the chat above was the first), still under the monthly AI cap.
    for (let i = 0; i < 59; i++) await consumeAllowance(u, "coach_message");
    await assert.rejects(consumeAllowance(u, "coach_message"), (e: unknown) => e instanceof AllowanceReachedError && /today's 60 coach messages/.test((e as Error).message));
    const me = await json(await call(meGet, "/api/billing/me", u));
    assert.deepEqual(me.allowances.find((a: any) => a.kind === "coach_message").limit, 60);
  });

  test("REQ-124 decision 9: explain-back and lab reports count against the graded-answer allowance", async () => {
    process.env.BILLING_ENABLED = "yes";
    process.env.BILLING_ALLOWANCE_GRADED_ANSWER_PRO = "2";
    const u = await pro();
    await guidedOn(u);
    assert.equal((await gradeOpen(u, "It adds authentication, one.")).status, 200);
    const words = "Counter mode turns a block cipher into a stream by encrypting a counter for each block, and GCM adds an authentication tag on top of that.";
    const ex = await call(explainPost, `/api/objectives/${obj}/explain-back`, u, "POST", { answer: words }, { id: obj });
    assert.equal(ex.status, 200, await ex.clone().text());
    const kinds = await query<{ kind: string }>(`select kind from allowance_uses where user_id = $1 order by used_at`, [u]);
    assert.deepEqual(kinds.map((k) => k.kind), ["graded_answer", "graded_answer"]);
    // The third graded thing today -- a lab report -- is refused before any model call.
    await query(
      `insert into lab_report_questions (objective_id, prompt_hash, questions, model) values ($1, $2, $3, 'test')
       on conflict (objective_id) do update set prompt_hash = excluded.prompt_hash, questions = excluded.questions`,
      [obj, labPromptHash("Try it"), JSON.stringify(["What did you set up?"])]
    );
    const calls = modelCalls;
    const rep = await json(await call(labReportPost, `/api/objectives/${obj}/lab/report`, u, "POST", { answers: ["I set up CTR mode on a test file."] }, { id: obj }), 429);
    assert.equal(rep.allowance.kind, "graded_answer");
    assert.equal(modelCalls, calls, "no model call");
    // A failed grading gives its use back.
    await query(`delete from allowance_uses where user_id = $1`, [u]);
    failGrading = true;
    assert.ok((await call(labReportPost, `/api/objectives/${obj}/lab/report`, u, "POST", { answers: ["I set up CTR mode."] }, { id: obj })).status >= 500);
    failGrading = false;
    assert.equal(Number((await queryOne<{ n: number }>(`select count(*)::int as n from allowance_uses where user_id = $1`, [u]))!.n), 0);
    delete process.env.BILLING_ALLOWANCE_GRADED_ANSWER_PRO;
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

    const buy = ev("INITIAL_PURCHASE", t0, { product_id: "ascendra.it_cloud_plus.monthly", entitlement_ids: ["it_cloud_plus"], expiration_at_ms: Date.now() + 30 * DAY });
    assert.equal((await json(await rc(buy))).outcome, "applied");
    assert.equal(await tierFor(u), "plus");
    assert.equal((await json(await rc(buy))).outcome, "duplicate");
    assert.equal(Number((await queryOne<{ n: number }>(`select count(*)::int as n from billing_events where event_id = $1`, [buy.id]))!.n), 1);

    const renew = ev("RENEWAL", t0 + 2000, { product_id: "ascendra.it_cloud_pro.yearly", entitlement_ids: ["it_cloud_pro"], expiration_at_ms: Date.now() + 365 * DAY });
    assert.equal((await json(await rc(renew))).outcome, "applied");
    assert.equal(await tierFor(u), "pro");
    const row = await queryOne<{ plan: string; product_id: string }>(`select plan, product_id from entitlements where external_id = $1`, [otx]);
    assert.deepEqual(row, { plan: "yearly", product_id: "ascendra.it_cloud_pro.yearly" });

    // An expiry stamped before the renewal, delivered after it: ignored.
    assert.equal((await json(await rc(ev("EXPIRATION", t0 + 1000, { product_id: "ascendra.it_cloud_plus.monthly", expiration_at_ms: t0 })))).outcome, "stale");
    assert.equal(await tierFor(u), "pro");

    // Cancelled (auto-renew off): access until the period ends.
    assert.equal((await json(await rc(ev("CANCELLATION", t0 + 3000, { product_id: "ascendra.it_cloud_pro.yearly", entitlement_ids: ["it_cloud_pro"], cancel_reason: "UNSUBSCRIBE", expiration_at_ms: Date.now() + 10 * DAY })))).outcome, "applied");
    assert.equal(await tierFor(u), "pro");
    const me = await json(await call(meGet, "/api/billing/me", u));
    assert.equal(me.entitlement.status, "canceled");
    assert.equal(me.entitlement.willRenew, false);
    assert.equal(me.entitlement.manage, "app_store");

    // Billing issue: access continues through the grace period.
    await rc(ev("BILLING_ISSUE", t0 + 4000, { product_id: "ascendra.it_cloud_pro.yearly", entitlement_ids: ["it_cloud_pro"], expiration_at_ms: Date.now() - DAY * 2, grace_period_expiration_at_ms: Date.now() + 3 * DAY }));
    assert.equal(await tierFor(u), "pro");

    assert.equal((await json(await rc(ev("EXPIRATION", t0 + 5000, { product_id: "ascendra.it_cloud_pro.yearly", expiration_at_ms: Date.now() })))).outcome, "applied");
    assert.equal(await tierFor(u), "free");
  });

  test("a refund ends access at once; unknown users and products are logged, not applied; TEST is ignored", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await newUser();
    const otx = `otx-${run}-${randomUUID()}`;
    const at = Date.now() - 10_000;
    await rc({ id: `rc-${run}-${randomUUID()}`, type: "INITIAL_PURCHASE", event_timestamp_ms: at, app_user_id: u, original_transaction_id: otx, product_id: "ascendra_it_cloud_plus:monthly", expiration_at_ms: Date.now() + 30 * DAY, store: "PLAY_STORE" });
    assert.equal(await tierFor(u), "plus");
    assert.equal((await json(await call(meGet, "/api/billing/me", u))).entitlement.manage, "play_store");
    await rc({ id: `rc-${run}-${randomUUID()}`, type: "CANCELLATION", event_timestamp_ms: at + 1, app_user_id: u, original_transaction_id: otx, product_id: "ascendra_it_cloud_plus:monthly", cancel_reason: "CUSTOMER_SUPPORT", expiration_at_ms: Date.now() + 30 * DAY });
    assert.equal(await tierFor(u), "free");

    assert.equal((await json(await rc({ id: `rc-${run}-${randomUUID()}`, type: "INITIAL_PURCHASE", event_timestamp_ms: at, app_user_id: "$RCAnonymousID:abc", original_transaction_id: `o-${randomUUID()}`, product_id: "ascendra.it_cloud_plus.monthly" }))).outcome, "unmatched");
    assert.equal((await json(await rc({ id: `rc-${run}-${randomUUID()}`, type: "INITIAL_PURCHASE", event_timestamp_ms: at, app_user_id: u, original_transaction_id: `o-${randomUUID()}`, product_id: "someone.else" }))).outcome, "unmatched");
    assert.equal((await json(await rc({ id: `rc-${run}-${randomUUID()}`, type: "TEST", event_timestamp_ms: at }))).outcome, "ignored");
  });

  test("a transfer moves access off the old account", async () => {
    process.env.BILLING_ENABLED = "true";
    const a = await newUser();
    const b = await newUser();
    const at = Date.now() - 10_000;
    await rc({ id: `rc-${run}-${randomUUID()}`, type: "INITIAL_PURCHASE", event_timestamp_ms: at, app_user_id: a, original_transaction_id: `o-${randomUUID()}`, product_id: "ascendra.it_cloud_pro.monthly", expiration_at_ms: Date.now() + DAY * 30 });
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
  metadata: { user_id: u, family: "it_cloud_plus", plan: "monthly" },
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
    process.env.STRIPE_PRICE_IT_CLOUD_PRO_YEARLY = "price_pro_y";
    const sub3 = `sub_${run}_${randomUUID()}`;
    await stripe(evt("customer.subscription.created", now + 9, sub(u, sub3, { customer: `cus_${sub3}`, metadata: { user_id: u }, items: { data: [{ price: { id: "price_pro_y" }, current_period_end: now + 365 * 86400 }] } })));
    assert.equal(await tierFor(u), "pro", "tier from the STRIPE_PRICE_* map");
    assert.equal((await json(await stripe(evt("charge.refunded", now + 10, { id: "ch_1", customer: `cus_${sub3}`, amount: 5999, amount_refunded: 1000, refunded: false })))).outcome, "ignored");
    assert.equal((await json(await stripe(evt("charge.refunded", now + 11, { id: "ch_1", customer: `cus_${sub3}`, amount: 5999, amount_refunded: 5999, refunded: true })))).outcome, "applied");
    assert.equal(await tierFor(u), "free");
  });
});

// ---------------------------------------------------------------------------
// 3b. REQ-124 decision 6: a downgrade keeps the paid plan to its period end
// ---------------------------------------------------------------------------

const ent = (u: string) =>
  query<{ external_id: string; tier: string; status: string; period_end: Date | null }>(
    `select external_id, tier, status, period_end from entitlements where user_id = $1 order by external_id`,
    [u]
  );
// Moves a held row's paid period into the past (beyond the 24-hour grace).
const endHeldPeriod = (u: string) =>
  query(`update entitlements set period_end = now() - interval '2 days' where user_id = $1 and external_id like 'held:%'`, [u]);

describe("REQ-124: downgrades keep the paid plan until the period ends (decision 6)", () => {
  beforeEach(() => {
    process.env.BILLING_ENABLED = "true";
    process.env.STRIPE_WEBHOOK_SECRET = WHSEC;
    process.env.REVENUECAT_WEBHOOK_AUTH = RC_SECRET;
  });
  const proSub = (u: string, id: string, extra: Record<string, unknown> = {}) =>
    sub(u, id, { metadata: { user_id: u, family: "it_cloud_pro", plan: "monthly" }, ...extra });
  const evt = (type: string, created: number, object: Record<string, unknown>) => ({ id: `evt_${run}_${randomUUID()}`, type, created, data: { object } });

  test("Stripe: Pro to Plus keeps Pro to the paid period's end, then Plus; an upgrade applies at once", async () => {
    // Before REQ-124 the subscription.updated with the Plus price made the
    // learner Plus at once, with a month of Pro paid for (fails before).
    const u = await newUser();
    const subId = `sub_${run}_${randomUUID()}`;
    const t = Math.floor(Date.now() / 1000) - 100;
    await stripe(evt("customer.subscription.created", t, proSub(u, subId)));
    assert.equal(await tierFor(u), "pro");
    assert.equal((await json(await stripe(evt("customer.subscription.updated", t + 5, sub(u, subId))))).outcome, "applied");
    assert.equal(await tierFor(u), "pro", "kept to the end of the paid month");
    const rows = await ent(u);
    assert.deepEqual(
      rows.map((r) => `${r.external_id.startsWith("held:") ? "held" : "sub"} ${r.tier} ${r.status}`).sort(),
      ["held pro canceled", "sub plus active"]
    );
    const me = await json(await call(meGet, "/api/billing/me", u));
    assert.equal(me.tier, "pro");
    assert.equal(me.entitlement.next.tier, "plus");
    assert.equal(me.entitlement.willRenew, true, "the subscription itself renews, as Plus");
    await endHeldPeriod(u);
    assert.equal(await tierFor(u), "plus", "the lower tier from the period end");
    // Upgrade back: Pro at once.
    await stripe(evt("customer.subscription.updated", t + 10, proSub(u, subId)));
    assert.equal(await tierFor(u), "pro");
  });

  test("Stripe, out of order: the Plus update arrives before the Pro creation; Pro is still kept to its end", async () => {
    const u = await newUser();
    const subId = `sub_${run}_${randomUUID()}`;
    const t = Math.floor(Date.now() / 1000) - 100;
    assert.equal((await json(await stripe(evt("customer.subscription.updated", t + 5, sub(u, subId))))).outcome, "applied");
    assert.equal(await tierFor(u), "plus");
    assert.equal((await json(await stripe(evt("customer.subscription.created", t, proSub(u, subId))))).outcome, "stale");
    assert.equal(await tierFor(u), "pro", "the paid Pro period is held whatever the delivery order");
    // A stale event for the SAME or a lower tier holds nothing.
    const v = await newUser();
    const sub2 = `sub_${run}_${randomUUID()}`;
    await stripe(evt("customer.subscription.updated", t + 5, proSub(v, sub2)));
    await stripe(evt("customer.subscription.created", t, sub(v, sub2)));
    assert.equal((await ent(v)).length, 1);
  });

  test("Stripe: canceling at once keeps the paid period; non-payment ends it now; a refund ends the held period too", async () => {
    const t = Math.floor(Date.now() / 1000) - 100;
    // Cancelled immediately from the portal: Pro to the period end.
    const a = await newUser();
    const subA = `sub_${run}_${randomUUID()}`;
    await stripe(evt("customer.subscription.created", t, proSub(a, subA)));
    await stripe(evt("customer.subscription.deleted", t + 5, proSub(a, subA, { status: "canceled", cancellation_details: { reason: "cancellation_requested" } })));
    assert.equal(await tierFor(a), "pro");
    assert.equal((await ent(a))[0].status, "canceled");
    // Deleted for non-payment: ends now, as before.
    const b = await newUser();
    const subB = `sub_${run}_${randomUUID()}`;
    await stripe(evt("customer.subscription.created", t, proSub(b, subB)));
    await stripe(evt("customer.subscription.deleted", t + 5, proSub(b, subB, { status: "canceled", cancellation_details: { reason: "payment_failed" } })));
    assert.equal(await tierFor(b), "free");
    // Downgraded, then refunded in full: the held Pro ends as well.
    const c = await newUser();
    const subC = `sub_${run}_${randomUUID()}`;
    await stripe(evt("customer.subscription.created", t, proSub(c, subC)));
    await stripe(evt("customer.subscription.updated", t + 5, sub(c, subC)));
    assert.equal(await tierFor(c), "pro");
    await stripe(evt("charge.refunded", t + 6, { id: "ch_x", customer: `cus_${subC}`, amount: 999, amount_refunded: 999, refunded: true }));
    assert.equal(await tierFor(c), "free");
  });

  test("RevenueCat: a lower product on the same subscription keeps Pro to its end; out of order too; a refund ends it", async () => {
    const t0 = Date.now() - 60_000;
    const evRc = (u: string, otx: string, type: string, at: number, extra: Record<string, unknown>) =>
      ({ id: `rc-${run}-${randomUUID()}`, type, event_timestamp_ms: at, app_user_id: u, original_transaction_id: otx, store: "PLAY_STORE", ...extra });
    const proBuy = (u: string, otx: string, at: number) =>
      evRc(u, otx, "INITIAL_PURCHASE", at, { product_id: "ascendra_it_cloud_pro:monthly", entitlement_ids: ["it_cloud_pro"], expiration_at_ms: Date.now() + 20 * DAY });
    const plusNow = (u: string, otx: string, at: number) =>
      evRc(u, otx, "INITIAL_PURCHASE", at, { product_id: "ascendra_it_cloud_plus:monthly", entitlement_ids: ["it_cloud_plus"], expiration_at_ms: Date.now() + 30 * DAY });

    const u = await newUser();
    const otx = `otx-${run}-${randomUUID()}`;
    await rc(proBuy(u, otx, t0));
    await rc(plusNow(u, otx, t0 + 1000));
    assert.equal(await tierFor(u), "pro");
    await endHeldPeriod(u);
    assert.equal(await tierFor(u), "plus");

    const v = await newUser();
    const otxV = `otx-${run}-${randomUUID()}`;
    await rc(plusNow(v, otxV, t0 + 1000));
    assert.equal((await json(await rc(proBuy(v, otxV, t0)))).outcome, "stale");
    assert.equal(await tierFor(v), "pro", "out of order");
    await rc(evRc(v, otxV, "CANCELLATION", t0 + 2000, { product_id: "ascendra_it_cloud_plus:monthly", entitlement_ids: ["it_cloud_plus"], cancel_reason: "CUSTOMER_SUPPORT", expiration_at_ms: Date.now() + 30 * DAY }));
    assert.equal(await tierFor(v), "free", "a refund ends the held period too");
  });

  test("an answer to a PBQ on screen when the paid period ended may still be sent; a new scenario may not", async () => {
    // Before REQ-124 the answer was refused (402) the moment access ended (fails before).
    const u = await newUser();
    await query(
      `insert into entitlements (user_id, tier, source, external_id, status, period_end) values ($1, 'pro', 'stripe', $2, 'canceled', now() - interval '25 hours')`,
      [u, `sub_${run}_${randomUUID()}`]
    );
    assert.equal(await tierFor(u), "free", "past the 24-hour grace");
    assert.equal((await call(pbqGet, `/api/pbq?scenarioId=${scen}`, u)).status, 402);
    const res = await call(pbqPost, "/api/pbq", u, "POST", { scenarioId: scen, answer: "1) GCM 2) it authenticates as well as encrypts" });
    assert.notEqual(res.status, 402, await res.clone().text());
    // Long after the period: refused.
    await query(`update entitlements set period_end = now() - interval '4 days' where user_id = $1`, [u]);
    assert.equal((await call(pbqPost, "/api/pbq", u, "POST", { scenarioId: scen, answer: "again" })).status, 402);
    // A refund is not a period ending: nothing to finish.
    await query(`update entitlements set period_end = now() - interval '25 hours', status = 'refunded' where user_id = $1`, [u]);
    assert.equal((await call(pbqPost, "/api/pbq", u, "POST", { scenarioId: scen, answer: "again" })).status, 402);
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

describe("REQ-124 decision 1: the launch comp", () => {
  test("dry run changes nothing; --apply gives every account Pro for 90 days once; a second run comps only new accounts (FAIL-512)", async () => {
    process.env.BILLING_ENABLED = "true";
    const a = await newUser();
    const b = await newUser();
    const countFor = async (u: string) => Number((await queryOne<{ n: number }>(`select count(*)::int as n from entitlements where user_id = $1`, [u]))!.n);
    const dry = await runGrant(parseGrantArgs(["--launch-comp"]));
    assert.match(dry.join("\n"), /would comp \d+ account\(s\) with Pro until .* \(90 days\)/);
    assert.match(dry.join("\n"), /dry run, nothing changed/);
    assert.equal(await countFor(a), 0);
    assert.equal(await tierFor(a), "free");

    const before = Date.now();
    await runGrant(parseGrantArgs(["--launch-comp", "--apply"]));
    for (const u of [a, b]) {
      assert.equal(await tierFor(u), "pro");
      const r = await queryOne<{ source: string; period_end: Date; external_id: string }>(`select source, period_end, external_id from entitlements where user_id = $1`, [u]);
      assert.equal(r!.source, "grant");
      const days = (new Date(r!.period_end).getTime() - before) / DAY;
      assert.ok(days > 89.9 && days < 90.1, String(days));
    }
    const c = await newUser();
    // FAIL-512: an account whose database timestamp is ahead of the app's
    // clock (skew, or the same millisecond) was skipped by a created_at filter.
    const skew = await newUser();
    await query(`update app_users set created_at = now() + interval '2 seconds' where id = $1`, [skew]);
    const again = await runGrant(parseGrantArgs(["--launch-comp", "--apply"]));
    assert.equal(await tierFor(skew), "pro", "an account the database dates a moment ahead of the app clock");
    assert.equal(await countFor(a), 1, "idempotent: never a second comp or an extension");
    assert.equal(await tierFor(c), "pro", `an account made since the last run: ${again.join(" / ")}`);
    assert.match(again[0], /comped \d+ account/);
    assert.equal(await revokeGrants(a), 1);
    assert.equal(await tierFor(a), "free");
    // Leave the shared test database as it was for accounts this file doesn't own.
    await query(`delete from entitlements where external_id like 'grant:launch-comp:%'`);
    await query(`delete from billing_events where provider = 'grant' and event_id like 'grant:launch-comp:%'`);
  });
});

describe("web checkout and portal", () => {
  test("409 without the key or the price; with them, a Checkout session with the learner's id in the metadata; a Stripe error is a 409 (REQ-216: a 5xx hides its words)", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await newUser();
    assert.equal((await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "it_cloud_plus_monthly" })).status, 409);
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_not_real";
    process.env.BILLING_WEB_RETURN_URL = "https://app.example.test";
    assert.equal((await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "it_cloud_plus_monthly" })).status, 409, "price not set");
    process.env.STRIPE_PRICE_IT_CLOUD_PLUS_MONTHLY = "price_plus_m";
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
      const ok = await json(await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "it_cloud_plus_monthly", requestId: "req-12345678" }));
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
      assert.equal((await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "it_cloud_plus_monthly" })).status, 409);
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
