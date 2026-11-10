// REQ-112: the integration follow-ups that touch the mastery rule (migration
// 041) and the code that reads or feeds it, against a real Postgres with
// every migration applied. Each test names the follow-up letter from the
// integration brief and failed before its change.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { planObjectives } from "./study-plan-store";
import { POST as pbqPost } from "../app/api/pbq/route";
import { POST as sessionsPost } from "../app/api/review/sessions/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unitA = randomUUID();
const objs: string[] = Array.from({ length: 12 }, () => randomUUID());
const scenario = randomUUID();
const checkX = randomUUID();
const checkY = randomUUID();
const users: string[] = [];
const PARTS = ["Identify", "Contain"];

// ---- fake model --------------------------------------------------------------
const sent: any[] = [];
function fakeParse(body: any) {
  sent.push(body);
  const sys = Array.isArray(body.system) ? body.system.map((b: any) => b.text).join("\n") : String(body.system);
  const user = body.messages[body.messages.length - 1].content as string;
  const reply = (parsed: unknown) => ({ parsed_output: parsed, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
  if (sys.includes("spaced-review questions")) {
    const blocks = [...user.matchAll(/<objective key="([^"]+)">/g)];
    return reply({
      items: blocks.map(([, key], i) => ({
        key,
        terms: [],
        question: `IR fresh ${key} ${randomUUID()}`,
        choices: [`r${i}`, `w${i}a`, `w${i}b`, `w${i}c`],
        correctIndex: 0,
        why: "w",
        testedTerms: [],
      })),
    });
  }
  return reply({
    verdict: "partial",
    feedback: "f",
    classification: "incomplete",
    missedParts: ["Contain"],
    modelAnswer: "m",
    fixNext: "n",
    parts: [
      { part: "Identify", score: "met", comment: "good" },
      { part: "Contain", score: "missed", comment: "no isolation" },
    ],
  });
}

// ---- helpers --------------------------------------------------------------------
async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `ir-${run}-${users.length}@example.test`]);
  await recordStudyNoticeAcceptance(u); // REQ-205: model routes need the notice
  return u;
}
const auth = (u: string) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
  "content-type": "application/json",
});

interface Row {
  kind?: string;
  stage?: string | null;
  format?: string;
  question?: string;
  verdict: "correct" | "partial" | "incorrect";
  ago: string;
  type?: string | null;
  assist?: string | null;
  objective?: string | null;
  unitCheck?: string | null;
  lab?: string | null;
}
async function put(u: string, o: string | null, r: Row): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict,
                           assisted, assist_reason, assessment_type, unit_check_item_id, lab_objective_id, created_at)
     values ($1, $2, $3, $4::attempt_kind, $5, $6::attempt_format, $7, 'a', $8, $9, $10, $11, $12, $13, now() - $14::interval)
     returning id`,
    [
      u,
      unitA,
      o,
      r.kind ?? "lesson",
      r.stage === undefined ? "solo" : r.stage,
      r.format ?? "open",
      r.question ?? `q-${randomUUID()}`,
      r.verdict,
      !!r.assist,
      r.assist ?? null,
      r.type ?? null,
      r.unitCheck ?? null,
      r.lab ?? null,
      r.ago,
    ]
  );
  return row!.id;
}
const detail = (u: string, o: string) =>
  queryOne<{ status: string; answers: number; direct_answers: number; evidence_weight: string; formats: string[]; weighted_accuracy: string }>(
    `select * from mastery_detail($1, $2)`,
    [u, o]
  );
const spaced = async (id: string) => (await queryOne<{ ok: boolean }>(`select attempt_spaced($1) as ok`, [id]))!.ok;
const unitCheck = (u: string, item: string, verdict: Row["verdict"], ago: string) =>
  put(u, null, { kind: "unitcheck", stage: null, format: "pbq", question: "UC", verdict, ago, type: "unit_check", unitCheck: item });

before(async () => {
  setAiCallSink(async () => undefined);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'IR', 'certification', null)`, [
    track,
    `IR-${run}`,
  ]);
  await query(`insert into course_units (id, track_id, title, sort_order, gate_description) values ($1, $2, 'A', 1, 'gate')`, [
    unitA,
    track,
  ]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unitA, `IR O${i}`, i]);
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', $2, 'f', '["a","b","c","d"]', 0, 'w', 's', '["a","b","c","d"]', 0, 'w', 'test')`,
      [o, `TEACH ${i}`]
    );
  }
  await query(`insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1, $2, 'IR PBQ', 's', $3, 't')`, [
    scenario,
    unitA,
    JSON.stringify(PARTS),
  ]);
  await query(
    `insert into unit_check_items (id, unit_id, gate_hash, title, scenario, sub_parts, model)
     values ($1, $3, md5('gate'), 'X', 'x', '["a"]', 't'), ($2, $3, md5('gate'), 'Y', 'y', '["a"]', 't')`,
    [checkX, checkY, unitA]
  );
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async (body: any) => fakeParse(body),
    },
  });
});

beforeEach(() => {
  sent.length = 0;
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from mastery_backup_041 where user_id = any($1::uuid[])`, [users]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("041 mastery rule (REQ-112)", () => {
  test("(a) a unit check counts in the unit branch like a PBQ, only beside direct evidence", async () => {
    const u = await newUser();
    await put(u, objs[0], { verdict: "correct", ago: "3 days" });
    await unitCheck(u, checkX, "correct", "1 hour");
    const d = await detail(u, objs[0]);
    assert.equal(d!.answers, 2, "the unit check is one of the answers");
    assert.equal(d!.direct_answers, 1);
    // REQ-117 (FAIL-340): unit-wide answers add accuracy only, never a format family.
    assert.ok(!d!.formats.includes("scenario"), "a correct unit check is not format evidence");
    // Alone it gives no level, as a PBQ alone does not.
    const v = await newUser();
    await unitCheck(v, checkX, "correct", "1 hour");
    assert.equal(await detail(v, objs[0]), null);
  });

  test("(a) review-retest matching covers unit-check items: same item earns the retest factor, another item does not", async () => {
    const same = await newUser();
    const other = await newUser();
    for (const u of [same, other]) {
      await put(u, objs[1], { verdict: "correct", ago: "4 days" });
      await unitCheck(u, checkX, "incorrect", "3 days");
    }
    await unitCheck(same, checkX, "correct", "1 hour");
    await unitCheck(other, checkY, "correct", "1 hour");
    const ws = Number((await detail(same, objs[1]))!.evidence_weight);
    const wo = Number((await detail(other, objs[1]))!.evidence_weight);
    // REQ-117 (FAIL-356): a second answer to the SAME item came after its
    // model answer was shown, so it is a repeat (x assist_weight_repeat 0.25,
    // and x review_retest_factor 1.2 still matches it); another item is a
    // fresh answer at full weight.
    assert.ok(ws < wo, `the same item again is a repeat and weighs less (${ws} vs ${wo})`);
    const rep = await queryOne<{ n: number }>(
      `select count(*)::int as n from mastery_detail($1, $2) d where d.evidence_weight > 0`,
      [same, objs[1]]
    );
    assert.equal(rep!.n, 1);
  });

  test("(b) a Quiz me (zero-weight) answer is not an answer, not the latest answer, not a spacing anchor or an earlier miss", async () => {
    const withQuiz = await newUser();
    const without = await newUser();
    for (const u of [withQuiz, without]) {
      await put(u, objs[2], { verdict: "incorrect", ago: "3 days" });
      await put(u, objs[2], { verdict: "correct", ago: "2 hours" });
    }
    await put(withQuiz, objs[2], { kind: "quiz", stage: "coach_quiz", format: "mc", verdict: "incorrect", ago: "2 days", type: "coach_quiz", assist: "coach" });
    await put(withQuiz, objs[2], { kind: "quiz", stage: "coach_quiz", format: "mc", verdict: "incorrect", ago: "1 hour", type: "coach_quiz", assist: "coach" });
    assert.deepEqual(await detail(withQuiz, objs[2]), await detail(without, objs[2]));
    // Only quiz answers: no level at all.
    const quizOnly = await newUser();
    await put(quizOnly, objs[2], { kind: "quiz", stage: "coach_quiz", format: "mc", verdict: "correct", ago: "1 hour", type: "coach_quiz", assist: "coach" });
    assert.equal(await detail(quizOnly, objs[2]), null);
  });

  test("(b) placement is not a spacing anchor, not spaced itself, and its miss does not make a later answer a retest", async () => {
    const placedRight = await newUser();
    const placedWrong = await newUser();
    const ids: string[] = [];
    for (const [u, v] of [[placedRight, "correct"], [placedWrong, "incorrect"]] as const) {
      await put(u, objs[3], { kind: "quiz", stage: "placement", format: "mc", verdict: v, ago: "2 days", type: "placement" });
      ids.push(await put(u, objs[3], { verdict: "correct", ago: "1 hour" }));
    }
    assert.equal(await spaced(ids[0]), false, "a lesson answer the day after placement is not spaced");
    const a = (await detail(placedRight, objs[3]))!;
    const b = (await detail(placedWrong, objs[3]))!;
    assert.equal(a.evidence_weight, b.evidence_weight, "same weights: no retest factor after a placement miss");
    // The control: a lesson answer two days earlier does anchor spacing.
    const lessons = await newUser();
    await put(lessons, objs[3], { verdict: "correct", ago: "2 days" });
    assert.equal(await spaced(await put(lessons, objs[3], { verdict: "correct", ago: "1 hour" })), true);
  });

  test("(c) a comparison-card question counts as format evidence only after two correct answers on different questions", async () => {
    const one = await newUser();
    const sameTwice = await newUser();
    const two = await newUser();
    const disc = (u: string, q: string, ago: string) =>
      put(u, objs[4], { kind: "quiz", stage: "discriminate", format: "mc", question: q, verdict: "correct", ago, type: "discrimination" });
    for (const u of [one, sameTwice, two]) await put(u, objs[4], { stage: "fade", format: "mc", verdict: "correct", ago: "3 days" });
    await disc(one, "scenario-1", "2 days");
    await disc(sameTwice, "scenario-1", "2 days");
    await disc(sameTwice, "scenario-1", "1 day");
    await disc(two, "scenario-1", "2 days");
    await disc(two, "scenario-2", "1 day");
    assert.equal((await detail(one, objs[4]))!.status, "Guided", "one correct two-option answer could be a guess");
    assert.deepEqual((await detail(one, objs[4]))!.formats, []);
    assert.equal((await detail(sameTwice, objs[4]))!.status, "Guided", "the same question twice is still one question");
    // REQ-117 (FAIL-346): comparison cards count as a format family but never
    // open Independent on their own (two coin flips made 11 of 36 Independent).
    assert.equal((await detail(two, objs[4]))!.status, "Guided");
    assert.deepEqual((await detail(two, objs[4]))!.formats, ["discrimination"]);
  });

  test("(e) a lab report never counts, even one written with an assessment type", async () => {
    const u = await newUser();
    await put(u, objs[5], { verdict: "correct", ago: "3 days" });
    const before = await detail(u, objs[5]);
    await put(u, null, { kind: "lab", stage: null, verdict: "correct", ago: "1 hour", lab: objs[5] });
    await put(u, null, { kind: "lab", stage: null, verdict: "incorrect", ago: "1 hour", lab: objs[5], type: "unit_check" });
    assert.deepEqual(await detail(u, objs[5]), before);
    const pairs = await query(`select 1 from mastery_pairs($1) where objective_id is null`, [u]);
    assert.equal(pairs.length, 0);
  });

  test("mastery_pairs reaches pairs that only have typed answers (exam, review, comparison)", async () => {
    const u = await newUser();
    await put(u, objs[6], { kind: "review", stage: "review", verdict: "correct", ago: "1 hour", type: "free_response" });
    const pairs = await query<{ objective_id: string }>(`select objective_id from mastery_pairs($1)`, [u]);
    assert.deepEqual(pairs.map((p) => p.objective_id), [objs[6]]);
  });
});

describe("(d) a correct, unassisted, spaced exam answer advances a due review", () => {
  const exam = (u: string, o: string, question: string, verdict: Row["verdict"] = "correct") =>
    recordAttemptAndUpdateMastery({
      userId: u,
      unitId: unitA,
      objectiveId: o,
      kind: "quiz",
      stage: "sprint",
      format: "mc",
      question,
      answer: "a",
      verdict,
      assessmentType: "multiple_choice",
      repeatAnySetting: true,
    });
  async function setup(lessonAgo: string) {
    const u = await newUser();
    await put(u, objs[7], { verdict: "incorrect", ago: lessonAgo });
    await query(
      `insert into error_log (user_id, unit_id, objective_id, topic, error_text, review_stage, next_review_at)
       values ($1, $2, $3, 't', 'e', 0, current_date)`,
      [u, unitA, objs[7]]
    );
    await query(`insert into review_schedule (user_id, objective_id, due_on, enrolled_at) values ($1, $2, current_date, now() - interval '3 days')
                 on conflict (user_id, objective_id) do update set due_on = current_date`, [u, objs[7]]);
    return u;
  }
  const state = async (u: string) => ({
    stage: (await queryOne<{ s: number }>(`select max(review_stage) s from error_log where user_id = $1`, [u]))!.s,
    step: (await queryOne<{ step: number }>(`select step from review_schedule where user_id = $1`, [u]))!.step,
    logs: Number((await queryOne<{ n: string }>(`select count(*) n from review_log where user_id = $1`, [u]))!.n),
  });

  test("spaced and unassisted: the due review entry and the schedule both move one step", async () => {
    const u = await setup("3 days");
    await exam(u, objs[7], `exam-${randomUUID()}`);
    assert.deepEqual(await state(u), { stage: 1, step: 1, logs: 1 });
  });
  test("not spaced (an answer an hour before) or a repeat: nothing moves; a spaced miss is a due review that slips (REQ-117)", async () => {
    const recent = await setup("1 hour");
    await exam(recent, objs[7], `exam-${randomUUID()}`);
    assert.deepEqual(await state(recent), { stage: 0, step: 0, logs: 0 });

    const repeat = await setup("3 days");
    const q = `seen-${randomUUID()}`;
    await put(repeat, objs[7], { kind: "quiz", stage: "sprint", format: "mc", question: q, verdict: "incorrect", ago: "2 days", type: "multiple_choice" });
    await query(`delete from error_log where user_id = $1 and review_stage = 0 and next_review_at > current_date`, [repeat]);
    await exam(repeat, objs[7], q);
    assert.deepEqual(await state(repeat), { stage: 0, step: 0, logs: 0 });

    // REQ-117 (FAIL-361): an unaided, spaced exam miss on a due objective is
    // logged as a due review (it used to log nothing, so "kept" only ever
    // saw the hits) and steps the schedule back (step 0 stays 0).
    const miss = await setup("3 days");
    await exam(miss, objs[7], `exam-${randomUUID()}`, "incorrect");
    assert.equal((await state(miss)).step, 0);
    assert.equal((await state(miss)).logs, 1);
    const lg = await queryOne<{ verdict: string; was_due: boolean }>(`select verdict, was_due from review_log where user_id = $1`, [miss]);
    assert.deepEqual(lg, { verdict: "incorrect", was_due: true });
    assert.equal((await queryOne<{ lapses: number }>(`select lapses from review_schedule where user_id = $1`, [miss]))!.lapses, 1);
  });
});

// REQ-117 (FAIL-345): kept is decided at DUE reviews (review_log.was_due,
// unaided), not by the latest spaced answer of any kind.
describe("(g) the kept view counts only unassisted answers at due reviews", () => {
  const keptOf = async (u: string, o: string) => (await planObjectives(u, track)).find((p) => p.id === o)!.kept;
  const logReview = (u: string, attempt: string, verdict: string, wasDue: boolean, assisted = false) =>
    query(
      `insert into review_log (user_id, objective_id, attempt_id, reviewed_at, verdict, assisted, was_due, step_before, step_after)
       values ($1, $2, $3, now() - interval '1 hour', $4, $5, $6, 0, 1)`,
      [u, objs[8], attempt, verdict, assisted, wasDue]
    );
  test("a due review answer keeps it; an early one, or one with help, neither keeps nor slips it; placement does not count", async () => {
    const reviewed = await newUser();
    await put(reviewed, objs[8], { verdict: "correct", ago: "3 days" });
    await logReview(reviewed, await put(reviewed, objs[8], { kind: "review", stage: "review", verdict: "correct", ago: "1 hour", type: "free_response" }), "correct", true);
    assert.equal(await keptOf(reviewed, objs[8]), "kept");

    const early = await newUser();
    await put(early, objs[8], { verdict: "correct", ago: "3 days" });
    await logReview(early, await put(early, objs[8], { kind: "review", stage: "review", verdict: "correct", ago: "1 hour", type: "free_response" }), "correct", false);
    assert.equal(await keptOf(early, objs[8]), "unchecked", "a spaced answer before the review was due does not confirm it");

    const helped = await newUser();
    await put(helped, objs[8], { verdict: "correct", ago: "3 days" });
    await put(helped, objs[8], { kind: "review", stage: "review", verdict: "correct", ago: "1 hour", type: "free_response", assist: "hint" });
    assert.equal(await keptOf(helped, objs[8]), "unchecked", "the choices were shown first");

    const helpedMiss = await newUser();
    await put(helpedMiss, objs[8], { verdict: "correct", ago: "3 days" });
    await put(helpedMiss, objs[8], { kind: "review", stage: "review", verdict: "incorrect", ago: "1 hour", type: "free_response", assist: "hint" });
    assert.equal(await keptOf(helpedMiss, objs[8]), "unchecked");

    const placed = await newUser();
    await put(placed, objs[8], { kind: "quiz", stage: "placement", format: "mc", verdict: "correct", ago: "3 days", type: "placement" });
    await put(placed, objs[8], { verdict: "correct", ago: "1 hour" });
    assert.equal(await keptOf(placed, objs[8]), "unchecked");
  });
});

describe("(j) PBQ per-part scores survive a replay", () => {
  test("the stored attempt carries the scores and a resend with the same id returns them", async () => {
    const u = await newUser();
    const body = { scenarioId: scenario, answer: "my answer", clientAttemptId: `ir-${randomUUID()}` };
    const post = async () => {
      const res = await pbqPost(new Request("http://t/api/pbq", { method: "POST", headers: auth(u), body: JSON.stringify(body) }));
      return { status: res.status, body: (await res.json()) as Record<string, any> };
    };
    const first = await post();
    assert.equal(first.status, 200);
    const expected = [
      { part: "Identify", score: "met", comment: "good" },
      { part: "Contain", score: "missed", comment: "no isolation" },
    ];
    assert.deepEqual(first.body.partScores, expected);
    const replay = await post();
    assert.equal(replay.status, 200);
    assert.equal(replay.body.replayed, true);
    assert.deepEqual(replay.body.partScores, expected);
    assert.equal(sent.length, 1, "the replay made no model call");
  });
});

describe("(i) review questions are aimed at the learner's recorded mix-ups", () => {
  test("a new review question batch carries the learner's misconception tags, fenced as data", async () => {
    const u = await newUser();
    const o = objs[9];
    const a = await put(u, o, { verdict: "correct", ago: "3 days" });
    await query(`insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, 'Guided', 2, 'e')
                 on conflict (user_id, objective_id) do nothing`, [u, o]);
    await query(`insert into review_schedule (user_id, objective_id, due_on) values ($1, $2, current_date)
                 on conflict (user_id, objective_id) do update set due_on = current_date`, [u, o]);
    await query(
      `insert into learner_misconceptions (user_id, objective_id, attempt_id, source, tag, sentence)
       values ($1, $2, $3, 'grader', 'MIXUP-RBAC-vs-MAC', 'You may be mixing up RBAC with MAC.')`,
      [u, o, a]
    );
    const res = await sessionsPost(
      new Request("http://t/api/review/sessions", { method: "POST", headers: auth(u), body: JSON.stringify({ trackId: track }) })
    );
    assert.equal(res.status, 200, JSON.stringify(await res.clone().json()));
    const batch = sent.find((b) => JSON.stringify(b.system).includes("spaced-review questions"));
    assert.ok(batch, "a question batch was written");
    const text = batch.messages[batch.messages.length - 1].content as string;
    assert.match(text, /<learner_mixups>[\s\S]*MIXUP-RBAC-vs-MAC[\s\S]*<\/learner_mixups>/);
  });
});
