// REQ-080: the mastery engine is pure and drives every progress number the
// app shows, so it gets the first real tests in the repo. Runs on Node's
// built-in runner through the already-installed tsx (`npm test`).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  accuracyFromAttempts,
  isProficient,
  nextReviewDate,
  statusToScore,
  suggestStatus,
  toDateOnlyString,
  MASTERY_LABELS,
} from "./mastery";

describe("accuracyFromAttempts", () => {
  test("ignores ungraded attempts and counts only 'correct' as correct", () => {
    const acc = accuracyFromAttempts([
      { verdict: "correct" },
      { verdict: "partial" },
      { verdict: null },
      { verdict: "incorrect" },
      { verdict: "correct" },
    ]);
    assert.deepEqual(acc, { attempts: 4, correctRate: 0.5 });
  });

  test("empty history is zero attempts, zero rate", () => {
    assert.deepEqual(accuracyFromAttempts([]), { attempts: 0, correctRate: 0 });
  });
});

describe("isProficient", () => {
  test("never on a single attempt, however good", () => {
    assert.equal(isProficient({ attempts: 1, correctRate: 1 }), false);
  });
  test("requires 85% across at least two attempts", () => {
    assert.equal(isProficient({ attempts: 2, correctRate: 1 }), true);
    assert.equal(isProficient({ attempts: 3, correctRate: 0.84 }), false);
    assert.equal(isProficient({ attempts: 20, correctRate: 0.85 }), true);
  });
});

describe("suggestStatus", () => {
  test("multiple choice tops out at Guided -- recognition never earns Independent", () => {
    const acc = { attempts: 10, correctRate: 1 };
    assert.equal(suggestStatus({ acc, lastFormat: "mc", lastVerdict: "correct" }), "Guided");
    assert.equal(suggestStatus({ acc, lastFormat: "mc", lastVerdict: "incorrect" }), "Introduced");
  });

  test("a correct free-response answer earns Independent, Transfer-ready once proficient", () => {
    assert.equal(
      suggestStatus({ acc: { attempts: 1, correctRate: 1 }, lastFormat: "open", lastVerdict: "correct" }),
      "Independent"
    );
    assert.equal(
      suggestStatus({ acc: { attempts: 2, correctRate: 1 }, lastFormat: "open", lastVerdict: "correct" }),
      "Transfer-ready"
    );
  });

  test("partial free-response is Guided, incorrect drops to Introduced", () => {
    const acc = { attempts: 3, correctRate: 0.67 };
    assert.equal(suggestStatus({ acc, lastFormat: "open", lastVerdict: "partial" }), "Guided");
    assert.equal(suggestStatus({ acc, lastFormat: "open", lastVerdict: "incorrect" }), "Introduced");
  });

  test("repeated failure flags Needs review regardless of format", () => {
    const acc = { attempts: 4, correctRate: 0.25 };
    assert.equal(suggestStatus({ acc, lastFormat: "mc", lastVerdict: "incorrect" }), "Needs review");
    assert.equal(suggestStatus({ acc, lastFormat: "open", lastVerdict: "incorrect" }), "Needs review");
  });

  test("a single incorrect answer is not yet Needs review (needs two attempts)", () => {
    assert.equal(
      suggestStatus({ acc: { attempts: 1, correctRate: 0 }, lastFormat: "open", lastVerdict: "incorrect" }),
      "Introduced"
    );
  });
});

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
