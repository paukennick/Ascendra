// FAIL-1760: the duplicate-option check stripped punctuation and case, so
// code options that differ only there (=== vs ==, [] vs (), None vs none)
// failed as duplicates. 10 of 92 Python/JavaScript lessons failed on
// 2026-11-12 pre-generation for this.
import { test } from "node:test";
import assert from "node:assert/strict";
import { optionKey } from "./content-validator";

test("code options that differ in punctuation or case are not duplicates", () => {
  for (const [a, b] of [
    ["`a == b`", "`a === b`"],
    ["[1, 2]", "(1, 2)"],
    ["`None`", "`none`"],
    ["x = 1;", "x == 1;"],
    ["`print(x)`", "`print[x]`"],
  ]) assert.notEqual(optionKey(a), optionKey(b), `${a} vs ${b}`);
});

test("real duplicates are still caught", () => {
  assert.equal(optionKey("`a === b`"), optionKey("`a  ===   b`"));
  assert.equal(optionKey("Use IAM roles."), optionKey("use IAM roles"));
  assert.equal(optionKey("Encrypt at rest"), optionKey("encrypt, at rest!"));
});

test("FAIL-1762: string literals and concatenation are compared as code", () => {
  assert.notEqual(optionKey('"ERROR: disk full"'), optionKey('"ERROR, disk full"'));
  assert.notEqual(optionKey('a + b + c'), optionKey('a+b+c "x"'));
});
