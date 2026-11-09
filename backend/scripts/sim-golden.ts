// REQ-162 (docs/sims.md 16, 17 step 5): golden paths for the prototype ports.
//
//   npm run sim:golden -- build tamponade
//       turns scripts/sim-golden/<name>.ts into engine commands, replays them
//       and writes <slug>.golden.json (expectations are the engine's own
//       results; the ±1 comparison with the prototype is a test).
//   npm run sim:golden -- prototype tamponade <dir with critical-care.html>
//       drives the revised prototype through the same paths with its ?test=1
//       hook in headless Chromium (PLAYWRIGHT_MODULE = an installed playwright
//       package directory) and records what it did in <slug>.prototype.json.
//
// The prototypes live outside this repository, so the recording is
// committed and lib/sim/ports.test.ts compares the engine against it in CI.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { Command, ScenarioDoc } from "../lib/sim/engine/v1/types.ts";
import { advance, applyCommand, createRun, readValue, stateHash } from "../lib/sim/engine/v1/engine.ts";
import type { Run } from "../lib/sim/engine/v1/engine.ts";
import { replayGoldenPath } from "../lib/sim/engine/v1/validate.ts";
import type { GoldenFile, GoldenPath } from "../lib/sim/engine/v1/validate.ts";
import { ALL_DOCUMENTS } from "../lib/sim/documents.ts";
import * as tamponade from "./sim-golden/tamponade.ts";
import * as cloud from "./sim-golden/cloud.ts";

const PORTS = {
  tamponade: { slug: "tamponade-after-cabg", spec: tamponade, prototype: "critical-care.html", vitals: ["hr", "sbp", "dbp", "map", "cvp", "paop", "ci", "svo2", "spo2", "uo", "ct15", "lactate"] },
  cloud: { slug: "ticketburst-launch-day", spec: cloud, prototype: "cloud.html", vitals: [] },
} as const;

type Port = { slug: string; spec: { PATHS: readonly { id: string; title: string; reasoning: string; notes?: string }[]; SNAPSHOT_TICKS?: number[] }; prototype: string; vitals: readonly string[] };

function portOf(name: string): Port {
  const p = (PORTS as unknown as Record<string, Port>)[name];
  if (!p) throw new Error(`unknown port ${name}; one of ${Object.keys(PORTS).join(", ")}`);
  return p;
}

function entryOf(slug: string): { file: string; golden: string } {
  const e = ALL_DOCUMENTS.find((d) => d.slug === slug);
  if (!e || !e.golden) throw new Error(`${slug} is not in lib/sim/documents.ts`);
  return { file: e.file, golden: e.golden };
}

// ---- engine side ----

function commandsFor(doc: ScenarioDoc, path: tamponade.PathSpec): Command[] {
  const run = createRun(doc, 1);
  const out: Command[] = [];
  let seq = 0;
  const send = (c: Omit<Command, "seq" | "tick">): void => {
    const cmd = { ...c, seq: ++seq, tick: run.state.tick } as Command;
    const r = applyCommand(run, cmd);
    if (!r.ok) throw new Error(`${path.id}: ${JSON.stringify(cmd)} rejected: ${r.reason}`);
    out.push(cmd);
  };
  const answerOpen = (): void => {
    if (run.state.openReasoning) send({ type: "reason", moment: run.state.openReasoning, answered: true } as Omit<Command, "seq" | "tick">);
  };
  const stepTo = (at: number): boolean => {
    while (run.state.tick < at && !run.state.ended && run.state.phase === "live") {
      answerOpen();
      if (!advance(run)) return false;
    }
    answerOpen();
    return !run.state.ended && run.state.phase === "live";
  };
  for (const s of path.steps) {
    if (!stepTo(s.at)) break;
    const params: Record<string, string> = {};
    if (s.value !== undefined) params[s.act === "fluid" ? "ml" : s.act === "protamine" ? "give" : "dose"] = s.value;
    if (s.sbar) Object.assign(params, s.sbar);
    send({ type: "act", action: s.act, ...(Object.keys(params).length ? { params } : {}) } as Omit<Command, "seq" | "tick">);
  }
  // live phase runs out in real time until re-exploration or arrest
  while (!run.state.ended && run.state.phase === "live") {
    answerOpen();
    if (!advance(run)) break;
  }
  const skipTo = (timer: string): void => {
    const inst = run.state.timers.find((t) => t.timer === timer);
    if (!inst) throw new Error(`${path.id}: no pending ${timer}`);
    send({ type: "skip", timer, instance: inst.id, to: inst.due } as Omit<Command, "seq" | "tick">);
  };
  if (!run.state.ended && run.state.phase === "reexp") {
    skipTo("backInIcu");
    for (const choice of path.p2) {
      if (!run.state.openPrompt) throw new Error(`${path.id}: no prompt open for ${choice}`);
      send({ type: "choose", prompt: run.state.openPrompt, choice } as Omit<Command, "seq" | "tick">);
      if (choice !== "finish" && !run.state.ended) skipTo("reassessT");
    }
  }
  return out;
}

function cloudCommands(doc: ScenarioDoc, path: cloud.CloudPath): Command[] {
  const run = createRun(doc, 1);
  const out: Command[] = [];
  const send = (c: Record<string, unknown>): void => {
    const cmd = { ...c, seq: out.length + 1, tick: run.state.tick } as Command;
    const r = applyCommand(run, cmd);
    if (!r.ok) throw new Error(`${path.id}: ${JSON.stringify(cmd)} rejected: ${r.reason}`);
    out.push(cmd);
  };
  for (const [id, slot] of path.items) {
    send({ type: "act", action: "place", params: { place: id, "place.slot": slot } });
    if (id === "asg" && path.asg) send({ type: "act", action: "configure", params: { azs: path.asg.azs, mn: String(path.asg.min), mx: String(path.asg.max), size: path.asg.size } });
  }
  if (path.backup) send({ type: "act", action: "toggleBackup" });
  send({ type: "act", action: "start" });
  if (run.state.openReasoning) send({ type: "reason", moment: run.state.openReasoning, answered: true });
  for (const timer of ["normalT", "spikeT", "azT", "dbT", "financeT"]) {
    const inst = run.state.timers.find((t) => t.timer === timer);
    if (!inst) throw new Error(`${path.id}: no pending ${timer}`);
    send({ type: "skip", timer, instance: inst.id, to: inst.due });
  }
  send({ type: "act", action: "review", params: Object.fromEntries(cloud.FINANCE_IDS.map((f) => [f, path.finance.includes(f) ? "cut" : "keep"])) });
  return out;
}

function snapshotsFor(doc: ScenarioDoc, cmds: Command[], ticks: number[], vitals: readonly string[], seed: number): { tick: number; values: Record<string, number> }[] {
  const run: Run = createRun(doc, seed);
  const snaps: { tick: number; values: Record<string, number> }[] = [];
  const take = (): void => {
    if (ticks.includes(run.state.tick) && run.state.phase === "live" && !snaps.some((s) => s.tick === run.state.tick)) {
      const values: Record<string, number> = {};
      for (const v of vitals) values[v] = readValue(run, v) as number;
      snaps.push({ tick: run.state.tick, values });
    }
  };
  take();
  for (const c of cmds) {
    while (run.state.tick < c.tick && advance(run)) take();
    applyCommand(run, c);
  }
  while (!run.state.ended && run.state.phase === "live" && advance(run)) take();
  return snaps;
}

function build(name: string): void {
  const port = portOf(name);
  const { file, golden } = entryOf(port.slug);
  const doc = JSON.parse(readFileSync(file, "utf8")) as ScenarioDoc;
  const paths: GoldenPath[] = [];
  for (const p of port.spec.PATHS) {
    const commands = name === "cloud" ? cloudCommands(doc, p as unknown as cloud.CloudPath) : commandsFor(doc, p as unknown as tamponade.PathSpec);
    const moment = Object.keys(doc.reasoning)[0];
    const draft: GoldenPath = { id: p.id, title: p.title, seed: 1, commands, expect: { ending: null, class: null, rating: null }, reasoning: { [moment]: p.reasoning as "met" | "partial" | "missed" } };
    const r = replayGoldenPath(doc, draft, (run) => stateHash(run.state));
    if (r.error) throw new Error(`${p.id}: ${r.error}`);
    const d = r.debrief;
    draft.expect = {
      ending: d.ending,
      class: d.outcomeClass,
      rating: d.rating,
      score: d.processScore ?? undefined,
      criteria: Object.fromEntries(d.criteria.map((c) => [c.id, c.score])),
      kpis: Object.fromEntries(d.kpis.map((k) => [k.id, k.raw as number])),
      ...(port.vitals.length ? { snapshots: snapshotsFor(doc, commands, port.spec.SNAPSHOT_TICKS ?? [], port.vitals, 1) } : {}),
      stateHash: r.stateHash,
    };
    if (p.notes) draft.notes = p.notes;
    paths.push(draft);
    console.log(`${p.id}: ${d.ending} / ${d.outcomeClass} / ${d.rating} (score ${d.processScore}); ${commands.length} commands, ended at tick ${r.finalTick}`);
  }
  const out: GoldenFile = { slug: port.slug, status: "draft", paths };
  writeFileSync(golden, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote ${golden}`);
}

// ---- prototype side (critical-care.html?test=1) ----

async function prototype(name: string, dir: string): Promise<void> {
  const port = portOf(name);
  const modulePath = process.env.PLAYWRIGHT_MODULE;
  if (!modulePath) throw new Error("set PLAYWRIGHT_MODULE to an installed playwright package directory");
  const pw = await import(pathToFileURL(`${modulePath.replace(/\/$/, "")}/index.mjs`).href);
  const browser = await pw.chromium.launch();
  const results: unknown[] = [];
  try {
    for (const p of port.spec.PATHS) {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e: Error) => errors.push(e.message));
      // tsx compiles the in-page function with esbuild's keepNames helper
      await page.addInitScript("window.__name = function (f) { return f; };");
      await page.goto(`${pathToFileURL(join(dir, port.prototype)).href}?test=1`);
      const r = name === "cloud" ? await page.evaluate(
        ({ path }: { path: cloud.CloudPath }) => {
          const w = window as unknown as Record<string, any>;
          const items = path.items.map(([type, slot], i) => {
            const it: Record<string, unknown> = { uid: "g" + i, type, slot };
            if (type === "asg") it.cfg = path.asg ? { min: path.asg.min, max: path.asg.max, size: path.asg.size, azs: path.asg.azs === "ab" ? ["a", "b"] : [path.asg.azs] } : { min: 2, max: 4, size: "m6i.large", azs: [slot.slice(-1)] };
            return it;
          });
          const design = { backup: path.backup, items };
          const sim = w.eval("simulate")(design);
          const fin = w.eval("financeSavings")(sim.d, new Set(path.finance));
          const sc = w.eval("score")(sim, fin);
          return { id: path.id, cost: sim.d.cost.total, events: sim.events.map((e: { id: string; status: string; down: number; degraded: number }) => ({ id: e.id, status: e.status, down: e.down, degraded: e.degraded })),
            impact: sc.impact, avail: sc.avail, rto: sc.rto, rpo: sc.rpo, criteria: sc.crit.map((c: { s: string }) => c.s), finTotal: fin.total, finRisks: fin.risks.length };
        },
        { path: p as unknown as cloud.CloudPath },
      ) : await page.evaluate(
        ({ path, ticks }: { path: tamponade.PathSpec; ticks: number[] }) => {
          const w = window as unknown as Record<string, any>;
          const S = () => w.eval("S");
          const snaps: { tick: number; values: Record<string, number> }[] = [];
          const take = () => {
            const s = S();
            if (s.phase === "run" && ticks.includes(Math.round(s.t)) && !snaps.some((x) => x.tick === Math.round(s.t))) {
              const v = w.eval("vitals()");
              snaps.push({ tick: Math.round(s.t), values: { hr: v.hr, sbp: v.sbp, dbp: v.dbp, map: v.map, cvp: v.cvp, paop: v.paop, ci: v.ci, svo2: v.svo2, spo2: v.spo2, uo: v.uo, ct15: v.ct, lactate: v.lactate } });
            }
          };
          const answer = () => {
            if (S().reasonOpen) {
              (document.getElementById("reasonSubmit") as HTMLButtonElement).click();
              (document.getElementById("reasonResume") as HTMLButtonElement).click();
            }
          };
          const stepTo = (at: number) => {
            take();
            while (S().t < at - 1e-9 && S().phase === "run") {
              answer();
              w.__simTest.advance(1);
              take();
            }
            answer();
          };
          w.eval("start()");
          for (const s of path.steps) {
            stepTo(s.at);
            if (S().phase !== "run") break;
            if (["look", "ausc", "inspect"].includes(s.act)) w.assess(s.act);
            else if (s.sbar) w.applyChoice("surgeon", { S: s.sbar.sit, B: s.sbar.bg, A: s.sbar.asmt, R: s.sbar.rec });
            else if (s.value !== undefined) w.applyChoice(s.act, s.value);
            else w.doAction(s.act);
          }
          stepTo(1e9);
          const s0 = S();
          const live = { path: s0.path, phase: s0.phase, endAt: s0.endAt, reexpAt: s0.reexpAt };
          if (s0.phase === "reexp") {
            w.startP2();
            for (const c of path.p2) if (c !== "finish") w.chooseP2(c);
          }
          const crit = w.eval("criteria()") as { name: string; s: string }[];
          const s1 = S();
          return {
            id: path.id,
            path: live.path,
            criteria: crit.map((c) => c.s),
            recognition: w.eval("recognitionTime()"),
            page: s1.surgeonEffAt == null ? null : s1.surgeonEffAt - 120,
            reexp: live.reexpAt == null || live.path === "arrest" ? null : live.reexpAt - 120,
            arrestAt: live.path === "arrest" ? live.endAt : null,
            p2: s1.p2.choices,
            p2vitals: s1.p2.v,
            snapshots: snaps,
          };
        },
        { path: p as unknown as tamponade.PathSpec, ticks: port.spec.SNAPSHOT_TICKS ?? [] },
      );
      if (errors.length) throw new Error(`${p.id}: page errors ${errors.join("; ")}`);
      results.push(r);
      console.log(`${p.id}: prototype ${JSON.stringify(r).slice(0, 160)}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const out = join(entryOf(port.slug).golden.replace(/\.golden\.json$/, ".prototype.json"));
  writeFileSync(out, `${JSON.stringify({ prototype: port.prototype, recordedWith: "headless Chromium, ?test=1 hook, 1 s steps", paths: results }, null, 2)}\n`);
  console.log(`wrote ${out}`);
}

const [cmd, name, dir] = process.argv.slice(2);
(async () => {
  if (cmd === "build" && name) build(name);
  else if (cmd === "prototype" && name && dir) await prototype(name, dir);
  else {
    console.error("usage: sim:golden -- build <port> | prototype <port> <prototype dir>");
    process.exit(2);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
