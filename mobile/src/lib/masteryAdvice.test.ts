// REQ-228 (FAIL-1262): the lesson's level advice matches the mastery rule
// (backend migration 074, REQ-218: Independent needs a confirming answer at
// least 24 hours after the first).
import { test } from "node:test";
import assert from "node:assert/strict";
import { masteryAdvice, SOLO_OPEN_NOTE } from "./masteryAdvice.ts";

test("Guided says Independent needs a second answer a day or more later", () => {
  assert.match(masteryAdvice("Guided"), /a day or more later/);
});

test("nothing promises Independent from one answer", () => {
  for (const s of ["Guided", "Independent", "Transfer-ready", "Introduced", "Needs review", null] as const) {
    assert.doesNotMatch(masteryAdvice(s), /answer earns Independent/i);
  }
  assert.doesNotMatch(SOLO_OPEN_NOTE, /answer earns Independent/i);
  assert.match(SOLO_OPEN_NOTE, /a day or more later/);
});

test("Transfer-ready advice names a different kind of answer and days apart", () => {
  assert.match(masteryAdvice("Independent"), /different way/);
  assert.match(masteryAdvice("Independent"), /three or more days/);
});
