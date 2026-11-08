// REQ-141: a test file the npm scripts don't reach never runs, and nothing
// says so. npm runs scripts under `sh`, which has no globstar: an unquoted
// `lib/sim/**/*.test.ts` is read as `lib/sim/*/*.test.ts` whenever that
// matches anything, and deeper engine tests silently drop out. This expands
// each script exactly as npm would (the same shell, then Node's own glob,
// which the test runner applies to every argument) and fails if any test
// file in the package, or the engine's first test, is left out.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

const ROOT = join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "public"]);

function filesReachedBy(script: string, cwd: string = ROOT): Set<string> {
  const shell = process.env.npm_config_script_shell || "sh";
  const argv = execFileSync(shell, ["-c", `set -- ${script}; printf '%s\\0' "$@"`], { cwd, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const patterns = argv.slice(1).filter((a) => !a.startsWith("-"));
  const reached = new Set<string>();
  for (const p of patterns) {
    if (/[*?[{]/.test(p)) for (const f of globSync(p, { cwd })) reached.add(f.split(sep).join("/"));
    else if (existsSync(join(cwd, p))) reached.add(p);
  }
  return reached;
}

function filesNamed(suffix: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name));
      } else if (e.name.endsWith(suffix)) out.push(relative(ROOT, join(dir, e.name)).split(sep).join("/"));
    }
  };
  walk(ROOT);
  return out.sort();
}

const scripts = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts as Record<string, string>;

describe("npm test reaches every test file", () => {
  const reached = filesReachedBy(scripts.test);

  test("the engine's tests, however deep, are reached", () => {
    for (const f of ["lib/sim/engine/v1/index.test.ts", "lib/sim/engineCopy.test.ts"]) {
      assert.ok(existsSync(join(ROOT, f)), `${f} is missing`);
      assert.ok(reached.has(f), `npm test does not reach ${f}`);
    }
  });

  test("no *.test.ts anywhere in backend/ is left out", () => {
    assert.deepEqual(filesNamed(".test.ts").filter((f) => !reached.has(f)), []);
  });

  test("no *.dbtest.ts is left out of npm run test:db", () => {
    const db = filesReachedBy(scripts["test:db"]);
    assert.deepEqual(filesNamed(".dbtest.ts").filter((f) => !db.has(f)), []);
  });

  test("the check itself catches the sh trap (unquoted ** drops deeper files)", () => {
    const dir = mkdtempSync(join(tmpdir(), "test-discovery-"));
    try {
      mkdirSync(join(dir, "sim", "engine", "v1"), { recursive: true });
      writeFileSync(join(dir, "sim", "engine", "shallow.test.ts"), "");
      writeFileSync(join(dir, "sim", "engine", "v1", "deep.test.ts"), "");
      assert.deepEqual([...filesReachedBy("tsx --test sim/**/*.test.ts", dir)], ["sim/engine/shallow.test.ts"]);
      assert.deepEqual(
        [...filesReachedBy('tsx --test "sim/**/*.test.ts"', dir)].sort(),
        ["sim/engine/shallow.test.ts", "sim/engine/v1/deep.test.ts"],
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
