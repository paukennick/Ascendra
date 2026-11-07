// REQ-121 (FAIL-440..442): the client-attempt-id replay binding (REQ-116,
// lib/replay-binding.ts) on the routes it had not reached yet.
//
// - Quiz me answers returned the stored verdict and feedback of WHICHEVER
//   attempt owned the id, on any quiz question. Now only the same question
//   replays; another question gets the shared 409 and nothing is written.
// - The lab report answered a mismatch with its own 400; now the shared 409.
// - The unit check refused a resend of an already-graded id with 400 when
//   the unit had since become ineligible (eligibility ran before the stored
//   result lookup); now the stored result comes back.
// Each test failed before the change. The model is a stub.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-replay";
process.env.CHOICE_ORDER_SECRET ??= "choice-secret-replay";
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
import { REPLAY_CONFLICT } from "./replay-binding";
import { UNIT_CHECK_NOT_ELIGIBLE } from "./unit-check";
import { POST as quizAnswerPost } from "../app/api/coach/quiz/answer/route";
import { POST as labReportPost } from "../app/api/objectives/[id]/lab/report/route";
import { POST as unitCheckPost } from "../app/api/units/[id]/check/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = [randomUUID(), randomUUID()];
const checkA = randomUUID();
const checkB = randomUUID();
const quizItems = [randomUUID(), randomUUID()];
const LAB_PROMPT = "Open the firewall log and find the blocked port.";
const LAB_QUESTIONS = ["Which port was blocked?", "Why was it blocked?"];
const SUB_PARTS = ["Identify", "Contain"];
const users: string[] = [];
let modelCalls = 0;

const auth = (u: string) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@replay.test` })}`,
  "content-type": "application/json",
});
async function call(handler: Function, u: string, body: unknown, params: Record<string, string> = {}) {
  const res: Response = await handler(
    new Request("http://t/x", { method: "POST", headers: auth(u), body: JSON.stringify(body) }),
    { params: Promise.resolve(params) }
  );
  return { status: res.status, body: (await res.json()) as any };
}
async function newUser() {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `replay-${run}-${users.length}@x.test`]);
  // Every objective studied, so the unit check is open.
  for (const o of objs) {
    await recordAttemptAndUpdateMastery({ userId: u, unitId: unit, objectiveId: o, kind: "lesson", stage: "solo", format: "open", question: `q-${o}`, answer: "a", verdict: "correct" });
  }
  return u;
}
const attemptsFor = async (u: string, cid: string) =>
  (await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1 and client_attempt_id = $2`, [u, cid]))!.n;
const allAttempts = async (u: string) =>
  (await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1`, [u]))!.n;

before(async () => {
  setAiCallSink(async () => undefined);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'RB', 'certification', null)`, [track, `RB-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, gate_description) values ($1, $2, 'U', 1, 'Can contain an incident')`, [unit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order, lab_prompt) values ($1, $2, $3, $4, $5)`, [o, unit, `RB O${i}`, i, LAB_PROMPT]);
    await query(`insert into lab_report_questions (objective_id, prompt_hash, questions, model) values ($1, $2, $3, 'test')`, [
      o,
      labPromptHash(LAB_PROMPT),
      JSON.stringify(LAB_QUESTIONS),
    ]);
    await query(
      `insert into coach_quiz_items (id, objective_id, question, choices, correct_index, hints, explanation, model)
       values ($1, $2, $3, $4, 0, $5, $6, 'test')`,
      [
        quizItems[i],
        o,
        `Which port does service ${i} use?`,
        JSON.stringify([`Port ${i}0`, `Port ${i}1`, `Port ${i}2`, `Port ${i}3`]),
        JSON.stringify(["Think about the default.", "Look at the service name."]),
        `Explanation ${i}: service ${i} listens on port ${i}0.`,
      ]
    );
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

describe("REQ-121: a client attempt id replays only the item it was recorded for", () => {
  test("FAIL-440 Quiz me: the id on another question is 409 with nothing written; on the same question it replays", async () => {
    const u = await newUser();
    const turns: string[] = [];
    for (const item of quizItems) {
      const t = await queryOne<{ id: string }>(`insert into coach_quiz_turns (user_id, track_id, item_id) values ($1, $2, $3) returning id`, [u, track, item]);
      turns.push(t!.id);
    }
    const cid = `cq-${randomUUID()}`;
    const first = await call(quizAnswerPost, u, { turnId: turns[0], choice: 0, clientAttemptId: cid });
    assert.equal(first.status, 200);
    assert.equal(first.body.replayed, false);
    const before = await allAttempts(u);

    // Same id on the OTHER question: refused, and it neither leaks the first
    // question's feedback nor uses up a try on the second.
    const other = await call(quizAnswerPost, u, { turnId: turns[1], choice: 0, clientAttemptId: cid });
    assert.equal(other.status, 409);
    assert.equal(other.body.error, REPLAY_CONFLICT);
    assert.equal(other.body.message, undefined);
    assert.ok(!JSON.stringify(other.body).includes("Explanation 0"));
    assert.equal(await allAttempts(u), before);
    const t2 = await queryOne<{ tries: number; status: string }>(`select tries, status from coach_quiz_turns where id = $1`, [turns[1]]);
    assert.deepEqual(t2, { tries: 0, status: "open" });

    // An id owned by a non-quiz attempt (a lesson answer) is refused too.
    const lessonCid = `ls-${randomUUID()}`;
    await recordAttemptAndUpdateMastery({ userId: u, unitId: unit, objectiveId: objs[1], kind: "lesson", stage: "solo", format: "open", question: "lesson q", answer: "a", verdict: "correct", clientAttemptId: lessonCid });
    const lessonReuse = await call(quizAnswerPost, u, { turnId: turns[1], choice: 0, clientAttemptId: lessonCid });
    assert.equal(lessonReuse.status, 409);

    // The same question's resend is still a replay of the stored answer.
    const again = await call(quizAnswerPost, u, { turnId: turns[0], choice: 0, clientAttemptId: cid });
    assert.equal(again.status, 200);
    assert.equal(again.body.replayed, true);
    assert.equal(again.body.message, first.body.message);
    assert.equal(await attemptsFor(u, cid), 1);
  });

  test("FAIL-441 lab report: the id on another objective's lab is the shared 409, with no model call", async () => {
    const u = await newUser();
    const cid = `lab-${randomUUID()}`;
    const answers = ["Port 23 was blocked by the edge firewall.", "Telnet is unencrypted, so policy denies it."];
    const first = await call(labReportPost, u, { answers, clientAttemptId: cid }, { id: objs[0] });
    assert.equal(first.status, 200);
    modelCalls = 0;
    const before = await allAttempts(u);
    const other = await call(labReportPost, u, { answers, clientAttemptId: cid }, { id: objs[1] });
    assert.equal(other.status, 409);
    assert.equal(other.body.error, REPLAY_CONFLICT);
    assert.equal(modelCalls, 0);
    assert.equal(await allAttempts(u), before);
    const again = await call(labReportPost, u, { answers, clientAttemptId: cid }, { id: objs[0] });
    assert.equal(again.status, 200);
    assert.equal(again.body.replayed, true);
  });

  // Runs last: it adds an objective to the shared unit.
  test("FAIL-442 unit check: a resend of a graded id gets its result after the unit becomes ineligible", async () => {
    const u = await newUser();
    const cid = `uc-${randomUUID()}`;
    const answer = "I would identify the beaconing host and isolate it from the network.";
    const first = await call(unitCheckPost, u, { checkId: checkA, answer, clientAttemptId: cid }, { id: unit });
    assert.equal(first.status, 200);
    assert.equal(first.body.verdict, "correct");

    // The course gains an objective this learner hasn't studied yet.
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'RB new', 9)`, [randomUUID(), unit]);
    modelCalls = 0;

    const resend = await call(unitCheckPost, u, { checkId: checkA, answer, clientAttemptId: cid }, { id: unit });
    assert.equal(resend.status, 200, JSON.stringify(resend.body));
    assert.equal(resend.body.replayed, true);
    assert.equal(resend.body.verdict, "correct");
    assert.equal(resend.body.feedback, first.body.feedback);
    assert.equal(await attemptsFor(u, cid), 1);

    // The binding still holds while ineligible: the id on another item is 409.
    const other = await call(unitCheckPost, u, { checkId: checkB, answer, clientAttemptId: cid }, { id: unit });
    assert.equal(other.status, 409);
    assert.equal(other.body.error, REPLAY_CONFLICT);

    // A NEW submission is still refused until the unit is studied again.
    const fresh = await call(unitCheckPost, u, { checkId: checkB, answer, clientAttemptId: `uc-${randomUUID()}` }, { id: unit });
    assert.equal(fresh.status, 400);
    assert.equal(fresh.body.error, UNIT_CHECK_NOT_ELIGIBLE);
    assert.equal(modelCalls, 0);
  });
});
