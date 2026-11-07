// REQ-120: the rest of the graded routes that take a clientAttemptId and
// bill a model call share one call among simultaneous copies of one
// submission (lib/grading-claims.ts, as REQ-117 did for /api/grade, /api/pbq
// and review answers). Each route: 20 identical copies at once -> exactly one
// model call and one attempt, every copy answered with the same result; and
// the id replayed on a different item is still refused. Each test failed
// before the change (20 model calls for 1 attempt). The model is a stub.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-claims";
process.env.CHOICE_ORDER_SECRET ??= "choice-secret-claims";
process.env.ITEM_FACT_CHECK = "off";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { labPromptHash } from "./lesson-experience";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { POST as unitCheckPost } from "../app/api/units/[id]/check/route";
import { POST as explainPost } from "../app/api/objectives/[id]/explain-back/route";
import { POST as labReportPost } from "../app/api/objectives/[id]/lab/report/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = [randomUUID(), randomUUID()];
const checkA = randomUUID();
const checkB = randomUUID();
const LAB_PROMPT = "Open the firewall log and find the blocked port.";
const LAB_QUESTIONS = ["Which port was blocked?", "Why was it blocked?"];
const users: string[] = [];
const SUB_PARTS = ["Identify", "Contain"];

let modelCalls = 0;
const MODEL_DELAY_MS = 150;

const auth = (u: string) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@claims.test` })}`,
  "content-type": "application/json",
});
async function call(handler: Function, u: string, body: unknown, params: Record<string, string>) {
  const res: Response = await handler(
    new Request("http://t/x", { method: "POST", headers: auth(u), body: JSON.stringify(body) }),
    { params: Promise.resolve(params) }
  );
  return { status: res.status, body: (await res.json()) as any };
}
async function newUser() {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `claims-${run}-${users.length}@x.test`]);
  // Real graded lesson answers, so the unit check stays eligible when its
  // attempt recomputes the unit's mastery; then Guided, so explain-back opens.
  for (const o of objs) {
    await recordAttemptAndUpdateMastery({ userId: u, unitId: unit, objectiveId: o, kind: "lesson", stage: "solo", format: "open", question: `q-${o}`, answer: "a", verdict: "correct" });
    await query(`update mastery set status = 'Guided', score_0_4 = 2 where user_id = $1 and objective_id = $2 and status not in ('Guided', 'Independent', 'Transfer-ready')`, [u, o]);
  }
  return u;
}
const attemptsFor = async (u: string, cid: string) =>
  (await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1 and client_attempt_id = $2`, [u, cid]))!.n;
const claimsFor = async (u: string) =>
  (await queryOne<{ n: number }>(`select count(*)::int as n from grading_claims where user_id = $1`, [u]))!.n;

// 20 copies at once. Every copy is 200 with the stored verdict and feedback,
// or the documented in-progress 409 (lib/grading-claims.ts) -- never a 500.
async function race(send: () => Promise<{ status: number; body: any }>) {
  modelCalls = 0;
  const res = await Promise.all(Array.from({ length: 20 }, send));
  const statuses = res.map((r) => r.status);
  assert.ok(statuses.every((s) => s === 200 || s === 409), statuses.join(","));
  const okRes = res.filter((r) => r.status === 200);
  assert.ok(okRes.length >= 1);
  for (const r of res.filter((r) => r.status === 409)) assert.match(r.body.error, /still being graded/);
  const verdicts = new Set(okRes.map((r) => r.body.verdict));
  const feedback = new Set(okRes.map((r) => r.body.feedback));
  assert.deepEqual([...verdicts], ["correct"]);
  assert.equal(feedback.size, 1, [...feedback].join(" | "));
  return { statuses, okCount: okRes.length };
}

before(async () => {
  setAiCallSink(async () => undefined);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'GC', 'certification', null)`, [track, `GC-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, gate_description) values ($1, $2, 'U', 1, 'Can contain an incident')`, [
    unit,
    track,
  ]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order, lab_prompt) values ($1, $2, $3, $4, $5)`, [o, unit, `GC O${i}`, i, LAB_PROMPT]);
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', 'Teaching about firewalls, ports and how incidents are contained.', 'f', '["a","b","c","d"]', 0, 'w', 's', '["a","b","c","d"]', 0, 'w', 'test')`,
      [o]
    );
    // Lab questions already written, so the only model call is the grader's.
    await query(`insert into lab_report_questions (objective_id, prompt_hash, questions, model) values ($1, $2, $3, 'test')`, [
      o,
      labPromptHash(LAB_PROMPT),
      JSON.stringify(LAB_QUESTIONS),
    ]);
  }
  for (const [id, title] of [
    [checkA, "Check A"],
    [checkB, "Check B"],
  ]) {
    await query(
      `insert into unit_check_items (id, unit_id, gate_hash, title, scenario, sub_parts, model) values ($1, $2, md5('Can contain an incident'), $3, 'A host is beaconing out.', $4, 't')`,
      [id, unit, title, JSON.stringify(SUB_PARTS)]
    );
  }
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async () => {
        modelCalls++;
        await new Promise((r) => setTimeout(r, MODEL_DELAY_MS));
        return {
          parsed_output: {
            verdict: "correct",
            feedback: "Clear and complete.",
            classification: "none",
            missedParts: [],
            modelAnswer: "model answer",
            fixNext: "next",
            parts: SUB_PARTS.map((part) => ({ part, score: "met", comment: "ok" })),
            rubric: { correct: true, complete: true, keyTerms: true, noMisconception: true },
            misconception: null,
            confusedWith: null,
          },
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  } as any);
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("REQ-120: racing copies of one submission call the model once on every graded route", () => {
  test("FAIL-430 unit check: 20 copies -> 1 model call, 1 attempt; the id on another check item is 409", async () => {
    const u = await newUser();
    const cid = `uc-${randomUUID()}`;
    const answer = "I would identify the beaconing host and isolate it from the network.";
    await race(() => call(unitCheckPost, u, { checkId: checkA, answer, clientAttemptId: cid }, { id: unit }));
    assert.equal(modelCalls, 1);
    assert.equal(await attemptsFor(u, cid), 1);
    assert.equal(await claimsFor(u), 0, "claim released");
    const again = await call(unitCheckPost, u, { checkId: checkA, answer, clientAttemptId: cid }, { id: unit });
    assert.equal(again.status, 200);
    assert.equal(again.body.replayed, true);
    const other = await call(unitCheckPost, u, { checkId: checkB, answer, clientAttemptId: cid }, { id: unit });
    assert.equal(other.status, 409);
    assert.equal(modelCalls, 1, "neither replay called the model");
  });

  test("FAIL-431 explain-back: 20 copies -> 1 model call, 1 attempt; the id on another objective is 409", async () => {
    const u = await newUser();
    const cid = `eb-${randomUUID()}`;
    const answer = "A firewall rule blocks a port so traffic to that service is dropped before it arrives.";
    await race(() => call(explainPost, u, { answer, clientAttemptId: cid }, { id: objs[0] }));
    assert.equal(modelCalls, 1);
    assert.equal(await attemptsFor(u, cid), 1);
    assert.equal(await claimsFor(u), 0, "claim released");
    const again = await call(explainPost, u, { answer, clientAttemptId: cid }, { id: objs[0] });
    assert.equal(again.status, 200);
    assert.equal(again.body.replayed, true);
    const other = await call(explainPost, u, { answer, clientAttemptId: cid }, { id: objs[1] });
    assert.equal(other.status, 409);
    assert.equal(modelCalls, 1, "neither replay called the model");
  });

  test("FAIL-432 lab report: 20 copies -> 1 model call, 1 attempt; the id on another objective's lab is refused", async () => {
    const u = await newUser();
    const cid = `lab-${randomUUID()}`;
    const answers = ["Port 23 was blocked by the edge firewall.", "Telnet is unencrypted, so policy denies it."];
    await race(() => call(labReportPost, u, { answers, clientAttemptId: cid }, { id: objs[0] }));
    assert.equal(modelCalls, 1);
    assert.equal(await attemptsFor(u, cid), 1);
    assert.equal(await claimsFor(u), 0, "claim released");
    const again = await call(labReportPost, u, { answers, clientAttemptId: cid }, { id: objs[0] });
    assert.equal(again.status, 200);
    assert.equal(again.body.replayed, true);
    // The lab route's binding (unchanged) answers a mismatch with 400, not 409.
    const other = await call(labReportPost, u, { answers, clientAttemptId: cid }, { id: objs[1] });
    assert.equal(other.status, 400);
    assert.match(other.body.error, /different answer/);
    assert.equal(modelCalls, 1, "neither replay called the model");
  });
});
