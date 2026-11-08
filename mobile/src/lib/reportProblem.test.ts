import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { REPORT_NOTE_MAX, REPORT_REASONS, reportBody, reportKey } from "./reportProblem.ts";

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
});
