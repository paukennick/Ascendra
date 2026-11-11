// FAIL-1251: a merge left `<<<<<<<` / `=======` / `>>>>>>>` lines in
// .ai/checklists/pre-completion.md on master, where nothing noticed. No tracked
// text file may carry a conflict marker at the start of a line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const TEXT = /\.(md|json|ts|tsx|js|mjs|sql|yml|yaml|py|sh)$/;

test("no tracked text file contains a merge conflict marker", () => {
  let files: string[];
  try {
    files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n").filter((f) => TEXT.test(f));
  } catch {
    return; // not a git checkout (a source tarball): nothing to scan
  }
  const hits: string[] = [];
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(join(ROOT, f), "utf8");
    } catch {
      continue; // deleted in the working tree
    }
    if (f.endsWith("conflict-markers.test.ts")) continue;
    text.split("\n").forEach((line, i) => {
      if (/^(<{7}|>{7}) \S/.test(line) || /^(<{7}|>{7})$/.test(line)) hits.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, []);
});
