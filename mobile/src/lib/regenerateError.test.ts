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

test("a held-back lesson (409, held) shows the server's own guidance, not the connection message (FAIL-884)", () => {
  const message = "This lesson didn't pass our accuracy checks, so we're not showing it yet.";
  const err = Object.assign(new Error(message), { status: 409, data: { error: message, held: true, retryable: false } });
  assert.equal(regenerateErrorMessage(err), message);
  // A 409 without the flag is still the generic message.
  assert.equal(regenerateErrorMessage(Object.assign(new Error("x"), { status: 409, data: { error: "x" } })), REGENERATE_FAILED);
});
