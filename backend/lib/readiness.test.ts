// REQ-100: course readiness rollup (pure).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { rollupReadiness } from "./readiness";

const units = [
  { id: "a", title: "A", weight: 60 },
  { id: "b", title: "B", weight: "40" },
];
const obj = (unitId: string, acc: number | null, score: number | null = acc) => ({
  unitId,
  weightedAccuracy: acc,
  readinessScore: score,
});

describe("rollupReadiness", () => {
  test("weights domains by the blueprint and keeps coverage, accuracy and readiness apart", () => {
    const r = rollupReadiness(units, [obj("a", 1, 1), obj("a", 1, 1), obj("b", 0.5, 0.25), obj("b", null)]);
    assert.equal(r.blueprintWeighted, true);
    assert.equal(r.coveragePercent, 80); // 0.6 x 1 + 0.4 x 0.5
    assert.equal(r.accuracyPercent, 80); // 0.6 x 1 + 0.4 x 0.5
    assert.equal(r.readinessPercent, 65); // 0.6 x 1 + 0.4 x 0.125
    assert.equal(r.practiced, 3);
    assert.equal(r.status, "building");
    assert.equal(r.focusUnitId, "b");
  });

  test("perfect accuracy on little of the course is not enough evidence", () => {
    const r = rollupReadiness(units, [obj("a", 1), obj("a", null), obj("a", null), obj("a", null), obj("b", null)]);
    assert.equal(r.accuracyPercent, 100);
    assert.equal(r.coveragePercent, 15);
    assert.equal(r.status, "not_enough_evidence");
  });

  test("no evidence at all", () => {
    const r = rollupReadiness(units, [obj("a", null), obj("b", null)]);
    assert.equal(r.status, "no_evidence");
    assert.equal(r.accuracyPercent, null);
    assert.equal(r.readinessPercent, 0);
  });

  test("ready needs both a high score and near-full coverage", () => {
    assert.equal(rollupReadiness(units, [obj("a", 0.9), obj("b", 0.8)]).status, "ready");
    const r = rollupReadiness(units, [obj("a", 1), obj("a", 1), obj("a", 1), obj("a", 1), obj("b", 1), obj("b", null)]);
    assert.equal(r.coveragePercent, 80);
    assert.equal(r.status, "building");
  });

  test("without a blueprint every objective counts the same; an unweighted unit in a blueprinted course is left out", () => {
    const flat = rollupReadiness(
      [
        { id: "a", title: "A", weight: null },
        { id: "b", title: "B", weight: null },
      ],
      [obj("a", 1), obj("a", 1), obj("a", 1), obj("b", null)]
    );
    assert.equal(flat.blueprintWeighted, false);
    assert.equal(flat.coveragePercent, 75);
    const withExtra = rollupReadiness([...units, { id: "x", title: "Unscored", weight: null }], [obj("a", 1), obj("b", 1), obj("x", null)]);
    assert.equal(withExtra.coveragePercent, 100);
    assert.equal(withExtra.domains.length, 3, "still listed, just not counted");
  });

  test("custom thresholds apply", () => {
    const r = rollupReadiness(units, [obj("a", 0.6), obj("b", 0.6)], { minCoverage: 0.5, readyScore: 0.5, readyCoverage: 0.5 });
    assert.equal(r.status, "ready");
  });
});
