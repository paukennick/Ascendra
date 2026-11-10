// REQ-190: the server's replay of a run (lib/sim/server-run.ts), without a
// database. Every golden path of every seeded document, replayed the way
// the sync route replays it, must reach the engine's own final state; so
// must a replay resumed from a checkpoint the server took mid-run.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { clientDocument } from "./content-hash.ts";
import { createRun, replayGoldenPath, stateHash, waits } from "./engine/v1/index.ts";
import type { Command, GoldenFile, ScenarioDoc } from "./engine/v1/index.ts";
import {
  ReplayBudgetError,
  SIM_LIMITS,
  isRevealed,
  parseCaps,
  parseCommand,
  parseCommands,
  pausedSeconds,
  renderersOn,
  replayRun,
  runnable,
  sameCommand,
  serveUnreviewed,
  simsEnabled,
  situationSummary,
  verdictFor,
  withinSpeedBound,
} from "./server-run.ts";

const docs = ALL_DOCUMENTS.map((e) => ({ e, doc: loadDocument(e), golden: JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile }));
const tamponade = docs.find((d) => d.e.slug === "tamponade-after-cabg")!;
const ticketburst = docs.find((d) => d.e.slug === "ticketburst-launch-day")!;

describe("switches", () => {
  test("SIMS_ENABLED is off unless set", () => {
    assert.equal(simsEnabled({}), false);
    for (const v of ["0", "false", "off", "no", " "]) assert.equal(simsEnabled({ SIMS_ENABLED: v }), false, v);
    assert.equal(simsEnabled({ SIMS_ENABLED: "on" }), true);
  });
  test("renderers default to bedside and board; the env narrows them", () => {
    assert.deepEqual(renderersOn({}), ["bedside", "board"]);
    assert.deepEqual(renderersOn({ SIMS_RENDERERS: "bedside" }), ["bedside"]);
  });
  test("unreviewed content is served unless switched off", () => {
    assert.equal(serveUnreviewed({}), true);
    assert.equal(serveUnreviewed({ SIMS_SERVE_UNREVIEWED: "off" }), false);
  });
});

describe("capabilities (5.10)", () => {
  test("parses the header and decides runnable by engine minor and renderer level", () => {
    const caps = parseCaps("protocol=1;engine=1.0;renderers=bedside@3,board@3");
    assert.ok(caps);
    const need = { engine_major: 1, engine_minor: 0, renderer_level: 3, screen_type: "bedside" };
    assert.equal(runnable(need, caps), true);
    assert.equal(runnable({ ...need, engine_minor: 1 }, caps), false, "newer minor");
    assert.equal(runnable({ ...need, renderer_level: 4 }, caps), false, "newer renderer level");
    assert.equal(runnable({ ...need, screen_type: "terminal" }, caps), false, "renderer not in the app");
    assert.equal(runnable({ ...need, engine_major: 2 }, caps), false, "other major");
  });
  test("a missing or malformed header runs nothing", () => {
    assert.equal(parseCaps(null), null);
    assert.equal(parseCaps("engine=1.0"), null, "no protocol");
    assert.equal(runnable({ engine_major: 1, engine_minor: 0, renderer_level: 1, screen_type: "bedside" }, null), false);
  });
});

describe("commands from the app", () => {
  test("accepts every command type the engine reads", () => {
    const cmds: Command[] = [
      { seq: 1, tick: 0, type: "act", action: "fluid", params: { ml: "250" } },
      { seq: 2, tick: 0, type: "act", action: "code_cpr", params: { cpr: "cpr 110 4" } },
      { seq: 3, tick: 5, type: "skip", timer: "callback", instance: 2, to: 125 },
      { seq: 4, tick: 9, type: "choose", prompt: "p2first", choice: "fluid" },
      { seq: 5, tick: 9, type: "pause", reason: "background" },
      { seq: 6, tick: 9, type: "resume" },
      { seq: 7, tick: 9, type: "reason", moment: "whatIsHappening", answered: true },
      { seq: 8, tick: 9, type: "end", reason: "learner_quit" },
    ];
    assert.deepEqual(parseCommands(cmds), cmds);
  });
  test("rejects malformed commands with a reason", () => {
    const bad: unknown[] = [
      null,
      { seq: 0, tick: 0, type: "resume" },
      { seq: 1, tick: -1, type: "resume" },
      { seq: 1, tick: 0.5, type: "resume" },
      { seq: 1, tick: 0, type: "act", action: "Bad-Id" },
      { seq: 1, tick: 0, type: "act", action: "x", params: { a: "line\nbreak" } },
      { seq: 1, tick: 0, type: "act", action: "x", params: { a: 1.5 } },
      { seq: 1, tick: 0, type: "act", action: "x", params: { a: "y".repeat(201) } },
      { seq: 1, tick: 0, type: "pause", reason: "bored" },
      { seq: 1, tick: 0, type: "end", reason: "won" },
      { seq: 1, tick: 0, type: "teleport" },
    ];
    for (const b of bad) assert.equal(typeof parseCommand(b), "string", JSON.stringify(b));
  });
  test("a batch needs consecutive seqs and a size limit", () => {
    assert.equal(typeof parseCommands([{ seq: 1, tick: 0, type: "resume" }, { seq: 3, tick: 0, type: "resume" }]), "string");
    const many = Array.from({ length: SIM_LIMITS.commandsPerRequest + 1 }, (_, i) => ({ seq: i + 1, tick: 0, type: "resume" }));
    assert.equal(typeof parseCommands(many), "string");
    assert.equal(typeof parseCommands("x"), "string");
    assert.deepEqual(parseCommands(undefined), []);
  });
  test("a resent command is the same command whatever its key order", () => {
    const a: Command = { seq: 1, tick: 3, type: "act", action: "fluid", params: { ml: "250" } };
    const b = JSON.parse('{"params":{"ml":"250"},"action":"fluid","type":"act","tick":3,"seq":1}') as Command;
    assert.equal(sameCommand(a, b), true);
    assert.equal(sameCommand(a, { ...a, params: { ml: "500" } }), false);
  });
});

describe("server replay against the golden paths", () => {
  for (const { e, doc, golden } of docs) {
    for (const path of golden.paths) {
      test(`${e.slug} / ${path.id}: same final state as the engine, straight and from a checkpoint`, () => {
        const expected = replayGoldenPath(doc, structuredClone(path), (r) => stateHash(r.state));
        assert.match(expected.stateHash, /^[0-9a-f]{16}$/);
        assert.equal(expected.error, null);
        const straight = replayRun({ doc, seed: path.seed, from: null, commands: path.commands, toTick: expected.finalTick, budget: 1e12 });
        assert.equal(straight.rejected, null);
        assert.equal(straight.run.state.tick, expected.finalTick);
        assert.equal(stateHash(straight.run.state), expected.stateHash);

        // The sync route's shape: the first half of the commands, a
        // checkpoint, then the rest replayed from it.
        const half = Math.floor(path.commands.length / 2);
        const first = replayRun({ doc, seed: path.seed, from: null, commands: path.commands.slice(0, half), every: 60, budget: 1e12 });
        assert.equal(first.rejected, null);
        if (first.checkpoint) {
          const cp = JSON.parse(JSON.stringify(first.checkpoint)); // as stored in jsonb
          const rest = path.commands.filter((c) => c.seq > cp.lastSeq);
          const resumed = replayRun({ doc, seed: path.seed, from: cp, commands: rest, toTick: expected.finalTick, budget: 1e12 });
          assert.equal(resumed.rejected, null);
          assert.equal(stateHash(resumed.run.state), expected.stateHash, "checkpoint equivalence");
        }

        // The app runs the client document: it must reach the same state.
        const client = replayRun({ doc: clientDocument(doc) as unknown as ScenarioDoc, seed: path.seed, from: null, commands: path.commands, toTick: expected.finalTick, budget: 1e12 });
        assert.equal(stateHash(client.run.state), expected.stateHash, "client document");
      });
    }
  }
});

describe("replay rules", () => {
  test("a checkpoint is never taken inside a skip and is Pre(k) at a command boundary", () => {
    for (const { doc, golden } of docs) {
      for (const path of golden.paths) {
        const r = replayRun({ doc, seed: path.seed, from: null, commands: path.commands, every: 1, budget: 1e12 });
        if (!r.checkpoint) continue;
        const cp = r.checkpoint;
        assert.ok(!cp.skips.some((s) => cp.tick > s.from && cp.tick < s.to));
        assert.ok(path.commands.some((c) => c.seq === cp.lastSeq + 1 && c.tick === cp.tick), "the next command is stamped at the checkpoint tick");
      }
    }
  });
  test("an illegal command is rejected with its seq, and later ones are not applied", () => {
    const { doc } = tamponade;
    const cmds: Command[] = [
      { seq: 1, tick: 10, type: "act", action: "look" },
      { seq: 2, tick: 12, type: "act", action: "noSuchAction" },
      { seq: 3, tick: 14, type: "act", action: "look" },
    ];
    const r = replayRun({ doc, seed: 1, from: null, commands: cmds });
    assert.equal(r.acceptedThrough, 1);
    assert.equal(r.rejected?.seq, 2);
  });
  test("time cannot go backwards, and a skip must name the server's due tick", () => {
    const { doc } = tamponade;
    const r = replayRun({ doc, seed: 1, from: null, commands: [{ seq: 1, tick: 10, type: "act", action: "look" }, { seq: 2, tick: 5, type: "act", action: "look" }] });
    assert.equal(r.rejected?.seq, 2);
    const run = createRun(doc, 1);
    const w = waits(run)[0];
    assert.ok(w, "tamponade has a pending wait at the start (the q15 check)");
    const bad = replayRun({ doc, seed: 1, from: null, commands: [{ seq: 1, tick: 0, type: "skip", timer: w.timer, instance: w.instance, to: w.due + 1 }] });
    assert.equal(bad.rejected?.seq, 1);
    const good = replayRun({ doc, seed: 1, from: null, commands: [{ seq: 1, tick: 0, type: "skip", timer: w.timer, instance: w.instance, to: w.due }] });
    assert.equal(good.rejected, null);
    assert.ok(good.stoppedAt !== null && good.stoppedAt <= w.due);
  });
  test("a heartbeat cannot move a stopped phase's clock", () => {
    const r = replayRun({ doc: ticketburst.doc, seed: 1, from: null, commands: [], toTick: 30 });
    assert.match(r.unreachable ?? "", /does not run in real time/);
    assert.equal(r.run.state.tick, 0);
  });
  test("the per-request evaluation budget stops a replay", () => {
    assert.throws(() => replayRun({ doc: tamponade.doc, seed: 1, from: null, commands: [], toTick: 3000, budget: 10_000 }), ReplayBudgetError);
  });
  test("speed bound: real-time ticks may not outrun the wall clock beyond 5 s and 1%", () => {
    assert.equal(withinSpeedBound(100, 1, 100), true);
    assert.equal(withinSpeedBound(106, 1, 100), true);
    assert.equal(withinSpeedBound(107, 1, 100), false);
    assert.equal(withinSpeedBound(1800, 1, 2), false, "a 30-minute case in 2 seconds");
  });
});

describe("results and grading context", () => {
  test("revealed once the learner acts; the rating is the verdict", () => {
    const run = createRun(tamponade.doc, 1);
    assert.equal(isRevealed(run), false);
    const r = replayRun({ doc: tamponade.doc, seed: 1, from: null, commands: [{ seq: 1, tick: 0, type: "act", action: "look" }] });
    assert.equal(isRevealed(r.run), true);
    assert.equal(verdictFor("good"), "correct");
    assert.equal(verdictFor("mediocre"), "partial");
    assert.equal(verdictFor("bad"), "incorrect");
  });
  test("paused time is counted from pause to resume as the server received them", () => {
    const t0 = new Date("2026-11-09T10:00:00Z").getTime();
    const at = (s: number) => new Date(t0 + s * 1000).toISOString();
    assert.equal(pausedSeconds([{ type: "pause", received_at: at(0) }, { type: "resume", received_at: at(30) }, { type: "act", received_at: at(31) }, { type: "pause", received_at: at(40) }, { type: "resume", received_at: at(50) }]), 40);
    assert.equal(pausedSeconds([{ type: "pause", received_at: at(0) }]), 0, "an unmatched pause counts nothing");
  });
  test("the situation summary is built by the engine from what the learner could see", () => {
    const r = replayRun({ doc: tamponade.doc, seed: 1, from: null, commands: [{ seq: 1, tick: 30, type: "act", action: "look" }] });
    const s = situationSummary(r.run);
    assert.match(s, /Sim time: /);
    assert.match(s, /Monitor: HR \d/);
    assert.match(s, /ABP \d+\/\d+ mmHg/);
    assert.match(s, /Actions taken:/);
    const board = situationSummary(createRun(ticketburst.doc, 1));
    assert.doesNotMatch(board, /Monitor:/);
  });
});

describe("the board's topology bindings (REQ-190)", () => {
  test("the TicketBurst board declares its zones, and a bad binding is a validation error", async () => {
    const { validateScenario } = await import("./engine/v1/index.ts");
    const doc = structuredClone(ticketburst.doc);
    assert.ok(doc.screen.board && doc.screen.board.zones.length >= 8);
    assert.deepEqual(validateScenario(doc), []);
    doc.screen.board!.zones[0].items[0].when = "noSuchState";
    doc.screen.board!.zones[1].items[0].label = "{alsoMissing}";
    doc.screen.board!.zones.push({ ...doc.screen.board!.zones[2] });
    const problems = validateScenario(doc).join("\n");
    assert.match(problems, /screen\.board\.zones\[0\]\.items\[0\]\.when/);
    assert.match(problems, /screen\.board\.zones\[1\]\.items\[0\]\.label/);
    assert.match(problems, /duplicate zone id/);
  });
});
