import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeLabPrompt, stepAfterSolo, stepsFor } from "./lesson-steps.ts";

describe("normalizeLabPrompt", () => {
  test("keeps real text, trimmed", () => {
    assert.equal(normalizeLabPrompt("  Use systemctl to inspect a service.  "), "Use systemctl to inspect a service.");
  });
  test("treats null, undefined, blank and non-strings as no lab", () => {
    assert.equal(normalizeLabPrompt(null), null);
    assert.equal(normalizeLabPrompt(undefined), null);
    assert.equal(normalizeLabPrompt("   "), null);
    assert.equal(normalizeLabPrompt(""), null);
    assert.equal(normalizeLabPrompt(42), null);
  });
});

describe("stepsFor", () => {
  test("an objective without a lab keeps the four steps it always had", () => {
    assert.deepEqual(stepsFor(null), ["guess", "teach", "fade", "solo"]);
  });
  test("an objective with a lab gets Try it after the solo check", () => {
    assert.deepEqual(stepsFor("Do the thing"), ["guess", "teach", "fade", "solo", "lab"]);
  });
  test("does not mutate the shared base list between calls", () => {
    stepsFor("Do the thing");
    assert.deepEqual(stepsFor(null), ["guess", "teach", "fade", "solo"]);
  });
});

describe("stepAfterSolo", () => {
  test("goes to done when there is no lab, exactly as before", () => {
    assert.equal(stepAfterSolo(null), "done");
  });
  test("goes to the lab step when there is one", () => {
    assert.equal(stepAfterSolo("Do the thing"), "lab");
  });
});
