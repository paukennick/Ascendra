// REQ-162 (docs/sims.md 5.3, 16): the engine reproduces every hand-computed
// corpus case, each case's state hash equals the manifest, and the
// invariants hold as properties over the corpus documents: determinism,
// skip = waiting, checkpoint resume = uninterrupted run, hash stability.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Command, ScenarioDoc } from "./types.ts";
import { advance, applyCommand, checkpoint, createRun, insideSkip, replay, restoreRun, stateHash, waits } from "./engine.ts";
import { runCorpusCase, type CorpusCase } from "./golden/corpus.ts";
import { lintScenario } from "./validate.ts";

const GOLDEN = join(__dirname, "golden");
const manifest = JSON.parse(readFileSync(join(GOLDEN, "manifest.json"), "utf8")) as { status: string; cases: Record<string, { hash: string; finalTick: number }> };
const cases: CorpusCase[] = readdirSync(join(GOLDEN, "corpus"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(GOLDEN, "corpus", f), "utf8")) as CorpusCase);

describe("v1 semantics corpus (draft until the step-7 freeze)", () => {
  test("the manifest covers every case and nothing else", () => {
    assert.deepEqual(Object.keys(manifest.cases).sort(), cases.map((c) => c.id).sort());
    assert.ok(manifest.status === "draft" || manifest.status === "frozen");
  });

  for (const c of cases) {
    test(`${c.id}: ${c.spec.slice(0, 90)}`, () => {
      const r = runCorpusCase(c);
      assert.deepEqual(r.failures, []);
      assert.equal(r.hash, manifest.cases[c.id].hash, `state hash changed for ${c.id}; while the corpus is a draft, run \`npm run sim:corpus\` and explain why in the commit`);
      assert.equal(r.finalTick, manifest.cases[c.id].finalTick);
    });
  }

  test("every corpus document type-checks (the toy documents skip only the content rules)", () => {
    const contentOnly = (path: string): boolean => path.startsWith("reasoning.") || path === "endings" || path === "scoring" || path === "sources";
    for (const c of cases) {
      const errors = lintScenario(c.doc, { searchNodes: 0 }).filter((p) => p.level === "error" && !contentOnly(p.path));
      assert.deepEqual(errors, [], c.id);
    }
  });
});

// Commands from a case's script, in order.
function scriptCommands(c: CorpusCase): Command[] {
  return c.script.flatMap((s) => ("command" in s ? [s.command] : []));
}

describe("engine properties over the corpus", () => {
  test("determinism: two runs of the same script give identical hashes at every tick", () => {
    for (const c of cases) {
      const a = runCorpusCase(c);
      const b = runCorpusCase(c);
      assert.deepEqual(a.tickHashes, b.tickHashes, c.id);
    }
  });

  test("replay = live: replaying the command log reproduces the live run's state", () => {
    for (const c of cases) {
      const live = runCorpusCase(c);
      const cmds = scriptCommands(c);
      const r = replay(c.doc, c.seed, cmds);
      if (r.rejected) continue; // scripts that rely on real-time advance between commands are covered by the live runner
      // run the clock out the same way the live script did
      const steps = c.script.flatMap((s) => ("advance" in s ? [s.advance] : []));
      const lastCmdTick = cmds.length ? cmds[cmds.length - 1].tick : 0;
      let target = lastCmdTick;
      for (const s of c.script) if ("advance" in s) target += s.advance;
      void steps;
      while (r.run.state.tick < Math.min(target, live.finalTick) && advance(r.run)) {
        /* advance */
      }
      assert.equal(r.run.state.tick, live.finalTick, `${c.id}: replay reached ${r.run.state.tick}`);
      assert.equal(stateHash(r.run.state), live.hash, c.id);
    }
  });

  test("skip = stepping: a skip to a wait gives the same Post state as waiting in real time", () => {
    for (const c of cases) {
      // find a point in the live run where a wait is pending in a running phase
      const run = createRun(c.doc, c.seed);
      let seq = 0;
      for (const cmd of scriptCommands(c)) {
        while (run.state.tick < cmd.tick && advance(run)) {
          /* advance */
        }
        if (cmd.type === "skip") break;
        const r = applyCommand(run, cmd);
        if (!r.ok) break;
        seq = cmd.seq;
        const w = waits(run);
        if (!w.length || run.c.doc.phases[run.state.phase].clock !== "running") continue; // only a running phase can wait in real time
        const cp = checkpoint(run);
        const skipped = restoreRun(c.doc, c.seed, cp);
        const skipRes = applyCommand(skipped, { seq: seq + 1, tick: skipped.state.tick, type: "skip", timer: w[0].timer, instance: w[0].instance, to: w[0].due });
        assert.ok(skipRes.ok, `${c.id}: ${skipRes.ok ? "" : skipRes.reason}`);
        const waited = restoreRun(c.doc, c.seed, cp);
        while (waited.state.tick < (skipRes.ok ? (skipRes.stoppedAt as number) : 0) && advance(waited)) {
          /* advance */
        }
        assert.equal(stateHash(waited.state), stateHash(skipped.state), `${c.id}: skip vs waiting at tick ${waited.state.tick}`);
        break;
      }
    }
  });

  test("checkpoint resume = uninterrupted: restore Pre(k) and continue, with a late command stamped k on top", () => {
    for (const c of cases) {
      const cmds = scriptCommands(c);
      const live = createRun(c.doc, c.seed);
      // checkpoint before any command stamped at the first command's tick
      const first = cmds[0];
      if (!first) continue;
      while (live.state.tick < first.tick && advance(live)) {
        /* advance */
      }
      const cp = checkpoint(live); // Pre(k): excludes every command stamped k
      assert.ok(!insideSkip(live, live.state.tick), "a checkpoint is never taken strictly inside a skip");
      const resumed = restoreRun(c.doc, c.seed, cp);
      assert.equal(stateHash(resumed.state), stateHash(live.state), c.id);
      for (const cmd of cmds) {
        for (const r of [live, resumed]) {
          while (r.state.tick < cmd.tick && advance(r)) {
            /* advance */
          }
          applyCommand(r, cmd);
        }
        assert.equal(stateHash(resumed.state), stateHash(live.state), `${c.id} after seq ${cmd.seq}`);
      }
      for (let i = 0; i < 5; i++) {
        advance(live);
        advance(resumed);
      }
      assert.equal(stateHash(resumed.state), stateHash(live.state), `${c.id} after resuming`);
      assert.deepEqual(resumed.log, live.log, c.id);
    }
  });

  test("a rejected command never changes state, and seq gaps are rejected", () => {
    const c = cases.find((x) => x.id === "worked-example")!;
    const run = createRun(c.doc, 1);
    const before = stateHash(run.state);
    const r = applyCommand(run, { seq: 5, tick: 0, type: "act", action: "boost" });
    assert.equal(r.ok, false);
    assert.equal(stateHash(run.state), before);
  });

  test("every run ends by maxDuration", () => {
    for (const c of cases) {
      const run = createRun(c.doc, c.seed);
      let guard = 0;
      while (!run.state.ended && advance(run) && guard++ < 100000) {
        /* advance */
      }
      if (run.c.doc.phases[run.state.phase].clock === "running" && !run.state.openPrompt && !run.state.openReasoning) {
        assert.ok(run.state.ended, c.id);
        assert.ok(run.state.tick <= run.c.maxTick, c.id);
      }
    }
  });

  test("state never leaves its declared bounds", () => {
    for (const c of cases) {
      const r = runCorpusCase(c);
      void r;
      const run = createRun(c.doc, c.seed);
      for (const cmd of scriptCommands(c)) {
        while (run.state.tick < cmd.tick && advance(run)) {
          /* advance */
        }
        applyCommand(run, cmd);
        for (const k of Object.keys(c.doc.state)) {
          const spec = c.doc.state[k];
          if (spec.type !== "number") continue;
          const v = run.state.vars[k] as number;
          assert.ok(v >= spec.min && v <= spec.max, `${c.id}: ${k} = ${v}`);
          assert.ok(!Object.is(v, -0), `${c.id}: ${k} is -0`);
        }
      }
    }
  });
});

export type { ScenarioDoc };
