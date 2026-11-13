// The pre-generation log is public (the repo is public), so a content-check
// problem is reported as a kind: quoted text and numbers removed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { problemKind } from "./pregen";

test("problemKind strips quoted text and numbers, keeping the validator's wording", () => {
  assert.equal(problemKind('Solo question option 3 uses the absolute word "always"; reword it without a cue word.'),
    'Solo question option N uses the absolute word "…"; reword it without a cue word.');
  assert.equal(problemKind("Guided question is longer than 400 characters."), "Guided question is longer than N characters.");
  assert.equal(problemKind('Solo question has a duplicate option ("Use IAM roles for EC2").'), 'Solo question has a duplicate option ("…").');
  assert.ok(problemKind("x".repeat(500)).length <= 140);
});

test("FAIL-1761: an option that itself holds quotes leaks nothing", () => {
  const k = problemKind('Guided question has a duplicate option (""ERROR: disk full"").');
  assert.ok(!/disk|ERROR/.test(k), k);
});
