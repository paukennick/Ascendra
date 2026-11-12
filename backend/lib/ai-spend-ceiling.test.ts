// REQ-202 x REQ-201: the global daily AI ceiling inside the model-call layer.
// Unit side: no database, no network, no key. The real ceiling sum and the real
// call paths (sprint, first lesson, re-check, review) are in
// lib/ai-spend-ceiling.dbtest.ts.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { __setClientForTest, callClaude, getFastModel } from "./anthropic";
import { setAiCallSink, PREGEN_PURPOSE_PREFIX, type AiPurpose } from "./ai-calls";
import { AiAccessError, ceilingPausedError } from "./ai-access";
import { setGlobalCeilingCheck, setSpendGateForTest, makeGlobalCeilingCheck, type CeilingDeps, type SpendContext } from "./ai-spend-gate";
import { PURPOSE_POOL, poolOf } from "./ai-spend-ledger";

const OWNER = "11111111-1111-4111-8111-111111111111";
const LEARNER = "22222222-2222-4222-8222-222222222222";

function deps(over: { reached?: boolean; isOwner?: CeilingDeps["isOwner"] } = {}) {
  const calls = { reached: 0, owner: 0 };
  const d: CeilingDeps = {
    reached: async () => (calls.reached++, over.reached ?? true),
    isOwner: over.isOwner ?? (async (id) => (calls.owner++, id === OWNER)),
    paused: (env) => ceilingPausedError("coach", env),
  };
  return { d, calls };
}

const ctx = (purpose: AiPurpose, userId: string | null): SpendContext => ({
  userId,
  purpose,
  model: "m",
  estimate: { usd: 0.01, inputTokens: 1, outputTokens: 1 },
});

const purposes = Object.keys(PURPOSE_POOL) as AiPurpose[];
const exempt = (p: AiPurpose) => p.startsWith(PREGEN_PURPOSE_PREFIX) || poolOf(p) === "grading";

describe("the ceiling check at the ceiling (every purpose)", () => {
  test("every purpose that writes or checks content is refused with a 429 paused AiAccessError", async () => {
    const check = makeGlobalCeilingCheck(deps().d);
    const blocked = purposes.filter((p) => !exempt(p));
    assert.ok(blocked.length > 20, "the walk covers the whole coach pool");
    for (const p of blocked) {
      for (const user of [LEARNER, null]) {
        await assert.rejects(check(ctx(p, user)), (e: unknown) => {
          assert.ok(e instanceof AiAccessError, p);
          assert.equal(e.status, 429, p);
          assert.equal(e.body.state, "paused", p);
          assert.ok(e.body.resetsAt, p);
          return true;
        }, `${p} for ${user ?? "no learner"}`);
      }
    }
  });

  test("the paths a release must stop are on that list: sprint exam items, item re-check, review writing, first lesson, chat, labs, unit-check writing", () => {
    for (const p of ["exam_items", "item_recheck", "review_generate", "lesson_intro", "lesson_practice", "chat", "coach_guard", "lab_generate", "unitcheck_generate", "fact_check", "pbq_generate"] as AiPurpose[]) {
      assert.equal(exempt(p), false, p);
    }
  });

  test("grading never stops (REQ-201): every grading-pool purpose passes and the spend is never even read", async () => {
    const { d, calls } = deps();
    const check = makeGlobalCeilingCheck(d);
    const grading = purposes.filter((p) => poolOf(p) === "grading");
    assert.ok(grading.length >= 8);
    for (const p of grading) await check(ctx(p, LEARNER));
    assert.equal(calls.reached, 0);
  });

  test("pregen purposes are not blocked, for any prefix match, with or without a learner (REQ-208)", async () => {
    const { d, calls } = deps();
    const check = makeGlobalCeilingCheck(d);
    const pre = purposes.filter((p) => p.startsWith("pregen"));
    assert.deepEqual(pre.sort(), ["pregen", "pregen_fact_check", "pregen_retry"]);
    for (const p of pre) {
      await check(ctx(p, null));
      await check(ctx(p, LEARNER));
    }
    assert.equal(calls.reached, 0);
  });

  test("owners are exempt; an ordinary learner and a call with no learner are not", async () => {
    const check = makeGlobalCeilingCheck(deps().d);
    await check(ctx("chat", OWNER));
    await check(ctx("exam_items", OWNER));
    await assert.rejects(check(ctx("chat", LEARNER)), AiAccessError);
    await assert.rejects(check(ctx("chat", null)), AiAccessError);
  });

  test("an owner lookup that fails counts as not an owner (the safe side)", async () => {
    const check = makeGlobalCeilingCheck(deps({ isOwner: async () => Promise.reject(new Error("db down")) }).d);
    await assert.rejects(check(ctx("chat", OWNER)), AiAccessError);
  });
});

describe("the ceiling check below the ceiling", () => {
  test("lets everything through and never looks the account up", async () => {
    const { d, calls } = deps({ reached: false });
    const check = makeGlobalCeilingCheck(d);
    for (const p of purposes) await check(ctx(p, LEARNER));
    assert.equal(calls.owner, 0);
  });
});

describe("the real check is the default and reaches the model-call layer", () => {
  let requests = 0;
  const savedCeiling = process.env.AI_GLOBAL_DAILY_CEILING_USD;
  beforeEach(() => {
    requests = 0;
    delete process.env.AI_GLOBAL_DAILY_CEILING_USD;
    setSpendGateForTest(null);
    setGlobalCeilingCheck(null);
    setAiCallSink(async () => {});
    __setClientForTest({
      messages: {
        create: async () => {
          requests++;
          return { content: [{ type: "text", text: "hi" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
        },
      },
    });
  });
  afterEach(() => {
    if (savedCeiling === undefined) delete process.env.AI_GLOBAL_DAILY_CEILING_USD;
    else process.env.AI_GLOBAL_DAILY_CEILING_USD = savedCeiling;
    setGlobalCeilingCheck(null);
    setAiCallSink(null);
    __setClientForTest(null);
  });
  const base = { system: "s", messages: [{ role: "user" as const, content: "q" }], model: getFastModel(), purpose: "exam_items" as const, userId: null };

  test("with no ceiling set a call goes through with no database read (the default configuration is unchanged)", async () => {
    assert.equal(await callClaude(base), "hi");
    assert.equal(requests, 1);
  });

  test("the lazy import resolves and a throw from the installed hook still stops the model request", async () => {
    setGlobalCeilingCheck(async () => {
      throw ceilingPausedError("coach");
    });
    await assert.rejects(callClaude(base), AiAccessError);
    assert.equal(requests, 0);
  });
});

describe("the paused answer", () => {
  test("is the one REQ-201's routes send", () => {
    const e = ceilingPausedError("regenerate", {} as NodeJS.ProcessEnv);
    assert.equal(e.status, 429);
    assert.equal(e.body.state, "paused");
    assert.equal(e.body.feature, "regenerate");
  });
});
