// REQ-207 (FAIL-951): rewrite `uses: owner/repo@vN` to `uses: owner/repo@<40-hex sha> # vX.Y.Z`
// in .github/workflows. Needs network access to GitHub with the `gh` CLI signed in
// (any account; it only reads public tags). Run from the repository root:
//
//   node .github/scripts/pin-actions.mjs            # rewrite in place
//   node .github/scripts/pin-actions.mjs --check    # list what is not pinned, exit 1 if any
//
// For each action it takes the newest tag within the major version that the
// workflow already names, resolves the tag (annotated tags are dereferenced)
// to the commit it points at, and writes that commit SHA with the tag in a
// comment, which Dependabot then keeps current. After running it, empty
// PENDING_PINS in backend/lib/workflow-hardening.test.ts.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = ".github/workflows";
const USES = /^(\s*(?:-\s+)?uses:\s*)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+)@([^\s#]+)(\s*#.*)?$/;
const SHA = /^[0-9a-f]{40}$/;

const gh = (path, jq) => execFileSync("gh", ["api", path, "--jq", jq], { encoding: "utf8" }).trim();

function resolve(repo, ref) {
  const major = /^v(\d+)$/.exec(ref)?.[1];
  if (!major) throw new Error(`${repo}@${ref}: expected a major-version tag like v4`);
  const tags = gh(`repos/${repo}/tags?per_page=100`, ".[].name").split("\n").filter((t) => new RegExp(`^v${major}\\.\\d+\\.\\d+$`).test(t));
  tags.sort((a, b) => {
    const [x, y] = [a, b].map((t) => t.slice(1).split(".").map(Number));
    return x[1] - y[1] || x[2] - y[2];
  });
  const tag = tags.at(-1);
  if (!tag) throw new Error(`${repo}: no ${major}.x.y tag found`);
  let [type, sha] = gh(`repos/${repo}/git/ref/tags/${tag}`, '.object.type + " " + .object.sha').split(" ");
  if (type === "tag") sha = gh(`repos/${repo}/git/tags/${sha}`, ".object.sha");
  if (!SHA.test(sha)) throw new Error(`${repo}@${tag}: could not resolve a commit`);
  return { tag, sha };
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
