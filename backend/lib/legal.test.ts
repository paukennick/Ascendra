// REQ-093: the backend's legal versions must match the text the app shows,
// or users would be asked to accept a version they can't see (or never be
// asked at all).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEGAL_VERSIONS, acceptsCurrentVersions } from "./legal";

const legalTs = readFileSync(join(__dirname, "..", "..", "mobile", "src", "content", "legal.ts"), "utf8");
function versionOf(name: string): string | undefined {
  const m = legalTs.match(new RegExp(`export const ${name}: LegalDoc = \\{[\\s\\S]*?version: "([^"]+)"`));
  return m?.[1];
}

test("backend Terms version matches the app's Terms text", () => {
  assert.equal(versionOf("TERMS"), LEGAL_VERSIONS.terms);
});

test("backend Privacy version matches the app's Privacy text", () => {
  assert.equal(versionOf("PRIVACY"), LEGAL_VERSIONS.privacy);
});

test("only the exact current versions count as acceptance", () => {
  assert.equal(acceptsCurrentVersions({ termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy }), true);
  assert.equal(acceptsCurrentVersions({ termsVersion: "2020-01-01", privacyVersion: LEGAL_VERSIONS.privacy }), false);
  assert.equal(acceptsCurrentVersions({}), false);
  assert.equal(acceptsCurrentVersions(null), false);
});
