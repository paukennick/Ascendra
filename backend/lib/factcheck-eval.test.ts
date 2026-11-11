// REQ-196: the fact-checker eval harness, with the model mocked (a fake
// Anthropic client) and the sandbox mocked (a fake runner). No key, no
// network, no Docker.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { RunBudget } from "./run-budget";
import type { CodeRunner } from "./verify-execution";
import {
  buildReport,
  installEvalSink,
  modelVariants,
  parseEvalSet,
  planEval,
  recommend,
  runEval,
  score,
  summaryMarkdown,
  wilson,
  type EvalItem,
  type ModelVariant,
  type VariantMetrics,
} from "./factcheck-eval";

const SET = parseEvalSet(JSON.parse(readFileSync(join(__dirname, "fixtures/factcheck-eval-set.json"), "utf8")));

// The fake model: "sonnet" with thinking answers like a perfect checker
// (the correct option for good items; for bad items an answer that differs
// from the key). Without thinking it misses every clinical bad item. Haiku
// misses every bad item and wrongly holds every clinical good one.
function fakeClient(calls: { model: string; thinking: unknown }[]) {
  return {
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async (body: any) => {
        calls.push({ model: body.model, thinking: body.thinking });
        const text: string = body.messages[0].content;
        // Paired items share a question; the options (rotated per item) tell them apart.
        const it = SET.find((i) => text.includes(`Question: ${i.question}`) && i.options.every((o, n) => text.includes(`Option ${n}: ${o}\n`)));
        assert.ok(it, "the item is in the prompt");
        const key = it!.expected[0];
        const other = (key + 1) % it!.options.length;
        const thinking = !body.thinking; // the 5.5 "off" spellings set a thinking param
        const strong = body.model.includes("sonnet");
        let answer = key;
        let claims: string[] = [];
        if (it!.label === "bad" && strong && (thinking || it!.family !== "clinical")) answer = other;
        if (it!.label === "good" && !strong && it!.family === "clinical") claims = ["unsure of this threshold"];
        return {
          parsed_output: { results: [{ key: "i1", answer: [answer], unsupportedClaims: claims }] },
          usage: { input_tokens: 1000, output_tokens: thinking ? 1000 : 100 },
          stop_reason: "end_turn",
        };
      },
    },
  };
}

// The fake sandbox: knows the two programs in the set.
const fakeRunner: CodeRunner = async (s) => {
  if (s.code.includes("date(2033")) return { status: "ok", stdout: "2557\n" };
  if (s.code.includes("2 ** (per_node - pod_range)")) return { status: "ok", stdout: "64\n" };
  return { status: "error", message: "unknown program" };
};

const variants: ModelVariant[] = modelVariants();

describe("REQ-196: the labeled set", () => {
  test("balanced: as many known-good as known-bad, every family on both sides except where noted, unique ids", () => {
    const bad = SET.filter((i) => i.label === "bad");
    const good = SET.filter((i) => i.label === "good");
    assert.equal(bad.length, good.length);
    assert.ok(bad.length >= 20);
    assert.equal(new Set(SET.map((i) => i.id)).size, SET.length);
    for (const f of ["clinical", "cloud", "it", "academic", "pm"]) {
      assert.ok(SET.some((i) => i.family === f && i.label === "bad"), `${f} has a known-bad item`);
      assert.ok(SET.some((i) => i.family === f && i.label === "good"), `${f} has a known-good item`);
    }
  });

  test("the audit items Nick named are in it as known-bad", () => {
    const ids = new Set(SET.filter((i) => i.label === "bad").map((i) => i.id));
    for (const id of ["SECPLUS-19-solo", "ABPTSECS-20-lems", "ABPTSGCS-27-hrmax", "AWSSAP-24-fade", "CMPCBS-7-fade", "CMPCBS-10-shared-credit", "CMPCBS-15-fade", "CCRNADULT-dka-k", "GCPNET-pod-range"]) {
      assert.ok(ids.has(id), id);
    }
    for (const i of SET) assert.ok(i.provenance && i.finding && i.why, `${i.id} says where it came from`);
  });

  test("the programs: a known-bad item's program expects the wrong key, a known-good one the right value", () => {
    const progs = SET.filter((i) => i.snippet);
    assert.ok(progs.some((i) => i.label === "bad") && progs.some((i) => i.label === "good"));
    for (const i of progs) assert.ok(i.options[i.expected[0]].replace(/,/g, "").includes(i.snippet!.expected), `${i.id}: the program expects what the key says`);
  });
});

describe("REQ-196: running the variants (model mocked)", () => {
  let calls: { model: string; thinking: unknown }[];
  beforeEach(() => {
    calls = [];
    __setClientForTest(fakeClient(calls));
  });
  afterEach(() => {
    __setClientForTest(null);
    setAiCallSink(null);
  });

  test("the estimate makes no call, and adds up per variant", async () => {
    const plan = await planEval({ items: SET, variants });
    assert.equal(calls.length, 0);
    assert.equal(plan.calls, SET.length * variants.length);
    const sum = Object.values(plan.perVariant).reduce((s, p) => s + p.upperUsd, 0);
    assert.ok(Math.abs(sum - plan.upperUsd) < 1e-9);
    assert.ok(plan.perVariant["sonnet+think"].upperUsd > plan.perVariant["haiku"].upperUsd * 10);
  });

  test("each variant is called with its own model and thinking setting; scoring, cost and the recommendation follow", async () => {
    const budget = new RunBudget(5);
    installEvalSink(budget);
    const run = await runEval({ items: SET, variants, budget, runner: fakeRunner, concurrency: 4 });
    assert.equal(run.calls.length, SET.length * variants.length);
    assert.equal(run.stoppedAtBudget, null);
    assert.deepEqual([...new Set(calls.map((c) => c.model))].sort(), ["claude-haiku-5-5", "claude-sonnet-5-5"]);
    assert.ok(calls.some((c) => c.model === "claude-sonnet-5-5" && c.thinking === undefined));
    assert.ok(calls.some((c) => c.model === "claude-sonnet-5-5" && (c.thinking as any)?.type === "between_tools"));
    assert.ok(calls.some((c) => c.model === "claude-haiku-5-5" && (c.thinking as any)?.type === "disabled"));

    const report = buildReport({ items: SET, variants, run, plan: await planEval({ items: SET, variants }), budget, startedAt: "t", mock: true });
    const m = (id: string, ms: VariantMetrics[] = report.overall) => ms.find((x) => x.variant === id)!;
    assert.equal(m("sonnet+think").recall.rate, 1);
    assert.equal(m("sonnet+think").falseHold.rate, 0);
    assert.equal(m("haiku").recall.rate, 0);
    // Execution catches the two known-bad programs even for the weakest model, and holds no known-good one.
    assert.equal(m("haiku+exec").recall.k, 2);
    assert.equal(m("haiku+exec").falseHold.k, m("haiku").falseHold.k);
    // Cost comes from the usage the API reported, per call.
    assert.ok(Math.abs(m("sonnet+think").usdPerCheck! - (1000 * 2 + 1000 * 10) / 1e6) < 1e-9);
    assert.ok(Math.abs(m("haiku").usdPerCheck! - (1000 * 0.1 + 100 * 0.5) / 1e6) < 1e-9);
    assert.ok(Math.abs(budget.spentUsd - run.calls.reduce((s, c) => s + c.usd, 0)) < 1e-9, "every call's cost is attributed to it");
    // Per family: sonnet without thinking is enough outside clinical; clinical needs thinking.
    assert.equal(report.recommendation.byFamily.cloud.variant, "sonnet");
    assert.equal(report.recommendation.byFamily.clinical.variant, "sonnet+think");
    assert.equal(report.recommendation.byFamily.clinical.meetsBar, true);
    assert.equal(report.recommendation.overall.variant, "sonnet+think");
    const md = summaryMarkdown(report);
    assert.match(md, /MOCK RUN/);
    assert.match(md, /## How to read this/);
    assert.match(md, /\*\*clinical\*\*: sonnet\+think/);
  });

  test("the budget is a hard stop, and the items reached are reached by every variant", async () => {
    const budget = new RunBudget(0.06);
    installEvalSink(budget);
    const run = await runEval({ items: SET, variants, budget, runner: null, concurrency: 1 });
    assert.ok(run.stoppedAtBudget);
    assert.ok(budget.spentUsd <= 0.06, `spent ${budget.spentUsd}`);
    assert.ok(run.calls.length > 0 && run.calls.length < SET.length * variants.length);
    const byItem = new Map<string, number>();
    for (const c of run.calls) byItem.set(c.itemId, (byItem.get(c.itemId) ?? 0) + 1);
    const complete = [...byItem.values()].filter((n) => n === variants.length).length;
    assert.ok(complete >= byItem.size - 1, "round-robin: at most the last item is partial");
  });

  test("a failed call counts as held (the gate fails closed) and is reported as an error", async () => {
    __setClientForTest({ messages: { create: async () => { throw new Error("x"); }, parse: async () => { throw new Error("overloaded"); } } });
    const budget = new RunBudget(5);
    installEvalSink(budget);
    const items = SET.filter((i) => i.label === "good").slice(0, 2);
    const run = await runEval({ items, variants: variants.slice(0, 1), budget, runner: null });
    assert.ok(run.calls.every((c) => c.held && c.outcome === "error"));
    const [m] = score(items, variants.slice(0, 1), run);
    assert.equal(m.errors, 2);
    assert.equal(m.falseHold.k, 2);
  });

  test("no sandbox: the +exec rows are not reported rather than reported as equal", async () => {
    const budget = new RunBudget(5);
    installEvalSink(budget);
    const items = SET.filter((i) => i.snippet);
    const run = await runEval({ items, variants: variants.slice(0, 1), budget, runner: async () => ({ status: "unavailable" }) });
    assert.equal(run.execAvailable, false);
    assert.deepEqual(score(items, variants.slice(0, 1), run).map((m) => m.variant), ["haiku"]);
  });
});

describe("REQ-196: the recommendation rule", () => {
  const met = (variant: string, recallK: number, fhK: number, usdPer1000: number, n = 20): VariantMetrics => ({
    variant,
    recall: wilson(recallK, n),
    falseHold: wilson(fhK, n),
    errors: 0,
    checks: 2 * n,
    usdPerCheck: usdPer1000 / 1000,
    usdPer1000,
    latencyMs: { mean: 1, p50: 1, p95: 1 },
    missed: [],
    wronglyHeld: [],
  });
  test("the cheapest variant at >= 95% recall and <= 5% false holds", () => {
    const r = recommend("x", [met("dear", 20, 0, 10), met("cheap", 19, 1, 1), met("cheapest", 18, 0, 0.1)]);
    assert.equal(r.variant, "cheap");
    assert.equal(r.meetsBar, true);
    assert.equal(r.smallSample, false);
  });
  test("none meets it: the best recall, flagged, with a pointer to human review", () => {
    const r = recommend("clinical", [met("a", 5, 0, 1, 7), met("b", 6, 1, 5, 7)]);
    assert.equal(r.meetsBar, false);
    assert.equal(r.variant, "b");
    assert.match(r.reason, /human review/);
    assert.equal(r.smallSample, true);
  });
  test("wilson intervals", () => {
    const w = wilson(19, 20);
    assert.ok(w.low! > 0.76 && w.low! < 0.77 && w.high! > 0.99);
    assert.equal(wilson(0, 0).rate, null);
  });
});

// keep the type import used
export type _E = EvalItem;
