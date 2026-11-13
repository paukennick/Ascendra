// Phase 0: per-model request parameters, request shape, and the logging
// wrapper around every call. No network and no API key: the Anthropic client is
// replaced with a fake and the ai_calls sink with an array.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  modelFamily,
  modelParams,
  effectiveMaxTokens,
  THINKING_HEADROOM_TOKENS,
  warnUnknownModelOnce,
  __resetUnknownModelWarningsForTest,
  buildRequest,
  callClaude,
  callClaudeStructured,
  getModel,
  getFastModel,
  parseLooseJson,
  __setClientForTest,
  type Effort,
} from "./anthropic";
import { setAiCallSink, type AiCallRecord } from "./ai-calls";
import { setSpendGateForTest } from "./ai-spend-gate";
import { systemWithRules } from "./prompts";

const SONNET = "claude-sonnet-5-5";
const HAIKU = "claude-haiku-5-5";
const ALL_EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

describe("modelFamily", () => {
  test("recognizes each family, including dated and suffixed ids", () => {
    assert.equal(modelFamily("claude-sonnet-5-5"), "sonnet-5-5");
    assert.equal(modelFamily("claude-sonnet-5-5-20261101"), "sonnet-5-5");
    assert.equal(modelFamily("claude-haiku-5-5"), "haiku-5-5");
    assert.equal(modelFamily("claude-opus-5-5"), "opus-5-5");
    assert.equal(modelFamily("claude-sonnet-4-5"), "legacy-4-5");
    assert.equal(modelFamily("claude-haiku-4-5-20251001"), "legacy-4-5");
  });
  test("does not mistake a longer version for a known one", () => {
    assert.equal(modelFamily("claude-sonnet-5-50"), "unknown");
    assert.equal(modelFamily("claude-sonnet-5"), "unknown");
    assert.equal(modelFamily("gpt-5"), "unknown");
    assert.equal(modelFamily(""), "unknown");
  });
});

describe("modelParams: Sonnet 5.5", () => {
  test("thinking off is between_tools (never disabled) at effort low, medium, high or unset", () => {
    for (const effort of [undefined, "low", "medium", "high"] as const) {
      const p = modelParams(SONNET, { effort, thinking: "off" });
      assert.deepEqual(p.thinking, { type: "between_tools" });
      assert.equal(p.effort, effort);
    }
  });
  test("thinking off is rejected at xhigh and max", () => {
    for (const effort of ["xhigh", "max"] as const) {
      assert.throws(() => modelParams(SONNET, { effort, thinking: "off" }), /only valid at effort low, medium or high/);
    }
  });
  test("thinking default omits the thinking field and keeps effort, at every level", () => {
    for (const effort of ALL_EFFORTS) {
      assert.deepEqual(modelParams(SONNET, { effort, thinking: "default" }), { effort });
    }
    assert.deepEqual(modelParams(SONNET), {});
  });
});

describe("modelParams: Haiku 5.5", () => {
  test("thinking off is disabled at effort low, medium, high or unset", () => {
    for (const effort of [undefined, "low", "medium", "high"] as const) {
      const p = modelParams(HAIKU, { effort, thinking: "off" });
      assert.deepEqual(p.thinking, { type: "disabled" });
      assert.equal(p.effort, effort);
    }
  });
  test("thinking off is rejected at xhigh and max", () => {
    for (const effort of ["xhigh", "max"] as const) {
      assert.throws(() => modelParams(HAIKU, { effort, thinking: "off" }), /only valid at effort low, medium or high/);
    }
  });
  test("thinking default omits thinking, keeps effort", () => {
    for (const effort of ALL_EFFORTS) {
      assert.deepEqual(modelParams(HAIKU, { effort }), { effort });
    }
  });
});

describe("modelParams: 4.5 models", () => {
  for (const model of ["claude-sonnet-4-5", "claude-haiku-4-5-20251001"]) {
    test(`${model}: thinking off is disabled, and effort is never sent`, () => {
      for (const effort of [undefined, ...ALL_EFFORTS]) {
        assert.deepEqual(modelParams(model, { effort, thinking: "off" }), { thinking: { type: "disabled" } });
      }
    });
    test(`${model}: thinking default sends nothing, whatever the effort`, () => {
      for (const effort of [undefined, ...ALL_EFFORTS]) {
        assert.deepEqual(modelParams(model, { effort, thinking: "default" }), {});
      }
    });
  }
});

describe("modelParams: Opus 5.5 and unknown models", () => {
  test("Opus 5.5 gets effort but never a thinking field", () => {
    assert.deepEqual(modelParams("claude-opus-5-5", { effort: "high", thinking: "off" }), { effort: "high" });
    assert.deepEqual(modelParams("claude-opus-5-5"), {});
  });
  test("an unknown model gets neither thinking nor effort", () => {
    assert.deepEqual(modelParams("claude-future-9", { effort: "high", thinking: "off" }), {});
    assert.deepEqual(modelParams("some-proxy-model", { effort: "low" }), {});
  });
  test("an invalid effort is an error, not silently sent", () => {
    assert.throws(() => modelParams(SONNET, { effort: "ultra" as Effort }), /Invalid effort/);
  });
});

describe("effectiveMaxTokens", () => {
  test("known models with thinking off keep the caller's cap", () => {
    for (const m of [SONNET, HAIKU, "claude-sonnet-4-5", "claude-haiku-4-5-20251001"]) {
      assert.equal(effectiveMaxTokens(m, 4000, "off"), 4000);
    }
  });
  test("4.5 models never think unless asked, so no headroom", () => {
    assert.equal(effectiveMaxTokens("claude-sonnet-4-5", 800), 800);
  });
  test("unknown models, Opus, and 5.5 models left on default thinking get headroom", () => {
    assert.equal(effectiveMaxTokens("claude-future-9", 800, "off"), 800 + THINKING_HEADROOM_TOKENS);
    assert.equal(effectiveMaxTokens("claude-opus-5-5", 800, "off"), 800 + THINKING_HEADROOM_TOKENS);
    assert.equal(effectiveMaxTokens(SONNET, 800, "default"), 800 + THINKING_HEADROOM_TOKENS);
    assert.equal(effectiveMaxTokens(HAIKU, 800), 800 + THINKING_HEADROOM_TOKENS);
  });
  test("REQ-251: a caller's own thinking allowance is added on top of its answer cap, only when thinking may run", () => {
    assert.equal(effectiveMaxTokens(SONNET, 6000, "default", 4000), 10_000);
    assert.equal(effectiveMaxTokens(HAIKU, 6000, "default", 2500), 8500);
    assert.equal(effectiveMaxTokens(SONNET, 6000, "off", 4000), 6000);
    assert.equal(effectiveMaxTokens("claude-sonnet-4-5", 6000, "default", 4000), 6000);
    assert.throws(() => effectiveMaxTokens(SONNET, 6000, "default", -1), /whole number/);
    assert.throws(() => effectiveMaxTokens(SONNET, 6000, "default", 1.5), /whole number/);
  });
});

describe("warnUnknownModelOnce", () => {
  beforeEach(() => __resetUnknownModelWarningsForTest());
  test("warns once per model id", () => {
    const logs: string[] = [];
    assert.equal(warnUnknownModelOnce("mystery-1", (m) => logs.push(m)), true);
    assert.equal(warnUnknownModelOnce("mystery-1", (m) => logs.push(m)), false);
    assert.equal(warnUnknownModelOnce("mystery-2", (m) => logs.push(m)), true);
    assert.equal(logs.length, 2);
    assert.match(logs[0], /mystery-1/);
  });
});

describe("defaults", () => {
  const saved = { m: process.env.ANTHROPIC_MODEL, f: process.env.ANTHROPIC_FAST_MODEL };
  afterEach(() => {
    if (saved.m === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = saved.m;
    if (saved.f === undefined) delete process.env.ANTHROPIC_FAST_MODEL;
    else process.env.ANTHROPIC_FAST_MODEL = saved.f;
  });
  test("5.5 models by default; env overrides win", () => {
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.ANTHROPIC_FAST_MODEL;
    assert.equal(getModel(), "claude-sonnet-5-5");
    assert.equal(getFastModel(), "claude-haiku-5-5");
    process.env.ANTHROPIC_MODEL = "claude-sonnet-4-5";
    process.env.ANTHROPIC_FAST_MODEL = "claude-haiku-4-5-20251001";
    assert.equal(getModel(), "claude-sonnet-4-5");
    assert.equal(getFastModel(), "claude-haiku-4-5-20251001");
  });
});

describe("buildRequest", () => {
  const base = { messages: [{ role: "user" as const, content: "hi" }], purpose: "chat" as const, userId: null };

  test("never contains temperature, top_p or top_k, for any family", () => {
    for (const model of [SONNET, HAIKU, "claude-opus-5-5", "claude-sonnet-4-5", "claude-haiku-4-5-20251001", "x"]) {
      const body = buildRequest({ ...base, system: "s", model, effort: "low", thinking: "off" });
      for (const k of ["temperature", "top_p", "top_k"]) assert.ok(!(k in body), `${model} has ${k}`);
    }
  });

  test("Sonnet 5.5, thinking off: between_tools plus effort in output_config", () => {
    const body = buildRequest({ ...base, system: "s", model: SONNET, effort: "medium", thinking: "off" });
    assert.deepEqual(body.thinking, { type: "between_tools" });
    assert.deepEqual(body.output_config, { effort: "medium" });
  });

  test("effort is merged into the same output_config as the structured-output format", () => {
    const format = { type: "json_schema", schema: {} };
    const body = buildRequest({ ...base, system: "s", model: HAIKU, effort: "high", thinking: "off" }, format);
    assert.deepEqual(body.output_config, { effort: "high", format });
    assert.deepEqual(body.thinking, { type: "disabled" });
  });

  test("4.5 model: no effort anywhere, format alone survives in output_config", () => {
    const format = { type: "json_schema", schema: {} };
    const body = buildRequest({ ...base, system: "s", model: "claude-haiku-4-5-20251001", effort: "high", thinking: "off" }, format);
    assert.deepEqual(body.output_config, { format });
    const plain = buildRequest({ ...base, system: "s", model: "claude-sonnet-4-5", effort: "high" });
    assert.ok(!("output_config" in plain));
  });

  test("a SystemPrompt becomes a cached stable block followed by an uncached task block", () => {
    const sp = systemWithRules("TASK TEXT", { trackTitle: "T", trackType: "skills" });
    const body = buildRequest({ ...base, system: sp, model: SONNET });
    const blocks = body.system as { type: string; text: string; cache_control?: unknown }[];
    assert.equal(blocks.length, 2);
    assert.deepEqual(blocks[0].cache_control, { type: "ephemeral" });
    assert.match(blocks[0].text, /^You are a demanding but practical study coach/);
    assert.ok(!blocks[0].text.includes("TASK TEXT"), "per-task text is not in the cached block");
    assert.equal(blocks[1].text, "TASK TEXT");
    assert.ok(!("cache_control" in blocks[1]));
  });

  test("the cached block is byte-identical across tasks on the same track", () => {
    const ctx = { trackTitle: "T", trackType: "skills" };
    const a = buildRequest({ ...base, system: systemWithRules("A", ctx), model: SONNET }).system as { text: string }[];
    const b = buildRequest({ ...base, system: systemWithRules("B", ctx), model: SONNET }).system as { text: string }[];
    assert.equal(a[0].text, b[0].text);
  });

  test("a plain string system prompt is passed through", () => {
    assert.equal(buildRequest({ ...base, system: "plain", model: SONNET }).system, "plain");
  });

  test("cacheBreakpoint marks exactly that message; others stay plain strings", () => {
    const body = buildRequest({
      ...base,
      system: "s",
      model: HAIKU,
      messages: [
        { role: "user", content: "q1" },
        { role: "assistant", content: "a1", cacheBreakpoint: true },
        { role: "user", content: "q2" },
      ],
    });
    const msgs = body.messages as { role: string; content: unknown }[];
    assert.equal(msgs[0].content, "q1");
    assert.deepEqual(msgs[1].content, [{ type: "text", text: "a1", cache_control: { type: "ephemeral" } }]);
    assert.equal(msgs[2].content, "q2");
  });

  test("refuses a request that ends with an assistant turn (prefill) and an empty one", () => {
    assert.throws(
      () => buildRequest({ ...base, system: "s", model: SONNET, messages: [{ role: "user", content: "q" }, { role: "assistant", content: "{" }] }),
      /must end with a user turn/
    );
    assert.throws(() => buildRequest({ ...base, system: "s", model: SONNET, messages: [] }), /at least one message/);
  });

  test("max_tokens: unchanged for known models with thinking off, padded for unknown ones", () => {
    assert.equal(buildRequest({ ...base, system: "s", model: SONNET, maxTokens: 800, thinking: "off" }).max_tokens, 800);
    assert.equal(
      buildRequest({ ...base, system: "s", model: "claude-future-9", maxTokens: 800, thinking: "off" }).max_tokens,
      800 + THINKING_HEADROOM_TOKENS
    );
  });
});

describe("parseLooseJson (local provider only)", () => {
  test("parses plain and fenced JSON; garbage is a coded error", () => {
    assert.deepEqual(parseLooseJson('{"a":1}'), { a: 1 });
    assert.deepEqual(parseLooseJson('```json\n{"a":1}\n```'), { a: 1 });
    assert.throws(() => parseLooseJson("nope"), /did not return valid JSON/);
  });
});

// --- the wrapper: fake client, array sink --------------------------------

type Fake = {
  requests: Record<string, unknown>[];
  client: Parameters<typeof __setClientForTest>[0];
};

function fakeClient(respond: (kind: "create" | "parse", params: Record<string, unknown>) => unknown): Fake {
  const requests: Record<string, unknown>[] = [];
  const run = (kind: "create" | "parse") => async (params: Record<string, unknown>) => {
    requests.push(params);
    const r = respond(kind, params);
    if (r instanceof Error) throw r;
    return r;
  };
  return { requests, client: { messages: { create: run("create"), parse: run("parse") } } };
}

const USAGE = { input_tokens: 120, output_tokens: 45, cache_read_input_tokens: 600, cache_creation_input_tokens: 0 };
const flush = () => new Promise((r) => setImmediate(r));

describe("call wrappers log every call and never throw because of logging", () => {
  const logged: AiCallRecord[] = [];
  beforeEach(() => {
    logged.length = 0;
    // No database in a unit test: the spend gate (lib/ai-spend-gate.test.ts,
    // ai-spend-gate.dbtest.ts) is stood in for by one that lets the call through.
    setSpendGateForTest({ reserve: async () => null });
    setAiCallSink(async (r) => {
      logged.push(r);
    });
    delete process.env.AI_PROVIDER;
    delete process.env.AI_CALL_LOG;
  });
  afterEach(() => {
    setSpendGateForTest(null);
    setAiCallSink(null);
    __setClientForTest(null);
  });

  const chatOpts = {
    system: "s",
    messages: [{ role: "user" as const, content: "hello" }],
    model: HAIKU,
    effort: "low" as const,
    thinking: "off" as const,
    purpose: "chat" as const,
    userId: "11111111-1111-4111-8111-111111111111",
  };

  test("callClaude: returns the text and logs usage, model, purpose and user", async () => {
    const f = fakeClient(() => ({ content: [{ type: "text", text: "reply" }], stop_reason: "end_turn", usage: USAGE }));
    __setClientForTest(f.client);
    assert.equal(await callClaude(chatOpts), "reply");
    await flush();
    assert.equal(logged.length, 1);
    assert.deepEqual(
      { ...logged[0], latencyMs: 0 },
      {
        userId: chatOpts.userId,
        purpose: "chat",
        model: HAIKU,
        inputTokens: 120,
        outputTokens: 45,
        cacheReadTokens: 600,
        cacheWriteTokens: 0,
        latencyMs: 0,
        ok: true,
        errorCode: null,
      }
    );
    assert.ok(logged[0].latencyMs >= 0);
    // and what was actually sent
    assert.deepEqual(f.requests[0].thinking, { type: "disabled" });
    assert.deepEqual(f.requests[0].output_config, { effort: "low" });
    assert.ok(!("temperature" in f.requests[0]));
  });

  test("callClaude: an API error is logged ok=false with a code, and still thrown to the caller", async () => {
    const apiErr = Object.assign(new Error("429 rate limited: secret prompt echo"), {
      status: 429,
      error: { error: { type: "rate_limit_error" } },
    });
    __setClientForTest(fakeClient(() => apiErr).client);
    await assert.rejects(callClaude(chatOpts), /rate limited/);
    await flush();
    assert.equal(logged.length, 1);
    assert.equal(logged[0].ok, false);
    assert.equal(logged[0].errorCode, "http_429_rate_limit_error");
    assert.equal(logged[0].inputTokens, null);
    assert.ok(!JSON.stringify(logged[0]).includes("secret prompt echo"), "error message is not logged");
  });

  test("callClaude: a response with no text block is a logged failure that keeps its usage", async () => {
    __setClientForTest(
      fakeClient(() => ({ content: [{ type: "thinking" }], stop_reason: "max_tokens", usage: USAGE })).client
    );
    await assert.rejects(callClaude(chatOpts), /no text content block.*blocks=\[thinking\]/);
    await flush();
    assert.equal(logged[0].ok, false);
    assert.equal(logged[0].errorCode, "no_text_block");
    assert.equal(logged[0].outputTokens, 45);
  });

  test("callClaudeStructured: returns parsed_output, sends the format with effort, logs success", async () => {
    const schema = z.object({ feedback: z.string() });
    const f = fakeClient(() => ({ content: [{ type: "text", text: '{"feedback":"good"}' }], stop_reason: "end_turn", usage: USAGE }));
    __setClientForTest(f.client);
    const out = await callClaudeStructured({ ...chatOpts, schema, purpose: "guess_feedback" });
    assert.deepEqual(out, { feedback: "good" });
    await flush();
    assert.equal(logged[0].purpose, "guess_feedback");
    assert.equal(logged[0].ok, true);
    const oc = f.requests[0].output_config as { effort?: string; format?: { type?: string } };
    assert.equal(oc.effort, "low");
    assert.equal(oc.format?.type, "json_schema");
  });

  test("callClaudeStructured: an answer with no text is a logged failure that keeps its usage", async () => {
    const schema = z.object({ feedback: z.string() });
    __setClientForTest(fakeClient(() => ({ content: [{ type: "thinking" }], stop_reason: "max_tokens", usage: USAGE })).client);
    await assert.rejects(callClaudeStructured({ ...chatOpts, schema }), /no text to parse/);
    await flush();
    assert.equal(logged[0].ok, false);
    assert.equal(logged[0].errorCode, "no_parsed_output");
    assert.equal(logged[0].outputTokens, 45);
  });

  // REQ-202 / FAIL-840: messages.parse threw before the usage reached the log,
  // so a billed answer that failed to parse was recorded at $0.
  test("callClaudeStructured: an answer that does not parse is logged with its real usage", async () => {
    const schema = z.object({ feedback: z.string() });
    for (const text of ['{"feedback": "cut off mid-str', '{"other": 1}', "not json at all"]) {
      logged.length = 0;
      __setClientForTest(fakeClient(() => ({ content: [{ type: "text", text }], stop_reason: "max_tokens", usage: USAGE })).client);
      await assert.rejects(callClaudeStructured({ ...chatOpts, schema }), /did not parse/);
      await flush();
      assert.equal(logged.length, 1);
      assert.equal(logged[0].ok, false);
      assert.equal(logged[0].errorCode, "invalid_structured_output");
      assert.equal(logged[0].inputTokens, 120, text);
      assert.equal(logged[0].outputTokens, 45, text);
      assert.equal(logged[0].cacheReadTokens, 600, text);
    }
  });

  test("a sink that rejects, throws synchronously, or hangs never changes the result", async () => {
    __setClientForTest(
      fakeClient(() => ({ content: [{ type: "text", text: "fine" }], stop_reason: "end_turn", usage: USAGE })).client
    );
    const warn = console.warn;
    const warnings: string[] = [];
    console.warn = (m: string) => warnings.push(String(m));
    try {
      setAiCallSink(async () => {
        throw new Error('relation "ai_calls" does not exist');
      });
      assert.equal(await callClaude(chatOpts), "fine");
      setAiCallSink(() => {
        throw new Error("sync boom");
      });
      assert.equal(await callClaude(chatOpts), "fine");
      setAiCallSink(() => new Promise(() => {})); // never settles
      assert.equal(await callClaude(chatOpts), "fine");
      await flush();
    } finally {
      console.warn = warn;
    }
    assert.equal(warnings.filter((w) => w.includes("[ai_calls]")).length, 2);
  });

  test("a failing call with a failing sink still surfaces the original API error", async () => {
    __setClientForTest(fakeClient(() => Object.assign(new Error("upstream 500"), { status: 500 })).client);
    setAiCallSink(async () => {
      throw new Error("db down");
    });
    const warn = console.warn;
    console.warn = () => {};
    try {
      await assert.rejects(callClaude(chatOpts), /upstream 500/);
      await flush();
    } finally {
      console.warn = warn;
    }
  });

  test("AI_CALL_LOG=off records nothing", async () => {
    process.env.AI_CALL_LOG = "off";
    __setClientForTest(
      fakeClient(() => ({ content: [{ type: "text", text: "x" }], stop_reason: "end_turn", usage: USAGE })).client
    );
    await callClaude(chatOpts);
    await flush();
    assert.equal(logged.length, 0);
  });
});
