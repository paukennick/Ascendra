// REQ-190: the app's pure sim modules (src/sim/runtime/*) against the seeded
// documents, compiled the way the server compiles them: capabilities, the
// tap-to-the-beat measurement and its command, the frame clock, the
// announcement policy, the view model (vitals, topology, actions, the
// non-tap compression alternative) and the local session.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRun, replay, stateHash } from "./engine/v1/engine.ts";
import { replayGoldenPath } from "./engine/v1/validate.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import { simCaps, SIM_RENDERERS } from "./runtime/caps.ts";
import { cprCommandText, isTapPadParam, measureTaps, tapFeedback, windowAfter } from "./runtime/tapPad.ts";
import { planFrame, MAX_STEPS_PER_FRAME } from "./runtime/clock.ts";
import { announce, newAnnouncer, POLITE_EVERY_MS } from "./runtime/announcer.ts";
import { actionViews, alarmTexts, boardViews, runView, slotChoices, tileViews, vitalsSentence, waitLabel } from "./runtime/view.ts";
import { accepted, issue, openSession, type RunPayload } from "./runtime/session.ts";

const here = dirname(fileURLToPath(import.meta.url));
const seeds = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims");
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));

async function compile(course: string, slug: string): Promise<ScenarioDoc> {
  const { spliceModules } = await import("../../../backend/lib/sim/modules.ts");
  const { applyBand } = await import("../../../backend/lib/sim/overlay.ts");
  const band = join(seeds, course, `${slug}.band.json`);
  let source = existsSync(band) ? null : read(join(seeds, course, `${slug}.sim.json`));
  if (!source) {
    const b = read(band);
    source = applyBand(read(join(seeds, b.base.course, `${b.base.slug}.sim.json`)), b).source;
  }
  return spliceModules(source, (ref: string) => read(join(seeds, "modules", `${ref}.module.json`))).doc as ScenarioDoc;
}
const golden = (course: string, slug: string) => read(join(seeds, course, `${slug}.golden.json`));

describe("capabilities", () => {
  test("the header names the engine, bedside and board at level 3 and the client session at level 1 (REQ-225)", async () => {
    assert.equal(simCaps(), "protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1");
    const { parseCaps, runnable } = await import("../../../backend/lib/sim/server-run.ts");
    const caps = parseCaps(simCaps());
    for (const r of SIM_RENDERERS) assert.equal(runnable({ engine_major: 1, engine_minor: 0, renderer_level: r.level, screen_type: r.type }, caps), true);
    // A session version that needs a later session renderer is not offered.
    assert.equal(runnable({ engine_major: 1, engine_minor: 0, renderer_level: 2, screen_type: "session" }, caps), false);
  });
});

describe("tap-to-the-beat compressions", () => {
  const taps = (bpm: number, n: number, start = 1000) => Array.from({ length: n }, (_, i) => start + Math.round((i * 60_000) / bpm));
  test("measures the rate and the longest pause as integers", () => {
    const t = taps(110, 30);
    const m = measureTaps(t, t[t.length - 1] + 200)!;
    assert.equal(m.rate, 110);
    assert.equal(m.longestPause, 1);
    assert.ok(Number.isInteger(m.rate) && Number.isInteger(m.longestPause));
    const paused = [...taps(110, 10), ...taps(110, 10, 30_000)];
    assert.equal(measureTaps(paused, paused[paused.length - 1])!.longestPause, 24);
    const stopped = taps(110, 10);
    assert.equal(measureTaps(stopped, stopped[9] + 12_000)!.longestPause, 12, "stopping counts as a pause");
    assert.equal(measureTaps([1, 2, 3], 4), null, "too few taps");
    assert.match(tapFeedback(measureTaps(taps(90, 20), taps(90, 20)[19])), /too slow/);
    assert.match(tapFeedback(m), /on target/);
    assert.deepEqual(windowAfter([1, 5, 9], 5), [5, 9]);
  });

  test("the pad's command is the module's pattern, and the engine scores it; the paced form is the non-tap alternative", async () => {
    const doc = await compile("CCRNADULT", "tamponade-after-cabg");
    const path = golden("CCRNADULT", "tamponade-after-cabg").paths.find((p: { id: string }) => p.id === "codeRosc");
    const firstCpr = path.commands.findIndex((c: Command) => c.type === "act" && c.action === "code_compress");
    const r = replay(doc, path.seed, path.commands.slice(0, firstCpr));
    const run = r.run;
    // Reach the arrest the way the golden path did.
    const target = path.commands[firstCpr].tick;
    const { advance } = await import("./engine/v1/engine.ts");
    while (run.state.tick < target && advance(run)) {
      /* real time to the code */
    }
    const acts = actionViews(run);
    const pad = acts.find((a) => a.kind === "tapPad");
    assert.ok(pad, "the code phase offers the tap pad");
    assert.ok(pad!.params.some((p) => isTapPadParam(p as never)));
    const paced = acts.find((a) => a.id === "code_compressPaced");
    assert.ok(paced && paced.kind === "params" && paced.available, "the non-tap alternative is always there");
    const t = taps(112, 20);
    const m = measureTaps(t, t[19] + 300)!;
    const s = { runId: "r", leaseEpoch: 1, doc, run, pending: [] as Command[], graded: [] };
    const res = issue(s, { type: "act", action: pad!.id, params: { [pad!.params[0].id]: cprCommandText(m) } });
    assert.equal(res.ok, true);
    assert.equal(run.state.vars.code_rate, 112);
    assert.equal(run.state.vars.code_cprMode, "tap");
  });
});

describe("the frame clock (5.4)", () => {
  test("one tick per second, at most 3 per frame, re-anchors when behind, stalls after 3 s", () => {
    const a = { tick: 10, atMs: 0 };
    assert.deepEqual(planFrame(a, 10, 999, 900), { steps: 0, stall: false, reanchor: null });
    assert.deepEqual(planFrame(a, 10, 1000, 900), { steps: 1, stall: false, reanchor: null });
    const behind = planFrame(a, 10, 2900, 2800);
    assert.equal(behind.steps, 2);
    const far = planFrame(a, 10, 2900 + 7000, 2900 + 6900);
    assert.equal(far.steps, MAX_STEPS_PER_FRAME);
    assert.deepEqual(far.reanchor, { tick: 13, atMs: 9900 });
    assert.equal(planFrame(a, 10, 10_000, 6_000).stall, true, "a 4 s gap pauses instead of catching up");
  });
});

describe("announcements (13.2)", () => {
  test("alarms are immediate; polite news is rate-limited and quiet while typing", () => {
    let s = newAnnouncer();
    let r = announce(s, { alarms: ["Mean arterial pressure low"], log: [{ kind: "good", text: "Surgeon on the way." }], nowMs: 0, typing: false });
    assert.deepEqual(r.out.map((o) => o.assertive), [true, false]);
    s = r.state;
    r = announce(s, { alarms: ["Mean arterial pressure low"], log: [{ kind: "good", text: "Surgeon on the way." }, { kind: "find", text: "Echo shows effusion." }], nowMs: 5_000, typing: false });
    assert.equal(r.out.length, 0, "within 10 s and no alarm change");
    s = r.state;
    r = announce(s, { alarms: [], log: [{ kind: "good", text: "x" }, { kind: "find", text: "Echo shows effusion." }], nowMs: POLITE_EVERY_MS + 1, typing: true });
    assert.deepEqual(r.out, [{ text: "Alarm cleared: Mean arterial pressure low.", assertive: true }]);
    r = announce(r.state, { alarms: [], log: [{ kind: "good", text: "x" }, { kind: "find", text: "Echo shows effusion." }], nowMs: POLITE_EVERY_MS + 2, typing: false });
    assert.deepEqual(r.out, [{ text: "Echo shows effusion.", assertive: false }]);
  });
});

describe("the view model", () => {
  test("bedside: every tile has a spoken label with words for units; PAOP stays hidden until wedged", async () => {
    const doc = await compile("CCRNADULT", "tamponade-after-cabg");
    const run = createRun(doc, 1);
    const tiles = tileViews(run);
    assert.equal(tiles.length, doc.screen.bedside!.tiles.length);
    const hr = tiles.find((t) => t.id === "hr")!;
    assert.match(hr.a11y, /^Heart rate, \d+ per minute/);
    const abp = tiles.find((t) => t.id === "abp")!;
    assert.match(abp.text, /^\d+\/\d+$/);
    assert.match(abp.a11y, /\d+ over \d+ millimeters of mercury/);
    const paop = tiles.find((t) => t.id === "paop")!;
    assert.equal(paop.text, "--");
    assert.match(paop.a11y, /not measured yet/);
    assert.ok(vitalsSentence(tiles).split(". ").length >= tiles.length);
    const v = runView(run);
    assert.equal(v.mode, "running");
    assert.ok(v.waits.length > 0);
    assert.match(waitLabel(run, v.waits[0]).a11y, /Skips about \d+ min of sim time/);
    assert.ok(v.groups.length >= 3, "Assess, Orders, Drips, Call");
  });

  test("bedside: an untreated tamponade's alarms show as words, not color", async () => {
    const doc = await compile("CCRNADULT", "tamponade-after-cabg");
    const run = createRun(doc, 1);
    const { advance, applyCommand } = await import("./engine/v1/engine.ts");
    for (let i = 0; i < 2400; i++) {
      // The reasoning moment stops the clock; skip it and carry on untreated.
      if (run.state.openReasoning) applyCommand(run, { seq: run.lastSeq + 1, tick: run.state.tick, type: "reason", moment: run.state.openReasoning, answered: false });
      if (!advance(run)) break;
    }
    const alarms = alarmTexts(tileViews(run));
    assert.ok(alarms.some((a) => / low$/.test(a)), JSON.stringify(alarms));
  });

  test("board: the topology follows the design, zone by zone, with meters", async () => {
    const doc = await compile("AWSSAA", "ticketburst-launch-day");
    const empty = boardViews(createRun(doc, 1));
    assert.ok(empty.zones.length >= 8 && empty.zones.every((z) => z.items.length === 0));
    assert.match(empty.zones[0].a11y, /empty$/);
    const ref = golden("AWSSAA", "ticketburst-launch-day").paths.find((p: { id: string }) => p.id === "reference");
    const startAt = ref.commands.findIndex((c: Command) => c.type === "act" && c.action === "start");
    const run = replay(doc, ref.seed, ref.commands.slice(0, startAt)).run;
    const b = boardViews(run);
    const all = b.zones.flatMap((z) => z.items);
    assert.ok(all.length >= 6, JSON.stringify(b.zones));
    assert.ok(b.zones.find((z) => z.id === "edge")!.items.includes("CloudFront"));
    assert.match(b.meters.find((m) => m.id === "cost")!.text, /^\$/);
    const place = actionViews(run).find((a) => a.id === "place")!;
    const choices = slotChoices(run, place.params[0] as never);
    assert.ok(choices.find((c) => c.id === "alb")!.slots.every((s) => s.startsWith("pub-")));
  });

  test("board: the SAP band adds the second Region and the organization", async () => {
    const doc = await compile("AWSSAP", "ticketburst-launch-day-sap");
    const ids = boardViews(createRun(doc, 1)).zones.map((z) => z.id);
    assert.ok(ids.includes("region2") && ids.includes("org"));
  });
});

describe("the local session", () => {
  test("rebuilds the server's state from the payload, stamps and queues commands, drops accepted ones", async () => {
    const doc = await compile("AWSSAA", "ticketburst-launch-day");
    const path = golden("AWSSAA", "ticketburst-launch-day").paths.find((p: { id: string }) => p.id === "reference");
    const expected = replayGoldenPath(doc, structuredClone(path), (r) => stateHash(r.state));
    const payload: RunPayload = {
      run: { id: "r1", simId: "s1", versionId: "v1", version: 1, status: "open", seed: path.seed, leaseEpoch: 2, lastSeq: path.commands.length, lastTick: expected.finalTick, engineVersion: "1.0" },
      clientHash: "h",
      commands: path.commands,
      graded: [],
    };
    const s = openSession(payload, doc);
    assert.equal(stateHash(s.run.state), expected.stateHash);

    const fresh = openSession({ ...payload, run: { ...payload.run, lastSeq: 0, lastTick: 0 }, commands: [] }, doc);
    const ok = issue(fresh, { type: "act", action: "toggleBackup" });
    assert.equal(ok.ok, true);
    assert.deepEqual(fresh.pending.map((c) => [c.seq, c.tick]), [[1, 0]]);
    const bad = issue(fresh, { type: "act", action: "noSuchAction" });
    assert.equal(bad.ok, false);
    assert.equal(fresh.pending.length, 1, "an illegal command is never queued");
    issue(fresh, { type: "act", action: "toggleBackup" });
    accepted(fresh, 1);
    assert.deepEqual(fresh.pending.map((c) => c.seq), [2]);
  });
});
