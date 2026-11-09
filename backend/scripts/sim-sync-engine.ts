// REQ-141 (docs/sims.md 5.8): writes mobile/src/sim/engine/ from
// backend/lib/sim/engine/ (engine files only, tests stay here), each with a
// header naming its source hash, and removes copies whose source is gone.
// lib/sim/engineCopy.test.ts fails CI if the two ever differ.
//
//   npm run sim:sync-engine            write the copy
//   npm run sim:sync-engine -- --check report drift, write nothing (exit 1)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ENGINE_COPY_DIR, expectedCopy, importViolations, isEngineFile, listFiles, ENGINE_SOURCE_DIR } from "../lib/sim/engineCopy.ts";

const check = process.argv.includes("--check");
const problems = listFiles(ENGINE_SOURCE_DIR, isEngineFile).flatMap((rel) =>
  importViolations(rel, readFileSync(join(ENGINE_SOURCE_DIR, rel), "utf8")),
);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const expected = expectedCopy();
const existing = existsSync(ENGINE_COPY_DIR) ? listFiles(ENGINE_COPY_DIR) : [];
const changes: string[] = [];
for (const rel of existing) {
  if (!expected.has(rel)) {
    changes.push(`remove ${rel}`);
    if (!check) rmSync(join(ENGINE_COPY_DIR, rel));
  }
}
for (const [rel, content] of expected) {
  const target = join(ENGINE_COPY_DIR, rel);
  if (existsSync(target) && readFileSync(target, "utf8") === content) continue;
  changes.push(`write ${rel}`);
  if (!check) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}
console.log(changes.length ? changes.join("\n") : "mobile/src/sim/engine/ is up to date");
if (check && changes.length) process.exit(1);
