import { test } from "node:test";
import assert from "node:assert/strict";
import { newestInMajor, parseLsRemote } from "./pin-lib.mjs";

const h = (c) => c.repeat(40);
const out = [
  `${h("a")}\trefs/tags/v4.9.0`,
  `${h("b")}\trefs/tags/v4.10.0`, // annotated: tag object b, commit c
  `${h("c")}\trefs/tags/v4.10.0^{}`,
  `${h("d")}\trefs/tags/v4.10.0-rc.1`, // pre-release is ignored
  `${h("e")}\trefs/tags/v5.0.0`,
  `${h("f")}\trefs/tags/v4`, // the moving major tag is not a patch tag
].join("\n");

test("annotated tag: the peeled commit is pinned, not the tag object", () => {
  assert.deepEqual(newestInMajor("o/r", "v4", parseLsRemote(out)), { tag: "v4.10.0", sha: h("c") });
});

test("numeric ordering (4.10 is newer than 4.9) and other majors are ignored", () => {
  assert.equal(newestInMajor("o/r", "v5", parseLsRemote(out)).tag, "v5.0.0");
});

test("lightweight tag: the single entry is the commit; unprefixed tags get a v in the comment", () => {
  const t = parseLsRemote(`${h("1")}\trefs/tags/8.2.0\n${h("2")}\trefs/tags/8.2.1`);
  assert.deepEqual(newestInMajor("o/r", "v8", t), { tag: "v8.2.1", sha: h("2") });
});

test("no matching major, or a non-major reference, is an error", () => {
  assert.throws(() => newestInMajor("o/r", "v9", parseLsRemote(out)), /no v9/);
  assert.throws(() => newestInMajor("o/r", "main", parseLsRemote(out)), /expected a major/);
});
