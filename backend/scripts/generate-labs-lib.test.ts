// REQ-123: the lab generator's pure parts -- density policies, costs, review
// burden, request ids and arguments. Nothing here calls a model.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  apportion,
  isPerformanceObjective,
  kindFor,
  labRequestId,
  parseLabGenArgs,
  DEFAULT_LAB_POLICY,
  parseLabRequestId,
  perLabGenerationUsd,
  perStepGradingUsd,
  reviewItems,
  summarize,
  unitPlan,
  type PlanTrack,
} from "./generate-labs-lib";

const TRACK: PlanTrack = {
  code: "T",
  family: "general",
  units: [
    { title: "Big", weight: 50, objectives: ["Design a VPC", "Choose a database", "Calculate cost", "Configure routing"] },
    { title: "Mid", weight: 30, objectives: ["Plan a migration", "Define availability"] },
    { title: "Small", weight: 20, objectives: ["Define the shared responsibility model"] },
  ],
};

describe("density policies (REQ-123)", () => {
  test("largest-remainder split adds up and is deterministic", () => {
    assert.deepEqual(apportion(6, [50, 30, 20]), [3, 2, 1]);
    assert.deepEqual(apportion(5, [null, null, null]), [2, 2, 1]);
    assert.deepEqual(apportion(0, [1, 2]), [0, 0]);
    assert.equal(apportion(7, [33, 41, 26]).reduce((a, b) => a + b, 0), 7);
  });
  test("performance objectives by wording; knowledge-only ones are not", () => {
    assert.ok(isPerformanceObjective("Design a VPC", "general"));
    assert.ok(isPerformanceObjective("Calculating the expected delivery date", "clinical"));
    assert.ok(!isPerformanceObjective("Define availability", "general"));
    assert.ok(!isPerformanceObjective("The OPT model's phases", "fitness"));
    assert.ok(isPerformanceObjective("Cardiogenic shock and caring for patients on mechanical circulatory support devices", "clinical"));
    assert.ok(!isPerformanceObjective("Cardiogenic shock", "general"), "conditions count as cases only on clinical tracks");
  });
  test("each policy's per-unit counts", () => {
    assert.deepEqual(unitPlan(TRACK, "fixed"), [2, 1, 1]);
    assert.deepEqual(unitPlan(TRACK, "per_objective"), [4, 1, 0]);
    // weighted: 12 split 6/4/2, capped by performance objectives
    assert.deepEqual(unitPlan(TRACK, "weighted"), [4, 1, 0]);
    // hybrid: 1 each + 6 extras split 3/2/1, capped at 3 per unit and at the
    // unit's performance objectives (floor of 1 always)
    assert.deepEqual(unitPlan(TRACK, "hybrid"), [3, 1, 1]);
  });
  test("summaries count labs, coverage, cost and review burden", () => {
    const s = summarize([TRACK, { ...TRACK, code: "C", family: "clinical" }], "hybrid");
    assert.equal(s.labs, 10);
    assert.equal(s.units, 6);
    assert.equal(s.unitsWithLab, 6);
    // general: 20% sample, at least 2; clinical: every lab
    assert.equal(s.reviewItems, 2 + 5);
    assert.ok(Math.abs(s.generationUsd - 10 * perLabGenerationUsd()) < 1e-9);
  });
  test("review burden: clinical and fitness in full, others sampled", () => {
    assert.equal(reviewItems("clinical", 14), 14);
    assert.equal(reviewItems("fitness", 11), 11);
    assert.equal(reviewItems("general", 10), 2);
    assert.equal(reviewItems("general", 40), 8);
    assert.equal(reviewItems("general", 0), 0);
  });
  test("cost per lab and per graded step stay in cents", () => {
    assert.ok(perLabGenerationUsd() > 0.01 && perLabGenerationUsd() < 0.03, String(perLabGenerationUsd()));
    assert.ok(perStepGradingUsd() < 0.001, String(perStepGradingUsd()));
  });
});

describe("generator plumbing", () => {
  test("request ids round-trip and fit the batch id pattern", () => {
    const id = "0b5f2a6e-3c1d-4f7a-9b2e-1c2d3e4f5a6b";
    const rid = labRequestId(id, "case");
    assert.match(rid, /^[a-zA-Z0-9_-]{1,64}$/);
    assert.deepEqual(parseLabRequestId(rid), { objectiveId: id, kind: "case" });
    assert.equal(parseLabRequestId("nope"), null);
  });
  test("clinical tracks get cases, others build labs", () => {
    assert.equal(kindFor("clinical"), "case");
    assert.equal(kindFor("fitness"), "build");
  });
  test("estimate is the default; submit and collect only when asked", () => {
    // REQ-124: Nick adopted (d) hybrid as the default plan.
    assert.equal(DEFAULT_LAB_POLICY, "hybrid");
    assert.deepEqual(parseLabGenArgs([]), { mode: "estimate", tracks: [], limit: null, policy: "hybrid" });
    assert.equal(parseLabGenArgs(["--compare"]).mode, "compare");
    assert.deepEqual(parseLabGenArgs(["--tracks", "AWSSAA, PMP", "--limit", "5", "--policy", "fixed"]).tracks, ["AWSSAA", "PMP"]);
    assert.equal(parseLabGenArgs(["--collect", "msgbatch_abc123"]).batchId, "msgbatch_abc123");
    assert.throws(() => parseLabGenArgs(["--collect", "x"]));
    assert.throws(() => parseLabGenArgs(["--policy", "lots"]));
    assert.throws(() => parseLabGenArgs(["--limit", "0"]));
    assert.throws(() => parseLabGenArgs(["--live"]));
  });
});
