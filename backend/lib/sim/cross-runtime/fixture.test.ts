// REQ-141: Node's run of the cross-runtime fixture is the reference the
// Hermes and browser CI jobs compare against byte for byte, so it must equal
// the committed fixture.expected.txt and be stable run to run. A change here
// on a Node upgrade is a finding, not something to re-record blindly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXPECTED_PATH, hermesScript, runFixtureInNode } from "./fixture.ts";

test("Node's output equals fixture.expected.txt", () => {
  const got = runFixtureInNode();
  assert.equal(got, readFileSync(EXPECTED_PATH, "utf8"));
  assert.equal(runFixtureInNode(), got);
});

test("the output ends with a hash of everything above it", () => {
  assert.match(runFixtureInNode(), /\nhash: [0-9a-f]{8}\n$/);
});

test("the Hermes script is the fixture plus a print call", () => {
  assert.match(hermesScript("fixture"), /\nprint\(simCrossRuntimeFixture\(\)\);\n$/);
});
