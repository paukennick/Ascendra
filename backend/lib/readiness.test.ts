// REQ-100: course readiness rollup (pure).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { objectiveReadiness, rollupReadiness } from "./readiness";

const units = [
  { id: "a", title: "A", weight: 60 },
  { id: "b", title: "B", weight: "40" },
];
// A confirmed objective (Independent, kept at a due review) unless told
// otherwise: REQ-117 caps the rest.
const obj = (unitId: string, acc: number | null, score: number | null = acc, over: Record<string, unknown> = {}) => ({
  unitId,
  weightedAccuracy: acc,
  readinessScore: score,
  status: acc == null ? null : "Independent",
  kept: acc == null ? null : "kept",
  retention: 1,
  ...over,
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

  test("FAIL-341: high accuracy with nothing kept at a due review is not ready", () => {
    const r = rollupReadiness(units, [obj("a", 0.95, 0.95, { kept: "unchecked" }), obj("b", 0.95, 0.95, { kept: "unchecked" })]);
    assert.equal(r.status, "building");
    assert.equal(r.keptPercent, 0);
    assert.equal(r.readinessPercent, 60, "capped until confirmed");
  });

  test("FAIL-342: readiness falls with time away (retention), whatever the evidence", () => {
    const fresh = rollupReadiness(units, [obj("a", 0.9), obj("b", 0.9)]);
    const away = rollupReadiness(units, [obj("a", 0.9, 0.9, { retention: 0.5 }), obj("b", 0.9, 0.9, { retention: 0.5 })]);
    assert.equal(fresh.status, "ready");
    assert.equal(away.readinessPercent, 45);
    assert.equal(away.status, "building");
    const due = objectiveReadiness({ unitId: "a", weightedAccuracy: 0.9, readinessScore: 0.9, status: "Independent", kept: "kept", recheckDue: true });
    assert.equal(due, 0.6, "a kept objective due to re-check is not confirmed");
  });

  test("FAIL-347: an objective below Independent is capped, so Guided-only learners never read ready", () => {
    const r = rollupReadiness(units, [obj("a", 0.95, 0.95, { status: "Guided" }), obj("b", 0.95, 0.95, { status: "Guided" })]);
    assert.equal(r.readinessPercent, 60);
    assert.equal(r.status, "building");
  });
});
