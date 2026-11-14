// REQ-298: full-length mock assembly against a real Postgres with every
// migration applied. No model is involved (a fake that throws is installed, and
// createSession is called with allowGeneration: false): the bank is filled by
// hand so what is chosen, and what is left out, is exactly known.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
process.env.ITEM_FACT_CHECK = "off";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { seedTrack } from "../supabase/seed/seed-lib";
import type { SeedTrack } from "../supabase/seed/data";
import { GET as sessionsGet } from "../app/api/exam/sessions/route";
import { POST as submitPost } from "../app/api/exam/sessions/[id]/submit/route";
import { createSession, mockFormState, examProfile } from "./exam-sessions";
import { insertDraft } from "./exam-items";

const run = Date.now().toString(36);
const fresh = randomUUID();
const second = randomUUID();
const shortLearner = randomUUID();
const providerSlug = `t-mockform-prov-${run}`;
const code = `T-MOCKFORM-${run}`;
let pool: Pool;
let trackId: string;

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` });

const track: SeedTrack = {
  code,
  title: "Mock form test track",
  description: "REQ-298 test",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  credential: {
    providerSlug,
    providerName: `Mock Form Vendor ${run}`,
    subcategorySlug: "aws-certifications",
    credentialSlug: "mockform-cert",
    credentialName: "Mock Form Cert",
    credentialType: "certification",
    examCode: "MKF-01",
    status: "active",
    officialObjectivesUrl: "https://example.test/guide",
    lastVendorVerifiedAt: "2026-11-14T00:00:00Z",
    durationMinutes: 40,
    questionFormat: "20 questions; multiple choice",
    passingScorePolicy: "700 of 1000",
  },
  units: [
    { title: "Domain A", weight: 60, objectives: ["A0", "A1"] },
    { title: "Domain B", weight: 40, objectives: ["B0", "B1"] },
  ],
};

async function objectives(): Promise<Record<string, string>> {
  const rows = await query<{ id: string; title: string }>(
    `select o.id, o.title from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = $1`,
    [trackId]
  );
  return Object.fromEntries(rows.map((r) => [r.title, r.id]));
}

async function addItems(objectiveId: string, n: number, prefix: string) {
  for (let i = 0; i < n; i++) {
    await insertDraft(
      objectiveId,
      { format: "multiple_choice", stem: `${prefix} question ${i}`, body: { choices: ["a", "b", "c", "d"] }, answerKey: { correct: [0] }, explanation: "a.", exhibit: null },
      null
    );
  }
}

const itemsOf = async (sessionId: string) =>
  query<{ item_id: string; stem: string; unit_title: string }>(
    `select si.item_id, i.stem, cu.title as unit_title
       from exam_session_items si join exam_items i on i.id = si.item_id join course_units cu on cu.id = si.unit_id
      where si.session_id = $1 order by si.position`,
    [sessionId]
  );

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  for (const u of [fresh, second, shortLearner]) await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
  await seedTrack(pool, null, track);
  trackId = (await queryOne<{ id: string }>(`select id from subject_tracks where code = $1`, [code]))!.id;
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("the model must not be called");
      },
      parse: async () => {
        throw new Error("the model must not be called");
      },
    },
  });
  const o = await objectives();
  // 16 questions per domain: more than a form needs (12 and 8), so a form can
  // be built with no repeat and the rest are left over.
  for (const t of ["A0", "A1", "B0", "B1"]) await addItems(o[t], 8, t);
  // A duplicate: the same words as an A0 item, under A1. One question to a learner.
  await insertDraft(
    o.A1,
    { format: "multiple_choice", stem: "a0 QUESTION 0!", body: { choices: ["a", "b", "c", "d"] }, answerKey: { correct: [0] }, explanation: "a.", exhibit: null },
    null
  );
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [[fresh, second, shortLearner]]);
  await query(`delete from subject_tracks where code = $1`, [code]);
  await query(`delete from credentials where provider_id in (select id from credential_providers where slug = $1)`, [providerSlug]);
  await query(`delete from credential_providers where slug = $1`, [providerSlug]);
  await pool.end();
  await closePool();
});

describe("a full form from a full bank", () => {
  test("the exam's length, the domain weights, no repeated item or stem", async () => {
    const { sessionId, preparation } = await createSession({ userId: fresh, trackId, mode: "mock", timed: true, allowGeneration: false });
    assert.equal(preparation!.requested, 20);
    assert.equal(preparation!.built, 20);
    assert.equal(preparation!.short, false);
    assert.equal(preparation!.shortReason, null);
    const rows = await itemsOf(sessionId);
    assert.equal(rows.length, 20);
    assert.equal(new Set(rows.map((r) => r.item_id)).size, 20, "no item twice");
    assert.equal(new Set(rows.map((r) => r.stem.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())).size, 20, "no question with the same words twice");
    assert.equal(rows.filter((r) => r.unit_title === "Domain A").length, 12);
    assert.equal(rows.filter((r) => r.unit_title === "Domain B").length, 8);
  });

  test("the second mock takes every question not yet served before any it was just shown", async () => {
    const a = await createSession({ userId: second, trackId, mode: "mock", timed: false, allowGeneration: false });
    const first = new Set((await itemsOf(a.sessionId)).map((r) => r.item_id));
    const b = await createSession({ userId: second, trackId, mode: "mock", timed: false, allowGeneration: false });
    const secondRows = await itemsOf(b.sessionId);
    assert.equal(secondRows.length, 20);
    assert.equal(new Set(secondRows.map((r) => r.item_id)).size, 20, "still no repeat within the form");
    const all = await query<{ id: string }>(`select i.id from exam_items i join objectives o on o.id = i.objective_id join course_units cu on cu.id = o.unit_id where cu.track_id = $1`, [trackId]);
    const neverServed = all.map((r) => r.id).filter((id) => !first.has(id));
    const secondIds = new Set(secondRows.map((r) => r.item_id));
    // Every distinct question that had not been served is in the second form
    // (the duplicate-stem row may be passed over for its twin).
    const missed = neverServed.filter((id) => !secondIds.has(id));
    assert.ok(missed.length <= 1, `unserved questions left out: ${missed.length}`);
    // The preparation counts what it handed back that was seen: some, not all.
    assert.ok(b.preparation!.built === 20);
  });
});

describe("the short form", () => {
  before(async () => {
    // Leave Domain B with only 3 questions.
    const o = await objectives();
    await query(
      `delete from exam_items where objective_id = any($1::uuid[]) and id not in (
         select id from exam_items where objective_id = $2 order by created_at limit 3)`,
      [[o.B0, o.B1], o.B0]
    );
    await query(`delete from exam_items where objective_id = $1`, [o.B1]);
  });

  test("a bank that cannot fill a domain gives a short form with its count and reason, and a scaled clock", async () => {
    const { sessionId, preparation } = await createSession({ userId: shortLearner, trackId, mode: "mock", timed: true, allowGeneration: false });
    assert.equal(preparation!.requested, 20);
    assert.equal(preparation!.built, 15, "12 from Domain A and the 3 that Domain B has");
    assert.equal(preparation!.short, true);
    assert.match(preparation!.shortReason ?? "", /^Short form: 15 of 20 questions\./);
    const s = await queryOne<{ time_limit_seconds: number; exam_question_count: number }>(
      `select time_limit_seconds, exam_question_count from exam_sessions where id = $1`,
      [sessionId]
    );
    assert.equal(s!.exam_question_count, 20);
    assert.equal(s!.time_limit_seconds, 15 * 120, "the exam's pace (120 s a question) over 15 questions, not the full 40 minutes");
    const rows = await itemsOf(sessionId);
    assert.equal(rows.filter((r) => r.unit_title === "Domain B").length, 3, "Domain B is not padded from Domain A");
  });

  test("the start screen's answer says short before a session starts", async () => {
    const res = await sessionsGet(new Request(`http://t/x?trackId=${trackId}`, { headers: auth(fresh) }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.mock.requested, 20);
    assert.equal(body.mock.canBuild, 15);
    assert.equal(body.mock.short, true);
    assert.match(body.mock.reason, /Short form: 15 of 20/);
    assert.deepEqual(body.mock.thinDomains, [{ title: "Domain B", need: 8, have: 3 }]);
    assert.equal(body.exam.mock.confirmed, false, "a course with no entry in the facts file says its length is approximate");
    assert.equal(body.exam.mock.weights, "exam_blueprint");
  });

  test("mockFormState reads the bank without writing or calling the model", async () => {
    const before = await queryOne<{ n: number }>(`select count(*)::int as n from exam_items`);
    const st = await mockFormState(fresh, trackId, await examProfile(trackId));
    assert.equal(st!.canBuild, 15);
    const after = await queryOne<{ n: number }>(`select count(*)::int as n from exam_items`);
    assert.equal(after!.n, before!.n);
  });

  test("results of a short form say so and report the pass score without a scaled claim", async () => {
    const { sessionId } = await createSession({ userId: shortLearner, trackId, mode: "mock", timed: true, allowGeneration: false });
    const res = await submitPost(new Request("http://t/x", { method: "POST", headers: auth(shortLearner) }), { params: Promise.resolve({ id: sessionId }) });
    assert.equal(res.status, 200);
    const { results } = await res.json();
    assert.deepEqual(results.form, { questions: 15, examQuestions: 20, short: true });
    assert.equal(results.pass.confirmed, false);
    assert.match(results.pass.line, /^You got 0 of 15 fully right \(0%\)\. Exams report a scaled score or a pass or fail result, not a percentage/);
    assert.equal(results.correct, 0, "blank answers score as wrong");
  });
});
