// REQ-191: the "Check your email" screen tells a refused login apart from a
// fresh sign-up, and always offers a resend and the reset-password route.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { pendingCopy, pendingReason, resendLabel, RESENT_MESSAGE, RESET_ALSO_VERIFIES } from "./verifyEmailPending.ts";

describe("verify-email pending screen copy (FAIL-671)", () => {
  test("a login refused for an unverified email does not claim a link was just sent", () => {
    const c = pendingCopy(pendingReason("login"), "a@b.test");
    assert.doesNotMatch(c.body + c.heading, /We sent/);
    assert.match(c.heading, /isn't verified/);
    assert.match(c.body, /a@b\.test/);
  });
  test("after sign-up it says a link was sent", () => {
    const c = pendingCopy(pendingReason("register"), "a@b.test");
    assert.match(c.body, /We sent a verification link to a@b\.test/);
  });
  test("unknown or missing reason falls back to sign-up copy", () => {
    assert.equal(pendingReason(undefined), "register");
    assert.equal(pendingReason(["login"]), "register");
  });
  test("both cases tell the learner to press the button on the page (links no longer verify on open)", () => {
    for (const r of ["login", "register"] as const) assert.match(pendingCopy(r, undefined).body, /Verify my email/);
  });
  test("resend and recovery copy", () => {
    assert.equal(resendLabel("idle"), "Resend verification email");
    assert.equal(resendLabel("sent"), "Send another link");
    assert.match(RESENT_MESSAGE, /spam/);
    assert.match(RESET_ALSO_VERIFIES, /Forgot password/);
  });
});
