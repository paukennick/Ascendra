// REQ-123: verifiable labs against a real Postgres with every migration
// applied: visibility and review gating, runs and step order, the per-part
// grader (fake model), one attempt per finished run as mastery evidence on
// the lab's objective only, the repeat rule, client-id replay and its 409s,
// "Report a problem" with quarantine and voiding, the coach guard, the
// generator's gates, the seed upsert and the schema's own checks.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
process.env.LABS_SERVE_UNREVIEWED = "on";
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
import { GET as listGet } from "../app/api/labs/route";
import { GET as progressGet } from "../app/api/labs/progress/route";
import { GET as labGet } from "../app/api/labs/[id]/route";
import { POST as runsPost } from "../app/api/labs/[id]/runs/route";
import { POST as submitPost } from "../app/api/labs/[id]/submit/route";

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
  score = "met";
  classification = "none";
  gradeCalls = 0;
  gradeDelayMs = 0;
  process.env.LABS_SERVE_UNREVIEWED = "on";
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
    assert.equal(m!.status, "Independent", m!.evidence);
    assert.match(m!.evidence, /unassisted formats: performance/);
    assert.equal(await mastery(u, OBJ_SIBLING), null, "not unit-wide");
    const detail = await queryOne<{ weighted_accuracy: string; evidence_weight: string }>(`select * from mastery_detail($1, $2)`, [u, OBJ_BUILD]);
    assert.equal(Number(detail!.weighted_accuracy), 1);
    assert.equal(Number(detail!.evidence_weight), 1.5);
    // No error_log entry and no review side effects for a lab.
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

describe("Report a problem, quarantine and voiding", () => {
  test("a lab can be reported; enough reports pull it; confirming it wrong voids its attempts and recomputes mastery", async () => {
    const learner = await newUser();
    await finishBuild(learner);
    assert.equal((await mastery(learner, OBJ_BUILD))!.status, "Independent");
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
    assert.notEqual(m!.status, "Independent", "the voided lab no longer counts");
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
    const lab = (title: string) => ({
      slug: "seed-test",
      objective: "LAB O2",
      kind: "build" as const,
      title,
      brief: "A fictional team asks for a written plan for its migration.",
      safetyNote: "Fictional.",
      steps: [{ text: "", ask: "Write the plan for the team.", parts: [{ label: "Plan", criteria: "Covers the requirement.", modelAnswer: "A plan covering the requirement." }] }],
    });
    await seedLabs(dbPool, { trackCode: code, sources: ["https://example.test/outline"], labs: [lab("Seed lab one")] });
    await query(`update labs set review_status = 'approved', reviewed_by = 'expert' where objective_id = $1 and slug = 'seed-test'`, [OBJ_SIBLING]);
    await seedLabs(dbPool, { trackCode: code, sources: ["https://example.test/outline"], labs: [lab("Seed lab one")] });
    let row = await queryOne<{ review_status: string; reviewed_by: string | null }>(`select review_status, reviewed_by from labs where objective_id = $1 and slug = 'seed-test'`, [OBJ_SIBLING]);
    assert.deepEqual(row, { review_status: "approved", reviewed_by: "expert" });
    await seedLabs(dbPool, { trackCode: code, sources: ["https://example.test/outline"], labs: [lab("Seed lab one, revised")] });
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
