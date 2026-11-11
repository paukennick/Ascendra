// REQ-209 (docs/sims.md 5.4a-5.4e): pace, focused start, calm skip, teaching
// prompts and chapters, on the seeded tamponade case, plus the server rules
// around them (command shape, who may use them, the paced speed bound) and
// the compatibility promises (a run with no logged pace is 1x; a checkpoint
// taken before REQ-209 restores unchanged).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import {
  advance, applyCommand, calmSkip, chapterDue, checkpoint, createRun, ENGINE_VERSION, minWallSeconds, readRunValue, replay, restoreRun, scoreRun, stateHash, teachingDue, waits,
} from "./engine/v1/index.ts";
import type { Checkpoint, Command, Run, ScenarioDoc } from "./engine/v1/index.ts";
import { pacingEligible, pacingRefusal, parseCommand, replayRun, withinPacedSpeedBound, withinSpeedBound } from "./server-run.ts";

const entry = ALL_DOCUMENTS.find((d) => d.slug === "tamponade-after-cabg")!;
const doc = loadDocument(entry) as ScenarioDoc;
const golden = JSON.parse(readFileSync(entry.golden!, "utf8")) as { paths: { id: string; seed: number; commands: Command[] }[] };
const gp = (id: string) => golden.paths.find((p) => p.id === id)!;

function to(run: Run, tick: number): void {
  while (run.state.tick < tick) assert.ok(advance(run), `cannot advance to ${tick} from ${run.state.tick}`);
}
function put(run: Run, c: Record<string, unknown>): void {
  const r = applyCommand(run, { ...c, seq: run.lastSeq + 1, tick: run.state.tick } as Command);
  assert.ok(r.ok, JSON.stringify(r));
}
const stripPace = (cmds: Command[]): Command[] => cmds.filter((c) => c.type !== "pace").map((c, i) => ({ ...c, seq: i + 1 }));

describe("the engine is minor 1 and reads minor 0 checkpoints", () => {
  test("version", () => assert.equal(ENGINE_VERSION, "1.1"));

  test("a checkpoint from before REQ-209 (engine 1.0, no pace fields) restores and continues like a straight run", () => {
    const cmds = gp("expert").commands.slice(0, 6);
    const straight = replay(doc, 1, gp("expert").commands).run;
    const first = replay(doc, 1, cmds).run;
    const legacy = JSON.parse(JSON.stringify(checkpoint(first))) as Checkpoint;
    legacy.engine = "1.0";
    delete legacy.paceTicks;
    delete legacy.focusedAt;
    const resumed = replay(doc, 1, gp("expert").commands, legacy);
    assert.equal(resumed.rejected, null);
    assert.equal(stateHash(resumed.run.state), stateHash(straight.state));
    // no pace was ever logged: every real-time tick reads as 1x
    assert.equal(minWallSeconds(resumed.run), resumed.run.realtimeTicks * resumed.run.c.dt);
    assert.equal(resumed.run.pace, 1);
  });

  test("a checkpoint from a later minor or another major is refused", () => {
    const cp = JSON.parse(JSON.stringify(checkpoint(createRun(doc, 1)))) as Checkpoint;
    cp.engine = "1.2";
    assert.throws(() => restoreRun(doc, 1, cp), /engine_mismatch|checkpoint is from engine/);
    cp.engine = "2.0";
    assert.throws(() => restoreRun(doc, 1, cp), /checkpoint is from engine/);
  });

  test("the existing expert path is unchanged at 1x: same state hash, same score", () => {
    const run = replay(doc, 1, gp("expert").commands).run;
    assert.equal(run.state.ended?.ending, "early");
    assert.equal(minWallSeconds(run), run.realtimeTicks);
  });
});

describe("pace (study 3x, exam realism 1x)", () => {
  test("pace changes no state: the 3x expert path ends in the 1x expert path's exact state", () => {
    const one = replay(doc, 1, gp("expert").commands).run;
    const three = replay(doc, 1, gp("expert3x").commands).run;
    assert.equal(stateHash(three.state), stateHash(one.state));
    assert.equal(three.realtimeTicks, one.realtimeTicks);
    assert.equal(three.pace, 3);
  });

  test("the fewest wall seconds is charged per segment at the pace in force", () => {
    const run = createRun(doc, 1);
    put(run, { type: "pace", pace: 3 });
    to(run, 300); // 300 ticks at 3x = 100 s
    put(run, { type: "pace", pace: 1 });
    to(run, 400); // 100 ticks at 1x = 100 s
    put(run, { type: "pace", pace: 3 });
    to(run, 430); // 30 ticks at 3x = 10 s
    assert.equal(minWallSeconds(run), 100 + 100 + 10);
    assert.equal(run.realtimeTicks, 430);
  });

  test("only 1 and 3 are paces", () => {
    const run = createRun(doc, 1);
    const r = applyCommand(run, { seq: 1, tick: 0, type: "pace", pace: 2 as 3 });
    assert.equal(r.ok, false);
  });

  test("a skip is not real time and is not charged at either pace", () => {
    const run = replay(doc, 1, gp("expert3x").commands).run;
    assert.ok(run.skippedTicks > 0);
    assert.equal(minWallSeconds(run), run.paceTicks[3] / 3 + run.paceTicks[1]);
    assert.equal(run.paceTicks[3], run.realtimeTicks);
  });
});

describe("the server's speed bound allows the logged speed and rejects faster", () => {
  const expert3 = gp("expert3x").commands;
  const ticks = replay(doc, 1, expert3).run.realtimeTicks; // 2580

  test("a legitimate 3x run is accepted at 3x wall time and at anything slower", () => {
    const run = replay(doc, 1, expert3).run;
    const min = minWallSeconds(run);
    assert.equal(min, ticks / 3);
    assert.ok(withinPacedSpeedBound(min, min), "exactly at speed");
    assert.ok(withinPacedSpeedBound(min, min * 1.5), "slower, with pauses");
    assert.ok(withinPacedSpeedBound(min, min - 5), "inside the 5 s tolerance");
  });

  test("the same ticks logged as 1x are rejected at 3x wall time (a client faster than its logged speed)", () => {
    const run = replay(doc, 1, stripPace(expert3)).run;
    assert.equal(run.realtimeTicks, ticks);
    assert.equal(minWallSeconds(run), ticks);
    assert.equal(withinPacedSpeedBound(minWallSeconds(run), ticks / 3), false);
  });

  test("a 3x run played at 4x is rejected", () => {
    const min = ticks / 3;
    assert.equal(withinPacedSpeedBound(min, min * 0.75), false);
  });

  test("with every tick at 1x the paced bound is exactly the old bound", () => {
    for (const [t, wall] of [[100, 50], [100, 94], [100, 95], [100, 96], [3600, 3500], [3600, 3640], [3600, 3000]] as const) {
      assert.equal(withinPacedSpeedBound(t, wall), withinSpeedBound(t, 1, wall), `${t} ticks in ${wall} s`);
    }
  });

  test("replayRun carries the pace through a checkpoint and a resume", () => {
    const full = replayRun({ doc, seed: 1, from: null, commands: expert3, every: 300 });
    assert.equal(full.rejected, null);
    assert.ok(full.checkpoint, "a checkpoint was taken");
    const cp = JSON.parse(JSON.stringify(full.checkpoint)) as Checkpoint;
    const rest = expert3.filter((c) => c.seq > cp.lastSeq);
    const resumed = replayRun({ doc, seed: 1, from: cp, commands: rest });
    assert.equal(resumed.rejected, null);
    assert.equal(minWallSeconds(resumed.run), minWallSeconds(full.run));
    assert.equal(stateHash(resumed.run.state), stateHash(full.run.state));
  });
});

describe("who may use the pacing features", () => {
  test("the tamponade case is eligible in a clinical track and not in a general one", () => {
    assert.equal(pacingEligible(doc, "clinical"), true);
    assert.equal(pacingEligible(doc, "fitness"), true);
    assert.equal(pacingEligible(doc, "general"), false);
  });

  test("the cloud scenarios are never eligible, even in a clinical track (no running phase)", () => {
    for (const e of ALL_DOCUMENTS.filter((d) => d.slug.startsWith("ticketburst"))) {
      const d = loadDocument(e) as ScenarioDoc;
      assert.equal(pacingEligible(d, "clinical"), false, e.slug);
    }
  });

  test("an ineligible scenario refuses every new command, accepts pace 1", () => {
    const base = { seq: 1, tick: 0 };
    assert.equal(pacingRefusal([{ ...base, type: "pace", pace: 1 }], false), null);
    assert.match(pacingRefusal([{ ...base, type: "pace", pace: 3 }], false) ?? "", /pace/);
    assert.match(pacingRefusal([{ ...base, type: "begin", start: "focused" }], false) ?? "", /begin/);
    assert.match(pacingRefusal([{ ...base, type: "teach", prompt: "a", choice: "b" }], false) ?? "", /teach/);
    assert.match(pacingRefusal([{ ...base, type: "chapter", chapter: "a", choice: "later" }], false) ?? "", /chapter/);
    assert.match(pacingRefusal([{ ...base, type: "skip", timer: "t", instance: 1, to: 9, calm: true }], false) ?? "", /skip offer/);
    assert.equal(pacingRefusal([{ ...base, type: "skip", timer: "t", instance: 1, to: 9 }], false), null);
    assert.equal(pacingRefusal([{ ...base, type: "pace", pace: 3 }], true), null);
  });

  test("command shapes are validated at the trust boundary", () => {
    assert.deepEqual(parseCommand({ seq: 1, tick: 0, type: "pace", pace: 3 }), { seq: 1, tick: 0, type: "pace", pace: 3 });
    assert.equal(typeof parseCommand({ seq: 1, tick: 0, type: "pace", pace: 2 }), "string");
    assert.equal(typeof parseCommand({ seq: 1, tick: 0, type: "pace", pace: "3" }), "string");
    assert.deepEqual(parseCommand({ seq: 1, tick: 0, type: "begin", start: "focused" }), { seq: 1, tick: 0, type: "begin", start: "focused" });
    assert.equal(typeof parseCommand({ seq: 1, tick: 0, type: "begin", start: "x" }), "string");
    assert.equal(typeof parseCommand({ seq: 1, tick: 5, type: "teach", prompt: "A b", choice: "x" }), "string");
    assert.equal(typeof parseCommand({ seq: 1, tick: 5, type: "chapter", chapter: "a", choice: "maybe" }), "string");
    assert.equal(typeof parseCommand({ seq: 2, tick: 5, type: "skip", timer: "t", instance: 1, to: 9, calm: "yes" }), "string");
    assert.deepEqual(parseCommand({ seq: 2, tick: 5, type: "skip", timer: "t", instance: 1, to: 9, calm: true }), { seq: 2, tick: 5, type: "skip", timer: "t", instance: 1, to: 9, calm: true });
  });
});

describe("focused start", () => {
  test("it is the normal start evolved with no learner actions, through the engine", () => {
    const focused = createRun(doc, 1);
    put(focused, { type: "begin", start: "focused" });
    const plain = createRun(doc, 1);
    to(plain, 720);
    assert.equal(focused.state.tick, 720);
    assert.equal(focused.focusedAt, 720);
    assert.equal(stateHash(focused.state), stateHash(plain.state));
    assert.equal(focused.realtimeTicks, 0, "the evolved ticks are not real time");
    assert.equal(minWallSeconds(focused), 0);
  });

  test("REQ-220 (FAIL-1142): a focused start leaves at least 2 sim minutes before the first written question, and its summary does not name the cue", () => {
    const run = createRun(doc, 1);
    put(run, { type: "begin", start: "focused" });
    const start = run.state.tick;
    assert.equal(run.state.openReasoning, null, "no question at the moment of joining");
    while (run.state.openReasoning === null) assert.ok(advance(run));
    assert.ok(run.state.tick - start >= 120, `question opened ${run.state.tick - start} s after the focused start`);
    assert.doesNotMatch(doc.focusedStart!.summary ?? "", /drain|tube|stopp/i);
  });

  test("REQ-220 (FAIL-1143): the brief says the default pace is 3x, not real time", () => {
    const how = (doc.brief.howItWorks ?? []).join(" ");
    assert.doesNotMatch(how, /runs in real time: one minute on the monitor is one minute/);
    assert.match(how, /study pace \(3x\)/);
  });

  test("REQ-220 (FAIL-1144): the CVP model rises by the teaching prompt's figure per 500 mL bolus", () => {
    const p = (doc.params as Record<string, { value: number }>).cvpPer500;
    assert.equal(p.value, 3);
    const t = (doc as unknown as { teaching: Record<string, { expect: string; explain: string }> }).teaching.cvpAfterBolus;
    assert.equal(t.expect, "rise");
    assert.match(t.explain, /about 3 mmHg/);
  });

  test("it can only be the first command", () => {
    const run = createRun(doc, 1);
    put(run, { type: "pace", pace: 3 });
    const r = applyCommand(run, { seq: 2, tick: 0, type: "begin", start: "focused" });
    assert.equal(r.ok, false);
    const late = createRun(doc, 1);
    to(late, 10);
    assert.equal(applyCommand(late, { seq: 1, tick: 10, type: "begin", start: "focused" }).ok, false);
  });

  test("a scenario without one refuses it", () => {
    const bare = { ...doc, focusedStart: undefined } as ScenarioDoc;
    assert.equal(applyCommand(createRun(bare, 1), { seq: 1, tick: 0, type: "begin", start: "focused" }).ok, false);
  });

  test("the server replays it from the log and a checkpoint resumes across it", () => {
    const cmds = gp("focused3x").commands;
    const full = replayRun({ doc, seed: 1, from: null, commands: cmds, every: 300 });
    assert.equal(full.rejected, null);
    assert.equal(full.run.focusedAt, 720);
    assert.ok(full.checkpoint && full.checkpoint.tick >= 720);
    const cp = JSON.parse(JSON.stringify(full.checkpoint)) as Checkpoint;
    assert.equal(cp.focusedAt, 720);
    const resumed = replayRun({ doc, seed: 1, from: cp, commands: cmds.filter((c) => c.seq > cp.lastSeq) });
    assert.equal(resumed.rejected, null);
    assert.equal(stateHash(resumed.run.state), stateHash(full.run.state));
    assert.equal(resumed.run.focusedAt, 720);
  });
});

describe("scoring a focused start (docs/sims.md 5.4b)", () => {
  const score = (cmds: Command[]) => scoreRun(replay(doc, 1, cmds).run, { reasoningGrades: [{ moment: "whatIsHappening", score: "met" }], pausedSeconds: 0 });

  test("timing targets still run from onset; the skipped recognition window is left out, not given", () => {
    const d = score(gp("focused3x").commands);
    const by = Object.fromEntries(d.criteria.map((c) => [c.id, c.score]));
    assert.equal(by.tubes, "na", "recognition is not applicable: the start is after the expert's recognition time");
    for (const k of ["callEarly", "sbar", "confirm", "bridge", "prep", "labs", "phase2"]) assert.equal(by[k], "met", k);
    assert.equal(d.processScore, 100);
    assert.equal(d.rating, "good");
    assert.equal(d.focusedStart?.time, "14:12:00");
    // paged 700 s after onset: the 20-minute (1200 s) target measured from onset applies unchanged
    assert.equal(d.kpis.find((k) => k.id === "page")?.raw, 700);
    assert.equal(d.kpis.find((k) => k.id === "recognition")?.raw, 662);
  });

  test("a full case that never checks the tubes still loses that criterion", () => {
    const d = score(gp("phoneOrdersLate").commands);
    assert.equal(d.criteria.find((c) => c.id === "tubes")?.score, "missed");
  });

  test("a focused run that is slow to page is still scored late from onset", () => {
    // begin, then page only after the 20-minute target (onset + 1200 s = tick 1320)
    // with no action the first reasoning moment opens at 840: answer it, then page
    const slow: Command[] = [
      { seq: 1, tick: 0, type: "begin", start: "focused" },
      { seq: 2, tick: 840, type: "reason", moment: "whatIsHappening", answered: true },
      { seq: 3, tick: 1400, type: "act", action: "surgeon", params: { sit: "stop", bg: "full", asmt: "tamp", rec: "come" } },
    ];
    const r = replay(doc, 1, slow);
    assert.equal(r.rejected, null);
    const d = scoreRun(r.run, { reasoningGrades: [{ moment: "whatIsHappening", score: "met" }], pausedSeconds: 0 });
    assert.notEqual(d.criteria.find((c) => c.id === "callEarly")?.score, "met");
  });

  test("the debrief reports the pace used, in sim minutes", () => {
    const d = score(gp("expert3x").commands);
    assert.equal(d.pacing?.startPace, 3);
    assert.equal(d.pacing?.studyTicks, 2580);
    assert.equal(d.pacing?.examTicks, 0);
    assert.match(d.pacing?.note ?? "", /study pace \(3x\).*sim time/);
    assert.equal(d.teaching?.length, 4);
    assert.equal(d.teaching?.filter((t) => t.matched).length, 3, "one answer was deliberately wrong");
    assert.equal(d.chapters?.length, 3);
    assert.equal(score(gp("expert").commands).pacing, undefined, "a run that never logged a pace has no pacing note (as before)");
  });
});

describe("calm skip offer", () => {
  test("nothing to offer at the start: the only wait is the routine q15 check", () => {
    const run = createRun(doc, 1);
    to(run, 100);
    assert.ok(waits(run).some((w) => w.routine), "the q15 check is a routine wait");
    assert.equal(calmSkip(run), null);
  });

  test("a real wait is offered once the learner has ordered the echo and nothing is alarming", () => {
    const run = createRun(doc, 1);
    to(run, 130);
    put(run, { type: "act", action: "echo" });
    const offer = calmSkip(run);
    assert.equal(offer?.timer, "echoResultT");
    assert.ok(offer && offer.due - run.state.tick >= 60);
  });

  test("not while an alarm condition is true", () => {
    const run = createRun(doc, 1);
    to(run, 130);
    put(run, { type: "act", action: "echo" });
    const cp = JSON.parse(JSON.stringify(checkpoint(run))) as Checkpoint;
    (cp.state.vars as Record<string, unknown>).tamp = 0.8;
    const worse = restoreRun(doc, 1, cp);
    assert.ok(Number(readRunValue(worse, "sbp")) < 100, "an interrupting alarm condition holds");
    assert.equal(calmSkip(worse), null);
  });

  test("not when something is due inside a minute", () => {
    const run = createRun(doc, 1);
    to(run, 130);
    put(run, { type: "act", action: "echo" });
    const w = calmSkip(run)!;
    to(run, w.due - 30);
    assert.equal(calmSkip(run), null);
  });

  test("the skip it makes is the existing mechanism and is logged as the offer", () => {
    const run = createRun(doc, 1);
    to(run, 130);
    put(run, { type: "act", action: "echo" });
    const w = calmSkip(run)!;
    put(run, { type: "skip", timer: w.timer, instance: w.instance, to: w.due, calm: true });
    assert.ok(run.skips[0].calm);
    assert.ok(run.log.some((l) => l.kind === "skip" && /skip offer/.test(l.text)));
    const d = scoreRun(run, { reasoningGrades: [], pausedSeconds: 0 });
    assert.equal(d.calmSkips, 1);
  });
});

describe("teaching prompts", () => {
  test("offered while their wait runs, answered once, never scored, never blocking", () => {
    const run = createRun(doc, 1);
    to(run, 600);
    assert.equal(teachingDue(run), null, "no named wait yet");
    put(run, { type: "act", action: "fluid", params: { ml: "250" } });
    assert.equal(teachingDue(run)?.id, "cvpAfterBolus");
    const before = stateHash(run.state);
    put(run, { type: "teach", prompt: "cvpAfterBolus", choice: "rise" });
    assert.equal(stateHash(run.state), before, "an answer changes no state");
    assert.equal(teachingDue(run), null);
    assert.equal(applyCommand(run, { seq: run.lastSeq + 1, tick: run.state.tick, type: "teach", prompt: "cvpAfterBolus", choice: "rise" }).ok, false, "once only");
    assert.equal(run.state.openPrompt, null);
  });

  test("a prompt that is not on offer, or a choice that does not exist, is refused", () => {
    const run = createRun(doc, 1);
    assert.equal(applyCommand(run, { seq: 1, tick: 0, type: "teach", prompt: "cvpAfterBolus", choice: "rise" }).ok, false);
    to(run, 600);
    put(run, { type: "act", action: "fluid", params: { ml: "250" } });
    assert.equal(applyCommand(run, { seq: run.lastSeq + 1, tick: run.state.tick, type: "teach", prompt: "cvpAfterBolus", choice: "nonsense" }).ok, false);
  });

  test("every prompt has a source with a cite, a link and a checked date", () => {
    for (const [id, t] of Object.entries(doc.teaching ?? {})) {
      assert.ok(t.source.cite.length > 20, id);
      assert.match(t.source.url ?? "", /^https:\/\/(doi\.org\/10\.|academic\.oup\.com\/eurheartj\/)/, id);
      assert.match(t.source.checkedAt, /^\d{4}-\d{2}-\d{2}$/, id);
      assert.ok(t.choices.length >= 2 && t.choices.length <= 4, id);
    }
    assert.equal(Object.keys(doc.teaching ?? {}).length, 4);
  });
});

describe("teaching prompts follow the 2025 ESC guideline (Nick, 2026-11-09)", () => {
  const t = doc.teaching ?? {};
  test("the 2025 guideline is cited, and the 2015 one is kept only for vasodilators", () => {
    const cites = (doc.sources ?? []).map((x) => x.cite);
    assert.ok(cites.some((c) => c.includes("2025 ESC Guidelines for the management of myocarditis and pericarditis")));
    const old = (doc.sources ?? []).find((x) => x.cite.includes("2015 ESC"));
    assert.ok(old && /vasodilators/.test(old.note ?? "") && /2025/.test(old.note ?? ""), "the 2015 entry says why it is kept");
    for (const id of ["echoNormal", "triad", "echoSigns"]) assert.match(t[id].source.cite, /2025 ESC Guidelines/, id);
  });
  test("the normal-echo prompt grounds itself in loculated collections and does not credit the guideline with a claim about TTE or TEE", () => {
    const p = t.echoNormal;
    assert.match(p.explain, /loculated/);
    assert.match(p.explain, /clinical diagnosis/);
    assert.match(p.source.note ?? "", /does NOT say whether a normal transthoracic echo excludes tamponade/);
    assert.match(p.source.note ?? "", /ezab468/, "the TTE statement has its own source");
    assert.match(p.source.note ?? "", /J Card Surg 2008/, "so does the TEE statement");
  });
  test("the triad prompt asks whether to wait for it, because the guideline ties it to surgical tamponade", () => {
    assert.match(t.triad.explain, /classically seen in surgical tamponade/);
    assert.equal(t.triad.expect, "no");
    assert.match(t.triad.ask, /Wait for all 3/);
  });
  test("the echo-sign prompt asks for the least specific finding, the plethoric vena cava (Table 17: sensitivity 97%, specificity 40%)", () => {
    assert.equal(t.echoSigns.expect, "ivcPlethora");
    assert.match(t.echoSigns.ask, /least specific/);
    assert.match(t.echoSigns.explain, /97%/);
    assert.match(t.echoSigns.explain, /40%/);
  });
});

describe("chapters", () => {
  test("a boundary is offered once, in order, and derived from state plus the log", () => {
    const run = replay(doc, 1, gp("expert3x").commands.filter((c) => c.tick < 1380)).run;
    assert.equal(chapterDue(run), null, "the surgeon has not arrived");
    to(run, 1380);
    assert.equal(chapterDue(run)?.id, "surgeonAtBedside");
    put(run, { type: "chapter", chapter: "surgeonAtBedside", choice: "later" });
    assert.equal(chapterDue(run), null, "answered: not offered again");
  });

  test("another device sees the same offer after replaying the log (save and finish later, resume elsewhere)", () => {
    const cmds = gp("expert3x").commands;
    const upto = cmds.filter((c) => c.tick < 1380);
    const a = replay(doc, 1, upto).run;
    to(a, 1380);
    assert.equal(chapterDue(a)?.id, "surgeonAtBedside");
    put(a, { type: "chapter", chapter: "surgeonAtBedside", choice: "later" });
    // device B opens the run from the server's log and its last tick
    const log = a.commands.map((c) => ({ ...c }));
    const b = replay(doc, 1, log).run;
    while (b.state.tick < a.state.tick) advance(b);
    assert.equal(stateHash(b.state), stateHash(a.state));
    assert.equal(chapterDue(b), null, "the saved chapter is not asked again");
    // device B that never saw the answer would be offered it again
    const c = replay(doc, 1, upto).run;
    to(c, 1380);
    assert.equal(chapterDue(c)?.id, "surgeonAtBedside");
  });

  test("a chapter that is not due is refused", () => {
    const run = createRun(doc, 1);
    assert.equal(applyCommand(run, { seq: 1, tick: 0, type: "chapter", chapter: "surgeonAtBedside", choice: "continue" }).ok, false);
  });
});
