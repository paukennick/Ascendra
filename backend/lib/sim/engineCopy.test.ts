// REQ-141 (docs/sims.md 5.8): the app's engine copy must equal the backend
// source plus its generated header, file for file. If this fails, run
// `npm run sim:sync-engine` in backend/ and commit mobile/src/sim/engine/.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ENGINE_COPY_DIR, ENGINE_SOURCE_DIR, copyOf, expectedCopy, importViolations, isEngineFile, listFiles, sha256 } from "./engineCopy.ts";

describe("engine copy drift (backend/lib/sim/engine -> mobile/src/sim/engine)", () => {
  const expected = expectedCopy();

  test("there is an engine to copy", () => {
    assert.ok(expected.has("v1/index.ts"), "backend/lib/sim/engine/v1/index.ts is missing");
  });

  test("the copy has exactly the engine's files", () => {
    assert.ok(existsSync(ENGINE_COPY_DIR), "mobile/src/sim/engine/ is missing: run `npm run sim:sync-engine`");
    assert.deepEqual(listFiles(ENGINE_COPY_DIR), [...expected.keys()], "file list differs: run `npm run sim:sync-engine`");
  });

  test("every copied file is byte-identical to source + header", () => {
    for (const [rel, content] of expected) {
      const actual = readFileSync(join(ENGINE_COPY_DIR, rel), "utf8");
      assert.ok(actual === content, `mobile/src/sim/engine/${rel} differs from the backend source: run \`npm run sim:sync-engine\``);
    }
  });

  test("engine files import only their own major's files, with .ts", () => {
    const problems = listFiles(ENGINE_SOURCE_DIR, isEngineFile).flatMap((rel) =>
      importViolations(rel, readFileSync(join(ENGINE_SOURCE_DIR, rel), "utf8")),
    );
    assert.deepEqual(problems, []);
  });
});

describe("drift check helpers", () => {
  test("the header names the source path and its hash", () => {
    const src = "export const A = 1;\n";
    const out = copyOf("v1/a.ts", src);
    assert.ok(out.endsWith(src));
    assert.match(out.split("\n")[0], new RegExp(`engine/v1/a\\.ts \\(sha256 ${sha256(src)}\\)`));
  });

  test("a one-character edit to either side is drift", () => {
    assert.notEqual(copyOf("v1/a.ts", "x = 1;\n"), copyOf("v1/a.ts", "x = 2;\n"));
  });

  test("import rules: relative .ts inside the major only", () => {
    assert.deepEqual(importViolations("v1/a.ts", 'import { b } from "./b.ts";\nexport * from "./sub/c.ts";'), []);
    assert.equal(importViolations("v1/a.ts", 'import { b } from "./b";').length, 1);
    assert.equal(importViolations("v1/a.ts", 'import x from "node:fs";').length, 1);
    assert.equal(importViolations("v1/a.ts", 'import { y } from "../../db.ts";').length, 1);
    assert.equal(importViolations("v1/a.ts", 'import { y } from "../v2/x.ts";').length, 1);
    assert.equal(importViolations("v1/a.ts", 'import type { T } from "./t";').length, 1);
    assert.equal(importViolations("v1/a.ts", 'const m = await import("zod");').length, 1);
  });
});
