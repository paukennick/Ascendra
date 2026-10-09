// REQ-080: regression for REQ-057 / FAIL-ledger entry -- an over-long
// model-generated classification tag used to crash grading with a raw
// Postgres "value too long" error shown straight to the learner.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { clampClassification, CLASSIFICATION_MAX_LENGTH } from "./grading-service";

describe("clampClassification", () => {
  test("passes short tags and null through unchanged", () => {
    assert.equal(clampClassification("misconception"), "misconception");
    assert.equal(clampClassification(null), null);
    assert.equal(clampClassification(undefined), null);
    assert.equal(clampClassification(""), "");
  });

  test("truncates anything over the limit instead of failing the insert", () => {
    const long = "x".repeat(CLASSIFICATION_MAX_LENGTH + 50);
    assert.equal(clampClassification(long)?.length, CLASSIFICATION_MAX_LENGTH);
  });
});
