import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { REPORT_NOTE_MAX, REPORT_REASONS, SIM_REPORT_REASONS, reportBody, reportCopy, reportKey, reportReasons } from "./reportProblem.ts";

describe("Report a problem with this question (REQ-114, Audit 3 H2)", () => {
  test("the body names the question the way each screen addresses it, never an item id or text", () => {
    assert.deepEqual(reportBody({ kind: "lesson", objectiveId: "o1", stage: "solo" }, "wrong_answer", ""), {
      kind: "lesson",
      objectiveId: "o1",
      stage: "solo",
      reason: "wrong_answer",
    });
    assert.deepEqual(reportBody({ kind: "exam", sessionId: "s1", position: 3 }, "unclear", "  two answers fit  "), {
      kind: "exam",
      sessionId: "s1",
      position: 3,
      reason: "unclear",
      note: "two answers fit",
    });
    assert.equal((reportBody({ kind: "quiz", turnId: "t" }, "other", "x".repeat(900)).note as string).length, REPORT_NOTE_MAX);
  });

  test("reasons match the server's list and each has a spoken label", () => {
    assert.deepEqual(
      REPORT_REASONS.map((r) => r.value),
      ["wrong_answer", "unclear", "outdated", "offensive", "other"]
    );
    for (const r of REPORT_REASONS) assert.ok(r.label.length > 5);
  });

  test("one key per question, so a re-render keeps the thank-you line", () => {
    assert.equal(reportKey({ kind: "review", sessionId: "s", position: 0 }), "review:s:0");
    assert.notEqual(reportKey({ kind: "lesson", objectiveId: "o", stage: "fade" }), reportKey({ kind: "lesson", objectiveId: "o", stage: "solo" }));
    assert.equal(reportKey({ kind: "comparison", itemId: "i" }), "comparison:i");
  });

  test("REQ-199: a sim report names the run and the moment; one per run; its own wording and the same reason codes", () => {
    assert.deepEqual(reportBody({ kind: "sim", runId: "r1", tick: 42, stateHash: "abc" }, "unclear", " odd "), {
      kind: "sim",
      runId: "r1",
      tick: 42,
      stateHash: "abc",
      reason: "unclear",
      note: "odd",
    });
    assert.deepEqual(reportBody({ kind: "sim", runId: "r1" }, "other", ""), { kind: "sim", runId: "r1", reason: "other" }, "no undefined fields");
    assert.equal(reportKey({ kind: "sim", runId: "r1", tick: 1 }), reportKey({ kind: "sim", runId: "r1", tick: 99 }), "the tick moving keeps the thank-you line");
    assert.deepEqual(SIM_REPORT_REASONS.map((r) => r.value), REPORT_REASONS.map((r) => r.value));
    assert.equal(reportReasons({ kind: "sim", runId: "r" }), SIM_REPORT_REASONS);
    assert.equal(reportCopy({ kind: "sim", runId: "r" }).link, "Report a problem");
    assert.match(reportCopy({ kind: "sim", runId: "r" }).thanks, /simulation/);
    assert.match(reportCopy({ kind: "lab", labId: "l" }).link, /question/);
  });
});
