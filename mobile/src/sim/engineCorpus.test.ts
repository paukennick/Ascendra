// REQ-162 (docs/sims.md 5.8, 16): the app's generated engine copy, loaded by
// Node's own type stripping, reproduces the v1 corpus with the same state
// hashes the backend source records in the manifest. This is the first
// cross-copy check; the on-device run (1c) is the second.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCorpusCase } from "./engine/v1/golden/corpus.ts";

const here = dirname(fileURLToPath(import.meta.url));
const golden = join(here, "..", "..", "..", "backend", "lib", "sim", "engine", "v1", "golden");

test("the engine copy reproduces the v1 corpus and its manifest hashes", () => {
  const manifest = JSON.parse(readFileSync(join(golden, "manifest.json"), "utf8"));
  const files = readdirSync(join(golden, "corpus")).filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 10);
  for (const f of files) {
    const c = JSON.parse(readFileSync(join(golden, "corpus", f), "utf8"));
    const r = runCorpusCase(c);
    assert.deepEqual(r.failures, [], c.id);
    assert.equal(r.hash, manifest.cases[c.id].hash, c.id);
  }
});

// REQ-162: every seeded scenario's golden paths replay under the app's copy
// to the same ending, rating, criteria and final state hash the backend
// recorded (backend/supabase/seed/sims/<course>/<slug>.golden.json).
test("the engine copy replays every seeded golden path to the recorded state hash", async () => {
  const { replayGoldenPath } = await import("./engine/v1/validate.ts");
  const { stateHash } = await import("./engine/v1/engine.ts");
  const seeds = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims");
  let paths = 0;
  for (const course of readdirSync(seeds)) {
    for (const f of readdirSync(join(seeds, course)).filter((x) => x.endsWith(".golden.json"))) {
      const doc = JSON.parse(readFileSync(join(seeds, course, f.replace(/\.golden\.json$/, ".sim.json")), "utf8"));
      const golden = JSON.parse(readFileSync(join(seeds, course, f), "utf8"));
      for (const p of golden.paths) {
        const r = replayGoldenPath(doc, p, (run) => stateHash(run.state));
        assert.equal(r.error, null, `${f} ${p.id}`);
        assert.deepEqual(r.mismatches, [], `${f} ${p.id}`);
        assert.ok(p.expect.stateHash && r.stateHash === p.expect.stateHash, `${f} ${p.id}: state hash`);
        paths++;
      }
    }
  }
  assert.ok(paths > 0);
});
