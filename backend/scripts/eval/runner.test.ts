// The eval orchestration with fake model clients: nothing is generated or
// judged by a real model, and a failing call is recorded rather than aborting
// the run.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mapLimit, briefError, runGradingEval, runLessonEval, type SampledObjective } from "./runner";
import { aggregateGrading, aggregateLessons, type GradingCase, type LessonContentLike } from "./scoring";

const lesson: LessonContentLike = {
  guessPrompt: "g",
  teach: Array.from({ length: 150 }, (_, i) => `w${i}`).join(" "),
  fadeProblem: "f",
  fadeChoices: ["a", "b", "c", "d"],
  fadeCorrectIndex: 0,
  fadeWhy: "Short reason.",
  soloCheck: "s",
  soloChoices: ["e", "f", "g", "h"],
  soloCorrectIndex: 3,
  soloWhy: "Short reason.",
};
const ok = { note: "ok", pass: true };
const rubric = {
  termsDefined: { ...ok, namedTerms: [], undefinedTerms: [] },
  oneWorkedExample: ok, misconceptionNamed: ok, inScope: ok, fadeChoicesPlausible: ok, soloChoicesPlausible: ok,
};
const sample: SampledObjective[] = ["a", "b", "c", "d", "e"].map((id, i) => ({
  id, stratum: i % 2 ? "skills" : "certification", title: `obj-${id}`, unitTitle: "u", trackTitle: "t",
}));

describe("mapLimit", () => {
  test("preserves order and never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapLimit([30, 5, 20, 1, 10, 2], 2, async (ms, i) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, ms));
      inFlight--;
      return i;
    });
    assert.deepEqual(out, [0, 1, 2, 3, 4, 5]);
    assert.ok(peak <= 2, `peak ${peak}`);
  });
  test("empty input", async () => {
    assert.deepEqual(await mapLimit([], 4, async () => 1), []);
  });
});

describe("briefError", () => {
  test("first line only, bounded, no stack", () => {
    const e = new Error("line one\nline two with secrets");
    assert.equal(briefError(e), "Error: line one");
    assert.equal(briefError("x".repeat(1000)).length, 300);
  });
});

describe("runLessonEval", () => {
  test("generates, judges and independently solves every objective; generation never touches storage", async () => {
    const calls = { generate: 0, judge: 0, solve: 0 };
    const { records, lessons } = await runLessonEval(sample, {
      concurrency: 3,
      async generate() { calls.generate++; return lesson; },
      async judge() { calls.judge++; return rubric; },
      // answers the way the stored keys say, so every key criterion passes
      async solve() { calls.solve++; return { fadeReasoning: "r", fadeAnswerIndex: 0, soloReasoning: "r", soloAnswerIndex: 3 }; },
    });
    assert.deepEqual(calls, { generate: 5, judge: 5, solve: 5 });
    assert.equal(records.length, 5);
    assert.deepEqual(records.map((r) => r.objectiveId), ["a", "b", "c", "d", "e"]);
    assert.ok(records.every((r) => r.score?.allPass));
    assert.deepEqual(Object.keys(lessons).sort(), ["a", "b", "c", "d", "e"]);
    assert.equal(aggregateLessons(records).allPass.rate, 1);
    assert.equal(records[1].trackType, "skills");
  });

  test("a failure in generation, judge or solve is recorded for that objective only", async () => {
    const progress: string[] = [];
    const { records } = await runLessonEval(sample, {
      async generate(o) { if (o.id === "b") throw new Error("overloaded_error"); return lesson; },
      async judge(o) { if (o.id === "d") throw Object.assign(new Error("judge 529"), { name: "APIError" }); return rubric; },
      async solve(o) {
        if (o.id === "e") throw new Error("no parsed_output");
        return { fadeReasoning: "r", fadeAnswerIndex: 0, soloReasoning: "r", soloAnswerIndex: 3 };
      },
      onProgress: (done, total, rec) => progress.push(`${done}/${total}:${rec.objectiveId}`),
    });
    assert.deepEqual(records.map((r) => (r.error ? "error" : "scored")), ["scored", "error", "scored", "error", "error"]);
    assert.match(records[1].error!, /overloaded_error/);
    assert.match(records[3].error!, /APIError: judge 529/);
    assert.equal(aggregateLessons(records).errors, 3);
    assert.equal(progress.length, 5);
    assert.ok(progress.some((p) => p.startsWith("5/5")));
  });

  test("a wrong stored key is caught by the independent solve", async () => {
    const { records } = await runLessonEval(sample.slice(0, 1), {
      async generate() { return lesson; },
      async judge() { return rubric; },
      async solve() { return { fadeReasoning: "r", fadeAnswerIndex: 2, soloReasoning: "r", soloAnswerIndex: 3 }; },
    });
    assert.equal(records[0].score?.criteria.fade_key_correct.pass, false);
    assert.equal(records[0].score?.criteria.solo_key_correct.pass, true);
    assert.equal(records[0].score?.allPass, false);
  });
});

describe("runGradingEval", () => {
  const cases: GradingCase[] = [
    { id: "x1", domain: "d", tags: [], track: { trackTitle: "T" }, question: "q", taughtText: "t", answer: "a", expectedVerdict: "correct", expectedMissedParts: [] },
    { id: "x2", domain: "d", tags: [], track: { trackTitle: "T" }, question: "q", taughtText: "t", answer: "a", expectedVerdict: "partial", expectedMissedParts: ["second part"] },
    { id: "x3", domain: "d", tags: [], track: { trackTitle: "T" }, question: "q", taughtText: "t", answer: "a", expectedVerdict: "incorrect", expectedMissedParts: [] },
  ];

  test("grades every case with the injected grader and aggregates", async () => {
    const seen: string[] = [];
    const records = await runGradingEval(cases, {
      async grade(c) {
        seen.push(c.id);
        if (c.id === "x1") return { verdict: "correct", feedback: "f", classification: "none", missedParts: [] };
        if (c.id === "x2") return { verdict: "partial", feedback: "f", classification: "incomplete", missedParts: ["The second part was skipped"] };
        return { verdict: "partial", feedback: "f", classification: "incomplete", missedParts: [] };
      },
    });
    assert.deepEqual(seen.sort(), ["x1", "x2", "x3"]);
    const s = aggregateGrading(records);
    assert.deepEqual(s.verdictAgreement, { pass: 2, total: 3, rate: 2 / 3 });
    assert.deepEqual(s.disagreements, ["x3"]);
    assert.equal(s.missedRecall.mean, 1);
  });

  test("a grader that throws is recorded as an error and does not stop the other cases", async () => {
    const records = await runGradingEval(cases, {
      async grade(c) {
        if (c.id === "x2") throw new Error("Claude structured output missing parsed_output. stop_reason=max_tokens");
        return { verdict: "correct", feedback: "f", classification: "none", missedParts: [] };
      },
    });
    assert.equal(records.filter((r) => r.error).length, 1);
    assert.match(records[1].error!, /missing parsed_output/);
    assert.equal(aggregateGrading(records).scored, 2);
  });
});
