// REQ-109: sprints and mock exams against a real Postgres with every
// migration applied. The model is a fake (no key exists): it returns a fixed
// batch of exam items per call, one of them invalid, so generation, the
// shared bank, validation and the whole session flow -- create, save,
// deadline, submit, attempts and mastery, results -- run for real.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
// REQ-114: the second-model fact-check gate has its own tests
// (lib/item-quality.dbtest.ts); here the fake model answers only the
// feature's own calls, so the gate is off, as it was before REQ-114.
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
import { GET as sessionsGet, POST as sessionsPost } from "../app/api/exam/sessions/route";
import { GET as sessionGet } from "../app/api/exam/sessions/[id]/route";
import { PUT as itemPut } from "../app/api/exam/sessions/[id]/items/[position]/route";
import { POST as submitPost } from "../app/api/exam/sessions/[id]/submit/route";
import { createSession, ExamSessionError } from "./exam-sessions";
import { bankItems, copyAnsweredLessonChecks, rowToItem, type ExamItemRow } from "./exam-items";
import { attemptQuestionText, itemOrders, revealFor } from "./exam-formats";
import { recordAttemptIdempotent } from "./grading-service";
import { openItemsFor } from "./coach-guard";
import { buildAccountExport } from "./account-export";
import { courseReadiness } from "./readiness";

const run = Date.now().toString(36);
const learner = randomUUID();
const other = randomUUID();
const providerSlug = `t-exam-prov-${run}`;
const code = `T-MOCK-${run}`;
let pool: Pool;
let trackId: string;
let modelCalls = 0;

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` });
const json = (body: unknown) => JSON.stringify(body);

const track: SeedTrack = {
  code,
  title: "Mock exam test track",
  description: "REQ-109 test",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  credential: {
    providerSlug,
    providerName: `Mock Vendor ${run}`,
    subcategorySlug: "aws-certifications",
    credentialSlug: "mock-cert",
    credentialName: "Mock Cert",
    credentialType: "certification",
    examCode: "MCK-01",
    status: "active",
    officialObjectivesUrl: "https://example.test/guide",
    lastVendorVerifiedAt: "2026-11-07T00:00:00Z",
    durationMinutes: 40,
    questionFormat: "20 questions (15 scored, 5 unscored); multiple choice, multiple response, ordering, matching, and performance-based",
    passingScorePolicy: "700 of 1000",
  },
  units: [
    { title: "Domain A", weight: 60, objectives: ["A0", "A1"] },
    { title: "Domain B", weight: 40, objectives: ["B0", "B1"] },
    { title: "Retired domain", weight: 10, objectives: ["R0"], retiredAt: "2026-01-01T00:00:00Z" },
  ],
};

// Five valid items (every format, one with an exhibit) and one invalid one
// (multiple response with a single key) per call.
function fakeItems() {
  const n = ++modelCalls;
  return {
    items: [
      { format: "multiple_choice", stem: `MC ${n} which control?`, choices: ["w", "x", "y", "z"], correct: [2], steps: null, prompts: null, responses: null, matches: null, exhibit: null, explanation: "y is right; the others are not." },
      { format: "multiple_choice", stem: `MC ${n}b read the log`, choices: ["p", "q", "r", "s"], correct: [0], steps: null, prompts: null, responses: null, exhibit: { kind: "log", title: "auth.log", text: "Failed password for root from 203.0.113.9", columns: null, rows: null }, matches: null, explanation: "p." },
      { format: "multiple_response", stem: `MR ${n} (Choose two.)`, choices: ["a", "b", "c", "d", "e"], correct: [1, 3], steps: null, prompts: null, responses: null, matches: null, exhibit: null, explanation: "b and d." },
      { format: "ordering", stem: `ORD ${n} order the phases`, choices: null, correct: null, steps: ["Prepare", "Detect", "Contain", "Recover"], prompts: null, responses: null, matches: null, exhibit: null, explanation: "NIST order." },
      { format: "matching", stem: `MATCH ${n} control to example`, choices: null, correct: null, steps: null, prompts: ["Preventive", "Detective", "Corrective"], responses: ["Firewall", "IDS", "Backup restore"], matches: [0, 1, 2], exhibit: null, explanation: "As named." },
      { format: "multiple_response", stem: `BAD ${n}`, choices: ["a", "b", "c", "d", "e"], correct: [1], steps: null, prompts: null, responses: null, matches: null, exhibit: null, explanation: "bad" },
    ],
  };
}

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  for (const u of [learner, other]) await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
  await seedTrack(pool, null, track);
  trackId = (await queryOne<{ id: string }>(`select id from subject_tracks where code = $1`, [code]))!.id;
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async () => ({ parsed_output: fakeItems(), stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }),
    },
  });
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [[learner, other]]);
  await query(`delete from subject_tracks where code = $1`, [code]);
  await query(`delete from credentials where provider_id in (select id from credential_providers where slug = $1)`, [providerSlug]);
  await query(`delete from credential_providers where slug = $1`, [providerSlug]);
  await pool.end();
  await closePool();
});

async function objectiveIds(): Promise<Record<string, string>> {
  const rows = await query<{ id: string; title: string }>(
    `select o.id, o.title from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = $1`,
    [trackId]
  );
  return Object.fromEntries(rows.map((r) => [r.title, r.id]));
}

// The right answer for a session item, in the learner's shown positions,
// worked out the way the server does (the app never gets it before submit).
async function rightAnswer(sessionId: string, position: number, user = learner) {
  const row = await queryOne<ExamItemRow>(
    `select i.id, i.objective_id, i.item_format, i.stem, i.body, i.answer_key, i.explanation, i.exhibit, i.source
       from exam_session_items si join exam_items i on i.id = si.item_id where si.session_id = $1 and si.position = $2`,
    [sessionId, position]
  );
  const item = rowToItem(row!);
  const correct = revealFor(item, itemOrders(user, item)).correct as { choices?: number[]; order?: number[]; matches?: number[] };
  if (item.format === "multiple_choice") return { item, shown: { choice: correct.choices![0] }, wrong: { choice: (correct.choices![0] + 1) % 4 } };
  return { item, shown: correct, wrong: null };
}

const put = (sessionId: string, pos: number, body: unknown, user = learner) =>
  itemPut(new Request("http://t/x", { method: "PUT", headers: auth(user), body: json(body) }), {
    params: Promise.resolve({ id: sessionId, position: String(pos) }),
  });

describe("exam profile", () => {
  test("formats, length and duration come from the course's exam", async () => {
    const res = await sessionsGet(new Request(`http://t/x?trackId=${trackId}`, { headers: auth(learner) }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.exam.formats, ["multiple_choice", "multiple_response", "ordering", "matching"]);
    assert.equal(body.exam.questionCount, 20);
    assert.equal(body.exam.durationMinutes, 40);
    assert.equal(body.exam.secondsPerQuestion, 120);
    assert.equal(body.exam.exhibits, true);
    assert.deepEqual(body.sessions, []);
  });

  test("the new formats are registered in the weighted model, below free response", async () => {
    const rows = await query<{ type_name: string; cognitive_weight: string; application_level: boolean }>(
      `select type_name, cognitive_weight, application_level from assessment_types
        where type_name in ('multiple_choice', 'multiple_response', 'ordering', 'matching', 'free_response')`
    );
    const w = Object.fromEntries(rows.map((r) => [r.type_name, Number(r.cognitive_weight)]));
    assert.ok(w.multiple_choice < w.multiple_response && w.multiple_response <= w.ordering && w.ordering < w.free_response);
    assert.ok(rows.filter((r) => ["multiple_response", "ordering", "matching"].includes(r.type_name)).every((r) => !r.application_level));
  });
});

describe("a mock exam end to end", () => {
  let sessionId: string;

  test("an empty bank with generation off is refused plainly, not a broken session", async () => {
    await assert.rejects(
      createSession({ userId: learner, trackId, mode: "sprint", timed: true, allowGeneration: false }),
      (e: unknown) => e instanceof ExamSessionError && e.status === 409
    );
  });

  test("another learner's session is invisible; a private course is 404", async () => {
    const res = await sessionsPost(
      new Request("http://t/x", { method: "POST", headers: auth(other), body: json({ trackId: randomUUID(), mode: "mock", timed: true }) })
    );
    assert.equal(res.status, 404);
  });

  test("creating a mock fills the shared bank once and returns no keys", async () => {
    const res = await sessionsPost(
      new Request("http://t/x", {
        method: "POST",
        headers: auth(learner),
        body: json({ trackId, mode: "mock", timed: true, clientSessionId: `mock-${run}` }),
      })
    );
    assert.equal(res.status, 201);
    const text = await res.text();
    const body = JSON.parse(text);
    sessionId = body.session.id;
    // Domain A's two objectives need 6 questions each (2 calls), domain B's
    // need 4 (1 call); 5 valid items per call, the invalid one rejected.
    assert.equal(modelCalls, 6);
    assert.equal((await query(`select 1 from exam_items where objective_id = any($1::uuid[])`, [Object.values(await objectiveIds())])).length, 30);
    assert.deepEqual(body.preparation, { requested: 20, built: 20, fresh: 20, repeats: 0, generatedCalls: 6, generationFailed: false });
    assert.equal(body.items.length, 20);
    assert.equal(body.session.timeLimitSeconds, 2400, "full length gets the exam's full 40 minutes");
    assert.ok(body.session.deadlineAt);
    assert.equal(body.results, null);
    const withExhibit = body.items.filter((i: { exhibit: { kind: string } | null }) => i.exhibit);
    assert.ok(withExhibit.length >= 1 && withExhibit.every((i: { exhibit: { kind: string } }) => i.exhibit.kind === "log"));
    // No key, verdict or explanation anywhere before submit.
    assert.doesNotMatch(text, /answerKey|answer_key|"correct"|explanation|correctText|"verdict"/);
    // Weighted by domain: A 60% -> 12, B 40% -> 8; the retired domain gets none.
    const titles = body.items.map((i: { unitTitle: string }) => i.unitTitle);
    assert.equal(titles.filter((t: string) => t === "Domain A").length, 12);
    assert.equal(titles.filter((t: string) => t === "Domain B").length, 8);
    assert.ok(!titles.includes("Retired domain"));
    // Readiness was snapshotted before any answer counted.
    const s = await queryOne<{ readiness_before: { status: string } }>(`select readiness_before from exam_sessions where id = $1`, [sessionId]);
    assert.equal(s?.readiness_before.status, "no_evidence");
  });

  test("the same clientSessionId returns the same session (retry-safe)", async () => {
    const res = await sessionsPost(
      new Request("http://t/x", {
        method: "POST",
        headers: auth(learner),
        body: json({ trackId, mode: "mock", timed: true, clientSessionId: `mock-${run}` }),
      })
    );
    assert.equal((await res.json()).session.id, sessionId);
    assert.equal(modelCalls, 6);
  });

  test("saving answers, flags, confidence and time; bad input and other users are refused", async () => {
    const a0 = await rightAnswer(sessionId, 0);
    assert.equal((await put(sessionId, 0, { response: a0.shown, confidence: 5, timeSpentMs: 30000 })).status, 200);
    const a1 = await rightAnswer(sessionId, 1);
    // Item 1 wrong (or, for a non-MC item, an empty-ish but valid answer).
    const wrong1 =
      a1.item.format === "multiple_choice"
        ? a1.wrong
        : a1.item.format === "multiple_response"
          ? { choices: [] as number[] }
          : a1.item.format === "ordering"
            ? { order: (a1.shown as { order: number[] }).order.slice().reverse() }
            : { matches: (a1.shown as { matches: number[] }).matches.map(() => null) };
    assert.equal((await put(sessionId, 1, { response: wrong1, confidence: 5, timeSpentMs: 400000 })).status, 200);
    assert.equal((await put(sessionId, 2, { flagged: true })).status, 200);
    assert.equal((await put(sessionId, 3, { response: { nonsense: true } })).status, 400);
    assert.equal((await put(sessionId, 3, { confidence: 9 })).status, 400);
    assert.equal((await put(sessionId, 99, { flagged: true })).status, 404);
    assert.equal((await put(sessionId, 0, { flagged: true }, other)).status, 404);
    // The other learner can't read it either.
    const res = await sessionGet(new Request("http://t/x", { headers: auth(other) }), { params: Promise.resolve({ id: sessionId }) });
    assert.equal(res.status, 404);
    // Time on screen never goes down, and is capped at the session's limit.
    await put(sessionId, 0, { timeSpentMs: 10 });
    const t = await queryOne<{ ms: number }>(`select time_spent_ms as ms from exam_session_items where session_id = $1 and position = 0`, [sessionId]);
    assert.equal(t?.ms, 30000);
  });

  test("resuming shows the saved answer in the same shown positions", async () => {
    const res = await sessionGet(new Request("http://t/x", { headers: auth(learner) }), { params: Promise.resolve({ id: sessionId }) });
    const body = await res.json();
    const a0 = await rightAnswer(sessionId, 0);
    assert.deepEqual(body.items[0].response, a0.shown);
    assert.equal(body.items[2].flagged, true);
  });

  test("open exam questions are named to the coach guard, with their keys kept server-side", async () => {
    const items = await openItemsFor(learner, trackId);
    const exam = items.filter((i) => i.kind === "exam");
    assert.ok(exam.length >= 10);
    // Every multiple-choice key in the fake bank is "y" or "p"; MR keys "b"/"d".
    assert.ok(exam.some((i) => ["y", "p", "b", "d"].includes(i.answerKey ?? "")));
    assert.ok(exam.every((i) => i.answerKey == null || ["y", "p", "b", "d"].includes(i.answerKey)));
  });

  test("submit grades on the server and records answered questions as attempts", async () => {
    const res = await submitPost(new Request("http://t/x", { method: "POST", headers: auth(learner) }), {
      params: Promise.resolve({ id: sessionId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.session.status, "submitted");
    assert.equal(body.results.total, 20);
    assert.equal(body.results.correct, 1);
    assert.equal(body.results.percent, 5);
    assert.equal(body.items[0].verdict, "correct");
    assert.ok(body.items[0].explanation);
    assert.ok(body.items[0].correct);
    assert.equal(body.items[3].counted, false, "a blank is not evidence");
    assert.equal(body.results.readiness.agreement, "not_comparable");
    assert.equal(body.results.domains.length, 2);
    assert.ok(body.results.pacing.slowQuestions.includes(2));
    assert.match(body.results.calibration.lines.join(" "), /When you were sure, you were right 1 of 2/);
    assert.match(body.results.evidence.line, /count toward your mastery/);

    const attempts = await query<{ kind: string; stage: string; assessment_type: string; assisted: boolean; confidence: number; verdict: string }>(
      `select kind, stage, assessment_type, assisted, confidence, verdict from attempts where user_id = $1 order by created_at`,
      [learner]
    );
    // Items 0 and 1 had answers (an empty multiple response counts as no answer).
    assert.ok(attempts.length >= 1 && attempts.length <= 2);
    assert.ok(attempts.every((a) => a.kind === "quiz" && a.stage === "mock" && !a.assisted && a.confidence === 5));
    assert.ok(attempts.every((a) => ["multiple_choice", "multiple_response", "ordering", "matching"].includes(a.assessment_type)));
    // Counts in the weighted mastery model.
    const ids = Object.values(await objectiveIds());
    const m = await query<{ status: string }>(`select status from mastery where user_id = $1 and objective_id = any($2::uuid[])`, [learner, ids]);
    assert.ok(m.length >= 1);
    // Guided / Introduced, or Needs review when both answered items landed on
    // one objective and the later one was wrong. Never Independent or above:
    // selected-response answers are not application-level evidence.
    assert.ok(
      m.every((r) => ["Guided", "Introduced", "Needs review"].includes(r.status)),
      `selected-response answers alone never lift above Guided (got ${m.map((r) => r.status)})`
    );
  });

  test("submitting again returns the same results and records nothing new", async () => {
    const before = (await query(`select 1 from attempts where user_id = $1`, [learner])).length;
    const res = await submitPost(new Request("http://t/x", { method: "POST", headers: auth(learner) }), {
      params: Promise.resolve({ id: sessionId }),
    });
    assert.equal((await res.json()).results.correct, 1);
    assert.equal((await query(`select 1 from attempts where user_id = $1`, [learner])).length, before);
  });

  test("saving after submit is refused", async () => {
    assert.equal((await put(sessionId, 5, { flagged: true })).status, 409);
  });

  test("the session is listed and in the account export", async () => {
    const res = await sessionsGet(new Request(`http://t/x?trackId=${trackId}`, { headers: auth(learner) }));
    const body = await res.json();
    assert.equal(body.sessions[0].id, sessionId);
    assert.equal(body.sessions[0].correct, 1);
    const out = await buildAccountExport(learner, (sql, p) => query(sql, p));
    assert.equal((out.examSessions as unknown[]).length, 1);
    assert.equal((out.examSessionItems as unknown[]).length, 20);
  });
});

describe("rules every format keeps", () => {
  test("an exam answer to a question already answered is a repeat (reduced credit)", async () => {
    const ids = await objectiveIds();
    const q = `Repeat check ${run}`;
    const base = {
      userId: learner,
      objectiveId: ids.A0,
      kind: "quiz" as const,
      stage: "sprint",
      format: "mc" as const,
      question: q,
      answer: "x",
      verdict: "correct" as const,
      assessmentType: "multiple_choice",
    };
    const first = await recordAttemptIdempotent(base);
    const second = await recordAttemptIdempotent(base);
    assert.equal(first.attempt?.assisted, false);
    assert.equal(second.attempt?.assisted, true);
    assert.equal(second.attempt?.assist_reason, "repeat");
  });

  test("a new sprint prefers questions not answered before; seen ones only fill gaps", async () => {
    const res = await sessionsPost(
      new Request("http://t/x", { method: "POST", headers: auth(learner), body: json({ trackId, mode: "sprint", timed: false }) })
    );
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.session.timeLimitSeconds, null, "untimed option");
    assert.equal(body.items.length, 10);
    assert.equal(body.preparation.repeats, 0);
    const answeredStems = new Set(
      (await query<{ question: string }>(`select question from attempts where user_id = $1`, [learner])).map((r) => r.question)
    );
    const sessionItems = await query<ExamItemRow>(
      `select i.* from exam_session_items si join exam_items i on i.id = si.item_id where si.session_id = $1`,
      [body.session.id]
    );
    assert.ok(sessionItems.every((r) => !answeredStems.has(attemptQuestionText(rowToItem(r)))));
  });

  test("starting another mock closes the open one ungraded", async () => {
    const a = await createSession({ userId: other, trackId, mode: "mock", timed: true, allowGeneration: false });
    const b = await createSession({ userId: other, trackId, mode: "mock", timed: true, allowGeneration: false });
    const s = await queryOne<{ status: string }>(`select status from exam_sessions where id = $1`, [a.sessionId]);
    assert.equal(s?.status, "abandoned");
    assert.notEqual(a.sessionId, b.sessionId);
    const res = await submitPost(new Request("http://t/x", { method: "POST", headers: auth(other) }), {
      params: Promise.resolve({ id: a.sessionId }),
    });
    assert.equal(res.status, 409);
  });

  test("past the deadline: saves are refused and the session is submitted with what was saved", async () => {
    const { sessionId } = await createSession({ userId: other, trackId, mode: "sprint", timed: true, allowGeneration: false });
    const a0 = await rightAnswer(sessionId, 0, other);
    assert.equal((await put(sessionId, 0, { response: a0.shown }, other)).status, 200);
    await query(`update exam_sessions set deadline_at = now() - interval '5 minutes' where id = $1`, [sessionId]);
    const late = await put(sessionId, 1, { flagged: true }, other);
    assert.equal(late.status, 409);
    const s = await queryOne<{ status: string }>(`select status from exam_sessions where id = $1`, [sessionId]);
    assert.equal(s?.status, "submitted");
    const res = await sessionGet(new Request("http://t/x", { headers: auth(other) }), { params: Promise.resolve({ id: sessionId }) });
    const body = await res.json();
    assert.equal(body.results.correct, 1);
    assert.equal(body.results.readiness, null, "only a mock is compared with readiness");
  });

  test("lesson checks are reused only for a learner who already answered them", async () => {
    const ids = await objectiveIds();
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', 't', 'Fade Q ${run}', '["a","b","c","d"]', 1, 'why f', 'Solo Q ${run}', '["e","f","g","h"]', 2, 'why s', 'test')
       on conflict (objective_id) do nothing`,
      [ids.B1]
    );
    await query(
      `insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict)
       values ($1, $2, 'lesson', 'solo', 'open', $3, 'g', 'correct')`,
      [learner, ids.B1, `Solo Q ${run}`]
    );
    assert.equal(await copyAnsweredLessonChecks(learner, [ids.B1]), 1);
    assert.equal(await copyAnsweredLessonChecks(learner, [ids.B1]), 0, "copied once");
    const mine = await bankItems(learner, [ids.B1], ["multiple_choice"]);
    assert.ok(mine.some((r) => r.source === "lesson" && r.stem === `Solo Q ${run}`));
    const theirs = await bankItems(other, [ids.B1], ["multiple_choice"]);
    assert.ok(!theirs.some((r) => r.source === "lesson"), "never a preview of an unanswered lesson question");
  });

  test("readiness ignores retired units (merge of REQ-102 into the readiness rollup)", async () => {
    const r = await courseReadiness(trackId, learner);
    assert.deepEqual(r.domains.map((d) => d.title), ["Domain A", "Domain B"]);
  });
});
