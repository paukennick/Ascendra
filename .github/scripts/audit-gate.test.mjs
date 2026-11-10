import { test } from "node:test";
import assert from "node:assert/strict";
import { gate } from "./audit-gate.mjs";

const audit = (o) => ({ vulnerabilities: Object.fromEntries(Object.entries(o).map(([k, s]) => [k, { severity: s }])) });

test("known high advisories pass; moderate and low never block", () => {
  assert.equal(gate(audit({ a: "high", b: "moderate", c: "low" }), { a: "why" }).ok, true);
});
test("a new high or critical advisory blocks", () => {
  const r = gate(audit({ a: "high", z: "critical" }), { a: "why" });
  assert.equal(r.ok, false);
  assert.deepEqual(r.unknown, ["z"]);
});
test("an accepted entry that is gone blocks, so the list shrinks", () => {
  const r = gate(audit({ b: "moderate" }), { a: "why" });
  assert.equal(r.ok, false);
  assert.deepEqual(r.stale, ["a"]);
});
test("a clean audit with an empty list passes", () => {
  assert.equal(gate({ vulnerabilities: {} }, {}).ok, true);
});
