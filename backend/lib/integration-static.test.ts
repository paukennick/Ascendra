// REQ-112 / FAIL-230: REQ-135 replaced "checkRateLimit, then recordAuthEvent"
// with the atomic consumeRateLimit, but routes written on branches that never
// saw REQ-135 (labs, exam items, Quiz me, review, unit checks) came back with
// the old two-step pattern when merged, so N requests sent at once each read
// "under the limit" and all made a model call. This scans the source so a
// later merge cannot bring it back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
// Source without line comments, so a comment that names a function is not a call.
const code = (f: string) => readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules" || n.startsWith(".")) return [];
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) && !/\.(db)?test\.ts$/.test(n) ? [p] : [];
  });
}

test("no code outside lib/auth/rateLimit.ts calls checkRateLimit; recordAuthEvent is only for auth logging", () => {
  const src = [...files(join(ROOT, "app")), ...files(join(ROOT, "lib"))];
  const checkers = src.filter((f) => /\bcheckRateLimit\s*\(/.test(code(f))).map((f) => relative(ROOT, f));
  assert.deepEqual(checkers.filter((f) => f !== "lib/auth/rateLimit.ts"), []);
  const recorders = src
    .filter((f) => /\brecordAuthEvent\s*\(/.test(code(f)))
    .map((f) => relative(ROOT, f))
    .filter((f) => f !== "lib/auth/rateLimit.ts" && !f.startsWith("app/api/auth/"));
  assert.deepEqual(recorders, []);
});
