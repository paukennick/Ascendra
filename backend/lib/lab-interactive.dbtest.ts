// REQ-189: interactive lab parts through the real routes, on Postgres with
// every migration: the key is not in the payload before grading and is
// after; a step with only interactive parts makes no model call; a mixed
// step sends only its written part to the model; a structured answer
// naming foreign options is a 400; a resend replays; an app below protocol
// 2 gets the options in the step text and its written answer goes to the
// model; the finished run records one attempt with the answers in words.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
delete process.env.LABS_SERVE_UNREVIEWED;
import { recordStudyNoticeAcceptance } from "./study-notice";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { interactiveKey, type InteractiveSpec } from "./lab-interactive";
import { GET as labGet } from "../app/api/labs/[id]/route";
import { POST as runsPost } from "../app/api/labs/[id]/runs/route";
import { POST as submitPost } from "../app/api/labs/[id]/submit/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const OBJ = randomUUID();
const LAB = randomUUID();
const users: string[] = [];

const ORDER: InteractiveSpec = { type: "order", items: ["ORDER-FIRST", "ORDER-SECOND", "ORDER-THIRD", "ORDER-FOURTH"] };
const NUMERIC: InteractiveSpec = { type: "numeric", answer: 4321, tolerance: 0, unit: "days" };
const SELECT: InteractiveSpec = { type: "select", display: "log", lines: ["fine one", "BAD LINE", "fine two"], correct: [1] };
const STEPS = [
  { text: "STEP-ONE", ask: "Order the phases and give the float." },
  { text: "STEP-TWO-SECRET", ask: "Pick the bad line and explain it." },
];
const RUBRIC = [
  {
    parts: [
      { label: "Sequence", criteria: "ORDER-CRITERIA all four in order.", modelAnswer: "ORDER-MODEL first, second, third, fourth.", interactive: ORDER },
      { label: "Float", criteria: "NUMERIC-CRITERIA exactly 4321.", modelAnswer: "NUMERIC-MODEL float is 4321 days.", interactive: NUMERIC },
    ],
  },
  {
    parts: [
      { label: "Bad line", criteria: "SELECT-CRITERIA line 2.", modelAnswer: "SELECT-MODEL line 2 is bad.", interactive: SELECT },
      { label: "Why", criteria: "WHY-CRITERIA explains the failure.", modelAnswer: "WHY-MODEL because it failed." },
    ],
  },
];

let gradeCalls = 0;
let lastPrompt = "";

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `ilab-${run}-${users.length}@example.test`]);
  await recordStudyNoticeAcceptance(u); // REQ-205: model routes need the notice
  return u;
}
const headers = (u: string, protocol: string | null) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
  "content-type": "application/json",
  ...(protocol ? { "X-Ascendra-Client": protocol } : {}),
});
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (u: string, method: string, body?: unknown, protocol: string | null = "2") =>
  new Request("http://t/x", { method, headers: headers(u, protocol), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const view = (u: string, protocol: string | null = "2") => labGet(req(u, "GET", undefined, protocol), ctx(LAB)).then(json);
const start = (u: string, protocol: string | null = "2") => runsPost(req(u, "POST", {}, protocol), ctx(LAB)).then(json);
const submit = (u: string, body: Record<string, unknown>, protocol: string | null = "2") => submitPost(req(u, "POST", body, protocol), ctx(LAB)).then(json);
const orderIds = () => (interactiveKey(ORDER) as { order: string[] }).order;

before(async () => {
  setAiCallSink(null);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'ILAB course', 'certification', null)`, [track, `ILAB-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'ILAB unit', 0, 100)`, [unit, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'ILAB O', 0)`, [OBJ, unit]);
  await query(
    `insert into labs (id, objective_id, slug, kind, title, brief, steps, rubric, safety_note, source, review_status, content_hash)
     values ($1, $2, 'ilab', 'case', 'Interactive lab', 'A fictional brief with enough words to pass.', $3, $4, 'Fictional practice.', 'authored', 'needs_expert_review', 'h')`,
    [LAB, OBJ, JSON.stringify(STEPS), JSON.stringify(RUBRIC)]
  );
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async (body: any) => {
        const text = JSON.stringify(body);
        if (!text.includes("Rubric parts:")) throw new Error("unexpected model call");
        gradeCalls++;
        lastPrompt = text;
        const labels = [...text.matchAll(/\\n(\d+)\. ([^\\]+)\\n   Criteria:/g)].map((m) => m[2]);
        const out = { verdict: "correct", feedback: "fake met", classification: "none", missedParts: [], fixNext: "", parts: labels.map((part) => ({ part, score: "met", comment: "c" })) };
        return { parsed_output: out, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
    },
  });
});

beforeEach(() => {
  gradeCalls = 0;
  lastPrompt = "";
  delete process.env.BILLING_ENABLED;
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from attempts where lab_id = $1`, [LAB]);
  await query(`delete from labs where id = $1`, [LAB]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("interactive lab parts through the routes (REQ-189)", () => {
  test("the app gets controls without the key; the key arrives only with the graded step", async () => {
    const u = await newUser();
    const v = await view(u);
    assert.equal(v.status, 200);
    const s0 = v.body.lab.steps[0];
    assert.deepEqual(s0.parts, ["Sequence", "Float"]);
    assert.equal(s0.inputs[0].type, "order");
    assert.notDeepEqual(s0.inputs[0].items.map((c: any) => c.id), orderIds(), "served shuffled");
    assert.deepEqual(s0.inputs[1], { type: "numeric", unit: "days" });
    const text = JSON.stringify(v.body);
    for (const secret of ["4321", "ORDER-CRITERIA", "ORDER-MODEL", "NUMERIC-MODEL", "STEP-TWO-SECRET", "BAD LINE", "SELECT-CRITERIA"]) {
      assert.ok(!text.includes(secret), `${secret} must not be sent before grading`);
    }
    assert.equal(s0.text, "STEP-ONE", "a protocol-2 app gets the step text unchanged");

    const r = await start(u);
    const cid = randomUUID();
    const answers = [JSON.stringify(orderIds()), "4,321 days"];
    const g = await submit(u, { runId: r.body.run.id, step: 0, answers, clientAttemptId: cid });
    assert.equal(g.status, 200);
    assert.equal(gradeCalls, 0, "an all-interactive step makes no model call");
    assert.equal(g.body.step.verdict, "correct");
    assert.deepEqual(g.body.step.partScores.map((p: any) => p.score), ["met", "met"]);
    assert.deepEqual(g.body.step.reference[0].key, { type: "order", order: orderIds() });
    assert.equal(g.body.step.reference[1].key.answer, 4321);
    assert.deepEqual(g.body.step.responses, answers);
    assert.match(g.body.step.answers[0], /^1\. ORDER-FIRST; 2\. ORDER-SECOND/);
    assert.equal(g.body.nextStep.inputs[0].type, "select");
    assert.ok(!JSON.stringify(g.body.nextStep).includes("SELECT-CRITERIA"));
    assert.ok(!JSON.stringify(g.body.nextStep).includes('"correct"'));

    const replay = await submit(u, { runId: r.body.run.id, step: 0, answers, clientAttemptId: cid });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.replayed, true);
    assert.deepEqual(replay.body.step.reference[0].key, { type: "order", order: orderIds() });
  });

  test("a mixed step sends only the written part to the model; the run records one attempt in words", async () => {
    const u = await newUser();
    const r = await start(u);
    const runId = r.body.run.id;
    const swapped = [orderIds()[1], orderIds()[0], ...orderIds().slice(2)];
    const s0 = await submit(u, { runId, step: 0, answers: [JSON.stringify(swapped), "4300"] });
    assert.equal(s0.status, 200);
    assert.deepEqual(s0.body.step.partScores.map((p: any) => p.score), ["partial", "missed"]);
    assert.equal(s0.body.step.verdict, "partial");
    const lines = s0.body.nextStep.inputs[0].lines;
    const s1 = await submit(u, { runId, step: 1, answers: [JSON.stringify([lines[1].id]), "Because it failed authentication."] });
    assert.equal(s1.status, 200);
    assert.equal(gradeCalls, 1);
    assert.ok(lastPrompt.includes("WHY-CRITERIA") && !lastPrompt.includes("SELECT-CRITERIA"), "only the written part is in the prompt");
    assert.deepEqual(s1.body.step.partScores.map((p: any) => p.score), ["met", "met"]);
    assert.equal(s1.body.final.verdict, "partial");
    const a = await queryOne<{ answer: string; part_scores: { part: string; score: string }[] }>(`select answer, part_scores from attempts where user_id = $1 and lab_id = $2`, [u, LAB]);
    assert.match(a!.answer, /Sequence: 1\. ORDER-SECOND; 2\. ORDER-FIRST/);
    assert.match(a!.answer, /Bad line: line 2: BAD LINE/);
    assert.deepEqual(a!.part_scores.map((p) => p.score), ["partial", "missed", "met", "met"]);
  });

  test("a structured answer naming options the part doesn't have is a 400, and nothing is stored", async () => {
    const u = await newUser();
    const r = await start(u);
    const bad = await submit(u, { runId: r.body.run.id, step: 0, answers: [JSON.stringify(["x", "y", "z", "w"]), "4321"] });
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /^part 1: /);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from lab_run_steps where run_id = $1`, [r.body.run.id]);
    assert.equal(n!.n, 0);
  });

  test("an app below protocol 2 sees the options in the step text, and its written answer is graded by the model", async () => {
    const u = await newUser();
    const v = await view(u, null);
    assert.match(v.body.lab.steps[0].text, /^STEP-ONE\n\nSequence -- put these in order: .*ORDER-THIRD/);
    assert.match(v.body.lab.steps[0].text, /Float -- give the number in days\./);
    assert.ok(!JSON.stringify(v.body).includes("4321"));
    const r = await start(u, "1");
    const g = await submit(u, { runId: r.body.run.id, step: 0, answers: ["First, then second, then third, then fourth", "4321"] }, "1");
    assert.equal(g.status, 200);
    assert.equal(gradeCalls, 1, "the written order goes to the model");
    assert.ok(lastPrompt.includes("ORDER-CRITERIA") && !lastPrompt.includes("NUMERIC-CRITERIA"));
    assert.deepEqual(g.body.step.partScores.map((p: any) => p.score), ["met", "met"]);
    assert.match(g.body.nextStep.text, /Bad line -- which of these lines are the problem\?\n1\. fine one\n2\. BAD LINE/);
  });
});
