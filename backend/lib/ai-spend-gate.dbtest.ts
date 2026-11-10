// REQ-202 (F1, the AI spend gate) against a real Postgres with every migration
// applied. The model is a fake client (no key exists); what is under test is
// that money is held back BEFORE it is spent and recorded after:
//   - an account at its cap starts 12 sprints and the model is called 0 times;
//   - 25 parallel calls at $0.49 of $0.50 do not settle above the cap;
//   - a billed answer that does not parse is recorded with its real usage;
//   - grading has its own pool, so a grader keeps the coach and the reverse;
//   - a database error refuses the call (fail closed);
//   - a first lesson generation and a re-check are charged to the learner who
//     triggered them, and re-checks are capped per learner per day.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
process.env.ITEM_FACT_CHECK = "off";
delete process.env.AI_DAILY_BUDGET_USD;
delete process.env.AI_DAILY_GRADING_BUDGET_USD;
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, queryOne, closePool } from "./db";
import { setAiCallSink } from "./ai-calls";
import { __setClientForTest, callClaude, callClaudeStructured } from "./anthropic";
import { AiBudgetError, requireAiBudget } from "./ai-budget";
import { reserveAiSpend, setSpendGateForTest } from "./ai-spend-gate";
import { AiSpendUnavailableError, estimateCall, poolSpendUsd } from "./ai-spend-ledger";
import { createSession, generationEstimateUsd, ExamSessionError } from "./exam-sessions";
import { ensureGeneration, type GenerationHandle, type LessonGenerator, type ObjectiveRow } from "./lesson-generation";
import { SHARED } from "./lesson-store";
import { flagItem, RECHECK_EVENT, RECHECK_LIMIT, type ItemRef } from "./item-quality";
import { consumeRateLimit } from "./auth/rateLimit";
import type { CheckItem, CheckMeta, FactChecker } from "./fact-check";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = [randomUUID(), randomUUID(), randomUUID()];
const users: string[] = [];
const SONNET = "claude-sonnet-5-5";
const HAIKU = "claude-haiku-5-5";

let modelRequests = 0;
let respond: (params: any) => unknown = () => ({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 } });

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `spend-${run}-${users.length}@example.test`]);
  return u;
}

// Seed finished spend for a learner: `tokens` output tokens of a model.
async function seedSpend(userId: string, purpose: string, model: string, outputTokens: number) {
  await query(
    `insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok)
     values ($1, $2, $3, 0, $4, 100, true)`,
    [userId, purpose, model, outputTokens]
  );
}
const SEED_COACH_CAP = 60_000; // 60k Sonnet output tokens = $0.60, over the $0.50 coach budget
const SEED_GRADING_CAP = 600_000; // 600k Haiku output tokens = $0.30, over the $0.25 grading budget

const chatOpts = (userId: string | null, over: Record<string, unknown> = {}) => ({
  system: "s",
  messages: [{ role: "user" as const, content: "hello" }],
  model: SONNET,
  maxTokens: 400,
  effort: "low" as const,
  thinking: "off" as const,
  purpose: "chat" as const,
  userId,
  ...over,
});

const callsFor = (userId: string) =>
  query<{ purpose: string; ok: boolean; error_code: string | null; input_tokens: number | null; output_tokens: number | null }>(
    `select purpose, ok, error_code, input_tokens, output_tokens from ai_calls where user_id = $1 order by created_at`,
    [userId]
  );
const run1 = (userId: string, pool: "coach" | "grading" | "all") => poolSpendUsd((sql, p) => query(sql, p) as never, userId, pool);

before(async () => {
  setAiCallSink(null);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Spend gate track', 'certification', null)`, [track, `SG-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Unit', 1, 100)`, [unit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `Objective ${i + 1}`, i + 1]);
    // A small bank: enough for a sprint to be built without the model.
    for (let k = 0; k < 4; k++) {
      await query(
        `insert into exam_items (objective_id, item_format, stem, body, answer_key, explanation)
         values ($1, 'multiple_choice', $2, $3, '{"correct":[1]}', 'e')`,
        [o, `Bank stem ${run} ${i}-${k}`, JSON.stringify({ choices: ["a", "b", "c", "d"] })]
      );
    }
  }
  __setClientForTest({
    messages: {
      create: async (params: any) => {
        modelRequests++;
        return respond(params);
      },
    },
  });
});

beforeEach(() => {
  modelRequests = 0;
  setSpendGateForTest(null);
  respond = () => ({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 } });
});

after(async () => {
  __setClientForTest(null);
  setSpendGateForTest(null);
  await query(`delete from item_flags where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from item_status where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from exam_sessions where user_id = any($1::uuid[])`, [users]);
  await query(`delete from lesson_generation_claims where objective_id = any($1::uuid[])`, [objs]).catch(() => undefined);
  await query(`delete from auth_events where identifier = any($1::text[])`, [users.map((u) => u.toLowerCase())]);
  await query(`delete from ai_calls where user_id = any($1::uuid[])`, [users]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("an account at its cap (FAIL-842)", () => {
  test("starts 12 sprints from the bank and the model is called 0 times", async () => {
    const u = await newUser();
    await seedSpend(u, "chat", SONNET, SEED_COACH_CAP);
    for (let i = 0; i < 12; i++) {
      const { sessionId, preparation } = await createSession({ userId: u, trackId: track, mode: "sprint", timed: false, clientSessionId: randomUUID() });
      assert.ok(sessionId);
      assert.equal(preparation?.generatedCalls, 0);
      assert.ok((preparation?.built ?? 0) > 0, "built from the bank");
    }
    assert.equal(modelRequests, 0, "no model request for a learner at the cap");
    const rows = await callsFor(u);
    assert.equal(rows.length, 1, "nothing was reserved or recorded beyond the seed");
    const slots = await queryOne<{ n: number }>(
      `select count(*)::int as n from auth_events where event_type = 'exam_generate' and identifier = $1`,
      [u.toLowerCase()]
    );
    assert.equal(slots!.n, 0, "no generation slot was spent");
  });

  test("control: the same sprint for a learner with room does ask the model", async () => {
    const u = await newUser();
    // An empty course objective forces generation: use a track the bank does not cover.
    const t2 = randomUUID();
    const un2 = randomUUID();
    const o2 = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Empty bank', 'certification', null)`, [t2, `SG2-${run}`]);
    await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [un2, t2]);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 1)`, [o2, un2]);
    try {
      respond = () => ({ content: [{ type: "text", text: '{"items":[]}' }], stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 } });
      await createSession({ userId: u, trackId: t2, mode: "sprint", timed: false, clientSessionId: randomUUID() }).catch((e) => {
        if (!(e instanceof ExamSessionError)) throw e;
      });
      assert.ok(modelRequests >= 1, "a learner with budget does reach the model");
      // And at the cap the same course draws nothing and says why.
      const capped = await newUser();
      await seedSpend(capped, "chat", SONNET, SEED_COACH_CAP);
      const before = modelRequests;
      await assert.rejects(createSession({ userId: capped, trackId: t2, mode: "sprint", timed: false, clientSessionId: randomUUID() }), AiBudgetError);
      assert.equal(modelRequests, before);
    } finally {
      await query(`delete from exam_sessions where track_id = $1`, [t2]);
      await query(`delete from exam_items where objective_id = $1`, [o2]);
      await query(`delete from item_holdbacks where objective_id = $1 or track_id = $2`, [o2, t2]);
      await query(`delete from subject_tracks where id = $1`, [t2]);
    }
  });

  test("the pre-check estimate is positive and below the coach budget", () => {
    const e = generationEstimateUsd();
    assert.ok(e > 0 && e < 0.5, String(e));
  });
});

describe("reservations (FAIL-844)", () => {
  test("25 parallel calls at $0.49 of $0.50 never settle above the cap (cheap calls: two fit)", async () => {
    const u = await newUser();
    await seedSpend(u, "chat", SONNET, 49_000); // $0.49
    // Each call really costs 400 Sonnet output tokens = $0.004.
    respond = () => ({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 0, output_tokens: 400 } });
    const results = await Promise.allSettled(Array.from({ length: 25 }, () => callClaude(chatOpts(u))));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const refused = results.filter((r) => r.status === "rejected" && r.reason instanceof AiBudgetError).length;
    assert.equal(ok + refused, 25, JSON.stringify(results.filter((r) => r.status === "rejected" && !(r.reason instanceof AiBudgetError)).map((r: any) => String(r.reason))));
    assert.equal(modelRequests, ok, "a model request only for each admitted call");
    assert.ok(ok >= 1 && ok <= 2, `admitted ${ok}`);
    const total = await run1(u, "all");
    const oneCall = 0.004;
    assert.ok(total <= 0.5 + 1e-9, `settled at ${total}`);
    assert.ok(total <= 0.5 + oneCall, "never above the cap plus one call");
    const rows = await callsFor(u);
    assert.equal(rows.length, 1 + ok, "one ai_calls row per admitted call, none left reserved");
    assert.ok(rows.every((r) => r.error_code !== "reserved"));
  });

  test("25 parallel calls that each cost $0.05 at $0.49 are all refused; the old read-then-call check let all 25 through", async () => {
    const u = await newUser();
    await seedSpend(u, "chat", SONNET, 49_000);
    respond = () => ({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 0, output_tokens: 5000 } });
    // What requireAiBudget alone does (read, no reservation): all 25 see $0.49 < $0.50.
    const seen = await Promise.allSettled(Array.from({ length: 25 }, () => requireAiBudget(u)));
    assert.equal(seen.filter((r) => r.status === "fulfilled").length, 25);
    const results = await Promise.allSettled(Array.from({ length: 25 }, () => callClaude(chatOpts(u, { maxTokens: 5000 }))));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 0);
    assert.equal(modelRequests, 0);
    assert.ok((await run1(u, "all")) <= 0.5);
  });

  test("a call is reserved at its worst case, then settled to the real usage in the same row", async () => {
    const u = await newUser();
    const est = estimateCall(SONNET, { system: "s", messages: [{ role: "user", content: "hello" }], max_tokens: 400 });
    const r = await reserveAiSpend({ userId: u, purpose: "chat", model: SONNET, estimate: est });
    assert.ok(r);
    const held = await callsFor(u);
    assert.equal(held.length, 1);
    assert.equal(held[0].error_code, "reserved");
    assert.ok(Math.abs((await run1(u, "coach")) - est.usd) < 1e-9, "the estimate counts while the call is in flight");
    await r!.settle({ userId: u, purpose: "chat", model: SONNET, inputTokens: 5, outputTokens: 7, cacheReadTokens: null, cacheWriteTokens: null, latencyMs: 12, ok: true, errorCode: null });
    const done = await callsFor(u);
    assert.equal(done.length, 1, "settled in place");
    assert.deepEqual({ ok: done[0].ok, e: done[0].error_code, i: done[0].input_tokens, o: done[0].output_tokens }, { ok: true, e: null, i: 5, o: 7 });
    assert.ok((await run1(u, "coach")) < est.usd / 10);
  });

  test("a call that never settles (the function was killed) keeps counting at its estimate", async () => {
    const u = await newUser();
    const est = estimateCall(SONNET, { max_tokens: 20_000 }); // $0.20
    assert.ok(await reserveAiSpend({ userId: u, purpose: "chat", model: SONNET, estimate: est }));
    assert.ok(await reserveAiSpend({ userId: u, purpose: "chat", model: SONNET, estimate: est }));
    await assert.rejects(reserveAiSpend({ userId: u, purpose: "chat", model: SONNET, estimate: est }), AiBudgetError, "0.20 + 0.20 + 0.20 > 0.50");
  });

  test("a failed call with an HTTP status settles at no cost; a timeout settles at the input estimate", async () => {
    const u = await newUser();
    respond = () => {
      throw Object.assign(new Error("overloaded"), { status: 529 });
    };
    await assert.rejects(callClaude(chatOpts(u)), /overloaded/);
    respond = () => {
      throw Object.assign(new Error("Request timed out."), { name: "APIConnectionTimeoutError" });
    };
    await assert.rejects(callClaude(chatOpts(u)), /timed out/);
    const rows = await callsFor(u);
    assert.equal(rows.length, 2);
    assert.deepEqual([rows[0].ok, rows[0].error_code, rows[0].input_tokens, rows[0].output_tokens], [false, "http_529", null, null]);
    assert.equal(rows[1].error_code, "APIConnectionTimeoutError");
    const cw = await queryOne<{ cache_write_tokens: number | null }>(`select cache_write_tokens from ai_calls where user_id = $1 and error_code = 'APIConnectionTimeoutError'`, [u]);
    assert.ok((cw!.cache_write_tokens ?? 0) > 0, "the prompt that was sent is charged");
  });
});

describe("usage survives a parse failure (FAIL-840)", () => {
  const schema = z.object({ verdict: z.string() });
  test("a billed answer that does not parse is recorded with its tokens and counts against the budget", async () => {
    const u = await newUser();
    respond = () => ({ content: [{ type: "text", text: '{"verdict": "corr' }], stop_reason: "max_tokens", usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } });
    await assert.rejects(callClaudeStructured({ ...chatOpts(u, { purpose: "grade_open", model: HAIKU }), schema }), /did not parse/);
    const rows = await callsFor(u);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ok, false);
    assert.equal(rows[0].error_code, "invalid_structured_output");
    assert.equal(rows[0].input_tokens, 1200);
    assert.equal(rows[0].output_tokens, 300);
    assert.ok((await run1(u, "grading")) > 0, "non-zero cost");
  });
});

describe("two pools", () => {
  test("a learner at the coach cap can still be graded; a learner at the grading cap keeps the coach", async () => {
    const coachCapped = await newUser();
    await seedSpend(coachCapped, "chat", SONNET, SEED_COACH_CAP);
    assert.equal(await callClaude(chatOpts(coachCapped, { purpose: "grade_open", model: HAIKU })), "ok");
    await assert.rejects(callClaude(chatOpts(coachCapped)), AiBudgetError);

    const gradeCapped = await newUser();
    await seedSpend(gradeCapped, "grade_open", HAIKU, SEED_GRADING_CAP);
    assert.equal(await callClaude(chatOpts(gradeCapped)), "ok");
    await assert.rejects(callClaude(chatOpts(gradeCapped, { purpose: "pbq_grade", model: HAIKU })), (e: any) => e instanceof AiBudgetError && /grading/.test(e.message));
    // The route-level check (chat, regenerate) counts the coach pool only.
    await requireAiBudget(gradeCapped);
    await assert.rejects(requireAiBudget(coachCapped), AiBudgetError);
  });

  test("a call with no cap switched on is not held (AI_DAILY_GRADING_BUDGET_USD=off)", async () => {
    const u = await newUser();
    await seedSpend(u, "grade_open", HAIKU, SEED_GRADING_CAP);
    process.env.AI_DAILY_GRADING_BUDGET_USD = "off";
    try {
      assert.equal(await callClaude(chatOpts(u, { purpose: "grade_open", model: HAIKU })), "ok");
    } finally {
      delete process.env.AI_DAILY_GRADING_BUDGET_USD;
    }
  });
});

describe("fail closed (FAIL-845)", () => {
  test("a database error refuses the call and sends nothing", async () => {
    // A learner id Postgres rejects as a uuid makes the check itself fail.
    const warn = console.warn;
    console.warn = () => {};
    try {
      await assert.rejects(callClaude(chatOpts("not-a-uuid")), AiSpendUnavailableError);
      await assert.rejects(requireAiBudget("not-a-uuid"), AiSpendUnavailableError);
    } finally {
      console.warn = warn;
    }
    assert.equal(modelRequests, 0);
  });
});

describe("a first lesson generation is charged to the learner who started it (FAIL-843)", () => {
  const objRow: ObjectiveRow = { title: "Objective 1", unit_title: "Unit", track_title: "Spend gate track", ctx: null };
  const fresh = () => new Map<string, GenerationHandle>();
  const practice = {
    fadeProblem: "f", fadeChoices: ["a", "b", "c", "d"], fadeCorrectIndex: 1, fadeWhy: "w",
    soloCheck: "s", soloChoices: ["a", "b", "c", "d"], soloCorrectIndex: 1, soloWhy: "w",
    confidence: "high" as const, uncertainClaims: [] as string[],
  };

  test("the generator's meta names the triggering learner; a regenerate names its owner", async () => {
    const trigger = await newUser();
    const seen: Array<string | undefined> = [];
    const gen: LessonGenerator = {
      intro: async (_r, _a, meta) => {
        seen.push(meta?.userId);
        return { guessPrompt: "g", teach: "HTTPS defaults to port 443.", confidence: "high", uncertainClaims: [] };
      },
      practice: async (_r, _a, meta) => {
        seen.push(meta?.userId);
        return practice;
      },
      model: () => "test",
    };
    await ensureGeneration(objs[0], objRow, { scope: SHARED, triggeredBy: trigger, generator: gen, pending: fresh() }).fullPromise;
    assert.deepEqual(seen, [trigger, trigger]);
  });

  test("the real generator under a learner at the cap makes no model request", async () => {
    const u = await newUser();
    await seedSpend(u, "chat", SONNET, SEED_COACH_CAP);
    const h = ensureGeneration(objs[1], objRow, { scope: SHARED, triggeredBy: u, pending: fresh() });
    await assert.rejects(h.introPromise, AiBudgetError);
    await assert.rejects(h.fullPromise, AiBudgetError);
    assert.equal(modelRequests, 0);
  });
});

describe("item re-checks (FAIL-846)", () => {
  // The re-check only runs with the fact-check gate on.
  before(() => {
    delete process.env.ITEM_FACT_CHECK;
  });
  after(() => {
    process.env.ITEM_FACT_CHECK = "off";
  });
  const examItem = async (o: string) => {
    const r = await queryOne<{ id: string }>(
      `insert into exam_items (objective_id, item_format, stem, body, answer_key, explanation)
       values ($1, 'multiple_choice', $2, $3, '{"correct":[1]}', 'e') returning id`,
      [o, `Recheck stem ${randomUUID()}`, JSON.stringify({ choices: ["a", "b", "c", "d"] })]
    );
    return r!.id;
  };
  const ref = (id: string, o: string): ItemRef => ({ kind: "exam", itemId: id, objectiveId: o, question: "stem" });
  const checker = (): FactChecker & { users: Array<string | null | undefined> } => {
    const fn = (async (items: CheckItem[], meta: CheckMeta) => {
      fn.users.push(meta.userId);
      return items.map((it) => ({ key: it.key, publish: true, answer: it.expected, unsupportedClaims: [], outcome: "agree" as const }));
    }) as unknown as FactChecker & { users: Array<string | null | undefined> };
    fn.users = [];
    return fn;
  };

  test("the re-check is charged to the reporter", async () => {
    const u = await newUser();
    const c = checker();
    const id = await examItem(objs[2]);
    const f = await flagItem(ref(id, objs[2]), { userId: u, source: "learner" }, c);
    assert.deepEqual(await f.recheck, { ran: true, agreed: true, quarantined: false });
    assert.deepEqual(c.users, [u]);
  });

  test("a learner may start RECHECK_LIMIT.max a day; past it the report stands, the claim is given back, no call is made", async () => {
    const u = await newUser();
    for (let i = 0; i < RECHECK_LIMIT.max; i++) await consumeRateLimit(RECHECK_EVENT, u, RECHECK_LIMIT, { userId: u });
    const c = checker();
    const id = await examItem(objs[2]);
    const f = await flagItem(ref(id, objs[2]), { userId: u, source: "learner" }, c);
    assert.equal(f.recorded, true, "the report itself is recorded");
    assert.deepEqual(await f.recheck, { ran: false, agreed: null, quarantined: false });
    assert.deepEqual(c.users, []);
    const claims = await queryOne<{ n: number }>(`select count(*)::int as n from item_flags where item_id = $1 and source = 'recheck'`, [id]);
    assert.equal(claims!.n, 0, "the one re-check is still unspent");
    // Another reporter can still start it.
    const other = await newUser();
    const again = await flagItem(ref(id, objs[2]), { userId: other, source: "learner" }, c);
    assert.deepEqual(await again.recheck, { ran: true, agreed: true, quarantined: false });
  });
});
