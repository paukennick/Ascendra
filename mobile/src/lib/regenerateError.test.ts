import { test } from "node:test";
import assert from "node:assert/strict";
import { regenerateErrorMessage, REGENERATE_FAILED, REGENERATE_OFFLINE, REGENERATE_RATE_LIMITED } from "./regenerateError.ts";

test("a 429 gets the friendly rate-limit message", () => {
  const err = Object.assign(new Error("Too many lesson_regenerate attempts. Try again later."), { status: 429 });
  assert.equal(regenerateErrorMessage(err), REGENERATE_RATE_LIMITED);
});

test("a server answer without words is a retry message; only an unreached server says to check the connection", () => {
  assert.equal(regenerateErrorMessage(Object.assign(new Error("x"), { status: 500 })), REGENERATE_FAILED);
  assert.doesNotMatch(REGENERATE_FAILED, /connection/);
  assert.equal(regenerateErrorMessage(new TypeError("Network request failed")), REGENERATE_OFFLINE);
  assert.equal(regenerateErrorMessage(null), REGENERATE_OFFLINE);
  assert.equal(regenerateErrorMessage(undefined), REGENERATE_OFFLINE);
});

test("a server message on a 409, 502 or 503 is shown, never 'check your connection' (REQ-216)", () => {
  for (const status of [409, 502, 503]) {
    const err = Object.assign(new Error("x"), { status, data: { error: "The AI coach is busy. Try again shortly." } });
    assert.equal(regenerateErrorMessage(err), "The AI coach is busy. Try again shortly.");
  }
});

test("a held-back lesson (409, held) shows the server's own guidance, not the connection message (FAIL-884)", () => {
  const message = "This lesson didn't pass our accuracy checks, so we're not showing it yet.";
  const err = Object.assign(new Error(message), { status: 409, data: { error: message, held: true, retryable: false } });
  assert.equal(regenerateErrorMessage(err), message);
  // A 409 without the flag still shows the server's words (REQ-216).
  assert.equal(regenerateErrorMessage(Object.assign(new Error("x"), { status: 409, data: { error: "x" } })), "x");
});
