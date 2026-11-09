// REQ-141: a test file `npm test` doesn't reach never runs, and nothing says
// so. npm runs scripts under `sh`, which has no globstar: an unquoted
// `src/sim/**/*.test.ts` is read as `src/sim/*/*.test.ts` whenever that
// matches anything, and deeper tests silently drop out. This expands the
// script exactly as npm would (the same shell, then Node's own glob, which
// the test runner applies to every argument) and fails if any test file in
// the app, or the sim's first test, is left out.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, globSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP_DIRS = new Set(["node_modules", ".expo", "dist", "web-build", "android", "ios", ".git"]);

function filesReachedBy(script: string): Set<string> {
  const shell = process.env.npm_config_script_shell || "sh";
  const argv = execFileSync(shell, ["-c", `set -- ${script}; printf '%s\\0' "$@"`], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const reached = new Set<string>();
  for (const p of argv.slice(1).filter((a) => !a.startsWith("-"))) {
    if (/[*?[{]/.test(p)) for (const f of globSync(p, { cwd: ROOT })) reached.add(f.split(sep).join("/"));
    else if (existsSync(join(ROOT, p))) reached.add(p);
  }
  return reached;
}

function testFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name));
      } else if (e.name.endsWith(".test.ts")) out.push(relative(ROOT, join(dir, e.name)).split(sep).join("/"));
    }
  };
  walk(ROOT);
  return out.sort();
}

describe("npm test reaches every test file", () => {
  const scripts = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts as Record<string, string>;
  const reached = filesReachedBy(scripts.test);

  test("the sim's tests are reached", () => {
    assert.ok(existsSync(join(ROOT, "src/sim/engineCopy.test.ts")), "src/sim/engineCopy.test.ts is missing");
    assert.ok(reached.has("src/sim/engineCopy.test.ts"), "npm test does not reach src/sim/engineCopy.test.ts");
  });

  test("no *.test.ts anywhere in mobile/ is left out", () => {
    assert.deepEqual(testFiles().filter((f) => !reached.has(f)), []);
  });
});
