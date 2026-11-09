// REQ-141: the first test under lib/sim/engine/v1/. lib/test-discovery.test.ts
// fails unless `npm test` reaches this file, so engine tests can't silently
// stop running.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ENGINE_MAJOR } from "./index.ts";

test("engine v1 placeholder loads", () => {
  assert.equal(ENGINE_MAJOR, 1);
});
