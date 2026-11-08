// REQ-093: the privacy policy states these periods; changing one here
// without changing the policy (mobile/src/content/legal.ts) breaks this test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RETENTION } from "./retention";

const legalTs = readFileSync(join(__dirname, "..", "..", "mobile", "src", "content", "legal.ts"), "utf8");

test("privacy policy states the sign-in log period", () => {
  assert.match(legalTs, new RegExp(`Sign-in and security event log: ${RETENTION.authEventsDays} days`));
});
test("privacy policy states the ended-session period", () => {
  assert.match(legalTs, new RegExp(`Ended or expired sessions: ${RETENTION.endedSessionsDays} days`));
});
test("privacy policy states the one-time code period", () => {
  assert.match(legalTs, new RegExp(`one-time codes: ${RETENTION.expiredTokensDays} days`));
});
test("privacy policy states the email-change request period (REQ-139)", () => {
  assert.match(legalTs, new RegExp(`Email address change requests [^"]*: ${RETENTION.emailChangeDays} days after they expire`));
});
