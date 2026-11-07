// REQ-080: the mastery engine is pure and drives every progress number the
// app shows, so it gets the first real tests in the repo. Runs on Node's
// built-in runner through the already-installed tsx (`npm test`).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  nextReviewDate,
  statusToScore,
  toDateOnlyString,
  MASTERY_LABELS,
} from "./mastery";

describe("statusToScore", () => {
  test("covers every label on the 0-4 rubric; Needs review scores like Introduced", () => {
    const expected: Record<string, number> = {
      "Not started": 0,
      Introduced: 1,
      Guided: 2,
      Independent: 3,
      "Transfer-ready": 4,
      "Needs review": 1,
    };
    for (const label of MASTERY_LABELS) {
      assert.equal(statusToScore(label), expected[label], label);
    }
  });
});

describe("spaced review schedule", () => {
  test("1 / 7 / 21 days out, then resolved", () => {
    const from = new Date(2026, 0, 1); // local Jan 1
    assert.equal(toDateOnlyString(nextReviewDate(from, 0)!), "2026-01-02");
    assert.equal(toDateOnlyString(nextReviewDate(from, 1)!), "2026-01-08");
    assert.equal(toDateOnlyString(nextReviewDate(from, 2)!), "2026-01-22");
    assert.equal(nextReviewDate(from, 3), null);
  });

  test("toDateOnlyString zero-pads month and day", () => {
    assert.equal(toDateOnlyString(new Date(2026, 2, 5)), "2026-03-05");
  });
});
