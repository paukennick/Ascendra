// REQ-209 (Nick, 2026-11-09): the cloud/IT, project-management and other
// non-clinical sims move only at the learner's pace. This pins it, per
// scenario: with ten idle minutes and no learner action, sim time and every
// part of the state are exactly as they were, in every `turns` and `stopped`
// phase, through the app's real-time path (advance) and the server's replay
// (a heartbeat to a later tick). It also pins that such a scenario has no
// `running` phase at all, so a future one that adds a running phase has to
// make a decision here instead of slipping in.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { safetyFamilyOf } from "./lint.ts";
import { advance, checkpoint, createRun, restoreRun, stateHash, lintScenario } from "./engine/v1/index.ts";
import type { Checkpoint, ScenarioDoc } from "./engine/v1/index.ts";
import { replayRun } from "./server-run.ts";

const IDLE_SECONDS = 10 * 60;
const general = ALL_DOCUMENTS.map((entry) => ({ entry, doc: loadDocument(entry) as ScenarioDoc })).filter((d) => safetyFamilyOf(d.doc) === "general");

function snapshot(cp: Checkpoint): string {
  // everything the run holds except the (unchanged) function-of-nothing fields
  return JSON.stringify({ tick: cp.tick, state: cp.state, log: cp.log, outputs: cp.outputs, findings: cp.findings, skips: cp.skips, commands: cp.commands, realtimeTicks: cp.realtimeTicks, skippedTicks: cp.skippedTicks });
}

describe("non-clinical sims never advance on their own", () => {
  test("the non-clinical scenarios are the cloud sims", () => {
    const slugs = general.map((d) => d.doc.slug);
    assert.ok(slugs.includes("ticketburst-launch-day"), slugs.join(","));
    assert.ok(slugs.length >= 2, "the SAP band is a non-clinical scenario too");
  });

  for (const { entry, doc } of general) {
    describe(`${entry.course}/${entry.slug}`, () => {
      test("no phase runs in real time", () => {
        for (const k of Object.keys(doc.phases)) assert.notEqual(doc.phases[k].clock, "running", `phase ${k} is running: a non-clinical sim must only move when the learner acts (decide this explicitly)`);
      });

      test("ten idle minutes change nothing, in every phase", () => {
        for (const phase of Object.keys(doc.phases)) {
          const base = createRun(doc, 7);
          const cp0 = checkpoint(base);
          cp0.state.phase = phase; // put the run in each phase in turn
          const run = restoreRun(doc, 7, cp0);
          const before = snapshot(checkpoint(run));
          const hash = stateHash(run.state);
          // the app's frame loop: one real-time step per second of idling
          for (let s = 0; s < IDLE_SECONDS; s++) assert.equal(advance(run), false, `phase ${phase}: the clock moved at idle second ${s}`);
          assert.equal(run.state.tick, cp0.tick, `phase ${phase}: sim time moved`);
          assert.equal(stateHash(run.state), hash, `phase ${phase}: state changed`);
          assert.equal(snapshot(checkpoint(run)), before, `phase ${phase}: the run changed`);
          assert.equal(run.realtimeTicks, 0);
          // the server: a heartbeat ten minutes later reaches no later tick
          const r = replayRun({ doc, seed: 7, from: cp0, commands: [], toTick: Math.ceil(IDLE_SECONDS / run.c.dt) });
          assert.equal(r.rejected, null);
          assert.ok(r.unreachable, `phase ${phase}: the server let the clock run`);
          assert.equal(r.run.state.tick, cp0.tick, `phase ${phase}: the server's replay moved sim time`);
          assert.equal(stateHash(r.run.state), hash, `phase ${phase}: the server's replay changed state`);
        }
      });

      test("the pacing declarations are refused here (lint)", () => {
        const withFocus = { ...doc, engine: { major: 1 as const, minor: 1 }, focusedStart: { label: "x", summary: "x", at: "1h", source: { cite: "x", checkedAt: "2026-11-09" } } } as ScenarioDoc;
        const problems = lintScenario(withFocus, { safetyFamily: "general" });
        assert.ok(problems.some((p) => p.level === "error" && p.path === "pacing"), "a focused start on a non-clinical scenario is a lint error");
      });
    });
  }
});
