// REQ-190: golden paths written as driver scripts against the engine, for
// documents with no prototype to record (the SAP band, the code/ACLS module
// in tamponade, the module's fixture case). A path drives a run through a
// small controller (act, choose, answer, skip, wait in real time); the
// commands it sends are the golden path and the expectations are the
// engine's own results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps <name>
//
// `keep` paths already in the golden file are replayed with their recorded
// commands and snapshots, and their expectations refreshed, so a port's
// prototype-matched paths are never re-driven.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Command, CommandParams, CriterionRowScore, CriterionScore, ScenarioDoc } from "../../lib/sim/engine/v1/types.ts";
import { advance, applyCommand, clockMode, createRun, readValue, stateHash, waits } from "../../lib/sim/engine/v1/engine.ts";
import type { Run } from "../../lib/sim/engine/v1/engine.ts";
import { replayGoldenPath } from "../../lib/sim/engine/v1/validate.ts";
import type { GoldenFile, GoldenPath } from "../../lib/sim/engine/v1/validate.ts";

export interface Ctl {
  run: Run;
  act(action: string, params?: CommandParams): void;
  choose(choice: string): void;
  answer(): void; // submit the open reasoning moment, if any
  skip(timer?: string): void; // to the earliest wait (or that timer's), stopping where the engine stops
  wait(seconds: number): void; // real time in a running phase
  waitUntil(pred: (run: Run) => boolean, limit?: number): void;
  replay(cmds: Command[]): void; // a recorded prefix
  value(name: string): unknown;
}

export interface StepPath {
  id: string;
  title: string;
  seed?: number;
  reasoning: CriterionScore;
  notes?: string;
  drive(c: Ctl): void;
}

export interface StepsSpec {
  slug: string;
  keep?: string[]; // ids of existing golden paths to keep (commands and snapshots), expectations refreshed
  paths: StepPath[];
}

function controller(doc: ScenarioDoc, seed: number, out: Command[], id: string): Ctl {
  const run = createRun(doc, seed);
  let seq = 0;
  const send = (c: Record<string, unknown>): void => {
    const cmd = { ...c, seq: ++seq, tick: run.state.tick } as Command;
    const r = applyCommand(run, cmd);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(cmd)} rejected: ${r.reason}`);
    out.push(cmd);
  };
  const ctl: Ctl = {
    run,
    act: (action, params) => send({ type: "act", action, ...(params ? { params } : {}) }),
    choose: (choice) => {
      if (!run.state.openPrompt) throw new Error(`${id}: no prompt open at tick ${run.state.tick}`);
      send({ type: "choose", prompt: run.state.openPrompt, choice });
    },
    answer: () => {
      if (run.state.openReasoning) send({ type: "reason", moment: run.state.openReasoning, answered: true });
    },
    skip: (timer) => {
      ctl.answer();
      const w = waits(run).filter((x) => !timer || x.timer === timer);
      if (!w.length) throw new Error(`${id}: nothing to skip to${timer ? ` (${timer})` : ""} at tick ${run.state.tick}`);
      send({ type: "skip", timer: w[0].timer, instance: w[0].instance, to: w[0].due });
    },
    wait: (seconds) => {
      const to = run.state.tick + Math.round(seconds / run.c.dt);
      while (run.state.tick < to && !run.state.ended) {
        ctl.answer();
        if (clockMode(run) !== "running" || !advance(run)) break;
      }
      ctl.answer();
    },
    waitUntil: (pred, limit = 100000) => {
      let n = 0;
      while (!pred(run) && !run.state.ended && n++ < limit) {
        ctl.answer();
        if (clockMode(run) !== "running" || !advance(run)) break;
      }
      if (!pred(run)) throw new Error(`${id}: condition not reached by tick ${run.state.tick}`);
    },
    replay: (cmds) => {
      for (const c of cmds) {
        while (run.state.tick < c.tick && advance(run)) {
          /* real time */
        }
        const cmd = { ...c, seq: ++seq } as Command;
        const r = applyCommand(run, cmd);
        if (!r.ok) throw new Error(`${id}: replayed ${JSON.stringify(c)} rejected: ${r.reason}`);
        out.push(cmd);
      }
    },
    value: (name) => readValue(run, name),
  };
  return ctl;
}

function expectFor(doc: ScenarioDoc, p: GoldenPath): GoldenPath {
  const draft: GoldenPath = { ...p, expect: { ending: null, class: null, rating: null, ...(p.expect?.snapshots ? { snapshots: p.expect.snapshots } : {}) } };
  const r = replayGoldenPath(doc, draft, (run) => stateHash(run.state));
  if (r.error) throw new Error(`${p.id}: ${r.error}`);
  const d = r.debrief;
  draft.expect = {
    ending: d.ending,
    class: d.outcomeClass,
    rating: d.rating,
    score: d.processScore ?? undefined,
    criteria: Object.fromEntries(d.criteria.map((c) => [c.id, c.score as CriterionRowScore])),
    kpis: Object.fromEntries(d.kpis.map((k) => [k.id, typeof k.raw === "number" || typeof k.raw === "string" || k.raw === null ? k.raw : JSON.stringify(k.raw)])),
    ...(p.expect?.snapshots ? { snapshots: p.expect.snapshots } : {}),
    stateHash: r.stateHash,
  };
  const snapMiss = r.mismatches.filter((m) => m.startsWith("snapshot") || m.startsWith("engine error"));
  if (snapMiss.length) throw new Error(`${p.id}: ${snapMiss.join("; ")}`);
  console.log(`${p.id}: ${d.ending} / ${d.outcomeClass} / ${d.rating} (score ${d.processScore}); ${p.commands.length} commands, ended at tick ${r.finalTick}`);
  return draft;
}

export function buildSteps(doc: ScenarioDoc, goldenFile: string, spec: StepsSpec): void {
  const old: GoldenFile | null = existsSync(goldenFile) ? (JSON.parse(readFileSync(goldenFile, "utf8")) as GoldenFile) : null;
  const paths: GoldenPath[] = [];
  for (const id of spec.keep ?? []) {
    const p = old?.paths.find((x) => x.id === id);
    if (!p) throw new Error(`keep: no path ${id} in ${goldenFile}`);
    paths.push(expectFor(doc, p));
  }
  for (const sp of spec.paths) {
    const cmds: Command[] = [];
    const seed = sp.seed ?? 1;
    const ctl = controller(doc, seed, cmds, sp.id);
    sp.drive(ctl);
    const moment = Object.keys(doc.reasoning)[0];
    const p: GoldenPath = { id: sp.id, title: sp.title, seed, commands: cmds, expect: { ending: null, class: null, rating: null }, reasoning: { [moment]: sp.reasoning } };
    if (sp.notes) p.notes = sp.notes;
    paths.push(expectFor(doc, p));
  }
  const out: GoldenFile = { slug: spec.slug, status: "draft", paths };
  writeFileSync(goldenFile, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote ${goldenFile}`);
}
