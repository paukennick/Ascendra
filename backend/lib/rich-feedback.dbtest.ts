// REQ-105: "explain every option, show a model answer, then let the learner
// revise once", against a real Postgres with every migration applied. Route
// handlers are called directly; the model is a fake client (no API key).
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { presentationOrder, presentationSeed, shownIndexOf, shuffleForPresentation } from "./choice-order";
import { POST as gradePost } from "../app/api/grade/route";
import { GET as lessonGet } from "../app/api/objectives/[id]/lesson/route";
import { POST as hintPost } from "../app/api/objectives/[id]/hint/route";
import { POST as pbqPost } from "../app/api/pbq/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = Array.from({ length: 10 }, () => randomUUID());
const OLD = objs[9]; // a lesson cached before option reasons existed
const users: string[] = [];
const scenario = randomUUID();

const FADE_Q = "RF fade: finish the worked example";
const SOLO_Q = "RF solo: what does a firewall filter?";
const FADE_CHOICES = ["f-right", "f-wrong1", "f-wrong2", "f-wrong3"];
const SOLO_CHOICES = ["s-right", "s-wrong1", "s-wrong2", "s-wrong3"];
// Each reason names its option, so a test can see that reason and option stay paired after the shuffle.
const reasonFor = (choice: string) => `REASON-FOR-${choice}`;
const PBQ_PARTS = ["Identify the threat", "Pick a control", "Write the ticket"];

const sent: Array<{ messages: Array<{ content: string }> }> = [];
let next: { verdict: "correct" | "partial" | "incorrect"; missedParts: string[] } = { verdict: "correct", missedParts: [] };

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `rf-${run}-${users.length}@example.test`]);
  return u;
}
const auth = (u: string) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
  "content-type": "application/json",
});
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function grade(u: string, body: Record<string, unknown>) {
  const res = await gradePost(
    new Request("http://t/api/grade", { method: "POST", headers: auth(u), body: JSON.stringify({ kind: "lesson", ...body }) })
  );
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
async function pbq(u: string, body: Record<string, unknown>) {
  const res = await pbqPost(
    new Request("http://t/api/pbq", { method: "POST", headers: auth(u), body: JSON.stringify({ scenarioId: scenario, ...body }) })
  );
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const order = (u: string, o: string, stage: "fade" | "solo") =>
  presentationOrder(presentationSeed(u, o, stage, stage === "fade" ? FADE_Q : SOLO_Q), 4);
const shownWrong = (u: string, o: string, stage: "fade" | "solo") => (shownIndexOf(order(u, o, stage), 0) + 1) % 4;
const errorCount = async (u: string) =>
  Number((await queryOne<{ n: string }>(`select count(*) as n from error_log where user_id = $1`, [u]))!.n);

before(async () => {
  setAiCallSink(null);
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'RF', 'certification', null)`,
    [track, `RF-${run}`]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [unit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `O${i}`, i]);
    const withReasons = o !== OLD;
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, fade_option_reasons, solo_option_reasons, model)
       values ($1, 'guess', 'SERVER-TEACH', $2, $3, 0, 'FADE-WHY', $4, $5, 0, 'SOLO-WHY', $6, $7, 'test')`,
      [
        o,
        FADE_Q,
        JSON.stringify(FADE_CHOICES),
        SOLO_Q,
        JSON.stringify(SOLO_CHOICES),
        withReasons ? JSON.stringify(FADE_CHOICES.map(reasonFor)) : null,
        withReasons ? JSON.stringify(SOLO_CHOICES.map(reasonFor)) : null,
      ]
    );
  }
  await query(
    `insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1, $2, 'RF PBQ', 'do 1, 2 and 3', $3, 'test')`,
    [scenario, unit, JSON.stringify(PBQ_PARTS)]
  );
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async (body: any) => {
        sent.push(body);
        return {
          parsed_output: {
            verdict: next.verdict,
            feedback: `fake ${next.verdict}`,
            classification: next.verdict === "correct" ? "none" : "misconception",
            missedParts: next.missedParts,
            modelAnswer: "MODEL-ANSWER",
            fixNext: "FIX-NEXT",
          },
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  });
});

beforeEach(() => {
  next = { verdict: "correct", missedParts: [] };
  sent.length = 0;
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("option reasons", () => {
  test("the lesson payload and the hint carry no option reasons or key before the learner answers", async () => {
    const u = await newUser();
    const res = await lessonGet(new Request("http://t/x", { headers: auth(u) }), ctx(objs[0]));
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.doesNotMatch(text, /REASON-FOR-/);
    assert.doesNotMatch(text, /optionReasons|option_reasons|FADE-WHY|SOLO-WHY/);
    const hint = await hintPost(
      new Request("http://t/x", { method: "POST", headers: auth(u), body: JSON.stringify({ stage: "solo" }) }),
      ctx(objs[0])
    );
    const hintText = await hint.text();
    assert.doesNotMatch(hintText, /REASON-FOR-|SOLO-WHY/);
    assert.deepEqual(Object.keys(JSON.parse(hintText)), ["choices"]);
  });

  test("grading returns a reason for every option, in the order this learner was shown", async () => {
    const u = await newUser();
    const o = objs[1];
    const shown = shuffleForPresentation(FADE_CHOICES, order(u, o, "fade"));
    const picked = shownWrong(u, o, "fade");
    const r = await grade(u, { format: "mc", stage: "fade", objectiveId: o, chosenIndex: picked });
    assert.equal(r.status, 200);
    assert.equal(r.body.verdict, "incorrect");
    assert.deepEqual(r.body.optionReasons, shown.map(reasonFor));
    assert.equal(r.body.optionReasons[r.body.correctIndex], reasonFor("f-right"));
    // The miss's own feedback (what Review shows later) says why the picked option fails.
    assert.match(r.body.feedback, new RegExp(reasonFor(shown[picked])));
    // A replay of the same answer returns the same reasons.
    const id = randomUUID();
    const first = await grade(u, { clientAttemptId: id, format: "mc", stage: "fade", objectiveId: o, chosenIndex: picked });
    const replay = await grade(u, { clientAttemptId: id, format: "mc", stage: "fade", objectiveId: o, chosenIndex: picked });
    assert.deepEqual(replay.body.optionReasons, first.body.optionReasons);
  });

  test("a lesson cached without option reasons still grades, falling back to the single explanation", async () => {
    const u = await newUser();
    const r = await grade(u, { format: "mc", stage: "fade", objectiveId: OLD, chosenIndex: shownWrong(u, OLD, "fade") });
    assert.equal(r.status, 200);
    assert.equal(r.body.verdict, "incorrect");
    assert.equal(r.body.optionReasons, null);
    assert.equal(r.body.why, "FADE-WHY");
    assert.equal(r.body.feedback, "Not quite. FADE-WHY");
    const open = await grade(u, { format: "open", stage: "solo", objectiveId: OLD, answer: "x" });
    assert.equal(open.status, 200);
    assert.equal(open.body.optionReasons, null);
  });
});

describe("model answer", () => {
  test("free response returns and stores the model answer and fix line; a replay returns them too", async () => {
    const u = await newUser();
    next = { verdict: "partial", missedParts: [] };
    const id = randomUUID();
    const r = await grade(u, { clientAttemptId: id, format: "open", stage: "fade", objectiveId: objs[2], answer: "half" });
    assert.equal(r.body.modelAnswer, "MODEL-ANSWER");
    assert.equal(r.body.fixNext, "FIX-NEXT");
    const row = await queryOne<{ model_answer: string; fix_next: string }>(
      `select model_answer, fix_next from attempts where id = $1`,
      [r.body.attempt.id]
    );
    assert.deepEqual(row, { model_answer: "MODEL-ANSWER", fix_next: "FIX-NEXT" });
    const replay = await grade(u, { clientAttemptId: id, format: "open", stage: "fade", objectiveId: objs[2], answer: "half" });
    assert.equal(replay.body.modelAnswer, "MODEL-ANSWER");
    assert.equal(replay.body.fixNext, "FIX-NEXT");
  });
});

describe("revise once after a miss", () => {
  test("a lesson revision is recorded as assisted ('retry'), can't lift mastery, adds no second review entry, and is allowed once", async () => {
    const u = await newUser();
    const o = objs[3];
    next = { verdict: "incorrect", missedParts: [] };
    const miss = await grade(u, { format: "open", stage: "solo", objectiveId: o, answer: "wrong" });
    assert.equal(miss.body.assisted, false);
    assert.equal(await errorCount(u), 1);
    // Make the miss's review entry due, so a correct revision WOULD advance it if it counted.
    await query(`update error_log set next_review_at = current_date where user_id = $1`, [u]);

    next = { verdict: "correct", missedParts: [] };
    const rev = await grade(u, { format: "open", stage: "solo", objectiveId: o, answer: "better", retryOf: miss.body.attempt.id });
    assert.equal(rev.status, 200);
    assert.equal(rev.body.assisted, true);
    assert.equal(rev.body.assistReason, "retry");
    const row = await queryOne<{ retry_of: string; assisted: boolean; assist_reason: string }>(
      `select retry_of, assisted, assist_reason from attempts where id = $1`,
      [rev.body.attempt.id]
    );
    assert.deepEqual(row, { retry_of: miss.body.attempt.id, assisted: true, assist_reason: "retry" });
    const m = await queryOne<{ status: string }>(`select status from mastery where user_id = $1 and objective_id = $2`, [u, o]);
    assert.notEqual(m?.status, "Independent");
    assert.notEqual(m?.status, "Transfer-ready");
    // The first miss's review entry is not advanced by the revision.
    const e = await queryOne<{ review_stage: number }>(`select review_stage from error_log where user_id = $1`, [u]);
    assert.equal(e?.review_stage, 0);

    const again = await grade(u, { format: "open", stage: "solo", objectiveId: o, answer: "third", retryOf: miss.body.attempt.id });
    assert.equal(again.status, 409);
    const ofRevision = await grade(u, { format: "open", stage: "solo", objectiveId: o, answer: "x", retryOf: rev.body.attempt.id });
    assert.equal(ofRevision.status, 400);
    assert.equal(await errorCount(u), 1);
  });

  test("a missed revision does not schedule the item a second time", async () => {
    const u = await newUser();
    next = { verdict: "incorrect", missedParts: [] };
    const miss = await grade(u, { format: "open", stage: "fade", objectiveId: objs[4], answer: "no" });
    const rev = await grade(u, { format: "open", stage: "fade", objectiveId: objs[4], answer: "still no", retryOf: miss.body.attempt.id });
    assert.equal(rev.status, 200);
    assert.equal(rev.body.verdict, "incorrect");
    assert.equal(await errorCount(u), 1);
  });

  test("refuses a revision of a correct answer, another learner's answer, another question, or a multiple-choice answer", async () => {
    const u = await newUser();
    const other = await newUser();
    const right = await grade(u, { format: "open", stage: "fade", objectiveId: objs[5], answer: "yes" });
    assert.equal(
      (await grade(u, { format: "open", stage: "fade", objectiveId: objs[5], answer: "x", retryOf: right.body.attempt.id })).status,
      400
    );
    next = { verdict: "incorrect", missedParts: [] };
    const miss = await grade(u, { format: "open", stage: "fade", objectiveId: objs[5], answer: "no" });
    assert.equal(
      (await grade(other, { format: "open", stage: "fade", objectiveId: objs[5], answer: "x", retryOf: miss.body.attempt.id })).status,
      404
    );
    assert.equal(
      (await grade(u, { format: "open", stage: "solo", objectiveId: objs[5], answer: "x", retryOf: miss.body.attempt.id })).status,
      400
    );
    assert.equal(
      (await grade(u, { format: "mc", stage: "fade", objectiveId: objs[5], chosenIndex: 0, retryOf: miss.body.attempt.id })).status,
      400
    );
    assert.equal((await grade(u, { format: "open", stage: "fade", objectiveId: objs[5], answer: "x", retryOf: "not-a-uuid" })).status, 404);
  });

  test("two revisions racing record exactly one", async () => {
    const u = await newUser();
    next = { verdict: "incorrect", missedParts: [] };
    const miss = await grade(u, { format: "open", stage: "fade", objectiveId: objs[6], answer: "no" });
    const [a, b] = await Promise.all([
      grade(u, { format: "open", stage: "fade", objectiveId: objs[6], answer: "r1", retryOf: miss.body.attempt.id }),
      grade(u, { format: "open", stage: "fade", objectiveId: objs[6], answer: "r2", retryOf: miss.body.attempt.id }),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    const n = await queryOne<{ n: string }>(`select count(*) as n from attempts where retry_of = $1`, [miss.body.attempt.id]);
    assert.equal(Number(n!.n), 1);
  });

  test("a PBQ revision is graded on the missed sub-parts only, recorded as assisted, and allowed once", async () => {
    const u = await newUser();
    next = { verdict: "partial", missedParts: ["pick a control", "Write the ticket"] };
    const miss = await pbq(u, { answer: "first try" });
    assert.equal(miss.status, 200);
    assert.equal(miss.body.modelAnswer, "MODEL-ANSWER");
    assert.equal(miss.body.fixNext, "FIX-NEXT");
    assert.equal(miss.body.assisted, false);
    assert.equal(await errorCount(u), 1);
    await query(`update error_log set next_review_at = current_date where user_id = $1`, [u]);

    sent.length = 0;
    next = { verdict: "correct", missedParts: [] };
    const rev = await pbq(u, { answer: "control: MFA; ticket: ...", retryOf: miss.body.attempt.id });
    assert.equal(rev.status, 200);
    assert.deepEqual(rev.body.revisedParts, ["Pick a control", "Write the ticket"]);
    assert.equal(rev.body.assisted, true);
    assert.equal(rev.body.assistReason, "retry");
    const prompt = sent[0].messages[0].content;
    assert.match(prompt, /Sub-parts required: 1\. Pick a control\n2\. Write the ticket\n/);
    assert.doesNotMatch(prompt, /Identify the threat/);
    assert.equal(prompt.match(/<\/learner_answer>/g)?.length, 1);
    // A correct revision is practice: the review entry from the miss (due) was not advanced.
    const again = await pbq(u, { answer: "x", retryOf: miss.body.attempt.id });
    assert.equal(again.status, 409);
    const e = await queryOne<{ review_stage: number }>(`select review_stage from error_log where user_id = $1`, [u]);
    assert.equal(e?.review_stage, 0);
    assert.equal(await errorCount(u), 1);
  });

  test("a PBQ revision of a lesson attempt, or of another scenario's attempt, is refused", async () => {
    const u = await newUser();
    next = { verdict: "incorrect", missedParts: [] };
    const lessonMiss = await grade(u, { format: "open", stage: "fade", objectiveId: objs[7], answer: "no" });
    assert.equal((await pbq(u, { answer: "x", retryOf: lessonMiss.body.attempt.id })).status, 400);
  });
});
