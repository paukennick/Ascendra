import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { backupCodesText, isShareDismissal, mfaLeaveGuard } from "./mfaLeaveGuard.ts";

describe("MFA screen leave guard", () => {
  test("backup codes on screen block leaving", () => {
    assert.equal(mfaLeaveGuard("backup-codes", false), "codes");
  });
  test("a started but unconfirmed setup warns before leaving", () => {
    assert.equal(mfaLeaveGuard("totp-setup", false), "setup");
    assert.equal(mfaLeaveGuard("email-setup", false), "setup");
  });
  test("other views leave freely", () => {
    for (const v of ["status", "disable", "regenerate"] as const) assert.equal(mfaLeaveGuard(v, false), null);
  });
  test("once leaving is confirmed nothing blocks it", () => {
    assert.equal(mfaLeaveGuard("backup-codes", true), null);
    assert.equal(mfaLeaveGuard("totp-setup", true), null);
  });
  test("copy/share text is one code per line", () => {
    assert.equal(backupCodesText(["AAAA-1111", "BBBB-2222"]), "AAAA-1111\nBBBB-2222");
    assert.equal(backupCodesText([]), "");
  });

  test("never holds back a sign-out, session expiry or lock (FAIL-060)", () => {
    for (const v of ["backup-codes", "totp-setup", "email-setup"] as const) {
      assert.equal(mfaLeaveGuard(v, false, false), null);
      assert.notEqual(mfaLeaveGuard(v, false, true), null);
    }
  });
});

describe("share sheet dismissal (FAIL-069)", () => {
  test("a cancelled web share (AbortError) is not an error", () => {
    const abort = new Error("Share canceled");
    abort.name = "AbortError";
    assert.equal(isShareDismissal(abort), true);
    assert.equal(isShareDismissal({ name: "AbortError" }), true);
  });
  test("real failures still are", () => {
    assert.equal(isShareDismissal(new Error("Share is not supported")), false);
    assert.equal(isShareDismissal(Object.assign(new Error("x"), { name: "NotAllowedError" })), false);
    assert.equal(isShareDismissal(null), false);
    assert.equal(isShareDismissal("AbortError"), false);
  });
});
