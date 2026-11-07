// Audit 3 M5: the live-eval plumbing, with no model and no database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BudgetExceededError, CostTally } from "./cost";
import { ATTACKS, guardItems, mockExamItems, parseLiveArgs, STEPS } from "./live";
import { referenceRuns } from "./runner";
import { gradeOutputProblems, parseGradingCases } from "./scoring";
import { OPEN_ITEM_KINDS } from "../../lib/coach-guard";
import type { AiCallRecord } from "../../lib/ai-calls";

const rec = (over: Partial<AiCallRecord>): AiCallRecord => ({
  userId: null, purpose: "chat", model: "claude-haiku-5-5", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, latencyMs: 1, ok: true, errorCode: null, ...over,
});

describe("cost tally", () => {
  test("prices each call from its usage, totals by purpose, and stops at the limit", () => {
    const t = new CostTally(1);
    t.add(rec({ outputTokens: 1_000_000 })); // $0.50
    t.add(rec({ purpose: "eval_judge", model: "claude-opus-5-5", inputTokens: 100_000, cacheReadTokens: 10 }));
    assert.ok(Math.abs(t.totalUsd - 0.900002) < 1e-9);
    assert.equal(t.byPurpose.get("eval_judge")!.callsWithCacheRead, 1);
    t.check();
    t.add(rec({ outputTokens: 200_000 }));
    assert.equal(t.exceeded, true);
    assert.throws(() => t.check(), BudgetExceededError);
  });
});

describe("live-eval arguments and plan coverage", () => {
  test("defaults follow the plan: all steps, $5, concurrency 4, Opus judge", () => {
    const a = parseLiveArgs([]);
    assert.deepEqual(a.steps, [...STEPS]);
    assert.equal(a.budget, 5);
    assert.equal(a.concurrency, 4);
    assert.equal(a.judge, "claude-opus-5-5");
    assert.deepEqual([a.lessons, a.quiz, a.exam], [20, 10, 10]);
    assert.deepEqual(parseLiveArgs(["--steps", "guard,cache", "--budget", "2", "--mock"]).steps, ["guard", "cache"]);
    assert.throws(() => parseLiveArgs(["--steps", "nope"]));
    assert.throws(() => parseLiveArgs(["--budget", "500"]));
  });
  test("the guard step covers all 8 open item kinds with 10 attacks, and question 40 of a 50-question mock", () => {
    assert.equal(ATTACKS.length, 10);
    const exam = mockExamItems();
    assert.equal(exam.length, 50);
    assert.equal(exam[39].position, 40);
    assert.deepEqual(new Set([...guardItems(), ...exam].map((i) => i.kind)), new Set(OPEN_ITEM_KINDS));
    for (const a of ATTACKS) for (const it of guardItems()) assert.ok(a.turns(it).length >= 1);
  });
  test("grading cases carry a reference answer each, and the plan's new adversarial cases", () => {
    const cases = parseGradingCases(JSON.parse(readFileSync(join(__dirname, "grading-cases.json"), "utf8")));
    assert.ok(cases.every((c) => c.referenceAnswer && c.referenceAnswer.length > 2));
    for (const id of ["adv-14", "adv-15", "adv-16", "adv-17", "adv-18", "adv-19", "adv-20"]) assert.ok(cases.some((c) => c.id === id), id);
    const padded = cases.find((c) => c.id === "adv-20")!;
    assert.ok(padded.answer.length > 7_800 && padded.answer.length <= 8_000);
    assert.equal(cases.find((c) => c.id === "adv-17")!.answer, cases.find((c) => c.id === "aws-03")!.referenceAnswer);
    assert.deepEqual(referenceRuns("both"), [false, true]);
    assert.deepEqual(referenceRuns("with"), [true]);
  });
  test("output consistency check", () => {
    assert.deepEqual(gradeOutputProblems({ verdict: "correct", missedParts: [] }), []);
    assert.deepEqual(gradeOutputProblems({ verdict: "correct", missedParts: ["x"] }), ["correct with missed parts"]);
    assert.deepEqual(gradeOutputProblems({ verdict: "correct", parts: [{ score: "missed" }] }), ["correct with a part not met"]);
  });
});
