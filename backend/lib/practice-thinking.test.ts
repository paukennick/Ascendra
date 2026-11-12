// REQ-251 (FAIL-1663): the practice half of a lesson is written with bounded
// thinking; the teaching text is not. Pins the request every practice writer
// sends (the app's generator, pre-generation's batch request and live retry),
// that max_tokens leaves the answer its whole room on top of the thinking
// allowance (FAIL-008 cannot recur), and the one thinking-off fallback when a
// reply still stops on max_tokens. No network, no key, no database: the
// Anthropic client is a fake and the spend gate lets every call through.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { __setClientForTest, buildRequest, THINKING_HEADROOM_TOKENS } from "./anthropic";
import { AiResponseError, setAiCallSink } from "./ai-calls";
import { setSpendGateForTest } from "./ai-spend-gate";
import {
  claudeGenerator,
  PRACTICE_CALL,
  PRACTICE_NO_THINKING_CALL,
  PRACTICE_OUTPUT_TOKENS,
  PRACTICE_THINKING_BUDGET_TOKENS,
  stoppedAtMaxTokens,
  writePracticeDraft,
  type ObjectiveRow,
} from "./lesson-generation";
import { introParams, liveRetryWriter, practiceParams } from "./pregen";
import { lessonPracticeLint, lessonPracticeHardProblems } from "./content-validator";

const SONNET = "claude-sonnet-5-5";
const HAIKU = "claude-haiku-5-5";
// What a practice reply really used in the 2026-11-12 trial, thinking off.
const TRIAL_PRACTICE_OUTPUT_TOKENS = 4800;

const obj = { title: "Objective", unit_title: "Unit", track_title: "Track", ctx: null } as unknown as ObjectiveRow;

const CORRECT = "Use TCP port 443";
const reasons = () => ["Port 80 is plain HTTP.", "Port 443 is HTTPS.", "Port 8080 is an alternate HTTP port.", "Port 22 is SSH."];
const choices = () => ["Use TCP port 80", CORRECT, "Use TCP port 8080", "Use TCP port 22"];
const practiceBody = () => ({
  fadeProblem: "A team is configuring a firewall. Which port must be opened so browsers can reach the secure site?",
  fadeChoices: choices(),
  fadeCorrectIndex: 1,
  fadeWhy: "Secure web traffic uses port 443.",
  soloCheck: "Another team must allow secure browsing to its server. Which port does that need?",
  soloChoices: choices(),
  soloCorrectIndex: 1,
  soloWhy: "Secure web traffic uses port 443.",
  fadeOptionReasons: reasons(),
  soloOptionReasons: reasons(),
  soloVerification: null,
  confidence: "high",
  uncertainClaims: [] as string[],
});
const USAGE = { input_tokens: 10, output_tokens: 10 };
const ok = () => ({ content: [{ type: "text", text: JSON.stringify(practiceBody()) }], stop_reason: "end_turn", usage: USAGE });
// FAIL-008's shape: thinking used every token, no answer text at all.
const thinkingOnly = () => ({ content: [{ type: "thinking", thinking: "" }], stop_reason: "max_tokens", usage: USAGE });

function fake(replies: (() => unknown)[]) {
  const sent: Record<string, any>[] = [];
  let i = 0;
  __setClientForTest({
    messages: {
      create: async (params: Record<string, any>) => {
        sent.push(params);
        const r = (replies[i++] ?? replies[replies.length - 1])();
        if (r instanceof Error) throw r;
        return r;
      },
    },
  });
  return sent;
}

const knobs = (body: Record<string, any>) => ({ thinking: body.thinking, effort: body.output_config?.effort, max_tokens: body.max_tokens });

describe("REQ-251: the practice call thinks, bounded; the teaching text does not", () => {
  test("fixture is clean, so a retry below is never the style retry", () => {
    assert.deepEqual(lessonPracticeHardProblems(practiceBody() as never), []);
    assert.deepEqual(lessonPracticeLint(practiceBody() as never), []);
  });

  test("the named budget and the shared practice configuration", () => {
    assert.equal(PRACTICE_THINKING_BUDGET_TOKENS, 4000);
    assert.equal(PRACTICE_OUTPUT_TOKENS, 6000);
    assert.deepEqual(PRACTICE_CALL, { maxTokens: 6000, thinkingBudgetTokens: 4000, effort: "low", thinking: "default" });
    assert.deepEqual(PRACTICE_NO_THINKING_CALL, { maxTokens: 6000, effort: "medium", thinking: "off" });
  });

  test("Sonnet 5.5 practice: adaptive thinking (no thinking field) at effort low, max_tokens = full answer room + thinking budget", () => {
    const p = practiceParams(SONNET, obj, "teach") as Record<string, any>;
    assert.ok(!("thinking" in p), "no thinking field: adaptive thinking on Sonnet 5.5; never budget_tokens (a 400 on 5.5)");
    assert.ok(!JSON.stringify(p).includes("budget_tokens"));
    assert.equal(p.output_config.effort, "low");
    assert.equal(p.max_tokens, PRACTICE_OUTPUT_TOKENS + PRACTICE_THINKING_BUDGET_TOKENS);
    assert.equal(p.max_tokens, 10_000);
    // FAIL-008 guard: a reply whose thinking uses its whole allowance still
    // has more room left than a practice answer has ever needed.
    assert.ok(p.max_tokens - PRACTICE_THINKING_BUDGET_TOKENS >= TRIAL_PRACTICE_OUTPUT_TOKENS);
    assert.ok(p.max_tokens - PRACTICE_THINKING_BUDGET_TOKENS >= PRACTICE_OUTPUT_TOKENS);
  });

  test("Haiku 5.5 practice: same bound, no thinking field; a 4.5 rollback never thinks and keeps the answer-sized cap", () => {
    const h = practiceParams(HAIKU, obj, "teach") as Record<string, any>;
    assert.ok(!("thinking" in h));
    assert.equal(h.output_config.effort, "low");
    assert.equal(h.max_tokens, 10_000);
    const legacy = practiceParams("claude-sonnet-4-5", obj, "teach") as Record<string, any>;
    assert.ok(!("thinking" in legacy));
    assert.equal(legacy.max_tokens, PRACTICE_OUTPUT_TOKENS);
  });

  test("the intro (teaching text) keeps thinking off: between_tools, effort medium, 4000", () => {
    assert.deepEqual(knobs(introParams(SONNET, obj)), { thinking: { type: "between_tools" }, effort: "medium", max_tokens: 4000 });
  });

  test("thinkingBudgetTokens only sizes max_tokens; it is never sent", () => {
    const base = { system: "s", messages: [{ role: "user" as const, content: "x" }], purpose: "chat" as const, userId: null, model: SONNET };
    const b = buildRequest({ ...base, maxTokens: 1000, thinking: "default", thinkingBudgetTokens: 2500 });
    assert.equal(b.max_tokens, 3500);
    assert.ok(!JSON.stringify(b).includes("2500"));
    assert.equal(buildRequest({ ...base, maxTokens: 1000, thinking: "default" }).max_tokens, 1000 + THINKING_HEADROOM_TOKENS);
    assert.equal(buildRequest({ ...base, maxTokens: 1000, thinking: "off", thinkingBudgetTokens: 2500 }).max_tokens, 1000, "no allowance when thinking is off");
  });
});

describe("REQ-251: every practice writer sends the same thinking configuration", () => {
  const saved = process.env.ANTHROPIC_MODEL;
  beforeEach(() => {
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.AI_PROVIDER;
    setSpendGateForTest({ reserve: async () => null });
    setAiCallSink(async () => {});
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = saved;
    setSpendGateForTest(null);
    setAiCallSink(null);
    __setClientForTest(null);
  });

  test("claudeGenerator.practice and pregen's live retry send exactly the batch request's knobs", async () => {
    const batch = knobs(practiceParams(SONNET, obj, "teach"));
    let sent = fake([ok]);
    await claudeGenerator.practice(obj, undefined, { teach: "teach" });
    assert.equal(sent.length, 1);
    assert.deepEqual(knobs(sent[0]), batch);
    sent = fake([ok]);
    await liveRetryWriter.practice(obj, "teach", "steer");
    assert.equal(sent.length, 1);
    assert.deepEqual(knobs(sent[0]), batch);
  });

  test("a practice reply that stops on max_tokens (thinking only, FAIL-008's shape) is written once more with thinking off", async () => {
    const sent = fake([thinkingOnly, ok]);
    const out = await claudeGenerator.practice(obj, undefined, { teach: "teach" });
    assert.equal(sent.length, 2);
    assert.deepEqual(knobs(sent[0]), knobs(practiceParams(SONNET, obj, "teach")));
    assert.deepEqual(knobs(sent[1]), { thinking: { type: "between_tools" }, effort: "medium", max_tokens: PRACTICE_OUTPUT_TOKENS });
    assert.equal(out.soloChoices.length, 4);
  });

  test("the fallback is once: a second max_tokens stop is the error, and other errors are never retried", async () => {
    let sent = fake([thinkingOnly, thinkingOnly]);
    await assert.rejects(claudeGenerator.practice(obj, undefined, { teach: "teach" }), AiResponseError);
    assert.equal(sent.length, 2);
    sent = fake([() => ({ content: [], stop_reason: "refusal", usage: USAGE })]);
    await assert.rejects(claudeGenerator.practice(obj, undefined, { teach: "teach" }), AiResponseError);
    assert.equal(sent.length, 1, "not a max_tokens stop: no second call");
  });

  test("pregen's live retry has no fallback: a max_tokens stop is a failed retry (one call, inside its upper bound)", async () => {
    const sent = fake([thinkingOnly, ok]);
    await assert.rejects(liveRetryWriter.practice(obj, "teach", null), /retry call failed/);
    assert.equal(sent.length, 1);
  });

  test("stoppedAtMaxTokens reads both structured-output errors and nothing else", async () => {
    assert.ok(stoppedAtMaxTokens(new AiResponseError("no_parsed_output", "Claude structured output had no text to parse. stop_reason=max_tokens, blocks=[thinking]")));
    assert.ok(stoppedAtMaxTokens(new AiResponseError("invalid_structured_output", "Claude structured output did not parse. stop_reason=max_tokens. x")));
    assert.ok(!stoppedAtMaxTokens(new AiResponseError("no_parsed_output", "stop_reason=end_turn")));
    assert.ok(!stoppedAtMaxTokens(new Error("stop_reason=max_tokens")));
    const calls: string[] = [];
    const r = await writePracticeDraft(async (cfg) => {
      calls.push(cfg.thinking);
      return "fine";
    });
    assert.equal(r, "fine");
    assert.deepEqual(calls, ["default"]);
  });
});
