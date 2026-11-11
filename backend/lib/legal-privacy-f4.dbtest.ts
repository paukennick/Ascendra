// REQ-205 (FAIL-900..919): the legal and privacy batch against a real
// Postgres with every migration applied (070 included): deletion leaves no
// note anywhere, export scoping and the avatar, the study notice on every
// route that sends learner text to the model, the 16+ confirmation on both
// sign-up paths, the AI-count purge, the inbound support mail, and the
// inventory covering every per-learner table. No model is called.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-f4";
process.env.RESEND_API_KEY ??= "re_fake";
process.env.APP_BASE_URL ??= "http://t";
process.env.SIMS_ENABLED = "1";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setGoogleVerifierForTest } from "./auth/oauth";
import { buildAccountExport } from "./account-export";
import { purgeExpired, RETENTION } from "./retention";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { visibleLab } from "./labs";
import { DELETE as deleteAccount } from "../app/api/account/route";
import { POST as register } from "../app/api/auth/register/route";
import { POST as google } from "../app/api/auth/oauth/google/route";
import { POST as chatPost } from "../app/api/chat/route";
import { POST as gradePost } from "../app/api/grade/route";
import { POST as pbqPost } from "../app/api/pbq/route";
import { POST as guessPost } from "../app/api/objectives/[id]/guess-feedback/route";
import { POST as explainPost } from "../app/api/objectives/[id]/explain-back/route";
import { POST as labReportPost } from "../app/api/objectives/[id]/lab/report/route";
import { POST as labSubmitPost } from "../app/api/labs/[id]/submit/route";
import { POST as reviewAnswerPost } from "../app/api/review/sessions/[id]/items/[position]/answer/route";
import { POST as unitCheckPost } from "../app/api/units/[id]/check/route";
import { POST as simReasoningPost } from "../app/api/sims/runs/[runId]/reasoning/route";
import { POST as inboundPost } from "../app/api/inbound/email/route";

const run = Date.now().toString(36);
const realFetch = globalThis.fetch;
globalThis.fetch = (async () =>
  new Response(JSON.stringify({ id: "x" }), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
const testPw = (s: string) => s;
const users: string[] = [];
const emails: string[] = [];

async function newUser(tag: string): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const email = `f4-${tag}-${run}@example.test`;
  users.push(id);
  emails.push(email);
  await query(`insert into app_users (id, email) values ($1, $2)`, [id, email]);
  return { id, email };
}
const bearer = (u: { id: string; email: string }) => ({ authorization: `Bearer ${signAccessToken({ sub: u.id, email: u.email })}` });
function req(u: { id: string; email: string } | null, method: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://t/x", {
    method,
    headers: { "content-type": "application/json", ...(u ? bearer(u) : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });

after(async () => {
  __setGoogleVerifierForTest(null);
  globalThis.fetch = realFetch;
  await query(`delete from app_users where id = any($1::uuid[]) or email = any($2::text[])`, [users, emails]);
  await query(`delete from auth_events where identifier = any($1::text[])`, [emails]);
  await closePool();
});

describe("account deletion leaves no note anywhere, and AI counts are purged at 12 months (FAIL-900, FAIL-911)", () => {
  test("report notes, their copies in the review queue and support bodies are gone; unrelated data stays", async () => {
    const u = await newUser("del");
    const v = await newUser("other");
    const mine = `NOTE-${run}-the-answer-key-is-wrong-for-c`;
    const mineSupport = `LESSONBODY-${run}-this-step-contradicts-itself`;
    const theirs = `THEIRS-${run}-different-learner-note`;
    const item = `f4-${run}`;
    await query(
      `insert into item_flags (item_kind, item_id, question, user_id, source, reason, note) values
         ('quiz', $1, 'Which port?', $2, 'learner', 'wrong_answer', $3),
         ('quiz', $1, 'Which port?', $4, 'learner', 'unclear', $5)`,
      [item, u.id, mine, v.id, theirs]
    );
    const obj = await queryOne<{ id: string }>(`select id from objectives limit 1`);
    assert.ok(obj, "the seed has objectives");
    await query(
      `insert into support_requests (user_id, kind, subject, body, objective_id, lesson_stage) values ($1, 'content_report', 'lesson', $2, $3, 'fade')`,
      [u.id, mineSupport, obj!.id]
    );
    const queued = await queryOne<{ id: string }>(
      `insert into content_review_queue (item_kind, item_id, label, signal, evidence)
       values ('quiz', $1, 'Which port?', 'learner_reports', $2) returning id`,
      [item, JSON.stringify({ reporters: 2, recentNotes: [mine, theirs, mineSupport.slice(0, 200)], window: { days: 14 } })]
    );
    const untouched = await queryOne<{ id: string }>(
      `insert into content_review_queue (item_kind, item_id, label, signal, evidence)
       values ('quiz', $1, 'Other', 'learner_reports', $2) returning id`,
      [`${item}-b`, JSON.stringify({ recentNotes: ["a note from nobody we deleted"] })]
    );
    const noNotes = await queryOne<{ id: string }>(
      `insert into content_review_queue (item_kind, item_id, label, signal, evidence)
       values ('quiz', $1, 'Rate', 'correct_rate_drop', $2) returning id`,
      [`${item}-c`, JSON.stringify({ baseline: 0.9 })]
    );
    await query(`insert into auth_events (event_type, identifier, user_id, ip) values ('login_success', $1, $2, '9.9.9.9')`, [u.email, u.id]);
    await query(`insert into ai_calls (user_id, purpose, model, latency_ms, ok) values ($1, 'chat', 'm', 5, true)`, [u.id]);
    await query(`insert into ai_calls (user_id, purpose, model, latency_ms, ok, created_at) values ($1, 'chat', 'm', 5, true, now() - interval '13 months')`, [u.id]);

    const res = await deleteAccount(req(u, "DELETE"));
    assert.equal(res.status, 200, await res.clone().text());

    // The report stays (unlinked) with its note erased; the other learner's is untouched.
    const flags = await query<{ user_id: string | null; note: string | null }>(`select user_id, note from item_flags where item_id = $1 order by note nulls first`, [item]);
    assert.equal(flags.length, 2);
    assert.deepEqual(flags.map((f) => [f.user_id, f.note]).sort(), [[null, null], [v.id, theirs]].sort());
    const ev = async (id: string) => (await queryOne<{ evidence: { recentNotes?: string[] } }>(`select evidence from content_review_queue where id = $1`, [id]))!.evidence;
    assert.deepEqual((await ev(queued!.id)).recentNotes, [theirs]);
    assert.equal((await ev(queued!.id) as any).reporters, 2, "the rest of the evidence is kept");
    assert.deepEqual((await ev(untouched!.id)).recentNotes, ["a note from nobody we deleted"]);
    assert.deepEqual(await ev(noNotes!.id), { baseline: 0.9 });

    // Nothing, in any text or json column of any table, still holds the learner's words or address.
    const cols = await query<{ table_name: string; column_name: string }>(
      `select c.table_name, c.column_name from information_schema.columns c
         join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
        where c.table_schema = 'public' and c.data_type in ('text', 'character varying', 'jsonb', 'json', 'ARRAY')`
    );
    for (const needle of [mine, mineSupport, u.email]) {
      for (const c of cols) {
        const n = await queryOne<{ n: number }>(`select count(*)::int as n from "${c.table_name}" where "${c.column_name}"::text like $1`, [`%${needle}%`]);
        assert.equal(n!.n, 0, `${c.table_name}.${c.column_name} still holds ${needle.slice(0, 12)}`);
      }
    }
    assert.equal((await query(`select 1 from auth_events where user_id = $1 or identifier = $2`, [u.id, u.email])).length, 0);

    // The AI counts stay, unlinked, until 12 months; then the purge removes the old one only.
    assert.equal(RETENTION.aiCallsMonths, 12);
    const before = await query<{ old: boolean }>(`select created_at < now() - interval '12 months' as old from ai_calls where user_id is null and purpose = 'chat' and model = 'm' and latency_ms = 5`);
    assert.ok(before.some((r) => r.old) && before.some((r) => !r.old), "one recent and one 13-month-old row survive deletion");
    const purged = await purgeExpired();
    assert.ok(purged.ai_calls >= 1);
    const after = await query<{ old: boolean }>(`select created_at < now() - interval '12 months' as old from ai_calls where user_id is null and purpose = 'chat' and model = 'm' and latency_ms = 5`);
    assert.ok(after.length >= 1 && after.every((r) => !r.old), "the old row is purged, the recent one kept");
  });
});

describe("account export scoping and the avatar (FAIL-904, FAIL-905)", () => {
  test("sign-in events by address only since the account was created; the avatar is in the profile", async () => {
    const a = await newUser("exp");
    const b = await newUser("exp-b");
    await query(`update app_users set created_at = now() - interval '1 hour' where id = $1`, [a.id]);
    const ins = (type: string, ident: string, uid: string | null, age: string) =>
      query(`insert into auth_events (event_type, identifier, user_id, ip, created_at) values ($1, $2, $3, '1.2.3.4', now() - $4::interval)`, [type, ident, uid, age]);
    await ins("login_failure", a.email, null, "2 hours"); // an earlier holder of the address
    await ins("login_failure", a.email, null, "30 minutes"); // before sign-in, since creation
    await ins("login_success", a.email, a.id, "10 minutes"); // by user id
    await ins("login_success", b.email, b.id, "10 minutes"); // someone else
    await ins("login_failure", b.email, null, "10 minutes"); // someone else's address
    const photo = Buffer.alloc(600, 7);
    await query(`update app_users set avatar_image = $2, avatar_content_type = 'image/jpeg', age_confirmed_at = now(), age_confirmed_min = 16 where id = $1`, [a.id, photo]);

    const out = (await buildAccountExport(a.id, (sql, p) => query(sql, p))) as any;
    assert.deepEqual(
      out.signInEvents.map((e: any) => e.event_type).sort(),
      ["login_failure", "login_success"],
      "two events: the one by address since creation and the one by user id"
    );
    assert.ok(out.signInEvents.every((e: any) => Date.now() - new Date(e.created_at).getTime() < 61 * 60 * 1000));
    assert.equal(out.profile.avatar_data_url, `data:image/jpeg;base64,${photo.toString("base64")}`);
    assert.doesNotMatch(out.profile.avatar_data_url, /\s/);
    assert.ok(out.profile.age_confirmed_at);
    assert.equal(out.profile.age_confirmed_min, 16);
    const none = (await buildAccountExport(b.id, (sql, p) => query(sql, p))) as any;
    assert.equal(none.profile.avatar_data_url, null);
  });
});

describe("the study notice on every route that sends learner text (FAIL-907)", () => {
  const uuid = () => randomUUID();
  type Case = { name: string; handler: (r: Request, c?: any) => Promise<Response>; body: () => unknown; params: () => Record<string, string> };
  let labId = "";
  const cases: Case[] = [
    { name: "chat", handler: chatPost, body: () => ({ trackId: uuid(), message: "hello" }), params: () => ({}) },
    { name: "grade (written answer)", handler: gradePost, body: () => ({ format: "open", objectiveId: uuid(), stage: "solo", answer: "my words" }), params: () => ({}) },
    { name: "pbq", handler: pbqPost, body: () => ({ scenarioId: uuid(), answer: "my plan" }), params: () => ({}) },
    { name: "guess-feedback", handler: guessPost, body: () => ({ guess: "a guess" }), params: () => ({ id: uuid() }) },
    { name: "explain-back", handler: explainPost, body: () => ({ explanation: "in my words" }), params: () => ({ id: uuid() }) },
    { name: "lab report", handler: labReportPost, body: () => ({ report: "what I did" }), params: () => ({ id: uuid() }) },
    { name: "lab submit", handler: labSubmitPost, body: () => ({ runId: uuid(), step: 0, answers: ["x"] }), params: () => ({ id: labId }) },
    { name: "review answer (written)", handler: reviewAnswerPost, body: () => ({ format: "open", answer: "typed" }), params: () => ({ id: uuid(), position: "0" }) },
    { name: "unit check", handler: unitCheckPost, body: () => ({ checkId: uuid(), answer: "typed" }), params: () => ({ id: uuid() }) },
    { name: "sim reasoning", handler: simReasoningPost, body: () => ({ momentId: "m1", openedSeq: 0, openedTick: 0, answer: "because" }), params: () => ({ runId: uuid() }) },
  ];
  test("a learner who has not accepted the notice gets 403 study_notice_required before anything is sent", async () => {
    const u0 = await newUser("notice-lab");
    // An ungated track: a lab on nursing, PT or fitness meets requireAcknowledgementForObjective
    // first (same words, no `code`), and which course a random-UUID-first lab belongs to made
    // this test fail about one run in six (FAIL-969).
    const all = await query<{ id: string }>(
      `select l.id from labs l join objectives o on o.id = l.objective_id join course_units cu on cu.id = o.unit_id
         join subject_tracks st on st.id = cu.track_id where not st.requires_acknowledgement order by l.id limit 200`
    );
    for (const l of all) if (await visibleLab(l.id, u0.id)) { labId = l.id; break; }
    assert.ok(labId, "the seed has a lab a learner can see");
    const u = await newUser("notice");
    for (const c of cases) {
      const res = await c.handler(req(u, "POST", c.body()), ctx(c.params()));
      const body = await res.json();
      assert.equal(res.status, 403, `${c.name}: ${JSON.stringify(body)}`);
      assert.equal(body.code, "study_notice_required", c.name);
    }
    assert.equal((await query(`select 1 from ai_calls where user_id = $1`, [u.id])).length, 0);
  });
  test("once it is accepted the same requests pass the notice (and stop at their own checks)", async () => {
    const u = await newUser("notice-ok");
    await recordStudyNoticeAcceptance(u.id);
    for (const c of cases) {
      const res = await c.handler(req(u, "POST", c.body()), ctx(c.params()));
      assert.notEqual(res.status, 403, `${c.name}: ${await res.clone().text()}`);
      assert.ok(res.status < 500, `${c.name}: ${res.status}`);
    }
  });
  test("a multiple-choice answer, which sends no text, is not held up by the notice", async () => {
    const u = await newUser("notice-mc");
    const g = await gradePost(req(u, "POST", { format: "mc", objectiveId: uuid(), stage: "solo", chosenIndex: 0 }));
    assert.notEqual(g.status, 403);
    const r = await reviewAnswerPost(req(u, "POST", { format: "mc", chosenIndex: 0 }), ctx({ id: uuid(), position: "0" }) as { params: Promise<{ id: string; position: string }> });
    assert.notEqual(r.status, 403);
  });
});

describe("16 or older at sign-up (FAIL-906)", () => {
  const post = (handler: Function, body: unknown, ip: string) =>
    handler(
      new Request("http://t/x", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) }),
      ctx()
    ) as Promise<Response>;
  let ipSeq = 0;
  const ip = () => `10.77.${Math.floor(Math.random() * 200)}.${(++ipSeq % 250) + 1}`;
  const ageRow = (email: string) => queryOne<{ age_confirmed_at: Date | null; age_confirmed_min: number | null }>(`select age_confirmed_at, age_confirmed_min from app_users where email = $1`, [email]);

  test("email sign-up: refused without the confirmation, nothing created; recorded with it", async () => {
    const email = `f4-age-${run}@example.test`;
    emails.push(email);
    for (const bad of [undefined, false, "true", 1, null]) {
      const r = await post(register, { email, password: testPw("long-enough-pw"), ageConfirmed: bad }, ip());
      assert.equal(r.status, 400, String(bad));
      assert.equal((await r.json()).code, "age_confirmation_required");
    }
    assert.equal(await ageRow(email), null, "no account was created");
    const ok = await post(register, { email, password: testPw("long-enough-pw"), ageConfirmed: true }, ip());
    assert.equal(ok.status, 201);
    const row = await ageRow(email);
    assert.ok(row?.age_confirmed_at);
    assert.equal(row?.age_confirmed_min, 16);
  });
  test("an address that already has an account gets the same refusal, so nothing is revealed", async () => {
    const existing = await newUser("age-exists");
    const r = await post(register, { email: existing.email, password: testPw("long-enough-pw") }, ip());
    assert.equal(r.status, 400);
    assert.equal((await r.json()).code, "age_confirmation_required");
    const fresh = await post(register, { email: `f4-age-fresh-${run}@example.test`, password: testPw("long-enough-pw") }, ip());
    assert.equal(fresh.status, 400);
    emails.push(`f4-age-fresh-${run}@example.test`);
  });
  test("first-time Google sign-up: 400 and nothing created without it; created and recorded with it", async () => {
    const email = `f4-gage-${run}@example.test`;
    emails.push(email);
    __setGoogleVerifierForTest(async () => ({ providerAccountId: `f4-${run}`, email, emailVerified: true, name: null, issuedAt: Math.floor(Date.now() / 1000) }));
    const no = await post(google, { idToken: "stub" }, ip());
    assert.equal(no.status, 400);
    assert.equal((await no.json()).code, "age_confirmation_required");
    assert.equal(await ageRow(email), null);
    assert.equal((await query(`select 1 from oauth_accounts where provider_account_id = $1`, [`f4-${run}`])).length, 0);
    const yes = await post(google, { idToken: "stub", ageConfirmed: true }, ip());
    assert.equal(yes.status, 200, await yes.clone().text());
    const row = await ageRow(email);
    assert.ok(row?.age_confirmed_at);
    assert.equal(row?.age_confirmed_min, 16);
  });
  test("signing in with Google to an existing account never asks, and records nothing", async () => {
    const existing = await newUser("age-g-exists");
    await query(`update app_users set email_verified_at = now() where id = $1`, [existing.id]);
    __setGoogleVerifierForTest(async () => ({ providerAccountId: `f4e-${run}`, email: existing.email, emailVerified: true, name: null, issuedAt: Math.floor(Date.now() / 1000) }));
    const r = await post(google, { idToken: "stub" }, ip());
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal((await ageRow(existing.email))?.age_confirmed_at, null);
  });
});

describe("the support inbox route (FAIL-910)", () => {
  const SECRET_BYTES = Buffer.from("fedcba9876543210fedcba9876543210");
  const SECRET = `whsec_${SECRET_BYTES.toString("base64")}`;
  const EMAIL_ID = "56761188-7520-42d8-8898-ff6fc54ce618";
  const eventBody = (type = "email.received") => JSON.stringify({ type, data: { email_id: EMAIL_ID } });
  const signed = (body: string, id = `msg_${randomUUID()}`) => {
    const ts = Math.floor(Date.now() / 1000);
    return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${createHmac("sha256", SECRET_BYTES).update(`${id}.${ts}.${body}`).digest("base64")}` };
  };
  const call = (body: string, headers: Record<string, string>) =>
    inboundPost(new Request("http://t/api/inbound/email", { method: "POST", headers, body }));
  const SECRET_TEXT = `PRIVATE-${run}-message-body-text`;
  const saved = { ...process.env };
  const setEnv = () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    process.env.RESEND_API_KEY = "re_test";
    process.env.SUPPORT_FORWARD_TO = "owner@example.test";
  };
  const restore = () => {
    for (const k of ["RESEND_WEBHOOK_SECRET", "RESEND_API_KEY", "SUPPORT_FORWARD_TO"]) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  };
  function fakeResend(getStatus = 200, sendStatus = 200) {
    const calls: { url: string; method: string; body?: string }[] = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), method: String(init?.method), body: init?.body as string | undefined });
      if (init?.method === "GET")
        return new Response(JSON.stringify({ from: "Learner <l@example.test>", to: ["support@ascendra-learn.com"], subject: "Hi", text: SECRET_TEXT, headers: {} }), { status: getStatus });
      return new Response(JSON.stringify({ id: "sent" }), { status: sendStatus });
    }) as unknown as typeof fetch;
    return calls;
  }
  const clearLimit = () => query(`delete from auth_events where event_type = 'inbound_email'`);

  test("a signed email.received is fetched through Resend's API and forwarded to SUPPORT_FORWARD_TO", async () => {
    setEnv();
    await clearLimit();
    const calls = fakeResend();
    try {
      const body = eventBody();
      const res = await call(body, signed(body));
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { forwarded: true });
      assert.equal(calls.length, 2);
      assert.equal(calls[0].url, `https://api.resend.com/emails/receiving/${EMAIL_ID}`);
      const sent = JSON.parse(calls[1].body!);
      assert.deepEqual(sent.to, ["owner@example.test"]);
      assert.deepEqual(sent.reply_to, ["l@example.test"]);
      assert.match(sent.text, new RegExp(SECRET_TEXT));
      assert.equal("html" in sent, false);
    } finally {
      globalThis.fetch = realFetch;
      restore();
    }
  });
  test("an unsigned, wrongly signed or replayed-late request sends nothing and touches no budget", async () => {
    setEnv();
    await clearLimit();
    const calls = fakeResend();
    try {
      const body = eventBody();
      assert.equal((await call(body, {})).status, 401);
      assert.equal((await call(body, { ...signed(body), "svix-signature": "v1,AAAA" })).status, 401);
      assert.equal((await call(body + " ", signed(body))).status, 401, "body changed after signing");
      const stale = signed(body);
      assert.equal((await call(body, { ...stale, "svix-timestamp": String(Math.floor(Date.now() / 1000) - 3600) })).status, 401);
      assert.equal(calls.length, 0);
      assert.equal((await query(`select 1 from auth_events where event_type = 'inbound_email'`)).length, 0);
    } finally {
      globalThis.fetch = realFetch;
      restore();
    }
  });
  test("other event types are acknowledged and ignored", async () => {
    setEnv();
    const calls = fakeResend();
    try {
      const body = eventBody("email.delivered");
      const res = await call(body, signed(body));
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ignored: true });
      assert.equal(calls.length, 0);
    } finally {
      globalThis.fetch = realFetch;
      restore();
    }
  });
  test("rate limited: the 121st verified message in an hour is a 429 and sends nothing", async () => {
    setEnv();
    await clearLimit();
    await query(`insert into auth_events (event_type, identifier) select 'inbound_email', 'resend' from generate_series(1, 120)`);
    const calls = fakeResend();
    try {
      const body = eventBody();
      assert.equal((await call(body, signed(body))).status, 429);
      assert.equal(calls.length, 0);
    } finally {
      globalThis.fetch = realFetch;
      restore();
      await clearLimit();
    }
  });
  test("a failed fetch answers 502 (Resend retries) and the message text is never logged", async () => {
    setEnv();
    await clearLimit();
    const logged: string[] = [];
    const realError = console.error;
    const realLog = console.log;
    const realWarn = console.warn;
    console.error = (...a: unknown[]) => void logged.push(a.map(String).join(" "));
    console.log = console.error;
    console.warn = console.error;
    const calls = fakeResend(500);
    try {
      const body = eventBody();
      assert.equal((await call(body, signed(body))).status, 502);
      assert.equal(calls.length, 1, "no send after a failed fetch");
      assert.ok(logged.some((l) => l.includes(EMAIL_ID) && l.includes("fetch failed (500)")));
      for (const l of logged) assert.doesNotMatch(l, new RegExp(`${SECRET_TEXT}|l@example\\.test|owner@example\\.test|Hi`));
      // and a failed send
      fakeResend(200, 403);
      assert.equal((await call(body, signed(body))).status, 502);
    } finally {
      console.error = realError;
      console.log = realLog;
      console.warn = realWarn;
      globalThis.fetch = realFetch;
      restore();
      await clearLimit();
    }
  });
});

describe("the data inventory covers every per-learner table (FAIL-908)", () => {
  test("each table with a user_id or a key into app_users is named in docs/legal/data-inventory.md", async () => {
    const inventory = readFileSync(join(__dirname, "..", "..", "docs", "legal", "data-inventory.md"), "utf8");
    const tables = await query<{ t: string }>(
      `select distinct c.relname as t
         from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
        where c.relkind = 'r' and c.relname <> 'app_users'
          and (exists (select 1 from information_schema.columns k where k.table_schema = 'public' and k.table_name = c.relname and k.column_name in ('user_id', 'issued_to'))
            or exists (select 1 from pg_constraint con where con.conrelid = c.oid and con.contype = 'f' and con.confrelid = 'app_users'::regclass))`
    );
    assert.ok(tables.length > 40);
    const missing = tables.map((r) => r.t).filter((t) => !inventory.includes("`" + t + "`"));
    assert.deepEqual(missing, [], "add these tables to docs/legal/data-inventory.md");
    assert.match(inventory, /`app_users`/);
  });
});
