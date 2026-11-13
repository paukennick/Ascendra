// REQ-257: which seeded courses have the level-aware lesson flow switched on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const seed = join(__dirname, "..", "supabase", "seed");
const files = [join(seed, "data.ts"), ...readdirSync(join(seed, "tracks")).filter((f) => f.endsWith(".ts")).map((f) => join(seed, "tracks", f))];

function flowCodes(): string[] {
  const out: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/code: "([A-Z0-9_]+)",[\s\S]{0,400}?\n  levelFlow: true,/g)) {
      // the levelFlow line belongs to this track only if no other code: sits between them
      if (!/\n  code: "/.test(m[0].slice(m[0].indexOf("\n")))) out.push(m[1]);
    }
  }
  return out.sort();
}

test("level-aware lessons are on for exactly the courses Nick switched on", () => {
  assert.deepEqual(flowCodes(), ["AWSMLA", "AWSSAA", "CCRNADULT", "CNA", "DPT", "JAVASCRIPT", "PTPREREQ", "PYTHON", "SECPLUS"]);
});
