// REQ-207 (FAIL-951): rewrite `uses: owner/repo@vN` to `uses: owner/repo@<40-hex sha> # vX.Y.Z`
// in .github/workflows. Needs only `git` and network access to github.com (it
// runs `git ls-remote` on public repositories; no token, no REST API). Run from
// the repository root:
//
//   node .github/scripts/pin-actions.mjs            # rewrite in place
//   node .github/scripts/pin-actions.mjs --check    # list what is not pinned, exit 1 if any
//
// For each action it takes the newest tag within the major version that the
// workflow already names, resolves the tag (annotated tags are dereferenced)
// to the commit it points at (the peeled ^{} entry), and writes that commit SHA with the tag in a
// comment, which Dependabot then keeps current. After running it, empty
// PENDING_PINS in backend/lib/workflow-hardening.test.ts.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { newestInMajor, parseLsRemote } from "./pin-lib.mjs";

const DIR = ".github/workflows";
const USES = /^(\s*(?:-\s+)?uses:\s*)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+)@([^\s#]+)(\s*#.*)?$/;
const SHA = /^[0-9a-f]{40}$/;

function resolve(repo, ref) {
  const out = execFileSync("git", ["ls-remote", "--tags", `https://github.com/${repo}`], { encoding: "utf8" });
  return newestInMajor(repo, ref, parseLsRemote(out));
}

const check = process.argv.includes("--check");
const cache = new Map();
let unpinned = 0;
for (const f of readdirSync(DIR).filter((n) => n.endsWith(".yml"))) {
  const lines = readFileSync(join(DIR, f), "utf8").split("\n");
  let changed = false;
  const out = lines.map((line) => {
    const m = USES.exec(line);
    if (!m || m[2].startsWith("./") || SHA.test(m[3])) return line;
    unpinned++;
    if (check) {
      console.log(`${f}: ${m[2]}@${m[3]}`);
      return line;
    }
    const key = `${m[2]}@${m[3]}`;
    if (!cache.has(key)) cache.set(key, resolve(m[2].split("/").slice(0, 2).join("/"), m[3]));
    const { tag, sha } = cache.get(key);
    changed = true;
    return `${m[1]}${m[2]}@${sha} # ${tag}`;
  });
  if (changed) writeFileSync(join(DIR, f), out.join("\n"));
}
if (check) process.exit(unpinned ? 1 : 0);
console.log(`pinned ${unpinned} reference(s)`);
