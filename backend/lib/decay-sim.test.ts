// REQ-291: the persona simulation's pure parts, and the headline claims the
// design doc makes from it (docs/mastery-decay-design.md). Simulation with
// assumed forgetting curves, not learner data.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  draw,
  fixedRetention,
  formatReport,
  itemFactor,
  outcome,
  PERSONAS,
  runAll,
  runPersona,
  studies,
  trueRecall,
  trueUpdate,
} from "./decay-sim";

describe("decay simulation building blocks (REQ-291)", () => {
  test("draws are deterministic and in [0, 1)", () => {
    assert.equal(draw("a|1"), draw("a|1"));
    assert.notEqual(draw("a|1"), draw("a|2"));
    for (let i = 0; i < 1000; i++) {
      const u = draw(`k${i}`);
      assert.ok(u >= 0 && u < 1);
    }
  });

  test("the assumed true curve is exponential; hard recalls grow memory more; help grows it less; a miss shrinks it", () => {
    const m = { tau: 10, base: 8 };
    assert.equal(trueRecall(m, 0), 1);
    assert.ok(Math.abs(trueRecall(m, 10) - Math.exp(-1)) < 1e-12);
    assert.ok(trueUpdate(m, 0.6, "correct", false).tau > trueUpdate(m, 0.9, "correct", false).tau);
    assert.ok(trueUpdate(m, 0.6, "correct", true).tau < trueUpdate(m, 0.6, "correct", false).tau);
    assert.ok(trueUpdate(m, 0.6, "correct", false, "fast").tau > trueUpdate(m, 0.6, "correct", false, "slow").tau);
    assert.ok(trueUpdate(m, 0.6, "incorrect", false).tau < m.tau);
    assert.ok(trueUpdate({ tau: 2, base: 8 }, 0.1, "incorrect", false).tau >= 8 * 0.7);
  });

  test("outcomes: below p correct, a narrow partial band, then a miss; help raises the chance", () => {
    assert.equal(outcome(0.8, false, 0.79), "correct");
    assert.equal(outcome(0.8, false, 0.81), "partial");
    assert.equal(outcome(0.8, false, 0.95), "incorrect");
    assert.equal(outcome(0.5, true, 0.7), "correct");
  });

  test("study days follow the weekday pattern and absences", () => {
    const p = PERSONAS.find((x) => x.id === "inconsistent")!;
    for (let d = 28; d <= 41; d++) assert.equal(studies(p, d), false);
    const steady = PERSONAS.find((x) => x.id === "steady")!;
    assert.equal(studies(steady, 5), false); // weekend
    assert.equal(studies(steady, 7), true);
    const f = itemFactor(steady, 3);
    assert.ok(f > 0.6 && f < 1.7);
  });

  test("fixed_v1's prediction is migration 045's retention: 1 up to the interval, 10S / (9S + t) after", () => {
    assert.equal(fixedRetention(2, 7), 1);
    assert.ok(Math.abs(fixedRetention(2, 14) - 70 / 77) < 1e-12);
    assert.equal(fixedRetention(0, 0), 1);
  });
});

describe("decay simulation results (REQ-291)", () => {
  test("a run is deterministic", () => {
    const p = PERSONAS[0];
    assert.deepEqual(runPersona(p, "hybrid"), runPersona(p, "hybrid"));
  });

  test("8 personas x 3 engines, and the report says it is a simulation, not learner data", () => {
    const r = runAll();
    assert.equal(PERSONAS.length, 8);
    assert.equal(r.length, 24);
    const text = formatReport(r);
    assert.ok(text.includes("| crammer (exam day 21) | hybrid |"));
    for (const x of r) {
      assert.ok(x.learned === 40, `${x.persona} ${x.engine} learned ${x.learned}`);
      assert.ok(x.trueRecallAtCheck > 0 && x.trueRecallAtCheck <= 1);
    }
  });

  // The design's headline claims. If a change to the model breaks one of
  // these, the recommendation in docs/mastery-decay-design.md must change too.
  test("headline: hybrid keeps simulated exam-day recall at or above fixed_v1 for every persona, under both assumed truths", () => {
    for (const truth of ["slow", "fast"] as const) {
      const r = runAll(PERSONAS, { truth });
      for (const p of PERSONAS) {
        const fixed = r.find((x) => x.persona === p.id && x.engine === "fixed_v1")!;
        const hybrid = r.find((x) => x.persona === p.id && x.engine === "hybrid")!;
        assert.ok(hybrid.trueRecallAtCheck >= fixed.trueRecallAtCheck - 0.005, `${truth} ${p.id}: ${hybrid.trueRecallAtCheck} < ${fixed.trueRecallAtCheck}`);
      }
    }
  });

  test("headline: fixed_v1's 045 retention reads 97%+ at the exam for every persona, above simulated recall; the proposed model is closer", () => {
    const r = runAll();
    for (const p of PERSONAS) {
      const fixed = r.find((x) => x.persona === p.id && x.engine === "fixed_v1")!;
      const hybrid = r.find((x) => x.persona === p.id && x.engine === "hybrid")!;
      assert.ok(fixed.predictedAtCheck >= 0.97, p.id);
      assert.ok(Math.abs(hybrid.predictedAtCheck - hybrid.trueRecallAtCheck) < Math.abs(fixed.predictedAtCheck - fixed.trueRecallAtCheck), p.id);
    }
  });

  test("headline: the proposed model is still overconfident under the slow-growth truth (why it ships in shadow mode first)", () => {
    const r = runAll().filter((x) => x.engine === "hybrid");
    assert.ok(r.every((x) => x.predictedAtCheck > x.trueRecallAtCheck), "every persona over-predicted");
  });

  test("headline: goal-based daily caps starve a two-days-a-week learner (rejected)", () => {
    const p = PERSONAS.find((x) => x.id === "credential")!;
    const capped = runPersona(p, "hybrid", { goalCaps: true });
    const uncapped = runPersona(p, "hybrid");
    assert.ok(capped.trueRecallAtCheck < uncapped.trueRecallAtCheck - 0.2);
  });

  test("the output pasted in docs/mastery-decay-design.md is the current simulation's", () => {
    const doc = readFileSync(join(__dirname, "..", "..", "docs", "mastery-decay-design.md"), "utf8");
    const main = formatReport(runAll()).replace(/^### /gm, "#### ");
    assert.ok(doc.includes(main), "rerun npm run sim:decay and paste its output into the design doc");
  });
});
