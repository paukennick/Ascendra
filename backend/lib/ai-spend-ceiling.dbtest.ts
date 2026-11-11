// REQ-202 x REQ-201 (FAIL-964, FAIL-965): the global daily AI ceiling stops every
// gated model path, against a real database: the ceiling's own sum over
// ai_calls, the real spend gate, and the real library paths for a sprint's exam
// items, a first lesson, an item re-check and review writing. Owners and
// operator pre-generation (REQ-208) are exempt; grading (REQ-201) is not stopped.
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, queryOne, closePool } from "./db";
import { setAiCallSink } from "./ai-calls";
import { __setClientForTest, callClaude, callClaudeStructured } from "./anthropic";
import { AiAccessError, ceilingPausedError, globalCeilingReached, resetGlobalSpendCache } from "./ai-access";
import { utcDayStart } from "./ai-access-config";
import { globalSpendSinceUsd } from "./ai-budget";
import { setGlobalCeilingCheck, setSpendGateForTest } from "./ai-spend-gate";
import { createSession, ExamSessionError } from "./exam-sessions";
import { ensureGeneration, type ObjectiveRow } from "./lesson-generation";
import { SHARED } from "./lesson-store";
import { flagItem, type ItemRef } from "./item-quality";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = [randomUUID(), randomUUID()];
const emptyTrack = randomUUID();
const emptyUnit = randomUUID();
const emptyObj = randomUUID();
const users: string[] = [];
const SONNET = "claude-sonnet-5-5";
const OWNER_EMAIL = `ceiling-owner-${run}@example.test`;

let modelRequests = 0;
const saved = { ceiling: process.env.AI_GLOBAL_DAILY_CEILING_USD, owners: process.env.OWNER_EMAILS, factCheck: process.env.ITEM_FACT_CHECK };

async function newUser(email?: string): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email, email_verified_at) values ($1, $2, now())`, [u, email ?? `ceiling-${run}-${users.length}@example.test`]);
  return u;
}

async function seedSpend(userId: string | null, purpose: string, outputTokens: number): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok)
     values ($1, $2, $3, 0, $4, 100, true) returning id`,
    [userId, purpose, SONNET, outputTokens]
  );
  return r!.id;
}
const SEED_OVER_CEILING = 60_000; // $0.60 of Sonnet output, far over the $0.01 ceiling set below

const opts = (purpose: string, userId: string | null, model = SONNET) => ({
  system: "s",
  messages: [{ role: "user" as const, content: "hello" }],
  model,
  maxTokens: 400,
  effort: "low" as const,
  thinking: "off" as const,
  purpose: purpose as never,
  userId,
});

before(async () => {
  setAiCallSink(null);
  process.env.OWNER_EMAILS = OWNER_EMAIL;
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Ceiling track', 'certification', null)`, [track, `CE-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Unit', 1, 100)`, [unit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `Objective ${i + 1}`, i + 1]);
    for (let k = 0; k < 4; k++) {
      await query(
        `insert into exam_items (objective_id, item_format, stem, body, answer_key, explanation)
         values ($1, 'multiple_choice', $2, $3, '{"correct":[1]}', 'e')`,
        [o, `Ceiling bank stem ${run} ${i}-${k}`, JSON.stringify({ choices: ["a", "b", "c", "d"] })]
      );
    }
  }
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Empty bank', 'certification', null)`, [emptyTrack, `CE2-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [emptyUnit, emptyTrack]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 1)`, [emptyObj, emptyUnit]);
  __setClientForTest({
    messages: {
      create: async () => {
        modelRequests++;
        return { content: [{ type: "text", text: '{"items":[]}' }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 } };
      },
    },
  });
});

beforeEach(() => {
  modelRequests = 0;
  process.env.AI_GLOBAL_DAILY_CEILING_USD = "0.01";
  setSpendGateForTest(null);
  setGlobalCeilingCheck(null);
  resetGlobalSpendCache();
});

after(async () => {
  __setClientForTest(null);
  setSpendGateForTest(null);
  setGlobalCeilingCheck(null);
  for (const [k, v] of [["AI_GLOBAL_DAILY_CEILING_USD", saved.ceiling], ["OWNER_EMAILS", saved.owners], ["ITEM_FACT_CHECK", saved.factCheck]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await query(`delete from item_flags where objective_id = any($1::uuid[])`, [[...objs, emptyObj]]);
  await query(`delete from item_status where objective_id = any($1::uuid[])`, [[...objs, emptyObj]]);
  await query(`delete from exam_sessions where user_id = any($1::uuid[])`, [users]);
  await query(`delete from lesson_generation_claims where objective_id = any($1::uuid[])`, [objs]).catch(() => undefined);
  await query(`delete from auth_events where identifier = any($1::text[])`, [users.map((u) => u.toLowerCase())]);
  await query(`delete from ai_calls where user_id = any($1::uuid[]) or purpose = 'ceiling_test'`, [users]);
  await query(`delete from exam_items where objective_id = any($1::uuid[])`, [[...objs, emptyObj]]);
  await query(`delete from item_holdbacks where objective_id = any($1::uuid[])`, [[...objs, emptyObj]]).catch(() => undefined);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, emptyTrack]]);
  await closePool();
});

describe("at the ceiling (real ai_calls sum)", () => {
  let seeded: string;
  before(async () => {
    seeded = await seedSpend(null, "chat", SEED_OVER_CEILING);
  });
  after(async () => {
    await query(`delete from ai_calls where id = $1`, [seeded]);
  });

  test("the ceiling is reached by the seeded spend", async () => {
    assert.equal(await globalCeilingReached(process.env), true);
  });

  test("sprint exam generation: a learner is built a session from the bank with no model call; with an empty bank it is told so with a 429", async () => {
    const u = await newUser();
    const { sessionId, preparation } = await createSession({ userId: u, trackId: track, mode: "sprint", timed: false, clientSessionId: randomUUID() });
    assert.ok(sessionId);
    assert.equal(preparation?.generatedCalls, 0);
    await assert.rejects(
      createSession({ userId: u, trackId: emptyTrack, mode: "sprint", timed: false, clientSessionId: randomUUID() }),
      (e: unknown) => !(e instanceof ExamSessionError) && (e as { status?: number }).status === 429
    );
    assert.equal(modelRequests, 0);
  });

  test("sprint exam generation (FAIL-965): a ceiling reached after the pre-check is a 429 paused, not 'couldn't be prepared'", async () => {
    const u = await newUser();
    // The pre-check passes (it asks with no model); the call itself is refused, as when the cached sum was a minute stale.
    setGlobalCeilingCheck(async (ctx) => {
      if (ctx.model !== "") throw ceilingPausedError("coach");
    });
    await assert.rejects(
      createSession({ userId: u, trackId: emptyTrack, mode: "sprint", timed: false, clientSessionId: randomUUID() }),
      (e: unknown) => e instanceof AiAccessError && e.status === 429 && e.body.state === "paused"
    );
    assert.equal(modelRequests, 0);
  });

  test("direct exam-item generation, re-check, review writing and chat are all refused with a 429 paused and no model request", async () => {
    const u = await newUser();
    for (const purpose of ["exam_items", "item_recheck", "review_generate", "lesson_intro", "lesson_practice", "chat", "coach_guard", "unitcheck_generate", "pbq_generate", "lab_generate", "fact_check"]) {
      await assert.rejects(callClaude(opts(purpose, u)), (e: unknown) => e instanceof AiAccessError && e.status === 429 && e.body.state === "paused", purpose);
    }
    await assert.rejects(
      callClaudeStructured({ ...opts("review_generate", u), schema: z.object({ items: z.array(z.string()) }) }),
      AiAccessError
    );
    assert.equal(modelRequests, 0);
  });

  test("first-lesson generation by a learner makes no model request", async () => {
    const u = await newUser();
    const objRow: ObjectiveRow = { title: "Objective 1", unit_title: "Unit", track_title: "Ceiling track", ctx: null };
    const h = ensureGeneration(objs[0], objRow, { scope: SHARED, triggeredBy: u, pending: new Map() });
    await assert.rejects(h.introPromise, AiAccessError);
    await assert.rejects(h.fullPromise, AiAccessError);
    assert.equal(modelRequests, 0);
  });

  test("item re-check by the real checker makes no model request and gives the claim back", async () => {
    delete process.env.ITEM_FACT_CHECK;
    const u = await newUser();
    const item = await queryOne<{ id: string }>(
      `insert into exam_items (objective_id, item_format, stem, body, answer_key, explanation)
       values ($1, 'multiple_choice', $2, $3, '{"correct":[1]}', 'e') returning id`,
      [objs[1], `Ceiling recheck ${randomUUID()}`, JSON.stringify({ choices: ["a", "b", "c", "d"] })]
    );
    const ref: ItemRef = { kind: "exam", itemId: item!.id, objectiveId: objs[1], question: "stem" };
    const f = await flagItem(ref, { userId: u, source: "learner" });
    assert.equal(f.recorded, true, "the learner's report itself is recorded");
    assert.deepEqual(await f.recheck, { ran: false, agreed: null, quarantined: false });
    assert.equal(modelRequests, 0);
    const claims = await queryOne<{ n: number }>(`select count(*)::int as n from item_flags where item_id = $1 and source = 'recheck'`, [item!.id]);
    assert.equal(claims!.n, 0);
    process.env.ITEM_FACT_CHECK = "off";
  });

  test("owners are exempt: an owner's chat, exam items and a lesson all reach the model", async () => {
    const owner = await newUser(OWNER_EMAIL);
    for (const purpose of ["chat", "exam_items", "lesson_intro", "item_recheck"]) {
      assert.equal(await callClaude(opts(purpose, owner)), '{"items":[]}', purpose);
    }
    assert.equal(modelRequests, 4);
  });

  test("grading is not stopped by the ceiling (REQ-201) and still counts toward it", async () => {
    const u = await newUser();
    for (const purpose of ["grade_open", "pbq_grade", "lab_grade", "lab_step_grade", "review_grade", "unitcheck_grade", "explain_back", "guess_feedback"]) {
      assert.equal(await callClaude(opts(purpose, u)), '{"items":[]}', purpose);
    }
    assert.equal(modelRequests, 8);
  });

  test("pregen purposes are not blocked (REQ-208), with no learner", async () => {
    assert.equal(await callClaude(opts("pregen_fact_check", null)), '{"items":[]}');
    assert.equal(await callClaude(opts("pregen", null)), '{"items":[]}');
    assert.equal(modelRequests, 2);
  });
});

describe("pregen spend is outside the ceiling's sum (REQ-208)", () => {
  test("a huge pregen run does not pause learners; the same spend as chat does", async () => {
    const day = utcDayStart();
    const base = await globalSpendSinceUsd(day);
    process.env.AI_GLOBAL_DAILY_CEILING_USD = String(base + 0.5);
    const pre = await seedSpend(null, "pregen", 5_000_000); // about $50
    const preFc = await seedSpend(null, "pregen_fact_check", 1_000_000);
    try {
      resetGlobalSpendCache();
      assert.equal(await globalCeilingReached(process.env), false);
      const u = await newUser();
      assert.equal(await callClaude(opts("chat", u)), '{"items":[]}');
      assert.equal(await callClaude(opts("exam_items", u)), '{"items":[]}');
    } finally {
      await query(`delete from ai_calls where id = any($1::uuid[])`, [[pre, preFc]]);
    }
    const chat = await seedSpend(null, "chat", SEED_OVER_CEILING);
    try {
      resetGlobalSpendCache();
      assert.equal(await globalCeilingReached(process.env), true);
    } finally {
      await query(`delete from ai_calls where id = $1`, [chat]);
    }
  });
});

describe("below the ceiling and with none set", () => {
  test("every path works as before when no ceiling is set", async () => {
    delete process.env.AI_GLOBAL_DAILY_CEILING_USD;
    resetGlobalSpendCache();
    const u = await newUser();
    for (const purpose of ["chat", "exam_items", "item_recheck", "review_generate"]) assert.equal(await callClaude(opts(purpose, u)), '{"items":[]}');
    assert.equal(modelRequests, 4);
  });
});
