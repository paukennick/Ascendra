// REQ-123: verifiable labs against a real Postgres with every migration
// applied: visibility and review gating, runs and step order, the per-part
// grader (fake model), one attempt per finished run as mastery evidence on
// the lab's objective only, the repeat rule, client-id replay and its 409s,
// "Report a problem" with quarantine and voiding, the coach guard, the
// generator's gates, the seed upsert and the schema's own checks.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
// REQ-125: unreviewed labs are served by default; the tests run on the default.
delete process.env.LABS_SERVE_UNREVIEWED;
import { recordStudyNoticeAcceptance } from "./study-notice";
import { source } from "../supabase/seed/sources";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { confirmItemWrong, quarantineThreshold } from "./item-quality";
import { reportItem, resolveReport } from "./item-report";
import { openItemsFor } from "./coach-guard";
import { saveGeneratedLab, type GeneratedLab } from "./lab-generation";
import { seedLabs } from "../supabase/seed/seed-lib";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { grantEntitlement, tierFor } from "./entitlements";
import { GET as listGet } from "../app/api/labs/route";
import { GET as progressGet } from "../app/api/labs/progress/route";
import { GET as labGet } from "../app/api/labs/[id]/route";
import { POST as runsPost } from "../app/api/labs/[id]/runs/route";
import { POST as submitPost } from "../app/api/labs/[id]/submit/route";
import { POST as noticePost } from "../app/api/onboarding/notice/route";
import { STUDY_NOTICE_REQUIRED_MESSAGE, STUDY_NOTICE_VERSION } from "./study-notice";

const run = Date.now().toString(36);
const track = randomUUID();
const otherTrack = randomUUID();
const unit = randomUUID();
const otherUnit = randomUUID();
const OBJ_BUILD = randomUUID();
const OBJ_CASE = randomUUID();
const OBJ_SIBLING = randomUUID(); // same unit, no lab: must not be touched by a lab
const OBJ_PRIVATE = randomUUID();
const BUILD = randomUUID();
const CASE = randomUUID();
const PRIVATE_LAB = randomUUID();
const users: string[] = [];
let dbPool: Pool;

const BUILD_RUBRIC = [
  {
    parts: [
      { label: "Credentials", criteria: "Uses an execution role.", modelAnswer: "An execution role assumed by Lambda." },
      { label: "S3 statement", criteria: "Only GetObject on the prefix.", modelAnswer: "s3:GetObject on bucket/uploads/*." },
    ],
  },
];
const CASE_STEPS = [
  { text: "STEP-ONE-TEXT heart rate rising", ask: "Who do you see first?" },
  { text: "STEP-TWO-SECRET the dressing is soaked", ask: "What do you do now?" },
  { text: "STEP-THREE-SECRET the surgeon arrives", ask: "What do you hand over?" },
];
const CASE_RUBRIC = [
  { parts: [{ label: "Priority", criteria: "Names client 3.", modelAnswer: "Client 3." }] },
  { parts: [{ label: "Action", criteria: "Stays and calls for help.", modelAnswer: "Stay and call for help." }] },
  { parts: [{ label: "Handover", criteria: "Gives an SBAR.", modelAnswer: "SBAR." }] },
];

// The fake model: lab grading answers with `score` for every part; the
// generator check is not called through it.
let score: "met" | "partial" | "missed" = "met";
let classification = "none";
let gradeCalls = 0;
let gradeDelayMs = 0;

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `lab-${run}-${users.length}@example.test`]);
  await recordStudyNoticeAcceptance(u); // REQ-205: model routes need the notice
  return u;
}
const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (u: string, url = "http://t/x", method = "GET", body?: unknown) =>
  new Request(url, { method, headers: auth(u), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const startRun = (u: string, lab: string, restart = false) => runsPost(req(u, "http://t/x", "POST", { restart }), ctx(lab)).then(json);
const submit = (u: string, lab: string, body: Record<string, unknown>) => submitPost(req(u, "http://t/x", "POST", body), ctx(lab)).then(json);
const mastery = (u: string, o: string) => queryOne<{ status: string; evidence: string }>(`select status::text as status, evidence from mastery where user_id = $1 and objective_id = $2`, [u, o]);

async function finishBuild(u: string, opts: { restart?: boolean; answers?: string[]; cid?: string } = {}) {
  const r = await startRun(u, BUILD, opts.restart);
  return submit(u, BUILD, {
    runId: r.body.run.id,
    step: 0,
    answers: opts.answers ?? ["An execution role assumed by the function", "GetObject on uploads/* only"],
    clientAttemptId: opts.cid ?? randomUUID(),
  });
}

before(async () => {
  dbPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  setAiCallSink(null);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'LAB course', 'certification', null)`, [track, `LAB-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'LAB unit', 0, 100)`, [unit, track]);
  for (const [i, o] of [OBJ_BUILD, OBJ_CASE, OBJ_SIBLING].entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `LAB O${i}`, i]);
  }
  const owner = await newUser();
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Private', 'certification', $3)`, [otherTrack, `LABP-${run}`, owner]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'P unit', 0)`, [otherUnit, otherTrack]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'P O', 0)`, [OBJ_PRIVATE, otherUnit]);
  const ins = (id: string, obj: string, slug: string, kind: string, steps: unknown, rubric: unknown) =>
    query(
      `insert into labs (id, objective_id, slug, kind, title, brief, steps, rubric, safety_note, source, review_status, content_hash)
       values ($1, $2, $3, $4, $5, 'A fictional brief with enough words to pass.', $6, $7, 'Fictional practice.', 'authored', 'needs_expert_review', 'h')`,
      [id, obj, slug, kind, `Lab ${slug}`, JSON.stringify(steps), JSON.stringify(rubric)]
    );
  await ins(BUILD, OBJ_BUILD, "build", "build", [{ text: "", ask: "Write the access design." }], BUILD_RUBRIC);
  await ins(CASE, OBJ_CASE, "case", "case", CASE_STEPS, CASE_RUBRIC);
  await ins(PRIVATE_LAB, OBJ_PRIVATE, "private", "build", [{ text: "", ask: "Write the access design." }], BUILD_RUBRIC);

  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async (body: any) => {
        const text = JSON.stringify(body);
        if (!text.includes("Rubric parts:")) throw new Error("unexpected model call");
        gradeCalls++;
        if (gradeDelayMs) await new Promise((r) => setTimeout(r, gradeDelayMs));
        const labels = [...text.matchAll(/\\n(\d+)\. ([^\\]+)\\n   Criteria:/g)].map((m) => m[2]);
        const out = {
          verdict: score === "met" ? "correct" : score === "partial" ? "partial" : "incorrect",
          feedback: `fake ${score}`,
          classification,
          missedParts: score === "missed" ? labels : [],
          fixNext: "FIX",
          parts: labels.map((part) => ({ part, score, comment: "c" })),
        };
        return { parsed_output: out, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
    },
  });
});

beforeEach(() => {
  delete process.env.BILLING_ENABLED;
  score = "met";
  classification = "none";
  gradeCalls = 0;
  gradeDelayMs = 0;
  delete process.env.LABS_SERVE_UNREVIEWED;
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from item_flags where item_kind = 'lab' and item_id = any($1::text[])`, [[BUILD, CASE, PRIVATE_LAB]]);
  await query(`delete from item_status where item_kind = 'lab' and item_id = any($1::text[])`, [[BUILD, CASE, PRIVATE_LAB]]);
  await query(`delete from item_holdbacks where item_kind = 'lab' and objective_id = any($1::uuid[])`, [[OBJ_BUILD, OBJ_CASE, OBJ_SIBLING]]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from attempts where lab_id = any(select id from labs where objective_id = any($1::uuid[]))`, [[OBJ_BUILD, OBJ_CASE, OBJ_SIBLING, OBJ_PRIVATE]]);
  await query(`delete from labs where objective_id = any($1::uuid[])`, [[OBJ_BUILD, OBJ_CASE, OBJ_SIBLING, OBJ_PRIVATE]]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, otherTrack]]);
  await dbPool.end();
  await closePool();
});

describe("which labs a learner sees (REQ-123)", () => {
  test("listed for course, unit and objective with the learner's state; reviewed-only when unreviewed labs are off", async () => {
    const u = await newUser();
    const byTrack = await json(await listGet(req(u, `http://t/api/labs?trackId=${track}`)));
    assert.equal(byTrack.status, 200);
    assert.deepEqual(byTrack.body.labs.map((l: any) => l.id).sort(), [BUILD, CASE].sort());
    assert.equal(byTrack.body.labs[0].state, "new");
    const byObj = await json(await listGet(req(u, `http://t/api/labs?objectiveId=${OBJ_CASE}`)));
    assert.deepEqual(byObj.body.labs.map((l: any) => l.id), [CASE]);
    assert.equal((await json(await listGet(req(u, `http://t/api/labs?unitId=${unit}`)))).body.labs.length, 2);
    assert.equal((await json(await listGet(req(u, `http://t/api/labs?unitId=${unit}&trackId=${track}`)))).status, 400);

    process.env.LABS_SERVE_UNREVIEWED = "off";
    assert.equal((await json(await listGet(req(u, `http://t/api/labs?trackId=${track}`)))).body.labs.length, 0);
    assert.equal((await json(await labGet(req(u), ctx(BUILD)))).status, 404);
    await query(`update labs set review_status = 'approved' where id = $1`, [BUILD]);
    try {
      assert.deepEqual((await json(await listGet(req(u, `http://t/api/labs?trackId=${track}`)))).body.labs.map((l: any) => l.id), [BUILD]);
    } finally {
      await query(`update labs set review_status = 'needs_expert_review' where id = $1`, [BUILD]);
    }
  });

  test("a lab on another learner's private course is a 404 everywhere; a rejected lab is never served", async () => {
    const u = await newUser();
    assert.equal((await json(await labGet(req(u), ctx(PRIVATE_LAB)))).status, 404);
    assert.equal((await startRun(u, PRIVATE_LAB)).status, 404);
    assert.equal((await submit(u, PRIVATE_LAB, { runId: randomUUID(), step: 0, answers: ["a b", "c d"] })).status, 404);
    assert.equal((await json(await listGet(req(u, `http://t/api/labs?trackId=${otherTrack}`)))).status, 404);
    await query(`update labs set review_status = 'rejected' where id = $1`, [CASE]);
    try {
      assert.equal((await json(await labGet(req(u), ctx(CASE)))).status, 404);
    } finally {
      await query(`update labs set review_status = 'needs_expert_review' where id = $1`, [CASE]);
    }
  });

  test("a case's later steps and every rubric stay hidden until earlier steps are graded", async () => {
    const u = await newUser();
    const view = await json(await labGet(req(u), ctx(CASE)));
    const text = JSON.stringify(view.body);
    assert.ok(text.includes("STEP-ONE-TEXT"));
    assert.ok(!text.includes("STEP-TWO-SECRET") && !text.includes("STEP-THREE-SECRET"));
    assert.ok(!text.includes("Names client 3") && !text.includes("Stay and call for help"), "no criteria or reference answers before grading");
    assert.deepEqual(view.body.lab.steps[0].parts, ["Priority"]);
    const r = await startRun(u, CASE);
    const s0 = await submit(u, CASE, { runId: r.body.run.id, step: 0, answers: ["Client 3, the post-op one"], clientAttemptId: randomUUID() });
    assert.equal(s0.status, 200);
    assert.ok(JSON.stringify(s0.body.nextStep).includes("STEP-TWO-SECRET"));
    assert.ok(!JSON.stringify(s0.body).includes("STEP-THREE-SECRET"));
    assert.equal(s0.body.step.reference[0].modelAnswer, "Client 3.");
    assert.equal(s0.body.final, null);
    const again = await json(await labGet(req(u), ctx(CASE)));
    assert.equal(again.body.lab.steps.length, 2);
    assert.ok(!JSON.stringify(again.body).includes("Stay and call for help"), "step 2's reference answer still hidden");
  });
});

describe("runs and steps", () => {
  test("steps go in order, once per run; a finished run takes no more answers", async () => {
    const u = await newUser();
    const r = await startRun(u, CASE);
    const runId = r.body.run.id;
    assert.equal((await startRun(u, CASE)).body.run.id, runId, "no second open run");
    assert.equal((await submit(u, CASE, { runId, step: 1, answers: ["x y"] })).status, 400);
    assert.equal((await submit(u, CASE, { runId, step: 0, answers: ["Client 3 first"] })).status, 200);
    assert.equal((await submit(u, CASE, { runId, step: 0, answers: ["Something else now"], clientAttemptId: randomUUID() })).status, 409);
    assert.equal((await submit(u, CASE, { runId, step: 1, answers: ["Stay and call for help"] })).status, 200);
    const last = await submit(u, CASE, { runId, step: 2, answers: ["Give an SBAR handover"] });
    assert.equal(last.status, 200);
    assert.equal(last.body.final.verdict, "correct");
    assert.equal(last.body.final.summary, "You met 3 of 3 parts across 3 steps.");
    assert.equal(last.body.nextStep, null);
    assert.equal((await submit(u, CASE, { runId, step: 2, answers: ["again please"] })).status, 409);
    const attempts = await query<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1 and lab_id = $2`, [u, CASE]);
    assert.equal(attempts[0].n, 1, "one attempt per finished run, not one per step");
  });

  test("the run verdict counts every part of every step", async () => {
    const u = await newUser();
    const r = await startRun(u, CASE);
    const runId = r.body.run.id;
    await submit(u, CASE, { runId, step: 0, answers: ["Client 3 first"] });
    score = "missed";
    await submit(u, CASE, { runId, step: 1, answers: ["I would wait and see"] });
    score = "met";
    const last = await submit(u, CASE, { runId, step: 2, answers: ["Give an SBAR handover"] });
    assert.equal(last.body.final.verdict, "partial");
    const a = await queryOne<{ part_scores: { part: string; score: string }[]; missed_parts: string[]; answer: string; model_answer: string }>(
      `select part_scores, missed_parts, answer, model_answer from attempts where user_id = $1 and lab_id = $2`,
      [u, CASE]
    );
    assert.deepEqual(a!.missed_parts, ["Step 2: Action"]);
    assert.equal(a!.part_scores.length, 3);
    assert.match(a!.answer, /Step 2\nAction: I would wait and see/);
    assert.match(a!.model_answer, /Step 3\nHandover: SBAR\./);
  });

  test("every part trivial: graded incorrect with no model call", async () => {
    const u = await newUser();
    const r = await startRun(u, BUILD);
    const res = await submit(u, BUILD, { runId: r.body.run.id, step: 0, answers: ["idk", "."] });
    assert.equal(res.status, 200);
    assert.equal(gradeCalls, 0);
    assert.equal(res.body.final.verdict, "incorrect");
  });

  test("bad bodies are 400s before any model call", async () => {
    const u = await newUser();
    const r = await startRun(u, BUILD);
    const runId = r.body.run.id;
    for (const body of [
      { runId, step: 0, answers: ["one"] },
      { runId, step: 0, answers: ["a\u0000b", "c d"] },
      { runId, step: 0, answers: ["x".repeat(4001), "c d"] },
      { runId, step: 7, answers: ["a b", "c d"] },
      { runId: "not-a-uuid", step: 0, answers: ["a b", "c d"] },
    ]) {
      assert.equal((await submit(u, BUILD, body)).status, 400, JSON.stringify(body).slice(0, 60));
    }
    assert.equal(gradeCalls, 0);
    assert.equal((await submit(u, BUILD, { runId: randomUUID(), step: 0, answers: ["a b", "c d"] })).status, 404, "someone else's / unknown run");
  });
});

describe("mastery evidence (REQ-123)", () => {
  test("a finished build lab counts on its own objective only, as lab_build at full weight", async () => {
    const u = await newUser();
    assert.equal(await mastery(u, OBJ_BUILD), null);
    const res = await finishBuild(u);
    assert.equal(res.status, 200);
    assert.equal(res.body.final.verdict, "correct");
    assert.equal(res.body.final.assisted, false);
    const a = await queryOne<{ kind: string; assessment_type: string; objective_id: string; format: string; assisted: boolean }>(
      `select kind::text as kind, assessment_type, objective_id, format::text as format, assisted from attempts where user_id = $1 and lab_id = $2`,
      [u, BUILD]
    );
    assert.deepEqual(a, { kind: "labtask", assessment_type: "lab_build", objective_id: OBJ_BUILD, format: "open", assisted: false });
    const m = await mastery(u, OBJ_BUILD);
    // REQ-218: one correct unassisted run is Guided until a later sitting confirms it.
    assert.equal(m!.status, "Guided", m!.evidence);
    assert.match(m!.evidence, /unassisted formats: performance/);
    assert.match(m!.evidence, /Independent needs a second correct unassisted answer/);
    assert.equal(await mastery(u, OBJ_SIBLING), null, "not unit-wide");
    const detail = await queryOne<{ weighted_accuracy: string; evidence_weight: string }>(`select * from mastery_detail($1, $2)`, [u, OBJ_BUILD]);
    assert.equal(Number(detail!.weighted_accuracy), 1);
    assert.equal(Number(detail!.evidence_weight), 1.5);
    // A correct run logs nothing to review (REQ-124: a miss does, below).
    assert.equal((await query(`select 1 from error_log where user_id = $1`, [u])).length, 0);
  });

  test("a run after the model answer was shown is a repeat and cannot lift the level", async () => {
    const u = await newUser();
    score = "missed";
    const first = await finishBuild(u);
    assert.equal(first.body.final.verdict, "incorrect");
    assert.ok(first.body.step.reference[1].modelAnswer, "the model answer was shown");
    const before = await mastery(u, OBJ_BUILD);
    assert.notEqual(before!.status, "Independent");
    score = "met";
    const second = await finishBuild(u, { answers: ["An execution role assumed by Lambda.", "s3:GetObject on bucket/uploads/*."] });
    assert.equal(second.body.final.verdict, "correct");
    assert.equal(second.body.final.assisted, true);
    assert.equal(second.body.final.assistReason, "repeat");
    const m = await mastery(u, OBJ_BUILD);
    assert.notEqual(m!.status, "Independent", m!.evidence);
    assert.notEqual(m!.status, "Transfer-ready");
    assert.match(m!.evidence, /unassisted formats: none/);
  });

  test("abandoning a case after one graded step makes the next run a repeat", async () => {
    const u = await newUser();
    const r1 = await startRun(u, CASE);
    await submit(u, CASE, { runId: r1.body.run.id, step: 0, answers: ["Client 3 first"] });
    const r2 = await startRun(u, CASE, true);
    assert.notEqual(r2.body.run.id, r1.body.run.id);
    assert.equal(r2.body.run.stepsDone, 0);
    for (const [i, a] of ["Client 3 first", "Stay and call for help", "Give an SBAR handover"].entries()) {
      const s = await submit(u, CASE, { runId: r2.body.run.id, step: i, answers: [a] });
      if (i === 2) assert.equal(s.body.final.assistReason, "repeat");
    }
    assert.notEqual((await mastery(u, OBJ_CASE))!.status, "Independent");
  });

  test("a labtask attempt must name its lab and objective; the database refuses a lab id on any other kind or a pbq format", async () => {
    const u = await newUser();
    const base = { userId: u, kind: "labtask" as const, format: "open" as const, question: "q", answer: "a", verdict: "correct" as const, assessmentType: "lab_build" };
    await assert.rejects(recordAttemptAndUpdateMastery({ ...base, objectiveId: OBJ_BUILD }), /names its lab/);
    await assert.rejects(recordAttemptAndUpdateMastery({ ...base, labId: BUILD }), /names its lab/);
    await assert.rejects(
      query(
        `insert into attempts (user_id, objective_id, kind, format, question, answer, verdict, lab_id)
         values ($1, $2, 'lesson', 'open', 'q', 'a', 'correct', $3)`,
        [u, OBJ_BUILD, BUILD]
      ),
      /attempts_labtask_shape/
    );
    await assert.rejects(
      query(
        `insert into attempts (user_id, objective_id, kind, format, question, answer, verdict, lab_id, assessment_type)
         values ($1, $2, 'labtask', 'pbq', 'q', 'a', 'correct', $3, 'lab_build')`,
        [u, OBJ_BUILD, BUILD]
      ),
      /attempts_labtask_shape/,
      "format pbq would hide it from the rule's direct branch"
    );
  });

  // FAIL-480 / FAIL-481: the first migration draft required lab_id and
  // objective_id on every labtask row and had no ON DELETE on labs, then an
  // ON DELETE SET NULL key on attempts.lab_id; either way deleting a course
  // whose labs had runs and answers failed (attempts.objective_id is SET
  // NULL, like every item key on attempts). (The deferred key that fixed
  // that broke lib/mastery-recompute.dbtest.ts -- FAIL-481.)
  test("deleting a course with labs, runs and lab answers works and keeps the answers as history", async () => {
    const owner = await newUser();
    const t = randomUUID();
    const un = randomUUID();
    const o = randomUUID();
    const l = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Mine', 'certification', $3)`, [t, `LABD-${run}`, owner]);
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 0)`, [un, t]);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 0)`, [o, un]);
    await query(
      `insert into labs (id, objective_id, slug, kind, title, brief, steps, rubric, source, review_status, content_hash)
       values ($1, $2, 'mine', 'build', 'Mine', 'A fictional brief with enough words to pass.', $3, $4, 'authored', 'approved', 'h')`,
      [l, o, JSON.stringify([{ text: "", ask: "Write the access design." }]), JSON.stringify(BUILD_RUBRIC)]
    );
    const r = await startRun(owner, l);
    const done = await submit(owner, l, { runId: r.body.run.id, step: 0, answers: ["Execution role", "GetObject on uploads only"] });
    assert.equal(done.status, 200);
    await query(`delete from subject_tracks where id = $1`, [t]);
    const a = await queryOne<{ objective_id: string | null; lab_id: string | null; kind: string }>(
      `select objective_id, lab_id, kind::text as kind from attempts where id = $1`,
      [done.body.final.attemptId]
    );
    assert.deepEqual(a, { objective_id: null, lab_id: l, kind: "labtask" }, "kept as history, like its question text");
    assert.equal((await query(`select 1 from lab_runs where lab_id = $1`, [l])).length, 0);
  });
});

describe("client attempt ids", () => {
  test("a resend replays the stored result without a second model call", async () => {
    const u = await newUser();
    const r = await startRun(u, BUILD);
    const body = { runId: r.body.run.id, step: 0, answers: ["Execution role", "GetObject on uploads only"], clientAttemptId: randomUUID() };
    const a = await submit(u, BUILD, body);
    const b = await submit(u, BUILD, { ...body, answers: [" Execution role ", "GetObject on uploads only"] });
    assert.equal(b.status, 200);
    assert.equal(b.body.replayed, true);
    assert.equal(b.body.final.attemptId, a.body.final.attemptId);
    assert.equal(gradeCalls, 1);
  });

  test("the same id for another answer, step, lab or route is the shared 409, with nothing written", async () => {
    const u = await newUser();
    const r = await startRun(u, BUILD);
    const cid = randomUUID();
    await submit(u, BUILD, { runId: r.body.run.id, step: 0, answers: ["Execution role", "GetObject"], clientAttemptId: cid });
    const other = await submit(u, BUILD, { runId: r.body.run.id, step: 0, answers: ["Different", "GetObject"], clientAttemptId: cid });
    assert.equal(other.status, 409);
    const c = await startRun(u, CASE);
    assert.equal((await submit(u, CASE, { runId: c.body.run.id, step: 0, answers: ["Client 3 first"], clientAttemptId: cid })).status, 409);
    // An id already used by a lesson answer.
    const lessonCid = randomUUID();
    await query(
      `insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict, client_attempt_id)
       values ($1, $2, 'lesson', 'solo', 'open', 'q', 'a', 'correct', $3)`,
      [u, OBJ_SIBLING, lessonCid]
    );
    assert.equal((await submit(u, CASE, { runId: c.body.run.id, step: 0, answers: ["Client 3 first"], clientAttemptId: lessonCid })).status, 409);
    assert.equal(gradeCalls, 1);
    const steps = await query(`select 1 from lab_run_steps where run_id = $1`, [c.body.run.id]);
    assert.equal(steps.length, 0);
  });

  test("copies of one submission sent at once share one grading call and one attempt", async () => {
    const u = await newUser();
    const r = await startRun(u, BUILD);
    gradeDelayMs = 150;
    const body = { runId: r.body.run.id, step: 0, answers: ["Execution role", "GetObject on uploads only"], clientAttemptId: randomUUID() };
    const out = await Promise.all([submit(u, BUILD, body), submit(u, BUILD, body), submit(u, BUILD, body)]);
    assert.deepEqual(out.map((o) => o.status), [200, 200, 200]);
    assert.equal(gradeCalls, 1);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1 and lab_id = $2`, [u, BUILD]);
    assert.equal(n!.n, 1);
  });
});

describe("REQ-218 (FAIL-1082): a restart cannot race a graded last step", () => {
  test("a last step graded while the run is restarted is refused: no attempt, the old run stays abandoned", async () => {
    const u = await newUser();
    const r = await startRun(u, BUILD);
    gradeDelayMs = 400; // the restart lands after the step was checked, before it is stored
    const body = { runId: r.body.run.id, step: 0, answers: ["Execution role", "GetObject on uploads only"], clientAttemptId: randomUUID() };
    const inFlight = submit(u, BUILD, body);
    await new Promise((res) => setTimeout(res, 150));
    const restarted = await startRun(u, BUILD, true);
    assert.equal(restarted.status, 200);
    assert.notEqual(restarted.body.run.id, r.body.run.id);
    const out = await inFlight;
    assert.equal(out.status, 409, JSON.stringify(out.body));
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1 and lab_id = $2`, [u, BUILD]);
    assert.equal(n!.n, 0, "no attempt for a run that was abandoned");
    const run1 = await queryOne<{ completed_at: string | null; abandoned_at: string | null }>(`select completed_at, abandoned_at from lab_runs where id = $1`, [r.body.run.id]);
    assert.equal(run1!.completed_at, null);
    assert.ok(run1!.abandoned_at);
    assert.equal((await query(`select 1 from lab_run_steps where run_id = $1`, [r.body.run.id])).length, 0);
  });

  test("a restart racing a last step that finishes first leaves the run finished, not abandoned", async () => {
    const u = await newUser();
    const r = await startRun(u, BUILD);
    const done = await submit(u, BUILD, { runId: r.body.run.id, step: 0, answers: ["Execution role", "GetObject on uploads only"], clientAttemptId: randomUUID() });
    assert.equal(done.status, 200);
    await startRun(u, BUILD, true);
    const row = await queryOne<{ completed_at: string | null; abandoned_at: string | null }>(`select completed_at, abandoned_at from lab_runs where id = $1`, [r.body.run.id]);
    assert.ok(row!.completed_at);
    assert.equal(row!.abandoned_at, null);
  });
});

describe("Report a problem, quarantine and voiding", () => {
  test("a lab can be reported; enough reports pull it; confirming it wrong voids its attempts and recomputes mastery", async () => {
    const learner = await newUser();
    await finishBuild(learner);
    assert.equal((await mastery(learner, OBJ_BUILD))!.status, "Guided"); // REQ-218: one sitting
    const threshold = await quarantineThreshold();
    for (let i = 0; i < threshold; i++) {
      const u = i === 0 ? learner : await newUser();
      const input = await resolveReport(u, { kind: "lab", labId: BUILD, reason: "wrong_answer", note: "criteria look wrong" });
      const out = await reportItem(u, input);
      assert.equal(out.recheck, null, "labs go to a person, not the automated re-check");
    }
    const listed = await json(await listGet(req(learner, `http://t/api/labs?trackId=${track}`)));
    assert.ok(!listed.body.labs.some((l: any) => l.id === BUILD), "quarantined lab is not listed");
    assert.equal((await json(await labGet(req(learner), ctx(BUILD)))).status, 404);
    const voided = await confirmItemWrong({ kind: "lab", itemId: BUILD, objectiveId: OBJ_BUILD, question: "Lab build" }, "test");
    assert.ok(voided >= 1);
    const m = await mastery(learner, OBJ_BUILD);
    assert.notEqual(m!.status, "Guided", "the voided lab no longer counts");
    await query(`delete from item_status where item_kind = 'lab' and item_id = $1`, [BUILD]);
    await query(`delete from item_flags where item_kind = 'lab' and item_id = $1`, [BUILD]);
  });

  test("a grader that judges the rubric wrong flags the lab for review", async () => {
    const u = await newUser();
    classification = "key-suspect";
    await finishBuild(u);
    await new Promise((r) => setTimeout(r, 200));
    const f = await queryOne<{ source: string }>(`select source from item_flags where item_kind = 'lab' and item_id = $1 and user_id = $2`, [BUILD, u]);
    assert.equal(f?.source, "key_suspect");
    await query(`delete from item_flags where item_kind = 'lab' and item_id = $1`, [BUILD]);
  });

  test("an unknown lab or one on a course the learner can't see cannot be reported", async () => {
    const u = await newUser();
    await assert.rejects(resolveReport(u, { kind: "lab", labId: PRIVATE_LAB }), /not found/i);
    await assert.rejects(resolveReport(u, { kind: "lab" }), /labId/);
  });
});

describe("progress, the coach guard and export", () => {
  test("progress counts finished and correct labs per unit", async () => {
    const u = await newUser();
    await finishBuild(u);
    const p = await json(await progressGet(req(u, `http://t/api/labs/progress?trackId=${track}`)));
    assert.equal(p.status, 200);
    assert.deepEqual({ total: p.body.total, finished: p.body.finished, correct: p.body.correct }, { total: 2, finished: 1, correct: 1 });
  });

  test("the step a learner is on is an open item the coach must not answer; it leaves when graded", async () => {
    const u = await newUser();
    const r = await startRun(u, CASE);
    let items = await openItemsFor(u, track);
    assert.ok(items.some((i) => i.kind === "lab" && i.question.includes("STEP-ONE-TEXT")), JSON.stringify(items));
    await submit(u, CASE, { runId: r.body.run.id, step: 0, answers: ["Client 3 first"] });
    items = await openItemsFor(u, track);
    assert.ok(items.some((i) => i.kind === "lab" && i.question.includes("STEP-TWO-SECRET")));
    assert.ok(!items.some((i) => i.question.includes("STEP-ONE-TEXT")));
  });
});

describe("generated labs: every gate before storing", () => {
  const gen = (over: Partial<GeneratedLab> = {}): GeneratedLab => ({
    title: "Generated lab for the sibling objective",
    brief: "A fictional team needs a plan that meets three stated requirements.",
    safetyNote: "",
    steps: [{ text: "", ask: "Write the plan for the team.", parts: [{ label: "Plan", criteria: "Meets all three requirements.", modelAnswer: "A plan that meets them." }] }],
    confidence: "high",
    uncertainClaims: [],
    ...over,
  });
  const pass = async () => ({ referenceAnswersCorrect: true, safe: true, problems: [], unsupportedClaims: [] });

  test("uncertain, malformed, disputed or unchecked content is held back; clean content is stored for expert review once", async () => {
    const base = { objectiveId: OBJ_SIBLING, kind: "build" as const, model: "test" };
    assert.equal(await saveGeneratedLab({ ...base, generated: gen({ uncertainClaims: ["a quota"] }), checker: pass }), "held_uncertain");
    assert.equal(await saveGeneratedLab({ ...base, generated: gen({ steps: [] }), checker: pass }), "held_invalid");
    assert.equal(
      await saveGeneratedLab({ ...base, generated: gen(), checker: async () => ({ referenceAnswersCorrect: false, safe: true, problems: ["wrong"], unsupportedClaims: [] }) }),
      "held_check"
    );
    assert.equal(
      await saveGeneratedLab({ ...base, generated: gen(), checker: async () => { throw new Error("network"); } }),
      "held_check_error"
    );
    const held = await query(`select reason from item_holdbacks where item_kind = 'lab' and objective_id = $1 order by created_at`, [OBJ_SIBLING]);
    assert.deepEqual(held.map((h: any) => h.reason), ["uncertain", "fact_check", "fact_check", "fact_check_error"]);
    assert.equal(await saveGeneratedLab({ ...base, generated: gen(), checker: pass }), "saved");
    assert.equal(await saveGeneratedLab({ ...base, generated: gen(), checker: pass }), "exists");
    const row = await queryOne<{ source: string; review_status: string; slug: string }>(`select source, review_status, slug from labs where objective_id = $1`, [OBJ_SIBLING]);
    assert.deepEqual({ source: row!.source, review_status: row!.review_status }, { source: "generated", review_status: "needs_expert_review" });
    assert.match(row!.slug, /^gen-[0-9a-f]{12}$/);
    await query(`delete from labs where objective_id = $1`, [OBJ_SIBLING]);
  });
});

describe("seeding authored labs", () => {
  test("upsert keeps an expert's approval while content is unchanged, resets it when content changes, and retires labs the seed dropped", async () => {
    const code = `LAB-${run}`;
    // REQ-142: the seed's dated source; the database keeps the URL only.
    const OUTLINE = source("https://example.test/outline", "exam_outline", "2026-11-07");
    const lab = (title: string) => ({
      slug: "seed-test",
      objective: "LAB O2",
      kind: "build" as const,
      title,
      brief: "A fictional team asks for a written plan for its migration.",
      safetyNote: "Fictional.",
      steps: [{ text: "", ask: "Write the plan for the team.", parts: [{ label: "Plan", criteria: "Covers the requirement.", modelAnswer: "A plan covering the requirement." }] }],
    });
    await seedLabs(dbPool, { trackCode: code, sources: [OUTLINE], labs: [lab("Seed lab one")] });
    await query(`update labs set review_status = 'approved', reviewed_by = 'expert' where objective_id = $1 and slug = 'seed-test'`, [OBJ_SIBLING]);
    await seedLabs(dbPool, { trackCode: code, sources: [OUTLINE], labs: [lab("Seed lab one")] });
    let row = await queryOne<{ review_status: string; reviewed_by: string | null }>(`select review_status, reviewed_by from labs where objective_id = $1 and slug = 'seed-test'`, [OBJ_SIBLING]);
    assert.deepEqual(row, { review_status: "approved", reviewed_by: "expert" });
    const stored = await queryOne<{ sources: unknown }>(`select sources from labs where objective_id = $1 and slug = 'seed-test'`, [OBJ_SIBLING]);
    assert.deepEqual(stored?.sources, ["https://example.test/outline"]);
    await seedLabs(dbPool, { trackCode: code, sources: [OUTLINE], labs: [lab("Seed lab one, revised")] });
    row = await queryOne(`select review_status, reviewed_by from labs where objective_id = $1 and slug = 'seed-test'`, [OBJ_SIBLING]);
    assert.deepEqual(row, { review_status: "needs_expert_review", reviewed_by: null });
    // Dropped from the seed: retired (the hand-inserted fixtures are authored too).
    await seedLabs(dbPool, { trackCode: code, sources: [], labs: [lab("Seed lab one, revised")] });
    const retired = await query<{ slug: string }>(`select slug from labs where objective_id = any($1::uuid[]) and retired_at is not null order by slug`, [[OBJ_BUILD, OBJ_CASE]]);
    assert.deepEqual(retired.map((r) => r.slug), ["build", "case"]);
    await query(`update labs set retired_at = null where objective_id = any($1::uuid[])`, [[OBJ_BUILD, OBJ_CASE]]);
    await assert.rejects(seedLabs(dbPool, { trackCode: code, sources: [], labs: [{ ...lab("x y z w"), objective: "No such objective" }] }), /no active objective/);
    await query(`delete from labs where objective_id = $1`, [OBJ_SIBLING]);
  });
});

// ---------------------------------------------------------------------------
// REQ-124 (Nick's decisions of 2026-11-07)
// ---------------------------------------------------------------------------

describe("REQ-124 decision 14: a lab run moves the objective's review like a Solo answer", () => {
  const sched = (u: string, o: string) =>
    queryOne<{ step: number; lapses: number; due_on: string }>(
      `select step, lapses, to_char(due_on, 'YYYY-MM-DD') as due_on from review_schedule where user_id = $1 and objective_id = $2`,
      [u, o]
    );
  const due = async (u: string, o: string) => {
    await query(
      `insert into review_schedule (user_id, objective_id, due_on, step, enrolled_at) values ($1, $2, current_date, 1, now() - interval '10 days')
       on conflict (user_id, objective_id) do update set due_on = current_date, step = 1, lapses = 0`,
      [u, o]
    );
  };

  test("a correct first run steps a due schedule on and moves a due error_log entry, like a correct Solo answer", async () => {
    const u = await newUser();
    await due(u, OBJ_BUILD);
    const old = await query<{ id: string }>(
      `insert into error_log (user_id, unit_id, objective_id, topic, error_text, review_stage, next_review_at)
       values ($1, $2, $3, 't', 'e', 0, current_date) returning id`,
      [u, unit, OBJ_BUILD]
    );
    const before = await sched(u, OBJ_BUILD);
    const res = await finishBuild(u);
    assert.equal(res.body.final.verdict, "correct");
    const after = await sched(u, OBJ_BUILD);
    assert.ok(after!.step > before!.step, `schedule stepped on: ${before!.step} -> ${after!.step}`);
    assert.ok(after!.due_on > before!.due_on, "next review later");
    const log = await queryOne<{ verdict: string; was_due: boolean }>(`select verdict::text as verdict, was_due from review_log where user_id = $1 and objective_id = $2`, [u, OBJ_BUILD]);
    assert.deepEqual(log, { verdict: "correct", was_due: true });
    const e = await queryOne<{ review_stage: number }>(`select review_stage from error_log where id = $1`, [old[0].id]);
    assert.equal(e!.review_stage, 1, "the due entry moved one step");
  });

  test("a missed first run is a miss: logged for review, and a due schedule steps back", async () => {
    const u = await newUser();
    await due(u, OBJ_BUILD);
    score = "missed";
    const res = await finishBuild(u);
    assert.equal(res.body.final.verdict, "incorrect");
    const e = await query<{ review_stage: number; next_review_at: string }>(`select review_stage, next_review_at from error_log where user_id = $1 and objective_id = $2`, [u, OBJ_BUILD]);
    assert.equal(e.length, 1, "a review entry, as a missed Solo answer gets");
    assert.equal(e[0].review_stage, 0);
    const after = await sched(u, OBJ_BUILD);
    assert.equal(after!.lapses, 1, "the schedule recorded a lapse");
  });

  test("a repeat run (after the model answers were shown) moves nothing either way", async () => {
    const u = await newUser();
    score = "missed";
    await finishBuild(u);
    await due(u, OBJ_BUILD);
    const entries = (await query(`select 1 from error_log where user_id = $1`, [u])).length;
    const before = await sched(u, OBJ_BUILD);
    const logs = (await query(`select 1 from review_log where user_id = $1`, [u])).length;
    for (const sc of ["met", "missed"] as const) {
      score = sc;
      const r = await finishBuild(u);
      assert.equal(r.body.final.assistReason, "repeat");
    }
    assert.equal((await query(`select 1 from error_log where user_id = $1`, [u])).length, entries, "no new review entry");
    assert.deepEqual(await sched(u, OBJ_BUILD), before, "schedule untouched");
    assert.equal((await query(`select 1 from review_log where user_id = $1`, [u])).length, logs);
  });
});

describe("REQ-125 (reverses REQ-124 decision 11): serving and the lab disclaimer by subject family", () => {
  const clinicalTrack = randomUUID();
  const fitnessTrack = randomUUID();
  const cUnit = randomUUID();
  const fUnit = randomUUID();
  const cObj = randomUUID();
  const fObj = randomUUID();
  const cLab = randomUUID();
  const fLab = randomUUID();
  before(async () => {
    const sub = async (cat: string) =>
      (await queryOne<{ id: string }>(
        `select esc.id from education_subcategories esc join education_categories ec on ec.id = esc.category_id where ec.slug = $1 order by esc.sort_order limit 1`,
        [cat]
      ))!.id;
    await query(
      `insert into subject_tracks (id, code, title, track_type, user_id, subcategory_id) values ($1, $2, 'Clinical', 'certification', null, $3), ($4, $5, 'Fitness', 'certification', null, $6)`,
      [clinicalTrack, `LABC-${run}`, await sub("healthcare-nursing"), fitnessTrack, `LABF-${run}`, await sub("health-fitness")]
    );
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'C', 0), ($3, $4, 'F', 0)`, [cUnit, clinicalTrack, fUnit, fitnessTrack]);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'C O', 0), ($3, $4, 'F O', 0)`, [cObj, cUnit, fObj, fUnit]);
    for (const [id, o] of [[cLab, cObj], [fLab, fObj]]) {
      await query(
        `insert into labs (id, objective_id, slug, kind, title, brief, steps, rubric, safety_note, source, review_status, content_hash)
         values ($1, $2, $3, 'build', 'Clinical or fitness', 'A fictional brief with enough words to pass.', $4, $5, 'Fictional practice.', 'authored', 'needs_expert_review', 'h')`,
        [id, o, `fam-${id}`, JSON.stringify([{ text: "", ask: "Write the access design." }]), JSON.stringify(BUILD_RUBRIC)]
      );
    }
  });
  after(async () => {
    await query(`delete from labs where id = any($1::uuid[])`, [[cLab, fLab]]);
    await query(`delete from subject_tracks where id = any($1::uuid[])`, [[clinicalTrack, fitnessTrack]]);
  });

  // REQ-125 (Nick, 2026-11-07) reversed REQ-124 decision 11: unreviewed
  // clinical and fitness labs are served. REQ-165 (Nick, 2026-11-09): with no
  // per-lab disclaimer, no "Awaiting expert review" badge and no per-family
  // acknowledgement -- the one study notice covers labs, and the server
  // requires it before a clinical or fitness lab starts or is graded.
  test("REQ-165: unreviewed clinical and fitness labs are served by default, with no lab disclaimer", async () => {
    const u = await newUser();
    for (const [t, lab] of [[clinicalTrack, cLab], [fitnessTrack, fLab]]) {
      const list = (await json(await listGet(req(u, `http://t/api/labs?trackId=${t}`)))).body.labs;
      assert.deepEqual(list.map((l: any) => l.id), [lab]);
      const view = await json(await labGet(req(u), ctx(lab)));
      assert.equal(view.status, 200);
      assert.equal("disclaimer" in view.body, false);
    }
  });

  test("REQ-165: a clinical or fitness lab can't be started or graded until the study notice is accepted (403)", async () => {
    const u = await newUser();
    await query(`delete from legal_acceptances where user_id = $1 and document = 'study_notice'`, [u]); // this test is about not having accepted it
    // An acknowledgement under the old per-family gate (051) no longer counts.
    await query(`insert into lab_disclaimer_acknowledgements (user_id, family, version) values ($1, 'clinical', 1), ($1, 'fitness', 1)`, [u]);
    for (const lab of [cLab, fLab]) {
      const refused = await startRun(u, lab);
      assert.equal(refused.status, 403);
      assert.equal(refused.body.error, STUDY_NOTICE_REQUIRED_MESSAGE);
      assert.equal(refused.body.code, "study_notice_required");
    }
    const sub = await submit(u, cLab, { runId: randomUUID(), step: 0, answers: ["a b", "c d"] });
    assert.equal(sub.status, 403);
    assert.equal(await queryOne(`select 1 from lab_runs where user_id = $1`, [u]), null);

    const accepted = await noticePost(req(u, "http://t/api/onboarding/notice", "POST", { version: STUDY_NOTICE_VERSION }));
    assert.equal(accepted.status, 200);
    // One acceptance covers every family.
    assert.equal((await startRun(u, cLab)).status, 200);
    assert.equal((await startRun(u, fLab)).status, 200);
  });

  test("REQ-165: general labs need no study notice", async () => {
    const u = await newUser();
    assert.equal((await startRun(u, BUILD)).status, 200);
  });

  test("REQ-125: LABS_SERVE_UNREVIEWED=off still hides unreviewed labs in every subject family", async () => {
    const u = await newUser();
    process.env.LABS_SERVE_UNREVIEWED = "off";
    for (const [t, lab] of [[clinicalTrack, cLab], [fitnessTrack, fLab], [track, BUILD]]) {
      assert.deepEqual((await json(await listGet(req(u, `http://t/api/labs?trackId=${t}`)))).body.labs, []);
      assert.equal((await json(await labGet(req(u), ctx(lab)))).status, 404);
      assert.equal((await startRun(u, lab)).status, 404);
    }
    // Approved by an expert: served either way.
    await query(`update labs set review_status = 'approved' where id = $1`, [cLab]);
    try {
      const list = (await json(await listGet(req(u, `http://t/api/labs?trackId=${clinicalTrack}`)))).body.labs;
      assert.deepEqual(list.map((l: any) => [l.id, l.reviewStatus]), [[cLab, "approved"]]);
    } finally {
      await query(`update labs set review_status = 'needs_expert_review' where id = $1`, [cLab]);
      delete process.env.LABS_SERVE_UNREVIEWED;
    }
  });

  test("other subjects: served unreviewed by default; review status stays internal data", async () => {
    const u = await newUser();
    const on = (await json(await listGet(req(u, `http://t/api/labs?trackId=${track}`)))).body.labs;
    assert.ok(on.length >= 2 && on.every((l: any) => l.reviewStatus === "needs_expert_review"));
    const view = (await json(await labGet(req(u), ctx(BUILD)))).body;
    assert.equal(view.lab.reviewStatus, "needs_expert_review");
    assert.equal("disclaimer" in view, false);
    assert.equal((await startRun(u, BUILD)).status, 200);
    process.env.LABS_SERVE_UNREVIEWED = "off";
    assert.deepEqual((await json(await listGet(req(u, `http://t/api/labs?trackId=${track}`)))).body.labs, []);
  });
});

describe("REQ-124 decision 10: labs are Pro; Free and Plus get one sample lab per course", () => {
  const as = async (tier: "free" | "plus" | "pro") => {
    const u = await newUser();
    if (tier !== "free") await grantEntitlement({ userId: u, tier });
    return u;
  };
  beforeEach(() => {
    process.env.BILLING_ENABLED = "true";
  });
  after(() => {
    delete process.env.BILLING_ENABLED;
  });

  test("with no approved lab, the first served lab is the sample (REQ-125: labs are served before review)", async () => {
    for (const tier of ["free", "plus"] as const) {
      const u = await as(tier);
      const list = (await json(await listGet(req(u, `http://t/api/labs?trackId=${track}`)))).body.labs;
      assert.deepEqual(Object.fromEntries(list.map((l: any) => [l.id, l.access])), { [BUILD]: "sample", [CASE]: "locked" }, tier);
    }
  });

  test("the first APPROVED lab of the course is the sample, ahead of earlier unreviewed ones; the rest are listed as locked", async () => {
    // CASE approved, BUILD (earlier in the course) still awaiting review.
    await query(`update labs set review_status = 'approved' where id = $1`, [CASE]);
    try {
      for (const tier of ["free", "plus"] as const) {
        const u = await as(tier);
        const list = (await json(await listGet(req(u, `http://t/api/labs?trackId=${track}`)))).body.labs;
        const access = Object.fromEntries(list.map((l: any) => [l.id, l.access]));
        assert.deepEqual(access, { [BUILD]: "locked", [CASE]: "sample" }, tier);
        const view = await json(await labGet(req(u), ctx(CASE)));
        assert.equal(view.status, 200);
        assert.equal(view.body.lab.access, "sample");
        assert.equal((await startRun(u, CASE)).status, 200);
        const locked = await json(await labGet(req(u), ctx(BUILD)));
        assert.equal(locked.status, 402);
        assert.equal(locked.body.upgrade.feature, "labs");
        assert.equal(locked.body.upgrade.requiredTier, "pro");
        assert.equal((await startRun(u, BUILD)).status, 402);
      }
      // Once BUILD is approved it is first in the course, so it is the sample.
      await query(`update labs set review_status = 'approved' where id = $1`, [BUILD]);
      const u = await as("plus");
      const list = (await json(await listGet(req(u, `http://t/api/labs?trackId=${track}`)))).body.labs;
      assert.deepEqual(Object.fromEntries(list.map((l: any) => [l.id, l.access])), { [BUILD]: "sample", [CASE]: "locked" });
    } finally {
      await query(`update labs set review_status = 'needs_expert_review' where id = any($1::uuid[])`, [[BUILD, CASE]]);
    }
  });

  test("Pro and billing off: every lab is full; Free's sample is in their one course and counts as a graded answer (FAIL-511)", async () => {
    const p = await as("pro");
    assert.ok((await json(await listGet(req(p, `http://t/api/labs?trackId=${track}`)))).body.labs.every((l: any) => l.access === "full"));
    delete process.env.BILLING_ENABLED;
    const anyone = await newUser();
    assert.ok((await json(await listGet(req(anyone, `http://t/api/labs?trackId=${track}`)))).body.labs.every((l: any) => l.access === "full"));
    process.env.BILLING_ENABLED = "true";

    await query(`update labs set review_status = 'approved' where id = $1`, [BUILD]);
    try {
      const f = await as("free");
      const res = await finishBuild(f);
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(
        Number((await queryOne<{ n: number }>(`select count(*)::int as n from allowance_uses where user_id = $1 and kind = 'graded_answer'`, [f]))!.n),
        1,
        "a graded lab step is one of Free's graded typed answers"
      );
      // FAIL-511: Free studies one course. Once the free course is another
      // one, this course's labs are the usual one-course 402 (the merged lab
      // routes had no course check, so Free reached labs in every course).
      await query(`insert into free_course_choice (user_id, track_id, chosen_by) values ($1, $2, 'learner') on conflict (user_id) do update set track_id = excluded.track_id`, [f, otherTrack]);
      assert.equal((await json(await listGet(req(f, `http://t/api/labs?trackId=${track}`)))).status, 402);
    } finally {
      await query(`update labs set review_status = 'needs_expert_review' where id = $1`, [BUILD]);
    }
  });

  test("a run started on Pro may be finished and read after a downgrade; a new run may not (decision 6)", async () => {
    const u = await newUser();
    const ext = await query<{ id: string }>(
      `insert into entitlements (user_id, tier, source, external_id, status, period_end) values ($1, 'pro', 'stripe', $2, 'active', now() + interval '1 day') returning id`,
      [u, `sub_lab_${run}_${randomUUID()}`]
    );
    assert.equal(await tierFor(u), "pro");
    const r = await startRun(u, CASE);
    assert.equal(r.status, 200);
    await submit(u, CASE, { runId: r.body.run.id, step: 0, answers: ["Client 3 first"] });
    // The paid period ends (and the grace window with it).
    await query(`update entitlements set period_end = now() - interval '3 days' where id = $1`, [ext[0].id]);
    assert.equal(await tierFor(u), "free");
    await query(`insert into free_course_choice (user_id, track_id, chosen_by) values ($1, $2, 'learner')`, [u, otherTrack]);
    assert.equal((await json(await labGet(req(u), ctx(CASE)))).status, 200, "the open run is readable");
    assert.equal((await startRun(u, CASE)).status, 200, "resuming the open run");
    for (const [i, a] of [[1, "Stay and call for help"], [2, "Give an SBAR handover"]] as const) {
      const s2 = await submit(u, CASE, { runId: r.body.run.id, step: i, answers: [a] });
      assert.equal(s2.status, 200, JSON.stringify(s2.body));
    }
    assert.equal((await startRun(u, CASE, true)).status, 402, "a new run needs the plan");
  });
});
