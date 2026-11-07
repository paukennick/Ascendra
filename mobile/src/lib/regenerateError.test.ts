import { test } from "node:test";
import assert from "node:assert/strict";
import { regenerateErrorMessage, REGENERATE_FAILED, REGENERATE_RATE_LIMITED } from "./regenerateError.ts";

test("a 429 gets the friendly rate-limit message", () => {
  const err = Object.assign(new Error("Too many lesson_regenerate attempts. Try again later."), { status: 429 });
  assert.equal(regenerateErrorMessage(err), REGENERATE_RATE_LIMITED);
});

test("any other failure gets the generic retry message", () => {
  assert.equal(regenerateErrorMessage(Object.assign(new Error("x"), { status: 500 })), REGENERATE_FAILED);
  assert.equal(regenerateErrorMessage(new TypeError("Network request failed")), REGENERATE_FAILED);
  assert.equal(regenerateErrorMessage(null), REGENERATE_FAILED);
  assert.equal(regenerateErrorMessage(undefined), REGENERATE_FAILED);
});
