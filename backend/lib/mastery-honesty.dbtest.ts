// REQ-117: Audit 3 teaching-science and mastery-integrity fixes (migration
// 045 and the code that reads it), against a real Postgres with every
// migration applied. Each test names its FAIL entry and failed before the
// change. Rule details that older tests already cover were updated in place
// (mastery-model, integration-rule, review-loop, coach-plan ...).
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
process.env.CHOICE_ORDER_SECRET ??= "test-only-choice-secret";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool, withTransaction } from "./db";
import { ownerQuery, closeOwner } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordAttemptAndUpdateMastery, recordAttemptTx } from "./grading-service";
import { courseReadiness } from "./readiness";
import { loadPlanInput, planSettings } from "./study-plan-store";
import { dueObjectives } from "./review-store";
import { startSession } from "./review-service";
import { POST as pbqPost } from "../app/api/pbq/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unitA = randomUUID();
const unitBig = randomUUID();
const objs: string[] = Array.from({ length: 4 }, () => randomUUID());
const bigObjs: string[] = Array.from({ length: 40 }, () => randomUUID());
const scenario = randomUUID();
const users: string[] = [];

let modelCalls = 0;
let modelDelayMs = 0;
let feedbackText = "Good.";

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `mh-${run}-${users.length}@example.test`]);
  await recordStudyNoticeAcceptance(u); // REQ-205: model routes need the notice
  return u;
}
const auth = (u: string) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
  "content-type": "application/json",
});
const lesson = (u: string, o: string, verdict: "correct" | "incorrect", stage = "solo", question = `q-${randomUUID()}`) =>
  recordAttemptAndUpdateMastery({
    userId: u,
    unitId: objs.includes(o) ? unitA : unitBig,
    objectiveId: o,
    kind: "lesson",
    stage,
    format: "open",
    question,
    answer: "a",
    verdict,
  });
const shift = async (u: string, days: number) => {
  await query(`update attempts set created_at = created_at - make_interval(days => $2) where user_id = $1`, [u, days]);
  await query(
    `update review_schedule set due_on = due_on - $2::int, enrolled_at = enrolled_at - make_interval(days => $2),
            last_reviewed_at = last_reviewed_at - make_interval(days => $2) where user_id = $1`,
    [u, days]
  );
  await query(`update review_log set reviewed_at = reviewed_at - make_interval(days => $2) where user_id = $1`, [u, days]);
  await query(`update error_log set next_review_at = next_review_at - $2::int where user_id = $1`, [u, days]);
};
const detail = (u: string, o: string) =>
  queryOne<{ status: string; weighted_accuracy: string; formats: string[]; evidence_weight: string }>(
    `select * from mastery_detail($1, $2)`,
    [u, o]
  );

before(async () => {
  setAiCallSink(async () => undefined);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'MH', 'certification', null)`, [
    track,
    `MH-${run}`,
  ]);
  await query(
    `insert into course_units (id, track_id, title, sort_order, weight) values ($1, $3, 'A', 1, 50), ($2, $3, 'Big', 2, 50)`,
    [unitA, unitBig, track]
  );
  for (const [i, o] of [...objs.map((o) => [unitA, o]), ...bigObjs.map((o) => [unitBig, o])].entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o[1], o[0], `MH O${i}`, i]);
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', $2, 'f', '["a","b","c","d"]', 0, 'w', 's', '["a","b","c","d"]', 0, 'w', 'test')`,
      [o[1], `Teaching text number ${i}. Roles hold permissions and users get roles.`]
    );
  }
  await query(`insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1, $2, 'MH PBQ', 's', '["Identify"]', 't')`, [
    scenario,
    unitA,
  ]);
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async () => {
        modelCalls++;
        if (modelDelayMs) await new Promise((r) => setTimeout(r, modelDelayMs));
        return {
          parsed_output: {
            verdict: "correct",
            feedback: feedbackText,
            classification: "none",
            missedParts: [],
            modelAnswer: "model answer",
            fixNext: "next",
            parts: [{ part: "Identify", score: "met", comment: "ok" }],
          },
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  });
});

after(async () => {
  __setClientForTest(null);
  await ownerQuery(`delete from mastery_backup_045 where user_id = any($1::uuid[])`, [users]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
  await closeOwner();
});

const pbq = (u: string, body: Record<string, unknown>) =>
  pbqPost(new Request("http://t/api/pbq", { method: "POST", headers: auth(u), body: JSON.stringify({ scenarioId: scenario, ...body }) }));

describe("REQ-117 mastery rule (045)", () => {
  test("FAIL-340: one unit PBQ adds accuracy, never a format family, and weighs less on a large unit", async () => {
    const small = await newUser();
    const big = await newUser();
    await lesson(small, objs[0], "correct");
    for (const o of bigObjs) await lesson(big, o, "correct");
    await shift(small, 4);
    await shift(big, 4);
    // REQ-218: Independent needs the confirming answer from a later sitting.
    await lesson(small, objs[0], "correct");
    for (const o of bigObjs) await lesson(big, o, "correct");
    await recordAttemptAndUpdateMastery({ userId: small, unitId: unitA, pbqScenarioId: scenario, kind: "pbq", format: "pbq", question: "MH PBQ", answer: "a", verdict: "correct" });
    const bigScenario = (await queryOne<{ id: string }>(
      `insert into pbq_scenarios (unit_id, title, scenario, sub_parts, model) values ($1, 'big', 's', '[]', 't') returning id`,
      [unitBig]
    ))!.id;
    await recordAttemptAndUpdateMastery({ userId: big, unitId: unitBig, pbqScenarioId: bigScenario, kind: "pbq", format: "pbq", question: "big", answer: "a", verdict: "correct" });
    const levels = await query<{ status: string }>(`select status::text from mastery where user_id = $1`, [big]);
    assert.ok(levels.every((l) => l.status === "Independent"), JSON.stringify(levels));
    const s = await detail(small, objs[0]);
    const b = await detail(big, bigObjs[0]);
    assert.deepEqual(s!.formats, ["free_response"]);
    // the PBQ's share: 0.5 x 1.5 on a 4-objective unit, 0.5 x 1.5 x 4/40 on a 40-objective unit
    assert.ok(Number(s!.evidence_weight) - Number(b!.evidence_weight) > 0.6, `${s!.evidence_weight} vs ${b!.evidence_weight}`);
  });

  test("FAIL-344: correct answers given with help never lower accuracy", async () => {
    const u = await newUser();
    await lesson(u, objs[1], "correct"); // REQ-218: the earlier sitting that makes the later one a confirmation
    await shift(u, 3);
    await lesson(u, objs[1], "correct", "fade", "F1");
    await lesson(u, objs[1], "correct", "solo", "S1");
    const first = Number((await detail(u, objs[1]))!.weighted_accuracy);
    for (let i = 0; i < 3; i++) {
      await lesson(u, objs[1], "correct", "fade", "F1");
      await lesson(u, objs[1], "correct", "solo", "S1");
    }
    const d = (await detail(u, objs[1]))!;
    assert.equal(first, 1);
    assert.equal(Number(d.weighted_accuracy), 1, "repeating a lesson correctly used to take accuracy from 1.0 to 0.5");
    assert.equal(d.status, "Independent");
  });

  test("FAIL-354: one rough first lesson is not labeled Needs review; a placement guess is not Guided", async () => {
    const u = await newUser();
    await lesson(u, objs[2], "incorrect", "fade");
    await lesson(u, objs[2], "incorrect", "solo");
    assert.equal((await detail(u, objs[2]))!.status, "Introduced");
    await shift(u, 1);
    await lesson(u, objs[2], "incorrect", "solo");
    assert.equal((await detail(u, objs[2]))!.status, "Needs review", "once it has been checked again on a later day");
  });

  test("FAIL-352: Independent needs 70% weighted accuracy (was 60%), Transfer-ready 80%", async () => {
    const u = await newUser();
    const o = objs[3];
    // two right, one wrong, all typed Solo items in one sitting: 67%
    await lesson(u, o, "correct", "solo", "a1");
    await lesson(u, o, "correct", "solo", "a2");
    await lesson(u, o, "incorrect", "solo", "a3");
    const d = (await detail(u, o))!;
    assert.ok(Math.abs(Number(d.weighted_accuracy) - 0.6667) < 0.001, d.weighted_accuracy);
    assert.equal(d.status, "Guided");
    const p = await query<{ name: string; value: string }>(
      `select name, value from mastery_model_params where name in ('independent_accuracy', 'transfer_accuracy', 'transfer_min_gap_hours', 'recency_half_life_days') order by name`
    );
    assert.deepEqual(p.map((r) => [r.name, Number(r.value)]), [
      ["independent_accuracy", 0.7],
      ["recency_half_life_days", 30],
      ["transfer_accuracy", 0.8],
      ["transfer_min_gap_hours", 72],
    ]);
  });

  test("FAIL-360: the rule stays bounded for a learner with 26,000 answers (perf audit HIGH-2)", async () => {
    const u = await newUser();
    // ~90% direct answers across the course, 7% PBQs, 3% unit checks; a third missed.
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, created_at)
       select $1, o.unit_id, o.id, 'lesson', case when g % 2 = 0 then 'fade' else 'solo' end, 'open', 'h' || (g % 9),
              'a', (array['correct','incorrect','correct']::attempt_verdict[])[1 + g % 3], now() - make_interval(hours => g % 2000)
         from generate_series(1, 23400) g
         join lateral (select id, unit_id from objectives where unit_id in ($2, $3) order by id offset (g % 44) limit 1) o on true`,
      [u, unitA, unitBig]
    );
    await query(
      `insert into attempts (user_id, unit_id, pbq_scenario_id, kind, format, question, answer, verdict, created_at)
       select $1, $2, $3, 'pbq', 'pbq', 'MH PBQ', 'a', (array['correct','incorrect']::attempt_verdict[])[1 + g % 2],
              now() - make_interval(hours => g % 2000)
         from generate_series(1, 1820) g`,
      [u, unitA, scenario]
    );
    const item = (await queryOne<{ id: string }>(
      `insert into unit_check_items (unit_id, gate_hash, title, scenario, sub_parts, model) values ($1, 'h', 'T', 's', '["a"]', 't') returning id`,
      [unitA]
    ))!.id;
    await query(
      `insert into attempts (user_id, unit_id, kind, format, question, answer, verdict, assessment_type, unit_check_item_id, created_at)
       select $1, $2, 'unitcheck', 'pbq', 'T', 'a', (array['correct','incorrect']::attempt_verdict[])[1 + g % 2], 'unit_check', $3,
              now() - make_interval(hours => g % 2000)
         from generate_series(1, 780) g`,
      [u, unitA, item]
    );
    await query(`analyze attempts`);
    const n = (await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1`, [u]))!.n;
    assert.equal(n, 26000);
    const t0 = Date.now();
    await withTransaction(async (tx) => {
      await tx.query(`select set_config('jit', 'off', true)`);
      await tx.query(`select * from mastery_detail($1, $2)`, [u, objs[0]]);
    });
    const ms = Date.now() - t0;
    // 041 took about 10 s for one such objective (an EXISTS per answer over every attempt).
    assert.ok(ms < 1500, `one objective took ${ms} ms`);
  });
});

describe("REQ-117 A1: a PBQ answered again is a repeat (FAIL-356)", () => {
  test("pasting the model answer back into the same scenario is assisted, not fresh evidence", async () => {
    const u = await newUser();
    await lesson(u, objs[3], "correct");
    const first = await (await pbq(u, { answer: "my first answer" })).json();
    assert.equal(first.assisted, false);
    const again = await (await pbq(u, { answer: "model answer" })).json();
    assert.equal(again.assisted, true);
    assert.equal(again.assistReason, "repeat");
  });
});

describe("REQ-117 A3: model text is cleaned before it is stored (FAIL-358)", () => {
  test("a NUL or a lone surrogate in the grader's reply no longer loses the answer", async () => {
    const u = await newUser();
    const attempt = await withTransaction((tx) =>
      recordAttemptTx(tx, {
        userId: u,
        unitId: unitA,
        objectiveId: objs[0],
        kind: "lesson",
        stage: "solo",
        format: "open",
        question: "q?",
        answer: "a",
        verdict: "incorrect",
        feedback: "bad\u0000reply \ud800",
        classification: "x\u0000",
        missedParts: ["part\u0000", "\udc00"],
        modelAnswer: "m\u0000",
        fixNext: "f\ud800",
      })
    );
    assert.equal(attempt.feedback, "badreply �");
    assert.deepEqual(attempt.missed_parts, ["part", "�"]);
    assert.equal(attempt.model_answer, "m");
  });
});

describe("REQ-117 A9: racing copies of one submission call the model once (FAIL-359)", () => {
  test("20 simultaneous copies of one clientAttemptId: one model call, one attempt, every copy gets the result", async () => {
    const u = await newUser();
    await lesson(u, objs[3], "correct");
    modelCalls = 0;
    modelDelayMs = 150;
    try {
      const id = `race-${randomUUID()}`;
      const res = await Promise.all(Array.from({ length: 20 }, () => pbq(u, { answer: "same answer", clientAttemptId: id })));
      const statuses = res.map((r) => r.status);
      assert.ok(statuses.every((s) => s === 200), statuses.join(","));
      assert.equal(modelCalls, 1);
      const n = await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1 and client_attempt_id = $2`, [u, id]);
      assert.equal(n!.n, 1);
      assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from grading_claims where user_id = $1`, [u]))!.n, 0, "released");
    } finally {
      modelDelayMs = 0;
    }
  });
});

describe("REQ-117 readiness, plan and review tell one story", () => {
  test("FAIL-341 / FAIL-342: a one-session cram is not ready on day 0, and readiness falls with time away", async () => {
    const u = await newUser();
    for (const o of [...objs, ...bigObjs]) {
      await lesson(u, o, "correct", "fade");
      await lesson(u, o, "correct", "solo");
      await recordAttemptAndUpdateMastery({ userId: u, unitId: objs.includes(o) ? unitA : unitBig, objectiveId: o, kind: "quiz", stage: "explain", format: "open", question: "Explain", answer: "a", verdict: "correct", assessmentType: "explain_back" });
    }
    const day0 = await courseReadiness(track, u);
    assert.notEqual(day0.status, "ready", `day 0: ${day0.readinessPercent}%`);
    assert.equal(day0.keptPercent, 0);
    await shift(u, 30);
    const away = await courseReadiness(track, u);
    assert.ok(away.readinessPercent < day0.readinessPercent / 2, `${day0.readinessPercent}% -> ${away.readinessPercent}% after 30 days`);
  });

  test("FAIL-348: the plan's due count is the review screen's (one per objective), not one per error_log row", async () => {
    const u = await newUser();
    await lesson(u, objs[0], "correct", "fade");
    for (let i = 0; i < 4; i++) await lesson(u, objs[0], "incorrect", "solo", `miss-${i}`);
    await lesson(u, objs[1], "correct", "fade");
    await shift(u, 2);
    const today = new Date().toISOString().slice(0, 10);
    const due = await dueObjectives(u, today, track);
    const input = await loadPlanInput(u, track, today, await planSettings(u, track));
    assert.equal(input.dueReviews, due.length);
    assert.equal(due.length, 2, "two scheduled objectives are due; four error_log rows on one of them add nothing");
  });

  test("FAIL-349: after two misses in a row, the review opens with a re-teach and the choices", async () => {
    const u = await newUser();
    await lesson(u, objs[2], "correct", "fade");
    await lesson(u, objs[2], "incorrect", "solo", "m1");
    await lesson(u, objs[2], "incorrect", "solo", "m2");
    await lesson(u, objs[3], "correct", "fade");
    await shift(u, 2);
    for (const o of [objs[2], objs[3]]) {
      await query(
        `insert into review_items (objective_id, source_hash, question, choices, correct_index, why, terms, model)
         select $1::uuid, md5(teach), 'Review ' || $1::text, '["a","b","c","d"]', 0, 'w', '[]', 't' from lesson_content where objective_id = $1::uuid`,
        [o]
      );
    }
    const s = await startSession(u, track);
    const items = s!.session.items;
    const hard = items.find((i) => i.objectiveId === objs[2])!;
    const easy = items.find((i) => i.objectiveId === objs[3])!;
    assert.equal(hard.easierEntry, true);
    assert.match(hard.reteach ?? "", /Teaching text number 2/);
    assert.equal(easy.easierEntry, false);
    assert.equal(easy.reteach, null);
    const { strugglingObjectives } = await import("./review-store");
    const set = await strugglingObjectives(u, [objs[2], objs[3]]);
    assert.deepEqual([...set], [objs[2]]);
  });
});
