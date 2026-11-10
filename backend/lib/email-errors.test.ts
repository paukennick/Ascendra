// REQ-191: the health check's sender status and the failure log line.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { emailSenderStatus, emailFailureLog, EmailSendError } from "./email-errors";

describe("emailSenderStatus (FAIL-675)", () => {
  const prod = { NODE_ENV: "production" };
  test("production without EMAIL_FROM falls back to resend.dev: unconfigured", () => {
    assert.equal(emailSenderStatus(prod), "unconfigured");
    assert.equal(emailSenderStatus({ ...prod, EMAIL_FROM: "  " }), "unconfigured");
  });
  test("production with a resend.dev sender, bare or named: unconfigured", () => {
    assert.equal(emailSenderStatus({ ...prod, EMAIL_FROM: "onboarding@resend.dev" }), "unconfigured");
    assert.equal(emailSenderStatus({ ...prod, EMAIL_FROM: "Ascendra <onboarding@Resend.dev>" }), "unconfigured");
  });
  test("production with a real domain: ok", () => {
    assert.equal(emailSenderStatus({ ...prod, EMAIL_FROM: "Ascendra <no-reply@ascendra-learn.com>" }), "ok");
  });
  test("outside production the test sender is fine", () => {
    assert.equal(emailSenderStatus({ NODE_ENV: "development" }), "ok");
  });
});

describe("emailFailureLog", () => {
  test("carries route, template, code and status only", () => {
    const e = new EmailSendError("password_reset", "validation_error", 403);
    assert.deepEqual(emailFailureLog("auth/forgot-password", e), {
      event: "email_send_failed",
      route: "auth/forgot-password",
      kind: "password_reset",
      code: "validation_error",
      statusCode: 403,
    });
    assert.doesNotMatch(e.message, /@/);
  });
  test("an unexpected error logs its name, never its message", () => {
    const line = JSON.stringify(emailFailureLog("x", new Error("to someone@x.test failed")));
    assert.doesNotMatch(line, /someone/);
  });
});
