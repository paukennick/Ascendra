// REQ-209: the app's side of pace, the launch choice, the skip offer, teaching
// prompts and chapter breaks, against the seeded tamponade case (the engine
// copy the app runs), and the promise that a run from before REQ-209 is
// unchanged: no launch card, 1x, the same state.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { advance, applyCommand, createRun, replay, stateHash, minWallSeconds } from "./engine/v1/engine.ts";
import type { Run } from "./engine/v1/engine.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import { planFrame } from "./runtime/clock.ts";
import { accepted, issue, NO_PACING, openSession, step, clockRuns, type Pacing, type RunPayload } from "./runtime/session.ts";
import {
  CALM_IDLE_MS, calmOffer, chapterCommand, chapterOffer, launchCommands, launchView, needsLaunchChoice, paceOptions, simClock, spanWords, teachFeedback, teachOffer, tickMsFor, trackIdle,
} from "./runtime/pacing.ts";

const here = dirname(fileURLToPath(import.meta.url));
const seeds = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims");
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
async function compile(course: string, slug: string): Promise<ScenarioDoc> {
  const { spliceModules } = await import("../../../backend/lib/sim/modules.ts");
  return spliceModules(read(join(seeds, course, `${slug}.sim.json`)), (ref: string) => read(join(seeds, "modules", `${ref}.module.json`))).doc as ScenarioDoc;
}
const golden = (course: string, slug: string) => read(join(seeds, course, `${slug}.golden.json`)) as { paths: { id: string; seed: number; commands: Command[] }[] };
const PACING: Pacing = { eligible: true, studyPace: 3, examPace: 1, defaultPace: 3 };

function payload(commands: Command[], pacing?: Pacing, lastTick = 0): RunPayload {
  return { run: { id: "r1", simId: "s1", versionId: "v1", version: 1, status: "open", seed: 1, leaseEpoch: 1, lastSeq: commands.length, lastTick, engineVersion: "1.1" }, clientHash: "h", commands, graded: [], ...(pacing ? { pacing } : {}) };
}
function to(run: Run, tick: number): void {
  while (run.state.tick < tick) assert.ok(advance(run));
}

describe("pace toggle", async () => {
  const doc = await compile("CCRNADULT", "tamponade-after-cabg");

  test("study pace (3x) is the default and exam realism (1x) is opt-in, both labelled for a screen reader", () => {
    const o = paceOptions(3);
    assert.deepEqual(o.map((x) => [x.pace, x.selected]), [[3, true], [1, false]]);
    assert.match(o[0].label, /Study pace/);
    assert.match(o[1].label, /Exam realism/);
    assert.match(o[0].a11y, /Selected/);
    assert.doesNotMatch(o[1].a11y, /Selected/);
  });

  test("the frame clock runs three ticks a second at 3x and one at 1x, never faster than the pace", () => {
    assert.equal(tickMsFor(1), 1000);
    assert.ok(Math.abs(tickMsFor(3) - 333.333) < 0.01);
    const anchor = { tick: 0, atMs: 0 };
    assert.equal(planFrame(anchor, 0, 1500, 1400, tickMsFor(3)).steps, 3, "1.5 s at 3x is 4 ticks due, at most 3 stepped per frame");
    assert.equal(planFrame(anchor, 0, 1500, 1400, tickMsFor(1)).steps, 1);
    assert.equal(planFrame(anchor, 4, 1500, 1400, tickMsFor(3)).steps, 0, "already at the target");
  });

  test("choosing a pace is a logged command; the state is unchanged and replay matches", () => {
    const s = openSession(payload([], PACING), doc);
    const before = stateHash(s.run.state);
    const r = issue(s, { type: "pace", pace: 3 });
    assert.ok(r.ok);
    assert.equal(s.run.pace, 3);
    assert.equal(stateHash(s.run.state), before);
    for (let i = 0; i < 90; i++) step(s);
    issue(s, { type: "pace", pace: 1 });
    assert.equal(s.run.pace, 1);
    // the server's replay of the same log gives the same state and the same pace accounting
    const again = replay(doc, 1, s.pending.map((c) => ({ ...c }))).run;
    while (again.state.tick < s.run.state.tick) advance(again);
    assert.equal(stateHash(again.state), stateHash(s.run.state));
    assert.equal(minWallSeconds(again), minWallSeconds(s.run));
    assert.equal(minWallSeconds(s.run), 90 / 3);
  });

  test("pause is available at every speed (WCAG 2.2.1)", () => {
    const s = openSession(payload([], PACING), doc);
    for (const pace of [3, 1] as const) {
      assert.ok(issue(s, { type: "pace", pace }).ok);
      assert.ok(issue(s, { type: "pause", reason: "learner" }).ok, `pause at ${pace}x`);
      assert.ok(issue(s, { type: "resume" }).ok);
    }
  });

  test("the sim clock is shown with elapsed sim time and, in a running phase, the pace", () => {
    const s = openSession(payload([], PACING), doc);
    issue(s, { type: "pace", pace: 3 });
    to(s.run, 780);
    const c = simClock(s.run, PACING);
    assert.equal(c.text, "14:13:00");
    assert.equal(c.elapsed, "13 min elapsed");
    assert.match(c.spoken, /Sim time 14:13:00, 13 min elapsed\. Study pace: 3x/);
    assert.doesNotMatch(simClock(s.run, NO_PACING).spoken, /pace/i);
  });
});

describe("launch: pace and start point", async () => {
  const doc = await compile("CCRNADULT", "tamponade-after-cabg");

  test("a fresh run asks once; a run with any command (every run from before REQ-209) never does", () => {
    const fresh = openSession(payload([], PACING), doc);
    assert.equal(needsLaunchChoice(fresh.run, PACING), true);
    const old = golden("CCRNADULT", "tamponade-after-cabg").paths[0].commands.slice(0, 3);
    const resumed = openSession(payload(old, undefined, old[2].tick), doc);
    assert.equal(resumed.pacing.eligible, false, "a server that sends no pacing reads as none");
    assert.equal(needsLaunchChoice(resumed.run, resumed.pacing), false);
    const resumedEligible = openSession(payload(old, PACING, old[2].tick), doc);
    assert.equal(needsLaunchChoice(resumedEligible.run, PACING), false, "eligible, but it has commands");
    assert.equal(resumedEligible.run.pace, 1, "no pace was logged: 1x");
  });

  test("the card offers Full case and the scenario's focused start, defaulting to full case and study pace", () => {
    const v = launchView(doc, PACING, { pace: 3, start: "full" });
    assert.deepEqual(v.starts.map((x) => x.id), ["full", "focused"]);
    assert.equal(v.starts[1].label, "Start near the deterioration");
    assert.deepEqual(v.defaults, { pace: 3, start: "full" });
  });

  test("Full case logs only the pace; the focused start logs begin first and the engine evolves to it", () => {
    assert.deepEqual(launchCommands(doc, PACING, { pace: 3, start: "full" }), [{ type: "pace", pace: 3 }]);
    assert.deepEqual(launchCommands(doc, PACING, { pace: 1, start: "focused" }), [{ type: "begin", start: "focused" }, { type: "pace", pace: 1 }]);
    assert.deepEqual(launchCommands(doc, NO_PACING, { pace: 3, start: "focused" }), [], "nothing is logged where pacing is not offered");
    const s = openSession(payload([], PACING), doc);
    for (const c of launchCommands(doc, PACING, { pace: 3, start: "focused" })) assert.ok(issue(s, c).ok);
    assert.equal(s.run.state.tick, 780);
    const plain = createRun(doc, 1);
    to(plain, 780);
    assert.equal(stateHash(s.run.state), stateHash(plain.state), "the state is the engine's, not hand-written");
    assert.deepEqual(s.pending.map((c) => [c.seq, c.tick, c.type]), [[1, 0, "begin"], [2, 780, "pace"]]);
  });
});

describe("skip offer", async () => {
  const doc = await compile("CCRNADULT", "tamponade-after-cabg");
  const quiet = (): ReturnType<typeof openSession> => {
    const s = openSession(payload([], PACING), doc);
    issue(s, { type: "pace", pace: 3 });
    to(s.run, 130);
    assert.ok(issue(s, { type: "act", action: "echo" }).ok); // a real wait: the echo result
    return s;
  };

  test("not before 30 real seconds of quiet, then offered with a spoken label that says how much it skips", () => {
    const s = quiet();
    assert.equal(calmOffer(s.run, PACING, CALM_IDLE_MS - 1), null);
    const o = calmOffer(s.run, PACING, CALM_IDLE_MS)!;
    assert.equal(o.label, "Skip to the next change");
    assert.match(o.a11y, /^Skip to the next change: the echo result/);
    assert.match(o.a11y, /Skips about 10 minutes of simulated time/);
    assert.match(o.a11y, /stops early if an alarm or a result comes in/);
  });

  test("nothing to offer at the start: only the routine q15 check is pending", () => {
    const s = openSession(payload([], PACING), doc);
    to(s.run, 100);
    assert.equal(calmOffer(s.run, PACING, 60_000), null);
  });

  test("never where pacing is not offered", () => {
    const s = quiet();
    assert.equal(calmOffer(s.run, NO_PACING, 60_000), null);
  });

  test("idle time resets on any change and does not count while paused", () => {
    const s = quiet();
    let t = trackIdle(null, s.run, 0, true);
    t = trackIdle(t.state, s.run, 31_000, true);
    assert.equal(t.idleMs, 31_000);
    issue(s, { type: "act", action: "ausc" });
    t = trackIdle(t.state, s.run, 32_000, true);
    assert.equal(t.idleMs, 0, "a new log line is a change");
    t = trackIdle(t.state, s.run, 70_000, false);
    assert.equal(t.idleMs, 0, "paused time does not count");
  });

  test("it is the existing skip: stopped early by an alarm, logged and counted", () => {
    const s = quiet();
    const o = calmOffer(s.run, PACING, CALM_IDLE_MS)!;
    const r = issue(s, { type: "skip", timer: o.wait.timer, instance: o.wait.instance, to: o.wait.due, calm: true });
    assert.ok(r.ok);
    assert.equal(s.run.skips[0].calm, true);
    assert.ok(s.run.log.some((l) => l.kind === "skip" && /skip offer/.test(l.text)));
  });

  test("spoken spans are rounded the way a person says them", () => {
    assert.equal(spanWords(45), "45 seconds");
    assert.equal(spanWords(120), "about 2 minutes");
    assert.equal(spanWords(600), "about 10 minutes");
  });
});

describe("chapter prompt", async () => {
  const doc = await compile("CCRNADULT", "tamponade-after-cabg");
  const cmds = golden("CCRNADULT", "tamponade-after-cabg").paths.find((p) => p.id === "expert3x")!.commands;

  test("the break is offered when its boundary is reached, with Continue and Save and finish later", () => {
    const before = cmds.filter((c) => c.tick < 1380);
    const s = openSession(payload(before, PACING, before[before.length - 1].tick), doc);
    assert.equal(chapterOffer(s.run, PACING), null);
    to(s.run, 1380);
    const o = chapterOffer(s.run, PACING)!;
    assert.equal(o.title, "Surgeon at the bedside");
    assert.equal(o.continueLabel, "Continue");
    assert.equal(o.laterLabel, "Save and finish later");
    assert.match(o.a11y, /The clock is paused/);
    assert.equal(chapterOffer(s.run, NO_PACING), null, "not offered where pacing is not");
  });

  test("Save and finish later is logged, queued for the server and not asked again", () => {
    const before = cmds.filter((c) => c.tick < 1380);
    const s = openSession(payload(before, PACING, before[before.length - 1].tick), doc);
    to(s.run, 1380);
    const o = chapterOffer(s.run, PACING)!;
    assert.ok(issue(s, chapterCommand(o, "later")).ok);
    assert.equal(s.pending[s.pending.length - 1].type, "chapter");
    assert.equal(chapterOffer(s.run, PACING), null);
    accepted(s, s.run.lastSeq);
    assert.equal(s.pending.length, 0);
  });

  test("resume on another device: the server's log gives the same place and does not re-ask", () => {
    const before = cmds.filter((c) => c.tick < 1380);
    const a = openSession(payload(before, PACING, before[before.length - 1].tick), doc);
    to(a.run, 1380);
    const o = chapterOffer(a.run, PACING)!;
    issue(a, chapterCommand(o, "later"));
    const serverLog = [...before, ...a.pending];
    const b = openSession(payload(serverLog, PACING, 1380), doc);
    assert.equal(b.run.state.tick, 1380);
    assert.equal(stateHash(b.run.state), stateHash(a.run.state));
    assert.equal(chapterOffer(b.run, PACING), null);
    assert.equal(b.run.pace, 3, "the pace comes back from the log");
  });
});

describe("teaching prompts", async () => {
  const doc = await compile("CCRNADULT", "tamponade-after-cabg");

  test("offered while the named wait runs, answered by choice, with sourced feedback and no score", () => {
    const s = openSession(payload([], PACING), doc);
    to(s.run, 130);
    assert.equal(teachOffer(s.run, PACING), null);
    issue(s, { type: "act", action: "fluid", params: { ml: "250" } });
    const o = teachOffer(s.run, PACING)!;
    assert.match(o.ask, /CVP/);
    const fb = teachFeedback(doc, o.id, "fall")!;
    assert.equal(fb.matched, false);
    assert.match(fb.headline, /Not scored/);
    assert.match(fb.source.cite, /Circulation 2008/);
    assert.equal(teachFeedback(doc, o.id, "rise")!.matched, true);
    assert.ok(issue(s, { type: "teach", prompt: o.id, choice: "rise" }).ok);
    assert.equal(teachOffer(s.run, PACING), null);
    assert.equal(teachOffer(createRun(doc, 1), NO_PACING), null);
  });
});

describe("runs from before REQ-209 and scenarios that do not offer pacing are unchanged", async () => {
  const doc = await compile("CCRNADULT", "tamponade-after-cabg");

  test("a pre-REQ-209 log replays to the same state in the app, at 1x", () => {
    const p = golden("CCRNADULT", "tamponade-after-cabg").paths[0];
    const s = openSession(payload(p.commands, undefined, 9780), doc);
    assert.equal(stateHash(s.run.state), "dcef2c0d5a82811f");
    assert.equal(s.run.pace, 1);
    assert.equal(minWallSeconds(s.run), s.run.realtimeTicks * s.run.c.dt);
  });

  test("a cloud scenario: ten idle minutes change nothing and no pacing feature appears", async () => {
    const cloud = await compile("AWSSAA", "ticketburst-launch-day");
    const s = openSession(payload([], undefined), cloud);
    const hash = stateHash(s.run.state);
    for (let i = 0; i < 600; i++) {
      assert.equal(clockRuns(s), false);
      assert.equal(step(s), false);
    }
    assert.equal(stateHash(s.run.state), hash);
    assert.equal(s.run.state.tick, 0);
    assert.equal(needsLaunchChoice(s.run, s.pacing), false);
    assert.equal(calmOffer(s.run, s.pacing, 600_000), null);
    assert.equal(chapterOffer(s.run, s.pacing), null);
    assert.equal(teachOffer(s.run, s.pacing), null);
    assert.equal(applyCommand(s.run, { seq: 1, tick: 0, type: "begin", start: "focused" }).ok, false);
  });
});
