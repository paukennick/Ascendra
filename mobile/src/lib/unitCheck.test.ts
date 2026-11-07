import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { unitCheckPartRows, unitPartA11yLabel, unitPartSummary, UNIT_PART_LABEL } from "./unitCheck.ts";

// REQ-113 (Audit 3 mobile H2, FAIL-251): the unit check's rows come from the
// grader's per-part scores; nothing is shown as "covered" by default.

const parts = ["Name the threat", "Pick the control", "Say how you'd verify it"];

describe("unit check part rows", () => {
  test("before grading every row is pending", () => {
    assert.deepEqual(
      unitCheckPartRows(parts, null).map((r) => r.state),
      ["pending", "pending", "pending"]
    );
  });

  test("per-part scores from the server are used in order, with comments", () => {
    const rows = unitCheckPartRows(parts, {
      missedParts: [],
      partScores: [
        { part: parts[0], score: "met", comment: "Right threat." },
        { part: parts[1], score: "missed", comment: "No control named." },
        { part: parts[2], score: "partial", comment: "Only half." },
      ],
    });
    assert.deepEqual(rows.map((r) => r.state), ["met", "missed", "partial"]);
    assert.equal(rows[1].comment, "No control named.");
    assert.equal(unitPartSummary(rows), "1 of 3 parts covered, 1 partly");
  });

  test("the audit's case: reworded missedParts and no per-part scores never show a missed part as covered", () => {
    const rows = unitCheckPartRows(parts, { missedParts: ["Part 2: Pick the control."], partScores: null });
    assert.deepEqual(rows.map((r) => r.state), ["unscored", "unscored", "unscored"]);
    assert.ok(!rows.some((r) => r.state === "met"));
    assert.equal(unitPartSummary(rows), null);
    assert.match(unitPartA11yLabel(rows[1], 1), /Part 2: Pick the control\. Not scored separately/);
  });

  test("an exact missedParts match is still shown as to work on", () => {
    const rows = unitCheckPartRows(parts, { missedParts: [" pick the CONTROL "] });
    assert.deepEqual(rows.map((r) => r.state), ["unscored", "missed", "unscored"]);
  });

  test("a per-part list of the wrong length or with a bad score is not trusted", () => {
    const short = unitCheckPartRows(parts, { missedParts: [], partScores: [{ part: parts[0], score: "met", comment: "" }] });
    assert.ok(short.every((r) => r.state === "unscored"));
    const bad = unitCheckPartRows(parts, {
      missedParts: [],
      partScores: parts.map((p) => ({ part: p, score: "great" as "met", comment: "" })),
    });
    assert.ok(bad.every((r) => r.state === "unscored"));
  });

  test("a miss reads as information, as on the PBQ screen", () => {
    assert.equal(UNIT_PART_LABEL.missed, "To work on");
    assert.match(unitPartA11yLabel({ part: "X", state: "met", comment: "" }, 0), /^Part 1: X\. Covered$/);
  });
});
