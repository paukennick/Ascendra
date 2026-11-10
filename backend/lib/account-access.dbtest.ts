// REQ-144: unrestricted access, against a real Postgres with every migration
// applied (056 included). The model is a fake client; no key, no network,
// and email sends fail closed (no RESEND_API_KEY) without failing anything.
//
//   1. Owner from OWNER_EMAILS (verified addresses only) and /api/auth/me.
//   2. Gating bypass on representative gated routes, BILLING_ENABLED on and
//      off; no allowance rows, no per-tier monthly cap for a grant, the
//      owner's $35 monthly safety cap; disclaimers and rate limits
//      still apply.
//   3. The AI safety ceiling.
//   4. Early access: unreviewed labs with LABS_SERVE_UNREVIEWED off.
//   5. Grants: owner-only routes (an unrestricted user may not grant), a
//      pending grant applied on verification, expiry, revoke, audit rows,
//      the export, and the CLI.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { verifyEmailToken } from "./auth/emailTokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { callCostUsd } from "./ai-pricing";
import { accessFor, featureEnabledFor, isUnrestricted } from "./account-access";
import { CEILING_REACHED_MESSAGE } from "./account-access-config";
import { BUDGET_REACHED_MESSAGE } from "./ai-budget";
import { tierFor } from "./entitlements";
import { listLabs, visibleLab } from "./labs";
import { buildAccountExport } from "./account-export";
import { runAccessCli } from "./access-grant-cli";
import { parseAccessArgs } from "./account-access-config";
import { GET as grantsGet, POST as grantsPost } from "../app/api/access/grants/route";
import { DELETE as grantDelete } from "../app/api/access/grants/[id]/route";
import { GET as authMeGet } from "../app/api/auth/me/route";
import { GET as billingMeGet } from "../app/api/billing/me/route";
import { POST as chatPost } from "../app/api/chat/route";
import { POST as gradePost } from "../app/api/grade/route";
import { GET as lessonGet } from "../app/api/objectives/[id]/lesson/route";
import { POST as explainPost } from "../app/api/objectives/[id]/explain-back/route";
import { POST as labQuestionsPost } from "../app/api/objectives/[id]/lab/questions/route";
import { GET as unitCheckGet } from "../app/api/units/[id]/check/route";
import { POST as quizPost } from "../app/api/coach/quiz/route";
import { GET as pbqGet } from "../app/api/pbq/route";
import { POST as examPost } from "../app/api/exam/sessions/route";
import { GET as courseGet } from "../app/api/courses/[id]/route";

const run = Date.now().toString(36);
const track = randomUUID(), unit = randomUUID(), obj = randomUUID(), scen = randomUUID();
const track2 = randomUUID(), unit2 = randomUUID(), objB = randomUUID();
const ackTrack = randomUUID(), ackUnit = randomUUID(), ackObj = randomUUID();
const lab = randomUUID();
const users: string[] = [];
const ENV = ["BILLING_ENABLED", "OWNER_EMAILS", "AI_DAILY_BUDGET_USD", "AI_UNRESTRICTED_DAILY_CEILING_USD", "LABS_SERVE_UNREVIEWED", "OWNER_MONTHLY_AI_CAP_USD"];
const OWNER = `owner-${run}@example.test`;

const usage = { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
let modelCalls = 0;
const gradeOut = {
  verdict: "correct", feedback: "f", classification: "none", missedParts: [], modelAnswer: "m", fixNext: "n", misconception: "", confusedWith: "",
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
async function newUser(opts: { email?: string; verified?: boolean; name?: string } = {}): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email, display_name, email_verified_at) values ($1, $2, $3, $4)`, [
    u,
    opts.email ?? `acc-${run}-${users.length}@example.test`,
    opts.name ?? null,
    opts.verified === false ? null : new Date(),
  ]);
  return u;
}
const emailOf = async (u: string) => (await queryOne<{ email: string }>(`select email from app_users where id = $1`, [u]))!.email;
let ownerId = "";
async function unrestrictedUser(): Promise<string> {
  const u = await newUser();
  await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: await emailOf(u) }));
  return u;
}
const chat = (u: string, trackId = track) => call(chatPost, "/api/chat", u, "POST", { trackId, message: "What is CTR mode?" });
const gradeOpen = (u: string, answer: string) => call(gradePost, "/api/grade", u, "POST", { format: "open", objectiveId: obj, stage: "fade", answer });
const lesson = (u: string, o = obj) => call(lessonGet, `/api/objectives/${o}/lesson`, u, "GET", undefined, { id: o });
// One model call worth `usd` in the last 24 hours, priced by lib/ai-pricing.ts.
const PER_TOKEN = callCostUsd("claude-haiku-5-5", { inputTokens: 0, outputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, { longContext: false }) / 1_000_000;
const spend = (u: string, usd: number) =>
  query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok) values ($1,'chat','claude-haiku-5-5',0,$2,1,true)`, [u, Math.round(usd / PER_TOKEN)]);

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
        return { parsed_output: body.output_config.format.parse(JSON.stringify(gradeOut)), stop_reason: "end_turn", usage };
      },
    },
  });
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, requires_acknowledgement) values
       ($1,$2,'Access Crypto','certification',null,false), ($3,$4,'Access Networks','certification',null,false),
       ($5,$6,'Access Clinical','certification',null,true)`,
    [track, `ACC-${run}`, track2, `ACC2-${run}`, ackTrack, `ACC3-${run}`]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1,$2,'Ciphers',1), ($3,$4,'Ports',1), ($5,$6,'Care',1)`, [
    unit, track, unit2, track2, ackUnit, ackTrack,
  ]);
  await query(`insert into objectives (id, unit_id, title, sort_order, lab_prompt) values ($1,$2,'Block cipher modes',1,'Try it'), ($3,$4,'Ports',1,null), ($5,$6,'Triage',1,null)`, [
    obj, unit, objB, unit2, ackObj, ackUnit,
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
  await query(
    `insert into labs (id, objective_id, slug, kind, title, brief, steps, rubric, safety_note, source, review_status, content_hash)
     values ($1, $2, $3, 'build', 'Unreviewed lab', 'A fictional brief with enough words to pass.', $4, $5, 'Fictional practice.', 'authored', 'needs_expert_review', 'h')`,
    [lab, obj, `acc-${run}`, JSON.stringify([{ text: "", ask: "Write the access design." }]), JSON.stringify([{ parts: [{ label: "Design", criteria: "c", modelAnswer: "m" }] }])]
  );
  ownerId = await newUser({ email: OWNER, name: "Nick" });
});

after(async () => {
  __setClientForTest(null);
  setAiCallSink(null);
  for (const k of ENV) delete process.env[k];
  await query(`delete from account_access where email like $1`, [`%${run}%`]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from labs where id = $1`, [lab]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, track2, ackTrack]]);
  await closePool();
});

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  process.env.OWNER_EMAILS = `someone-else@example.test, ${OWNER.toUpperCase()}`;
  modelCalls = 0;
});

// ---------------------------------------------------------------------------
// 1. Owner
// ---------------------------------------------------------------------------

describe("owner from OWNER_EMAILS", () => {
  test("a verified account with an owner address is owner (any case); unverified or unlisted is not", async () => {
    assert.equal((await accessFor(ownerId))?.level, "owner");
    const unverified = await newUser({ email: `squat-${run}@example.test`, verified: false });
    process.env.OWNER_EMAILS = `${OWNER},squat-${run}@example.test`;
    assert.equal(await accessFor(unverified), null, "an unverified owner address is an ordinary account");
    delete process.env.OWNER_EMAILS;
    assert.equal(await accessFor(ownerId), null, "no setting, no owner");
  });

  test("/api/auth/me says so; an ordinary learner's access is null", async () => {
    const me = await json(await call(authMeGet, "/api/auth/me", ownerId));
    assert.deepEqual(me.user.access, { level: "owner", grantedBy: null, expiresAt: null });
    const other = await newUser();
    assert.equal((await json(await call(authMeGet, "/api/auth/me", other))).user.access, null);
  });
});

// ---------------------------------------------------------------------------
// 2. Gating
// ---------------------------------------------------------------------------

describe("unrestricted lifts the plan gates", () => {
  test("BILLING_ENABLED on: every representative gated route passes where Free gets 402/429, with no allowance row", async () => {
    process.env.BILLING_ENABLED = "true";
    const free = await newUser();
    const u = await unrestrictedUser();
    assert.equal(await tierFor(u), "pro");
    assert.equal(await tierFor(free), "free");
    assert.equal(await tierFor(ownerId), "pro");

    for (const who of [u, ownerId]) {
      assert.equal((await chat(who)).status, 200, "coach");
      assert.notEqual((await call(explainPost, `/api/objectives/${obj}/explain-back`, who, "POST", { answer: "CTR adds a counter per block so blocks can run in parallel." }, { id: obj })).status, 402, "explain-back");
      assert.equal((await call(pbqGet, `/api/pbq?scenarioId=${scen}`, who)).status, 200, "PBQ (Pro)");
      assert.notEqual((await call(labQuestionsPost, `/api/objectives/${obj}/lab/questions`, who, "POST", {}, { id: obj })).status, 402, "lab questions (Pro)");
      assert.notEqual((await call(quizPost, "/api/coach/quiz", who, "POST", { trackId: track })).status, 402, "Quiz me");
      assert.notEqual((await call(examPost, "/api/exam/sessions", who, "POST", { trackId: track, mode: "mock", timed: true })).status, 402, "mock exam");
      assert.equal((await json(await call(unitCheckGet, `/api/units/${unit}/check`, who, "GET", undefined, { id: unit }))).locked, undefined, "unit check");
      // Every course, not one free course.
      assert.equal((await lesson(who, obj)).status, 200);
      assert.equal((await lesson(who, objB)).status, 200);
      // More graded typed answers than Free's three.
      for (let i = 0; i < 4; i++) assert.equal((await gradeOpen(who, `It adds authentication, take ${i} ${who}.`)).status, 200);
      const course = await json(await call(courseGet, `/api/courses/${track}`, who, "GET", undefined, { id: track }));
      assert.equal(course.readinessLocked, undefined, "readiness");
      // Every lab, not just the sample.
      assert.deepEqual((await listLabs(who, { trackId: track })).map((l) => l.access), ["full"]);
      const n = await queryOne<{ n: number }>(`select count(*)::int as n from allowance_uses where user_id = $1`, [who]);
      assert.equal(n!.n, 0, "nothing counted against an allowance");
      assert.equal(await queryOne(`select 1 from free_course_choice where user_id = $1`, [who]), null, "no free course picked");
    }

    // The same routes for a Free learner, for contrast.
    assert.equal((await chat(free)).status, 402);
    assert.equal((await call(pbqGet, `/api/pbq?scenarioId=${scen}`, free)).status, 402);

    // The plan the app shows.
    const bm = await json(await call(billingMeGet, "/api/billing/me", u));
    assert.equal(bm.tier, "pro");
    assert.deepEqual(bm.unrestricted, { level: "unrestricted", grantedBy: "Nick", expiresAt: null });
    assert.deepEqual(bm.allowances, []);
    assert.equal(bm.entitlement, null);
  });

  test("BILLING_ENABLED on: no per-tier monthly AI cap (Pro's is $2.21)", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await unrestrictedUser();
    await query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok, created_at) values ($1,'chat','claude-haiku-5-5',0,$2,1,true, now() - interval '3 days')`, [u, Math.round(5 / PER_TOKEN)]); // $5 this month, outside 24h
    assert.equal((await chat(u)).status, 200);
  });

  // Nick, 2026-11-09: owners get a $35 monthly safety cap. Coach chat and
  // regenerate pause at it like a plan's cap; grading never stops. It applies
  // with the billing switch on or off. A granted account (above) has none.
  for (const billing of ["true", "off"]) {
    test(`owner monthly AI safety cap ($35), BILLING_ENABLED ${billing}`, async () => {
      process.env.BILLING_ENABLED = billing;
      process.env.AI_UNRESTRICTED_DAILY_CEILING_USD = "1000"; // keep the daily ceiling out of the way
      const email = `owner2-${billing}-${run}@example.test`;
      process.env.OWNER_EMAILS = `${OWNER}, ${email}`;
      const o = await newUser({ email });
      assert.equal((await accessFor(o))?.level, "owner");
      // $34 this month, written at the start of the month (UTC): under the cap.
      const monthSpend = (usd: number) =>
        query(
          `insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok, created_at)
           values ($1,'chat','claude-haiku-5-5',0,$2,1,true, date_trunc('month', now() at time zone 'utc') at time zone 'utc')`,
          [o, Math.round(usd / PER_TOKEN)]
        );
      await monthSpend(34);
      assert.equal((await chat(o)).status, 200, "under $35 the coach answers");
      await monthSpend(1.5);
      const res = await json(await chat(o), 429);
      assert.ok(res.aiPaused?.resetsAt, "paused like a plan's monthly cap");
      assert.equal(new Date(res.aiPaused.resetsAt).getUTCDate(), 1);
      assert.match(res.error, /You've used this month's AI coaching/);
      assert.equal((await gradeOpen(o, "CTR turns a block cipher into a stream cipher with a counter.")).status, 200, "grading never stops");
      if (billing === "true") assert.equal((await json(await call(billingMeGet, "/api/billing/me", o))).aiPaused.paused, true);
      process.env.OWNER_MONTHLY_AI_CAP_USD = "50";
      assert.equal((await chat(o)).status, 200, "the cap is a setting");
    });
  }

  test("BILLING_ENABLED off: the $0.50 daily budget is raised for unrestricted, not for others", async () => {
    const free = await newUser();
    const u = await unrestrictedUser();
    for (const who of [free, u, ownerId]) await spend(who, 1);
    assert.equal((await json(await chat(free), 429)).error, BUDGET_REACHED_MESSAGE);
    assert.equal((await chat(u)).status, 200);
    assert.equal((await chat(ownerId)).status, 200);
  });

  test("not lifted: the course disclaimer acknowledgement and the chat rate limit", async () => {
    const u = await unrestrictedUser();
    assert.equal((await chat(u, ackTrack)).status, 403, "acknowledgement still required");
    await query(
      `insert into auth_events (event_type, identifier, user_id) select 'chat_message', $1, $2::uuid from generate_series(1, 30)`,
      [u, u]
    );
    assert.equal((await chat(u)).status, 429, "30 messages in 10 minutes is still the limit");
    assert.equal(modelCalls, 0);
  });

  test("not lifted: another learner's private course stays invisible", async () => {
    const other = await newUser();
    const privateTrack = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Mine', 'certification', $3)`, [privateTrack, `ACCP-${run}`, other]);
    const u = await unrestrictedUser();
    assert.equal((await chat(u, privateTrack)).status, 404);
    assert.equal((await chat(ownerId, privateTrack)).status, 404, "owner is not admin over other learners' data");
    await query(`delete from subject_tracks where id = $1`, [privateTrack]);
  });
});

// ---------------------------------------------------------------------------
// 3. The AI safety ceiling
// ---------------------------------------------------------------------------

describe("the AI safety ceiling", () => {
  test("at $20 in 24 hours the coach pauses with its own message, recorded once a day", async () => {
    const u = await unrestrictedUser();
    await spend(u, 19);
    assert.equal((await chat(u)).status, 200, "under the ceiling");
    await spend(u, 1.5);
    const r = await json(await chat(u), 429);
    assert.equal(r.error, CEILING_REACHED_MESSAGE);
    assert.equal((await chat(u)).status, 429);
    const ev = await query<{ detail: any; via: string }>(`select detail, via from account_access_events where user_id = $1 and action = 'ceiling_reached'`, [u]);
    assert.equal(ev.length, 1, "recorded (and the owners emailed) once, not per request");
    assert.equal(ev[0].via, "system");
    assert.equal(ev[0].detail.ceilingUsd, 20);
  });

  test("configurable, and applies even when the everyday budget is switched off", async () => {
    process.env.AI_UNRESTRICTED_DAILY_CEILING_USD = "2";
    process.env.AI_DAILY_BUDGET_USD = "off";
    const free = await newUser();
    const u = await unrestrictedUser();
    for (const who of [free, u]) await spend(who, 3);
    assert.equal((await chat(free)).status, 200, "budget off for ordinary learners");
    assert.equal((await json(await chat(u), 429)).error, CEILING_REACHED_MESSAGE);
  });
});

// ---------------------------------------------------------------------------
// 4. Early access
// ---------------------------------------------------------------------------

describe("early access", () => {
  test("LABS_SERVE_UNREVIEWED off: an unreviewed lab is served only to owner and unrestricted accounts", async () => {
    process.env.LABS_SERVE_UNREVIEWED = "off";
    const free = await newUser();
    const u = await unrestrictedUser();
    assert.equal(await visibleLab(lab, free), null);
    assert.deepEqual(await listLabs(free, { trackId: track }), []);
    for (const who of [u, ownerId]) {
      assert.equal((await visibleLab(lab, who))?.id, lab);
      assert.equal((await listLabs(who, { trackId: track })).length, 1);
      assert.equal(await featureEnabledFor(who, "labs_unreviewed"), true);
    }
    assert.equal(await featureEnabledFor(free, "labs_unreviewed"), false);
    delete process.env.LABS_SERVE_UNREVIEWED;
    assert.equal((await visibleLab(lab, free))?.id, lab, "switch on: everyone");
  });
});

// ---------------------------------------------------------------------------
// 5. Grants
// ---------------------------------------------------------------------------

describe("granting (owner only)", () => {
  test("an unrestricted user and an ordinary learner get 403 on every Access route; nothing changes", async () => {
    const u = await unrestrictedUser();
    const plain = await newUser();
    const target = `target-${run}@example.test`;
    for (const who of [u, plain]) {
      assert.equal((await call(grantsGet, "/api/access/grants", who)).status, 403);
      assert.equal((await call(grantsPost, "/api/access/grants", who, "POST", { email: target })).status, 403);
    }
    const g = await queryOne<{ id: string }>(`select id from account_access where email = $1`, [await emailOf(u)]);
    assert.equal((await call(grantDelete, `/api/access/grants/${g!.id}`, u, "DELETE", undefined, { id: g!.id })).status, 403);
    assert.equal(await queryOne(`select 1 from account_access where email = $1`, [target]), null);
    assert.equal(await isUnrestricted(u), true, "its own grant untouched");
  });

  test("owners can't be granted or removed; bad input is a 400", async () => {
    assert.equal((await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: OWNER })).status, 409);
    assert.equal((await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: "nope" })).status, 400);
    assert.equal((await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: `x-${run}@example.test`, until: "2020-01-01" })).status, 400);
    assert.equal((await call(grantDelete, "/api/access/grants/not-a-uuid", ownerId, "DELETE", undefined, { id: "not-a-uuid" })).status, 404);
    const list = await json(await call(grantsGet, "/api/access/grants", ownerId));
    assert.ok(list.owners.some((o: any) => o.email === OWNER && o.hasAccount));
    assert.ok(!list.grants.some((g: any) => g.email === OWNER));
  });

  test("a grant to an address with no account waits, and applies when that address registers AND verifies", async () => {
    const email = `later-${run}@example.test`;
    const g = (await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: email.toUpperCase(), until: "2099-12-31", note: "beta tester" }))).grant;
    assert.equal(g.email, email);
    assert.equal(g.status, "waiting");
    assert.equal(g.expiresAt, "2099-12-31T23:59:59.999Z");

    // Registers: not verified yet, so nothing applies.
    const u = await newUser({ email, verified: false });
    assert.equal(await isUnrestricted(u), false);
    // Verifies through the real link.
    const raw = randomBytes(32).toString("base64url");
    await query(`insert into email_verification_tokens (user_id, token_hash, expires_at) values ($1, $2, now() + interval '1 hour')`, [
      u, createHash("sha256").update(raw).digest("hex"),
    ]);
    assert.equal((await verifyEmailToken(raw)).ok, true);
    const a = await accessFor(u);
    assert.equal(a?.level, "unrestricted");
    assert.equal(a?.grant?.grantedByName, "Nick");
    const row = await queryOne<{ user_id: string; claimed_at: Date | null }>(`select user_id, claimed_at from account_access where id = $1`, [g.id]);
    assert.equal(row!.user_id, u, "bound to the account for good");
    assert.ok(row!.claimed_at);
    const events = await query<{ action: string; user_id: string; actor_id: string | null; via: string }>(
      `select action, user_id, actor_id, via from account_access_events where access_id = $1 order by id`, [g.id]
    );
    assert.deepEqual(events.map((e) => [e.action, e.user_id, e.via]), [["grant", u, "app"], ["claim", u, "system"]]);
    assert.equal(events[0].actor_id, ownerId);

    // The learner sees it as their plan, named by the giver.
    assert.deepEqual((await json(await call(authMeGet, "/api/auth/me", u))).user.access, {
      level: "unrestricted", grantedBy: "Nick", expiresAt: "2099-12-31T23:59:59.999Z",
    });
    // A later email change does not take it away.
    await query(`update app_users set email = $2 where id = $1`, [u, `moved-${run}@example.test`]);
    assert.equal(await isUnrestricted(u), true);
  });

  test("a grant to a verified account binds at once; it ends at its end date; granting again renews it", async () => {
    const u = await newUser();
    const g = (await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: await emailOf(u), until: "2099-01-01" }))).grant;
    assert.equal(g.status, "active");
    await query(`update account_access set expires_at = now() - interval '1 minute' where id = $1`, [g.id]);
    assert.equal(await isUnrestricted(u), false, "ended");
    const list = await json(await call(grantsGet, "/api/access/grants", ownerId));
    assert.equal(list.grants.find((x: any) => x.id === g.id).status, "ended");
    const again = (await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: await emailOf(u) }))).grant;
    assert.equal(again.id, g.id, "one live grant per address, renewed");
    assert.equal(again.expiresAt, null);
    assert.equal(await isUnrestricted(u), true);
    const actions = await query<{ action: string }>(`select action from account_access_events where access_id = $1 order by id`, [g.id]);
    assert.deepEqual(actions.map((a) => a.action), ["grant", "change"]);
  });

  test("revoke ends it at once, is audited, and the export of the affected learner holds the grant and its trail", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await unrestrictedUser();
    const g = await queryOne<{ id: string }>(`select id from account_access where user_id = $1`, [u]);
    assert.equal((await chat(u)).status, 200);
    const r = await json(await call(grantDelete, `/api/access/grants/${g!.id}`, ownerId, "DELETE", undefined, { id: g!.id }));
    assert.equal(r.revoked.id, g!.id);
    assert.equal(await isUnrestricted(u), false);
    assert.equal((await chat(u)).status, 402, "back to Free");
    assert.equal((await call(grantDelete, `/api/access/grants/${g!.id}`, ownerId, "DELETE", undefined, { id: g!.id })).status, 404, "already revoked");
    const list = await json(await call(grantsGet, "/api/access/grants", ownerId));
    assert.ok(!list.grants.some((x: any) => x.id === g!.id));
    assert.ok(list.history.some((h: any) => h.action === "revoke" && h.by === "Nick"));

    const data = (await buildAccountExport(u, (sql, p) => query(sql, p))) as any;
    assert.equal(data.accessGrants.length, 1);
    assert.equal(data.accessGrants[0].granted_by, "Nick");
    assert.ok(data.accessGrants[0].revoked_at);
    assert.deepEqual(data.accessEvents.map((e: any) => [e.action, e.by]), [["grant", "Nick"], ["revoke", "Nick"]]);
    // Nothing of the owner's own email in someone else's export.
    assert.ok(!JSON.stringify(data.accessGrants).includes(OWNER));
    assert.ok(!JSON.stringify(data.accessEvents).includes(OWNER));
  });

  test("access changes are rate-limited for owners too", async () => {
    const before = await queryOne<{ n: number }>(`select count(*)::int as n from auth_events where event_type = 'access_change' and identifier = $1`, [ownerId]);
    await query(
      `insert into auth_events (event_type, identifier, user_id) select 'access_change', $1, $2::uuid from generate_series(1, $3::int)`,
      [ownerId, ownerId, Math.max(0, 30 - before!.n)]
    );
    assert.equal((await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: `limited-${run}@example.test` })).status, 429);
    await query(`delete from auth_events where event_type = 'access_change' and identifier = $1`, [ownerId]);
  });

  test("deleting the learner's account removes their grant and its trail", async () => {
    const u = await unrestrictedUser();
    await query(`delete from app_users where id = $1`, [u]);
    assert.equal(await queryOne(`select 1 from account_access where user_id = $1`, [u]), null);
    assert.equal(await queryOne(`select 1 from account_access_events where user_id = $1`, [u]), null);
  });

  test("CLI: grant, list and revoke, recorded as via cli", async () => {
    const email = `cli-${run}@example.test`;
    const out = await runAccessCli(parseAccessArgs(["--email", email, "--until", "2099-06-30", "--note", "emergency"]));
    assert.match(out[0], /waiting/);
    const listed = await runAccessCli(parseAccessArgs(["--list"]));
    assert.match(listed[0], new RegExp(`owners \\(OWNER_EMAILS\\): .*${OWNER}`));
    assert.ok(listed.some((l) => l.includes(email) && l.includes("command line") && l.includes("emergency")));
    const u = await newUser({ email });
    assert.equal(await isUnrestricted(u), true, "applies to a verified account with the address");
    assert.match((await runAccessCli(parseAccessArgs(["--email", email, "--revoke"])))[0], /revoked/);
    assert.equal(await isUnrestricted(u), false);
    assert.match((await runAccessCli(parseAccessArgs(["--email", email, "--revoke"])))[0], /nothing changed/);
    const ev = await query<{ action: string; via: string; actor_id: string | null }>(`select action, via, actor_id from account_access_events where email = $1 order by id`, [email]);
    assert.deepEqual(ev.map((e) => [e.action, e.via, e.actor_id]), [["grant", "cli", null], ["claim", "system", null], ["revoke", "cli", null]]);
    await assert.rejects(runAccessCli(parseAccessArgs(["--email", OWNER])), /owner already/);
  });
});
