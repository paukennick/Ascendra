// REQ-162 (docs/sims.md 5.5, 5.8, 15): source rules for the engine folder.
// The maths that engines disagree on is banned (Math.exp, Math.sin, Math.pow,
// `**`, ...), as are regular expressions, Date.now, Math.random, Intl and
// non-erasable TypeScript syntax, because the same files run under tsx,
// Node's type stripping, Metro and Hermes.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ENGINE_SOURCE_DIR, isEngineFile, listFiles } from "./engineCopy.ts";

const ALLOWED_MATH = new Set(["sqrt", "floor", "ceil", "abs", "round", "min", "max", "imul", "trunc"]);

function stripCommentsAndStrings(src: string): string {
  // good enough for a lint: drop // comments, /* */ comments and string literals
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") i++;
        i++;
      }
      i++;
      out += "''";
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

describe("engine source rules (engine/v1)", () => {
  const files = listFiles(ENGINE_SOURCE_DIR, isEngineFile);

  test("the engine folder has its files", () => {
    assert.ok(files.includes("v1/engine.ts"));
    assert.ok(files.includes("v1/types.ts"));
  });

  for (const rel of files) {
    const raw = readFileSync(join(ENGINE_SOURCE_DIR, rel), "utf8");
    const code = stripCommentsAndStrings(raw);

    test(`${rel}: only bit-exact Math functions`, () => {
      const used = new Set<string>();
      for (const m of code.matchAll(/\bMath\.([a-zA-Z0-9_]+)/g)) used.add(m[1]);
      const bad = [...used].filter((f) => !ALLOWED_MATH.has(f));
      assert.deepEqual(bad, [], `Math.${bad.join(", Math.")} differ between engines (docs/sims.md 5.5)`);
      assert.ok(!/\*\*/.test(code), "`**` is banned; use dpow");
    });

    test(`${rel}: no wall clock, randomness, locale or regex`, () => {
      assert.ok(!/\bDate\.now\b|new Date\(\)/.test(code), "no wall clock");
      assert.ok(!/\bMath\.random\b/.test(code), "no Math.random");
      assert.ok(!/\bIntl\b|toLocale/.test(code), "no locale");
      assert.ok(!/[=(,:]\s*\/[^/*\n][^\n]*\/[gimsuy]*[\s.;,)]/.test(code), "no regular expressions in the engine (docs/sims.md 15)");
      assert.ok(!/\bperformance\./.test(code), "no performance timers");
    });

    test(`${rel}: erasable syntax and type-only imports`, () => {
      assert.ok(!/\benum\s+[A-Za-z]/.test(code), "no enums");
      assert.ok(!/\bnamespace\s+[A-Za-z]/.test(code), "no namespaces");
      assert.ok(!/constructor\s*\(\s*(public|private|protected|readonly)\b/.test(code), "no parameter properties");
      assert.ok(!/^\s*@[A-Za-z]/m.test(code), "no decorators");
      // a non-type import of something that is only a type would survive type
      // stripping and fail at run time; every import of types.ts is `import type`
      for (const m of raw.matchAll(/^import\s+\{([^}]*)\}\s+from\s+"\.\/types\.ts";/gm)) {
        assert.fail(`${rel}: import from types.ts must be \`import type\` (${m[1].trim().slice(0, 40)})`);
      }
    });
  }
});
