// REQ-110: learner-aware coach + "Quiz me", placement check, study plan and
// the kept view, through their API routes against a real Postgres with every
// migration applied. The model is a fake client; no API key is involved.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { presentationOrder, presentationSeed, shownIndexOf } from "./choice-order";
import { POST as chatPost } from "../app/api/chat/route";
import { POST as quizPost } from "../app/api/coach/quiz/route";
import { POST as quizAnswerPost } from "../app/api/coach/quiz/answer/route";
import { GET as placementGet, POST as placementPost } from "../app/api/courses/[id]/placement/route";
import { GET as planGet, PUT as planPut } from "../app/api/courses/[id]/plan/route";
import { BEGINNER_STOP } from "./placement";

const run = Date.now().toString(36);
const track = randomUUID();
const privateTrack = randomUUID();
const unitA = randomUUID();
const unitB = randomUUID();
const objsA: string[] = Array.from({ length: 4 }, () => randomUUID());
const objsB: string[] = Array.from({ length: 3 }, () => randomUUID());
const all: string[] = [...objsA, ...objsB];
const users: string[] = [];
const title = (o: string) => `Objective ${all.indexOf(o) + 1}`;
const fadeQ = (o: string) => `Guided question for ${title(o)}: finish the last step.`;
const FADE_CHOICES = ["wrong one", "the right one", "wrong two", "wrong three"];

const QUIZ_ITEM = {
  question: "Which mode numbers each block with a counter?",
  choices: ["Electronic codebook", "Cipher block chaining", "Counter mode CTR", "Output feedback"],
  correctIndex: 2,
  hints: ["Think about what gets numbered.", "It is not the one that chains blocks together."],
  explanation: "CTR encrypts a counter per block, which makes it a stream cipher.",
};

type Body = { system: Array<{ text: string }>; messages: unknown[] };
const created: Body[] = [];
const parsed: Body[] = [];

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `cp-${run}-${users.length}@example.test`]);
  return u;
}
const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const req = (u: string, url: string, method = "GET", body?: unknown) =>
  new Request(`http://t${url}`, { method, headers: auth(u), body: body === undefined ? undefined : JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}

async function lessonAnswer(u: string, o: string, verdict: "correct" | "incorrect", question = `solo q ${randomUUID()}`) {
  return recordAttemptAndUpdateMastery({
    userId: u,
    unitId: objsA.includes(o) ? unitA : unitB,
    objectiveId: o,
    kind: "lesson",
    stage: "solo",
    format: "open",
    question,
    answer: "a",
    verdict,
    classification: verdict === "correct" ? "none" : "misconception",
  });
}
const detail = (u: string, o: string) =>
  queryOne<{ status: string; weighted_accuracy: string; evidence_weight: string }>(`select * from mastery_detail($1, $2)`, [u, o]);

before(async () => {
  setAiCallSink(null);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Crypto plan', 'certification', null)`, [
    track,
    `CP-${run}`,
  ]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Ciphers', 1, 60), ($3, $2, 'Keys', 2, 40)`, [
    unitA,
    track,
    unitB,
  ]);
  for (const [i, o] of all.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [
      o,
      objsA.includes(o) ? unitA : unitB,
      title(o),
      i + 1,
    ]);
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', 'teach', $2, $3, 1, 'w', $4, '["a","b","c","d"]', 0, 'w', 'test')`,
      [o, fadeQ(o), JSON.stringify(FADE_CHOICES), `solo for ${title(o)}`]
    );
  }
  const owner = await newUser();
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Mine', 'certification', $3)`, [
    privateTrack,
    `CPP-${run}`,
    owner,
  ]);
  __setClientForTest({
    messages: {
      create: async (body: Body) => {
        created.push(body);
        return { content: [{ type: "text", text: "Let's work it through." }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
      parse: async (body: Body) => {
        parsed.push(body);
        return { parsed_output: QUIZ_ITEM, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
    },
  });
});

beforeEach(() => {
  created.length = 0;
  parsed.length = 0;
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, privateTrack]]);
  await closePool();
});

describe("learner-aware coach (REQ-110, research #8)", () => {
  test("chat names the weakest objectives and mistake kinds in the per-call block, fenced; the stable block is unchanged", async () => {
    const u = await newUser();
    await lessonAnswer(u, objsA[1], "incorrect");
    await lessonAnswer(u, objsA[1], "incorrect");
    await lessonAnswer(u, objsA[0], "correct");
    await json(await chatPost(req(u, "/api/chat", "POST", { trackId: track, message: "help me" })));
    assert.equal(created.length, 1);
    const [stable, task] = created[0].system.map((s) => s.text);
    assert.match(task, /<learner_profile>\nWeakest objectives right now:\n1\. Objective 2 \(unit: Ciphers\) - Needs review, weighted accuracy 0%/);
    assert.match(task, /Recent kinds of mistake: misconception \(2\)/);
    assert.ok(!stable.includes("learner_profile") && !stable.includes("Objective 2"));

    const fresh = await newUser();
    await json(await chatPost(req(fresh, "/api/chat", "POST", { trackId: track, message: "hi" })));
    assert.equal(created[1].system[0].text, stable, "same cached prefix for every learner");
    assert.ok(!created[1].system[1].text.includes("learner_profile"), "nothing to say about a new learner");
  });
});

describe("Quiz me on my weak spots", () => {
  test("no graded evidence yet: no question, no model call", async () => {
    const u = await newUser();
    const body = await json(await quizPost(req(u, "/api/coach/quiz", "POST", { trackId: track })));
    assert.equal(body.turn, null);
    assert.equal(body.reason, "no_weak_spots");
    assert.equal(parsed.length, 0);
  });

  test("hints after misses, answer only after the last try; recorded as coach-assisted with zero weight; no Review entry", async () => {
    const u = await newUser();
    await lessonAnswer(u, objsA[2], "incorrect");
    await lessonAnswer(u, objsA[2], "correct");
    const before = await detail(u, objsA[2]);
    const errorsBefore = (await queryOne<{ n: number }>(`select count(*)::int as n from error_log where user_id = $1`, [u]))!.n;

    const { turn } = await json(await quizPost(req(u, "/api/coach/quiz", "POST", { trackId: track })));
    assert.equal(parsed.length, 1, "one model call writes the question");
    assert.equal(turn.objectiveId, objsA[2]);
    assert.equal(turn.correctIndex, null, "no key before answering");
    assert.equal(turn.explanation, null);
    assert.deepEqual([...turn.choices].sort(), [...QUIZ_ITEM.choices].sort());
    const again = await json(await quizPost(req(u, "/api/coach/quiz", "POST", { trackId: track })));
    assert.equal(again.turn.id, turn.id, "the open question is resumed");
    assert.equal(parsed.length, 1);

    const order = presentationOrder(presentationSeed(u, objsA[2], "coach_quiz", QUIZ_ITEM.question), 4);
    const right = shownIndexOf(order, 2);
    const wrong = [0, 1, 2, 3].filter((i) => i !== right);

    const a1 = await json(await quizAnswerPost(req(u, "/api/coach/quiz/answer", "POST", { turnId: turn.id, choice: wrong[0], clientAttemptId: `cq-${run}-1` })));
    assert.equal(a1.correct, false);
    assert.match(a1.message, /Think about what gets numbered/);
    assert.ok(!a1.message.includes("Counter mode CTR"));
    assert.deepEqual(a1.turn.hints, [QUIZ_ITEM.hints[0]]);
    const replay = await json(await quizAnswerPost(req(u, "/api/coach/quiz/answer", "POST", { turnId: turn.id, choice: right, clientAttemptId: `cq-${run}-1` })));
    assert.equal(replay.replayed, true);
    assert.equal(replay.turn.tries, 1, "a retried submit is not a second try");

    // While the question is open, "Ask the coach" holds it back too.
    await json(await chatPost(req(u, "/api/chat", "POST", { trackId: track, message: "which mode numbers each block with a counter?" })));
    assert.match(created.at(-1)!.system[1].text, /\[Quiz me question, not answered yet\] Objective 3: Which mode numbers/);
    assert.ok(!created.at(-1)!.system[1].text.includes("Counter mode CTR"));

    const a2 = await json(await quizAnswerPost(req(u, "/api/coach/quiz/answer", "POST", { turnId: turn.id, choice: wrong[1] })));
    assert.match(a2.message, /not the one that chains/);
    const a3 = await json(await quizAnswerPost(req(u, "/api/coach/quiz/answer", "POST", { turnId: turn.id, choice: wrong[2] })));
    assert.equal(a3.turn.status, "revealed");
    assert.equal(a3.turn.correctIndex, right);
    assert.match(a3.message, /Counter mode CTR/);
    const closed = await json(await quizAnswerPost(req(u, "/api/coach/quiz/answer", "POST", { turnId: turn.id, choice: right })));
    assert.equal(closed.closed, true);

    const rows = await query<{ assessment_type: string; assisted: boolean; assist_reason: string; kind: string }>(
      `select assessment_type, assisted, assist_reason, kind from attempts where user_id = $1 and assessment_type = 'coach_quiz' order by created_at`,
      [u]
    );
    assert.deepEqual(
      rows.map((r) => [r.kind, r.assisted, r.assist_reason]),
      [["quiz", true, "coach"], ["quiz", true, "retry"], ["quiz", true, "retry"]]
    );
    const after = await detail(u, objsA[2]);
    assert.equal(after!.weighted_accuracy, before!.weighted_accuracy, "zero weight: accuracy unchanged");
    assert.equal(after!.evidence_weight, before!.evidence_weight);
    const errorsAfter = (await queryOne<{ n: number }>(`select count(*)::int as n from error_log where user_id = $1`, [u]))!.n;
    assert.equal(errorsAfter, errorsBefore, "quiz misses do not go to Review");
  });

  test("a coached correct answer never lifts an objective to Independent", async () => {
    const u = await newUser();
    await lessonAnswer(u, objsB[0], "incorrect");
    const { turn } = await json(await quizPost(req(u, "/api/coach/quiz", "POST", { trackId: track })));
    const order = presentationOrder(presentationSeed(u, turn.objectiveId, "coach_quiz", QUIZ_ITEM.question), 4);
    const res = await json(await quizAnswerPost(req(u, "/api/coach/quiz/answer", "POST", { turnId: turn.id, choice: shownIndexOf(order, 2) })));
    assert.equal(res.correct, true);
    assert.equal(res.turn.status, "correct");
    const m = await queryOne<{ status: string }>(`select status from mastery where user_id = $1 and objective_id = $2`, [u, turn.objectiveId]);
    assert.ok(!["Independent", "Transfer-ready"].includes(m!.status), m!.status);
  });

  test("questions are shared: a second learner on the same objective costs no model call", async () => {
    const u = await newUser();
    await lessonAnswer(u, objsA[2], "incorrect");
    const { turn } = await json(await quizPost(req(u, "/api/coach/quiz", "POST", { trackId: track })));
    assert.equal(turn.objectiveId, objsA[2]);
    assert.equal(parsed.length, 0);
  });

  test("someone else's quiz question is not found", async () => {
    const u = await newUser();
    const other = await newUser();
    await lessonAnswer(u, objsA[3], "incorrect");
    const { turn } = await json(await quizPost(req(u, "/api/coach/quiz", "POST", { trackId: track })));
    await json(await quizAnswerPost(req(other, "/api/coach/quiz/answer", "POST", { turnId: turn.id, choice: 0 })), 404);
    await json(await quizPost(req(other, "/api/coach/quiz", "POST", { trackId: privateTrack })), 404);
  });
});

describe("placement check", () => {
  async function answerCurrent(u: string, view: any, correct: boolean) {
    const item = view.current;
    const order = presentationOrder(presentationSeed(u, item.objectiveId, "placement", item.question), FADE_CHOICES.length);
    const right = shownIndexOf(order, 1);
    const choice = correct ? right : (right + 1) % 4;
    return json(await placementPost(req(u, `/api/courses/${track}/placement`, "POST", { action: "answer", seq: item.seq, choice, clientAttemptId: `pl-${randomUUID()}` }), params(track)));
  }

  test("an expert tests out of what they answer; that is placement evidence only (Guided at most), with no Review entries", async () => {
    const u = await newUser();
    const plan0 = await json(await planGet(req(u, `/api/courses/${track}/plan?today=2026-11-07`), params(track)));
    assert.equal(plan0.placement.offer, true);
    let view = await json(await placementPost(req(u, `/api/courses/${track}/placement`, "POST", { action: "start" }), params(track)));
    assert.equal(view.status, "active");
    assert.equal(view.current.objectiveId, objsA[0], "starts at the beginning");
    assert.equal(view.current.question, fadeQ(objsA[0]));
    assert.ok(!("correctIndex" in view.current));
    while (view.status === "active") view = await answerCurrent(u, view, true);
    assert.equal(view.status, "done");
    assert.match(view.summary.message, /knew all/);

    const tested = await query<{ objective_id: string }>(
      `select pi.objective_id from placement_items pi join placement_checks pc on pc.id = pi.placement_id where pc.user_id = $1 and pi.correct`,
      [u]
    );
    assert.ok(tested.length >= 3);
    const statuses = await query<{ status: string }>(`select status::text from mastery where user_id = $1`, [u]);
    assert.ok(statuses.every((s) => s.status === "Guided"), JSON.stringify(statuses));
    const types = await query<{ assessment_type: string; assisted: boolean }>(`select assessment_type, assisted from attempts where user_id = $1`, [u]);
    assert.ok(types.every((t) => t.assessment_type === "placement" && !t.assisted));
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from error_log where user_id = $1`, [u]))!.n, 0);

    // The plan skips ahead past them and confirms them at the end.
    const plan = await json(await planGet(req(u, `/api/courses/${track}/plan?today=2026-11-07`), params(track)));
    assert.equal(plan.plan.remaining.confirm, tested.length);
    assert.equal(plan.placement.offer, false);
    const steps = plan.plan.thisWeek.steps as Array<{ kind: string; objectiveId: string }>;
    assert.ok(!steps.slice(0, 1).some((s) => s.kind === "confirm"));
    // Replaying an answer changes nothing; a finished check is not restarted.
    const again = await json(await placementPost(req(u, `/api/courses/${track}/placement`, "POST", { action: "start" }), params(track)));
    assert.equal(again.status, "done");
  });

  test("a beginner gets a short, kind check and starts at the beginning", async () => {
    const u = await newUser();
    let view = await json(await placementPost(req(u, `/api/courses/${track}/placement`, "POST", { action: "start" }), params(track)));
    while (view.status === "active") view = await answerCurrent(u, view, false);
    assert.ok(view.summary.asked <= BEGINNER_STOP);
    assert.equal(view.summary.correct, 0);
    assert.match(view.summary.message, /beginning, one step at a time/);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from error_log where user_id = $1`, [u]))!.n, 0);
    const plan = await json(await planGet(req(u, `/api/courses/${track}/plan?today=2026-11-07`), params(track)));
    assert.equal(plan.plan.thisWeek.steps[0].objectiveId, objsA[0]);
  });

  test("a stale or replayed submit does not record a second answer; skip works", async () => {
    const u = await newUser();
    const view = await json(await placementPost(req(u, `/api/courses/${track}/placement`, "POST", { action: "start" }), params(track)));
    const stale = await json(await placementPost(req(u, `/api/courses/${track}/placement`, "POST", { action: "answer", seq: 99, choice: 0 }), params(track)));
    assert.equal(stale.stale, true);
    const id = `pl-${randomUUID()}`;
    const b = { action: "answer", seq: view.current.seq, choice: 0, clientAttemptId: id };
    await json(await placementPost(req(u, `/api/courses/${track}/placement`, "POST", b), params(track)));
    const r = await json(await placementPost(req(u, `/api/courses/${track}/placement`, "POST", b), params(track)));
    assert.equal(r.replayed, true);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1`, [u]))!.n, 1);
    const skipped = await json(await placementPost(req(u, `/api/courses/${track}/placement`, "POST", { action: "skip" }), params(track)));
    assert.equal(skipped.status, "skipped");
    const got = await json(await placementGet(req(u, `/api/courses/${track}/placement`), params(track)));
    assert.equal(got.current, null);
  });

  test("placement alone never reaches Independent or Transfer-ready, even answered on separate days", async () => {
    const u = await newUser();
    for (const ago of ["3 days", "1 day"]) {
      await query(
        `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, assessment_type, created_at)
         values ($1, $2, $3, 'quiz', 'placement', 'mc', $4, 'a', 'correct', 'placement', now() - $5::interval)`,
        [u, unitA, objsA[0], `p-${ago}`, ago]
      );
    }
    const d = await detail(u, objsA[0]);
    assert.equal(d!.status, "Guided");
  });
});

describe("study plan, session choice and kept view", () => {
  test("settings are validated, saved, and the plan is built back from the exam date", async () => {
    const u = await newUser();
    await json(await planPut(req(u, `/api/courses/${track}/plan`, "PUT", { examDate: "2020-01-01", weeklyHours: 5 }), params(track)), 400);
    await json(await planPut(req(u, `/api/courses/${track}/plan`, "PUT", { weeklyHours: 500 }), params(track)), 400);
    const today = new Date().toISOString().slice(0, 10);
    const exam = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
    const body = await json(await planPut(req(u, `/api/courses/${track}/plan`, "PUT", { examDate: exam, weeklyHours: 3, today }), params(track)));
    assert.deepEqual(body.settings, { examDate: exam, weeklyHours: 3, saved: true });
    assert.equal(body.plan.phase, "building");
    assert.equal(body.plan.mockExamDate, new Date(Date.now() + 33 * 86_400_000).toISOString().slice(0, 10));
    assert.equal(body.plan.feasibility.status, "on_track");
    assert.equal(body.sessions.defaultKind, "lesson");
    const cleared = await json(await planPut(req(u, `/api/courses/${track}/plan`, "PUT", { examDate: null, weeklyHours: 3 }), params(track)));
    assert.equal(cleared.plan.phase, "no_date");
  });

  test("kept vs completed comes from spaced answers", async () => {
    const u = await newUser();
    const at = async (o: string, verdict: "correct" | "incorrect", ago: string) =>
      query(
        `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, created_at)
         values ($1, $2, $3, 'lesson', 'solo', 'open', $4, 'a', $5, now() - $6::interval)`,
        [u, unitA, o, `q-${randomUUID()}`, verdict, ago]
      );
    await at(objsA[0], "correct", "5 days"); // kept: right again 3 days later
    await at(objsA[0], "correct", "2 days");
    await at(objsA[1], "correct", "5 days"); // slipped: wrong 3 days later
    await at(objsA[1], "incorrect", "2 days");
    await at(objsA[2], "correct", "2 hours"); // completed, not re-checked yet
    await at(objsA[3], "incorrect", "1 hour"); // not completed
    const body = await json(await planGet(req(u, `/api/courses/${track}/plan`), params(track)));
    assert.deepEqual(body.kept, { completed: 3, kept: 1, slipped: 1, unchecked: 1 });
  });

  test("after a rough session the default is a winnable start", async () => {
    const u = await newUser();
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, created_at)
       values ($1, $2, $3, 'lesson', 'solo', 'open', 'k1', 'a', 'correct', now() - interval '4 days'),
              ($1, $2, $3, 'lesson', 'solo', 'open', 'k2', 'a', 'correct', now() - interval '2 days')`,
      [u, unitA, objsA[0]]
    );
    for (let i = 0; i < 4; i++) await lessonAnswer(u, objsB[i % 3], "incorrect");
    const body = await json(await planGet(req(u, `/api/courses/${track}/plan`), params(track)));
    assert.equal(body.plan.roughLastSession, true);
    assert.equal(body.plan.thisWeek.steps[0].kind, "warmup");
    assert.equal(body.plan.thisWeek.steps[0].objectiveId, objsA[0]);
    assert.equal(body.sessions.defaultKind, "review");
    assert.match(body.sessions.choices[0].detail, /quick win: Objective 1/);
  });

  test("a course the caller cannot see is not found", async () => {
    const u = await newUser();
    await json(await planGet(req(u, `/api/courses/${privateTrack}/plan`), params(privateTrack)), 404);
    await json(await placementPost(req(u, `/api/courses/${privateTrack}/placement`, "POST", { action: "start" }), params(privateTrack)), 404);
  });
});
