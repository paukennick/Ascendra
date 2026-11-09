// REQ-162: the engine bundle the Hermes and browser jobs run must, under
// Node, reproduce the v1 manifest's hashes and every golden replay without a
// mismatch. Otherwise a byte-identical result on another runtime would only
// prove that both runtimes agree on a wrong answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUNDLE_MODULES, bundleData, engineBundleSource, engineHermesScript, runEngineBundleInNode } from "./engine-bundle.ts";

const manifest = JSON.parse(readFileSync(join(__dirname, "..", "engine", "v1", "golden", "manifest.json"), "utf8")) as {
  cases: Record<string, { hash: string; finalTick: number }>;
};

const source = engineBundleSource();
const out = runEngineBundleInNode(source);
const lines = out.trimEnd().split("\n");

test("every corpus case in the bundle matches the manifest with no failures", () => {
  const cases = lines.filter((l) => l.startsWith("case "));
  assert.equal(cases.length, Object.keys(manifest.cases).length);
  for (const id of Object.keys(manifest.cases)) {
    const m = manifest.cases[id];
    assert.ok(cases.includes(`case ${id} hash=${m.hash} final=${m.finalTick} failures=0`), `${id}: ${cases.find((l) => l.startsWith(`case ${id} `))}`);
  }
});

test("every golden path in the bundle replays without a mismatch", () => {
  const paths = bundleData().documents.reduce((n, d) => n + ((d.golden as { paths: unknown[] } | null)?.paths.length ?? 0), 0);
  const golden = lines.filter((l) => l.startsWith("golden "));
  assert.equal(golden.length, paths);
  for (const l of golden) assert.match(l, / mismatches=0$/, l);
});

test("the output is stable and ends with its own hash", () => {
  assert.equal(runEngineBundleInNode(source), out);
  assert.match(out, /\nengine 1\.\d+ lines=\d+ hash: [0-9a-f]{8}\n$/);
});

test("the bundle is one plain script: no import/export statements, every engine module present", () => {
  assert.doesNotMatch(source, /^\s*(import|export)\s/m);
  for (const m of BUNDLE_MODULES()) assert.ok(source.includes(`__def(${JSON.stringify(m)}`), m);
  assert.match(engineHermesScript(source), /\nprint\(simCrossRuntimeEngine\(\)\);\n$/);
});
