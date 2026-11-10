// REQ-162 (docs/sims.md 3.1, 16, 17 step 5): each prototype port's golden
// paths behave like the revised prototype. The prototype's results were
// recorded by `npm run sim:golden -- prototype <port> <dir>` (the prototypes
// live outside this repository) into <slug>.prototype.json; this test holds
// the engine's golden replays to them: endings and criteria exactly, except
// the deliberate changes listed here (3.1), KPIs exactly, vitals within ±1
// display unit at the snapshot ticks. Plus the tamponade performance budget.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import { advance, applyCommand, createRun, TICK_BUDGET } from "./engine/v1/engine.ts";
import { replayGoldenPath } from "./engine/v1/validate.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";

interface ProtoPath {
  id: string;
  path: string | null;
  criteria: string[];
  recognition: number | null;
  page: number | null;
  reexp: number | null;
  arrestAt: number | null;
  p2: string[];
  p2vitals: Record<string, number> | null;
  snapshots: { tick: number; values: Record<string, number> }[];
}

const tamponade = ALL_DOCUMENTS.find((d) => d.slug === "tamponade-after-cabg");
if (!tamponade?.golden) throw new Error("tamponade port is not registered");
const doc: ScenarioDoc = loadDocument(tamponade);
const golden = JSON.parse(readFileSync(tamponade.golden, "utf8")) as GoldenFile;
const proto = JSON.parse(readFileSync(tamponade.golden.replace(/\.golden\.json$/, ".prototype.json"), "utf8")) as { paths: ProtoPath[] };

// Deliberate differences from the prototype, each from docs/sims.md 3.1 or
// recorded in PR #64:
// - the prototype's "early" splits by the rubric: target only when
//   re-exploration started <= 45 min after the drainage stopped and the
//   phase-2 low-output state ended on an inotrope; otherwise recovered.
// - the arrest path scores the phase-2 criterion "missed" (the prototype
//   omits it), so every run is scored on the same eight criteria.
// - REQ-190: the arrest is no longer terminal. It enters the code/ACLS
//   module (modules/code-acls@1); the prototype's arrest tick is the tick
//   the code starts, and the untreated arrest path ends without ROSC. The
//   module's criteria follow the host's and score "na" when no arrest
//   happens, so the host's criteria are compared by position as before.
//   Paths that go through the code (code*) have no prototype recording.
const ENDING_FOR_PATH: Record<string, string[]> = {
  early: ["early", "earlyUntreated"],
  bridge: ["bridge"],
  late: ["late"],
  arrest: ["code_noRosc"],
};
const CODE_PATHS = golden.paths.filter((p) => p.id.startsWith("code")).map((p) => p.id);

// Clearing the tubes adds 120 mL at once; the prototype interpolates its
// 5-second drainage ledger across that step and the engine's history keeps
// whole samples, so the 15-minute chest-tube figure differs for the few
// seconds when the window's far edge crosses the moment the tubes were
// cleared. Those snapshots skip that one tile.
function nearGush(cmds: Command[], tick: number): boolean {
  return cmds.some((c) => c.type === "act" && c.action === "tubes" && Math.abs(c.tick + 900 - tick) <= 10);
}

describe("tamponade port matches the revised prototype (critical-care.html)", () => {
  test("every golden path has a prototype recording and the reverse", () => {
    assert.deepEqual(golden.paths.map((p) => p.id).filter((id) => !CODE_PATHS.includes(id)), proto.paths.map((p) => p.id));
  });

  for (const gp of golden.paths.filter((p) => !CODE_PATHS.includes(p.id))) {
    const pp = proto.paths.find((p) => p.id === gp.id);
    test(gp.id, () => {
      assert.ok(pp, "no prototype recording");
      const r = replayGoldenPath(doc, gp);
      assert.equal(r.error, null);
      const d = r.debrief;
      assert.ok(pp.path && (ENDING_FOR_PATH[pp.path] ?? []).includes(d.ending ?? ""), `prototype path ${pp.path}, engine ending ${d.ending}`);
      if (pp.path === "early") {
        const target = d.ending === "early";
        const p2inotrope = pp.p2[pp.p2.length - 1] === "inotrope";
        assert.equal(target, p2inotrope && (pp.reexp ?? Infinity) <= 2700, "early splits by the 45-minute window and the phase-2 inotrope");
      }
      // criteria by position; the prototype omits phase 2 on an arrest
      const engineScores = d.criteria.filter((c) => !c.id.startsWith("code_")).map((c) => c.score);
      for (const c of d.criteria.filter((x) => x.id.startsWith("code_"))) assert.equal(c.score === "na", pp.path !== "arrest", `${c.id} is na exactly when no arrest happened`);
      const expected = pp.path === "arrest" ? [...pp.criteria, "missed"] : pp.criteria;
      assert.deepEqual(engineScores, expected);
      const kpi = (id: string): number | null => {
        const v = d.kpis.find((k) => k.id === id)?.raw as number;
        return v === -1 ? null : v;
      };
      assert.equal(kpi("recognition"), pp.recognition);
      assert.equal(kpi("page"), pp.page);
      assert.equal(kpi("reexp"), pp.reexp);
      if (pp.arrestAt !== null) {
        const run = createRun(doc, gp.seed);
        for (const c of gp.commands) {
          while (run.state.tick < c.tick && advance(run)) {
            /* real time */
          }
          applyCommand(run, c);
        }
        while (run.state.phase === "live" && advance(run)) {
          /* until the arrest */
        }
        assert.equal(run.state.tick, pp.arrestAt, "the code starts at the prototype's arrest tick");
        assert.equal(run.state.phase, "code");
      }
      // vitals within ±1 display unit (0.1 for CI and lactate) at every snapshot both reached
      const snaps = gp.expect.snapshots ?? [];
      assert.ok(snaps.length >= 3, "at least three snapshots");
      for (const s of snaps) {
        const ps = pp.snapshots.find((x) => x.tick === s.tick);
        assert.ok(ps, `prototype has no snapshot at tick ${s.tick}`);
        for (const k of Object.keys(ps.values)) {
          if (k === "ct15" && nearGush(gp.commands, s.tick)) continue;
          const tol = k === "ci" || k === "lactate" ? 0.1 + 1e-9 : 1;
          const got = s.values[k] as number;
          assert.ok(Math.abs(got - ps.values[k]) <= tol, `tick ${s.tick}: ${k} engine ${got}, prototype ${ps.values[k]}`);
        }
      }
    });
  }

  test("phase 2: the engine's final low-output numbers equal the prototype's", () => {
    for (const gp of golden.paths) {
      const pp = proto.paths.find((p) => p.id === gp.id);
      if (!pp?.p2vitals) continue;
      const run = createRun(doc, gp.seed);
      for (const c of gp.commands) {
        while (run.state.tick < c.tick && advance(run)) {
          /* real time */
        }
        applyCommand(run, c);
      }
      for (const k of ["hr", "sbp", "dbp", "cvp", "paop", "ci", "svo2", "spo2", "uo", "lactate"]) {
        assert.equal(run.ctx.root(`p2${k}`), pp.p2vitals[k], `${gp.id}: p2 ${k}`);
      }
    }
  });
});

describe("tamponade performance budget (docs/sims.md 14, 16)", () => {
  test("a live tick stays far inside the per-tick budget on every golden path", () => {
    for (const gp of golden.paths) {
      const run = createRun(doc, gp.seed);
      let worst = 0;
      for (const c of gp.commands) {
        while (run.state.tick < c.tick) {
          const before = run.evaluations;
          if (!advance(run)) break;
          worst = Math.max(worst, run.evaluations - before);
        }
        applyCommand(run, c);
      }
      assert.ok(worst > 0 && worst <= TICK_BUDGET / 20, `${gp.id}: worst live tick ${worst} evaluations`);
    }
  });

  test("90 minutes of live physiology, stepped as a skip steps it, fits the per-skip budget and 2 s on Node", () => {
    const run = createRun(doc, 1);
    const start = performance.now();
    const e0 = run.evaluations;
    let ticks = 0;
    while (ticks < 5400 && !run.state.ended) {
      if (run.state.openReasoning) applyCommand(run, { seq: run.lastSeq + 1, tick: run.state.tick, type: "reason", moment: run.state.openReasoning, answered: true });
      if (!advance(run)) break;
      ticks++;
    }
    // untreated, the patient arrests at about 68 minutes; scale to 90
    const ms = ((performance.now() - start) * 5400) / ticks;
    const evals = ((run.evaluations - e0) * 5400) / ticks;
    assert.ok(ticks > 3600, `stepped ${ticks} ticks`);
    assert.ok(evals <= 15_000_000, `${Math.round(evals)} evaluations for 90 minutes`);
    assert.ok(ms <= 2000, `${Math.round(ms)} ms for 90 minutes`);
  });

  test("the 90-minute wait for the patient's return from the OR is one bounded skip", () => {
    const gp = golden.paths.find((p) => p.id === "expert")!;
    const run = createRun(doc, gp.seed);
    for (const c of gp.commands) {
      while (run.state.tick < c.tick && advance(run)) {
        /* real time */
      }
      const before = run.evaluations;
      const t0 = performance.now();
      const r = applyCommand(run, c);
      if (c.type === "skip" && c.timer === "backInIcu") {
        assert.ok(r.ok && r.stoppedAt === c.to, "the skip runs to the return without stopping");
        assert.ok(c.to - c.tick === 5400, "90 minutes");
        assert.ok(run.evaluations - before <= 15_000_000);
        assert.ok(performance.now() - t0 <= 1000);
      }
    }
  });
});

// ---- TicketBurst launch day (cloud.html) ----
// The prototype is a pure function of the design and the finance picks, so
// the recording holds its simulate/score results; the engine must reproduce
// each criterion, the day's availability, the worst RTO and RPO, the cost
// and the finance savings. The prototype has no outcome classes; the class
// follows from those numbers by the cloud profile (docs/sims.md 3.1).
describe("TicketBurst port matches the revised prototype (cloud.html)", () => {
  const entry = ALL_DOCUMENTS.find((d) => d.slug === "ticketburst-launch-day");
  if (!entry?.golden) throw new Error("cloud port is not registered");
  const cdoc: ScenarioDoc = loadDocument(entry);
  const cgold = JSON.parse(readFileSync(entry.golden, "utf8")) as GoldenFile;
  const cproto = JSON.parse(readFileSync(entry.golden.replace(/\.golden\.json$/, ".prototype.json"), "utf8")) as {
    paths: { id: string; cost: number; avail: number; rto: number; rpo: number; criteria: string[]; finTotal: number }[];
  };

  test("every golden path has a prototype recording and the reverse", () => {
    assert.deepEqual(cgold.paths.map((p) => p.id), cproto.paths.map((p) => p.id));
  });

  for (const gp of cgold.paths) {
    test(gp.id, () => {
      const pp = cproto.paths.find((p) => p.id === gp.id)!;
      const r = replayGoldenPath(cdoc, gp);
      assert.equal(r.error, null);
      const d = r.debrief;
      assert.deepEqual(d.criteria.map((c) => c.score), pp.criteria);
      const kpi = (id: string): number => d.kpis.find((k) => k.id === id)?.raw as number;
      assert.equal(kpi("cost"), pp.cost);
      assert.ok(Math.abs(kpi("availability") - pp.avail) < 1e-9, `availability ${kpi("availability")} vs ${pp.avail}`);
      assert.equal(kpi("rto"), pp.rto);
      assert.equal(kpi("rpo"), pp.rpo);
      assert.equal(kpi("savings"), pp.finTotal);
      const cls = pp.rpo > 5 || pp.rto > 15 || pp.avail < 99.85 || pp.cost > 2750 ? "harm" : pp.avail >= 99.9 && pp.cost <= 2500 ? "target" : "recovered";
      assert.equal(d.outcomeClass, cls);
    });
  }
});
