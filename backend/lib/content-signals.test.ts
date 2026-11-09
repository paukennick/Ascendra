// REQ-143: the detection math behind the content review queue. Pure.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SIGNAL_PARAMS, evaluateDrop, evaluateReports, signalParams, twoProportionZ } from "./content-signals";

describe("learner reports", () => {
  test("three different learners in the window open a review, whatever the volume", () => {
    assert.deepEqual(evaluateReports({ reporters: 3, learners: null }), { flagged: true, rules: ["burst"], rate: null });
    assert.equal(evaluateReports({ reporters: 3, learners: 3 }).flagged, true);
  });
  test("two learners open one only when they are at least 10% of 10+ recent learners", () => {
    assert.deepEqual(evaluateReports({ reporters: 2, learners: 15 }).rules, ["rate"]);
    assert.equal(evaluateReports({ reporters: 2, learners: 20 }).flagged, true);
    assert.equal(evaluateReports({ reporters: 2, learners: 25 }).flagged, false); // 8%
  });
  test("low volume stays quiet: 2 of 3 learners is a high rate but not enough people", () => {
    assert.equal(evaluateReports({ reporters: 2, learners: 3 }).flagged, false);
    assert.equal(evaluateReports({ reporters: 2, learners: 9 }).flagged, false);
    assert.equal(evaluateReports({ reporters: 1, learners: 10 }).flagged, false);
    assert.equal(evaluateReports({ reporters: 2, learners: null }).flagged, false);
    assert.equal(evaluateReports({ reporters: 0, learners: 0 }).flagged, false);
  });
  test("both rules can fire together", () => {
    assert.deepEqual(evaluateReports({ reporters: 4, learners: 12 }).rules, ["burst", "rate"]);
  });
});

describe("correct-rate drop", () => {
  test("two-proportion z (pooled) matches a hand calculation", () => {
    // 24/30 vs 6/20: pooled 0.6, se = sqrt(0.24 * (1/30 + 1/20)) = 0.1414
    assert.ok(Math.abs(twoProportionZ(24, 30, 6, 20) - 3.536) < 0.01);
    assert.equal(twoProportionZ(30, 30, 20, 20), 0); // no variance
    assert.equal(twoProportionZ(0, 0, 1, 5), 0);
  });
  test("a large, significant drop on enough learners is flagged", () => {
    const v = evaluateDrop({ baselineN: 30, baselineCorrect: 24, recentN: 20, recentCorrect: 6 });
    assert.equal(v.flagged, true);
    assert.equal(v.drop, 0.5);
    assert.equal(v.baselineRate, 0.8);
    assert.equal(v.recentRate, 0.3);
    assert.equal(evaluateDrop({ baselineN: 200, baselineCorrect: 160, recentN: 50, recentCorrect: 25 }).flagged, true);
  });
  test("a 20-point drop on small samples is not significant enough", () => {
    const v = evaluateDrop({ baselineN: 30, baselineCorrect: 24, recentN: 20, recentCorrect: 12 });
    assert.equal(v.eligible, true);
    assert.equal(v.flagged, false);
    assert.ok(v.z! < DEFAULT_SIGNAL_PARAMS.dropZ);
  });
  test("a significant but small drop (big samples, 10 points) is not flagged", () => {
    const v = evaluateDrop({ baselineN: 5000, baselineCorrect: 4000, recentN: 2000, recentCorrect: 1400 });
    assert.ok(v.z! > 5);
    assert.equal(v.flagged, false);
  });
  test("low volume is never eligible: today's handful of accounts cannot trigger it", () => {
    for (const [bn, bc, rn, rc] of [
      [3, 3, 3, 0],
      [29, 29, 20, 0],
      [30, 30, 19, 0],
      [0, 0, 0, 0],
    ]) {
      const v = evaluateDrop({ baselineN: bn, baselineCorrect: bc, recentN: rn, recentCorrect: rc });
      assert.equal(v.eligible, false, `${bn}/${rn}`);
      assert.equal(v.flagged, false);
    }
  });
  test("a rise, or bad counts, is never flagged", () => {
    assert.equal(evaluateDrop({ baselineN: 50, baselineCorrect: 10, recentN: 40, recentCorrect: 38 }).flagged, false);
    assert.equal(evaluateDrop({ baselineN: 50, baselineCorrect: 60, recentN: 40, recentCorrect: 0 }).flagged, false);
    assert.equal(evaluateDrop({ baselineN: 50.5, baselineCorrect: 40, recentN: 40, recentCorrect: 0 }).flagged, false);
  });
  test("healthy items rarely flag by chance (2,000 simulated stable items)", () => {
    // Deterministic LCG so the test is stable.
    let seed = 42;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
    const draw = (n: number, p: number) => Array.from({ length: n }, () => (rand() < p ? 1 : 0)).reduce<number>((a, b) => a + b, 0);
    let flagged = 0;
    for (let i = 0; i < 2000; i++) {
      const p = 0.4 + rand() * 0.5;
      const bn = 30 + Math.floor(rand() * 200);
      const rn = 20 + Math.floor(rand() * 60);
      if (evaluateDrop({ baselineN: bn, baselineCorrect: draw(bn, p), recentN: rn, recentCorrect: draw(rn, p) }).flagged) flagged++;
    }
    // Expected about 0.1-0.2% (one-sided p < 0.001 plus the 20-point floor);
    // this seed gives 4. A real item is re-tested daily on overlapping data,
    // so its chance flags are not independent day to day.
    assert.ok(flagged <= 6, `${flagged} of 2000 stable items flagged`);
  });
});

describe("signalParams", () => {
  test("reads item_quality_params rows and falls back to defaults", () => {
    assert.deepEqual(signalParams([]), DEFAULT_SIGNAL_PARAMS);
    const p = signalParams([
      { name: "signal_report_min_learners", value: "5" },
      { name: "signal_drop_z", value: 2.58 },
      { name: "signal_report_rate", value: "0.2" },
      { name: "unrelated", value: 1 },
    ]);
    assert.equal(p.reportMinLearners, 5);
    assert.equal(p.dropZ, 2.58);
    assert.equal(p.reportRate, 0.2);
  });
  test("refuses values that would flood the queue", () => {
    const p = signalParams([
      { name: "signal_report_min_learners", value: "1" },
      { name: "signal_drop_min_recent", value: "2" },
      { name: "signal_drop_z", value: "0" },
      { name: "signal_report_rate", value: "0" },
      { name: "signal_drop_min_points", value: "abc" },
    ]);
    assert.deepEqual(p, DEFAULT_SIGNAL_PARAMS);
  });
});
