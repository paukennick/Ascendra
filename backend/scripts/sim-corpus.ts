// REQ-162 (docs/sims.md 5.3, 16): the v1 semantics corpus. Each case is a
// tiny document, a seed, a command script and HAND-COMPUTED expectations for
// the values the spec pins (state at ticks, log lines, waits, rejections).
// This script writes backend/lib/sim/engine/v1/golden/corpus/<id>.json and
// the manifest with each case's state hash as the engine computes it today.
//
//   npm run sim:corpus            write the corpus and manifest
//   npm run sim:corpus -- --check fail if what is committed differs
//
// The manifest is a DRAFT until Phase 1a step 7 (status "draft"): a hash may
// change while a hand computation or the spec is corrected, each change
// reviewed with its reason in the commit. After the freeze any hash change
// fails CI and means a new engine major (5.8).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Command, ScenarioDoc, Value } from "../lib/sim/engine/v1/types.ts";
import { runCorpusCase, type CorpusCase } from "../lib/sim/engine/v1/golden/corpus.ts";

const GOLDEN_DIR = join(__dirname, "..", "lib", "sim", "engine", "v1", "golden");
const CORPUS_DIR = join(GOLDEN_DIR, "corpus");
const MANIFEST_PATH = join(GOLDEN_DIR, "manifest.json");

const SRC: ScenarioDoc["sources"] = [{ cite: "docs/sims.md 5.3", checkedAt: "2026-11-07" }];
const S = SRC[0];

// A minimal valid document to build cases from.
function base(over: Partial<ScenarioDoc> & { maxDuration?: string; tick?: string }): ScenarioDoc {
  const { maxDuration, tick, ...rest } = over;
  return {
    schemaVersion: 1,
    engine: { major: 1, minor: 0 },
    slug: "corpus",
    title: "Corpus case",
    screen: { type: "bedside", bedside: { tiles: [] } },
    objective: "corpus",
    sources: SRC,
    brief: { situation: "A corpus case: a toy document that pins one rule of the tick contract." },
    safetyNote: "Fictional, for engine tests only; nothing here is clinical guidance.",
    clock: { start: "14:00", tick: tick ?? "1s", maxDuration: maxDuration ?? "20s" },
    params: {},
    state: {},
    derived: {},
    processes: [],
    phases: { main: { label: "Main", actions: [], clock: "running" } },
    initialPhase: "main",
    actions: {},
    timers: {},
    triggers: [],
    reasoning: { why: { question: "Why?", parts: [{ label: "p", criteria: "States the reason clearly.", modelAnswer: "Because the rule says so." }], pausesClock: true } },
    outcome: { profile: "clinical", thresholds: {}, noProgress: { when: "false", class: "recovered", rationale: "A corpus case has no clinical goal; nothing is classified by progress.", source: S } },
    endings: { time_up: { label: "Time up", class: "recovered", narrative: "Time is up.", terminal: true } },
    scoring: {
      criteria: [{ id: "any", label: "Did anything", weight: 1, critical: true, rows: [{ when: "true", score: "met", why: "ok" }] }],
      reasoningCriteria: [],
      kpis: [],
      expertPath: [],
      debrief: {},
      modelReasoning: "n/a",
    },
    ...rest,
  };
}

const num = (init: number, min: number, max: number) => ({ type: "number" as const, init, min, max });
const act = (seq: number, tick: number, action: string, params?: Record<string, string | number>): Command => ({ seq, tick, type: "act", action, ...(params ? { params } : {}) });
const skip = (seq: number, tick: number, timer: string, instance: number, to: number): Command => ({ seq, tick, type: "skip", timer, instance, to });

const cases: CorpusCase[] = [];

// 1. The worked example of 5.3, row by row.
cases.push({
  id: "worked-example",
  spec: "5.3 worked example: Pre/Post, process then command then settle, timer fires at its due tick, clamp at the write, edge trigger fires once on the rise",
  doc: base({
    params: { rate: { value: 1, unit: "/s", source: S } },
    state: { x: num(0, 0, 4) },
    processes: [{ id: "grow", update: { x: "x + rate*dt" } }],
    phases: { main: { label: "Main", actions: ["boost"], clock: "running" } },
    actions: { boost: { label: "boost", group: "g", effects: [{ add: "x", by: "2" }, { schedule: "ding", after: "2s" }] } },
    timers: { ding: { label: "ding", wait: { skipLabel: "the ding" }, instances: "one", source: S, effects: [{ log: "ding" }] } },
    triggers: [{ id: "hi", when: "x >= 3", mode: "edge", effects: [{ log: "hi" }] }],
    maxDuration: "6s",
  }),
  seed: 1,
  script: [{ advance: 1 }, { command: act(1, 1, "boost") }, { advance: 1 }, { advance: 1 }, { advance: 3 }],
  expect: {
    ticks: [
      { tick: 0, values: { x: 0 }, timers: [], log: [] },
      { tick: 1, afterSeq: 1, values: { x: 3 }, timers: [["ding", 1, 3]], log: ["1:boost", "1:hi"] },
      { tick: 2, values: { x: 4 }, timers: [["ding", 1, 3]], log: ["1:boost", "1:hi"] },
      { tick: 3, values: { x: 4 }, timers: [], log: ["1:boost", "1:hi", "3:ding"] },
    ],
    final: { tick: 6, ended: "time_up" },
  },
});

// 2. Process order and simultaneous writes inside one process.
cases.push({
  id: "process-order",
  spec: "5.3 Advance step 2: processes run in document order (b sees a's write); inside one process every right-hand side reads the same state (a swap swaps)",
  doc: base({
    state: { a: num(1, -100, 100), b: num(10, -100, 100), p: num(1, -100, 100), q: num(2, -100, 100) },
    processes: [
      { id: "first", update: { a: "a + 1" } },
      { id: "second", update: { b: "a * 10" } },
      { id: "swap", update: { p: "q", q: "p" } },
    ],
    maxDuration: "3s",
  }),
  seed: 1,
  script: [{ advance: 1 }, { advance: 1 }],
  expect: {
    ticks: [
      { tick: 0, values: { a: 1, b: 10, p: 1, q: 2 } },
      { tick: 1, values: { a: 2, b: 20, p: 2, q: 1 } },
      { tick: 2, values: { a: 3, b: 30, p: 1, q: 2 } },
    ],
  },
});

// 3. Clamping at the write, saturation, -0, division by zero, ln/sqrt/exp rules.
cases.push({
  id: "clamp-and-totality",
  spec: "4.3, 5.3 Values: every write clamps to min/max; -0 is stored as 0; x/0 = 0; ln and sqrt of non-positive = 0; exp clamps its argument; results saturate at 1e300",
  doc: base({
    state: { x: num(0, 0, 4), neg: num(0, -5, 5), z: num(0, -1e308, 1e308), l: num(1, -10, 10), big: num(0, -1e308, 1e308) },
    phases: { main: { label: "Main", actions: ["go"], clock: "running" } },
    actions: {
      go: {
        label: "go",
        group: "g",
        effects: [
          { add: "x", by: "10" },
          { set: "neg", to: "-1 * 0" },
          { set: "z", to: "5 / 0" },
          { set: "l", to: "ln(0) + sqrt(-4) + exp(800) / exp(800)" },
          { set: "big", to: "exp(700) * exp(700) * exp(700)" },
        ],
      },
    },
  }),
  seed: 1,
  script: [{ command: act(1, 0, "go") }],
  expect: { ticks: [{ tick: 0, afterSeq: 1, values: { x: 4, neg: 0, z: 0, l: 1, big: 1e300 } }] },
});

// 4. Timer instances: one replaces, many coexist, firing order by (due, id).
cases.push({
  id: "timer-instances",
  spec: "5.3 Timers: instances get run-unique ids; `one` replaces a pending instance, `many` coexist; instances due the same tick fire in id order; a timer's effects read timer.id",
  doc: base({
    state: { fired: { type: "records", fields: { id: { type: "number" }, who: { type: "string", max: 10 } }, max: 20, init: [] } },
    phases: { main: { label: "Main", actions: ["a", "b"], clock: "running" } },
    actions: {
      a: { label: "a", group: "g", effects: [{ schedule: "single", after: "3s" }, { schedule: "single", after: "2s" }] },
      b: { label: "b", group: "g", effects: [{ schedule: "multi", after: "2s" }, { schedule: "multi", after: "2s" }, { schedule: "multi", after: "1s" }] },
    },
    timers: {
      single: { label: "single", instances: "one", source: S, effects: [{ push: "fired", value: { id: "timer.id", who: "'s'" } }] },
      multi: { label: "multi", instances: "many", source: S, effects: [{ push: "fired", value: { id: "timer.id", who: "'m'" } }] },
    },
    maxDuration: "5s",
  }),
  seed: 1,
  script: [{ command: act(1, 0, "a") }, { command: act(2, 0, "b") }, { advance: 1 }, { advance: 1 }],
  expect: {
    ticks: [
      // a: instance 1 due 3 replaced by instance 2 due 2; b: 3 due 2, 4 due 2, 5 due 1
      { tick: 0, afterSeq: 2, timers: [["multi", 5, 1], ["single", 2, 2], ["multi", 3, 2], ["multi", 4, 2]], values: { fired: [] } },
      { tick: 1, values: { fired: [{ _id: 1, id: 5, who: "m" }] } },
      { tick: 2, values: { fired: [{ _id: 1, id: 5, who: "m" }, { _id: 2, id: 2, who: "s" }, { _id: 3, id: 3, who: "m" }, { _id: 4, id: 4, who: "m" }] } },
    ],
  },
});

// 5. Triggers: once vs edge; a later trigger sees an earlier one's writes.
cases.push({
  id: "triggers",
  spec: "5.3 Settle step 1: once fires the first time true; edge fires on each false->true; triggers run in document order and later ones see earlier writes",
  doc: base({
    state: { x: num(0, 0, 10), onceN: num(0, 0, 10), edgeN: num(0, 0, 10), saw: num(0, 0, 10) },
    processes: [{ id: "wave", update: { x: "tick == 1 or tick == 3 or tick == 5 ? 5 : 0" } }],
    triggers: [
      { id: "o", when: "x >= 5", mode: "once", effects: [{ add: "onceN", by: "1" }, { set: "saw", to: "1" }] },
      { id: "e", when: "x >= 5", mode: "edge", effects: [{ add: "edgeN", by: "1" }] },
      { id: "later", when: "saw == 1", mode: "once", effects: [{ add: "saw", by: "1" }] },
    ],
    maxDuration: "6s",
  }),
  seed: 1,
  script: [{ advance: 6 }],
  expect: {
    ticks: [
      { tick: 1, values: { onceN: 1, edgeN: 1, saw: 2 } },
      { tick: 2, values: { onceN: 1, edgeN: 1 } },
      { tick: 3, values: { onceN: 1, edgeN: 2 } },
      { tick: 5, values: { onceN: 1, edgeN: 3 } },
    ],
  },
});

// 6. Endings in document order; a non-terminal ending fires once and changes phase.
cases.push({
  id: "endings-order",
  spec: "5.3 Settle step 2: endings with a `when` are evaluated in document order and the first true one is reached; a non-terminal ending fires once and moves to its phase; a terminal one ends the run",
  doc: base({
    state: { x: num(0, 0, 10) },
    processes: [{ id: "grow", update: { x: "x + 1" } }],
    phases: { main: { label: "Main", actions: [], clock: "running" }, second: { label: "Second", actions: [], clock: "running" } },
    endings: {
      branch: { label: "Branch", when: "x >= 2", narrative: "To the second phase.", terminal: false, phase: "second" },
      done: { label: "Done", class: "target", when: "x >= 4", narrative: "Done.", terminal: true },
      never: { label: "Never", class: "harm", when: "x >= 4", narrative: "Shadowed by done.", terminal: true },
      time_up: { label: "Time up", class: "recovered", narrative: "Time is up.", terminal: true },
    },
  }),
  seed: 1,
  script: [{ advance: 10 }],
  expect: {
    ticks: [
      { tick: 1, phase: "main" },
      { tick: 2, phase: "second", log: ["2:To the second phase.", "2:Second"] },
      { tick: 3, phase: "second" },
    ],
    final: { tick: 4, ended: "done", class: "target" },
  },
});

// 7. Blocked clock: a prompt stops advance; the answer is a command at the same tick.
cases.push({
  id: "blocked-clock",
  spec: "5.3 Blocked clock: while a prompt is open no advance happens; the learner's choice is a command at the same tick and the clock resumes; an act while blocked is rejected",
  doc: base({
    state: { x: num(0, 0, 10), chosen: { type: "enum", values: ["none", "a", "b"], init: "none" } },
    processes: [{ id: "grow", update: { x: "x + 1" } }],
    phases: { main: { label: "Main", actions: ["poke"], clock: "running" } },
    actions: { poke: { label: "poke", group: "g", effects: [{ log: "poke" }] } },
    triggers: [{ id: "ask", when: "x >= 2", mode: "once", effects: [{ prompt: "q" }] }],
    prompts: { q: { title: "Q", context: "Pick.", choices: [{ id: "a", label: "A", effects: [{ set: "chosen", to: "'a'" }] }, { id: "b", label: "B", effects: [{ set: "chosen", to: "'b'" }] }] } },
    maxDuration: "6s",
  }),
  seed: 1,
  script: [
    { advance: 2 },
    { advanceExpect: false },
    { commandRejected: act(1, 2, "poke") },
    { command: { seq: 1, tick: 2, type: "choose", prompt: "q", choice: "b" } },
    { advance: 1 },
  ],
  expect: {
    ticks: [
      { tick: 2, values: { x: 2, chosen: "none" }, openPrompt: "q" },
      { tick: 3, values: { x: 3, chosen: "b" }, openPrompt: null },
    ],
  },
});

// 8. Skips stop at each kind of interrupt.
cases.push({
  id: "skip-interrupts",
  spec: "5.3 Skip: stepping stops early at an interruptsSkip trigger, an interruptsSkip timer, a prompt opening, a reasoning moment opening, or an ending; otherwise it reaches the target; the next command is stamped at the stop tick",
  doc: base({
    state: { x: num(0, 0, 100) },
    processes: [{ id: "grow", update: { x: "x + 1" } }],
    phases: { main: { label: "Main", actions: ["wait", "quiet"], clock: "running" } },
    actions: {
      wait: { label: "wait", group: "g", effects: [{ schedule: "far", after: "20s" }] },
      quiet: { label: "quiet", group: "g", effects: [{ schedule: "result", after: "4s" }] },
    },
    timers: {
      far: { label: "far", wait: { skipLabel: "far" }, instances: "one", source: S, effects: [{ log: "far" }] },
      result: { label: "result", instances: "one", interruptsSkip: true, source: S, effects: [{ log: "result back" }] },
    },
    triggers: [{ id: "alarm", when: "x >= 8", mode: "once", interruptsSkip: true, effects: [{ log: "Alarm: x high", kind: "alarm" }] }],
    maxDuration: "40s",
  }),
  seed: 1,
  script: [
    { command: act(1, 0, "wait") },
    { command: act(2, 0, "quiet") },
    { command: skip(3, 0, "far", 1, 20), expectStop: 4 },
    { command: skip(4, 4, "far", 1, 20), expectStop: 8 },
    { command: skip(5, 8, "far", 1, 20), expectStop: 20 },
  ],
  expect: {
    ticks: [{ tick: 20, values: { x: 20 } }],
    final: { tick: 20 },
    skips: [
      { from: 0, to: 4, stoppedBy: "result" },
      { from: 4, to: 8, stoppedBy: "alarm" },
      { from: 8, to: 20, stoppedBy: null },
    ],
  },
});

// 9. History: tick-0 sample, past/delta/trend with short buffers.
cases.push({
  id: "history",
  spec: "4.1, 4.3 history: a sample at tick 0 then every `every`; past() returns the oldest sample when the buffer is too short; delta and trend are 0 with one sample; the buffer keeps keep/every + 1 samples",
  doc: base({
    state: { x: num(0, 0, 1000) },
    history: { h: { of: "x", every: "2s", keep: "6s" } },
    derived: { p4: { expr: "past(h, 4)" }, d4: { expr: "delta(h, 4)" }, tr: { expr: "trend(h, 4, 3)" }, pOld: { expr: "past(h, 100)" } },
    processes: [{ id: "grow", update: { x: "x + 10" } }],
    maxDuration: "12s",
  }),
  seed: 1,
  script: [{ advance: 1 }, { advance: 1 }, { advance: 2 }, { advance: 4 }, { advance: 4 }],
  expect: {
    ticks: [
      // tick 0: buffer [0]; one sample: past = 0, delta 0, trend 0
      { tick: 0, values: { p4: 0, d4: 0, tr: 0, pOld: 0 }, history: { h: [0] } },
      // tick 1: x=10, no sample (1 % 2 != 0): newest sample still 0 -> delta 0
      { tick: 1, values: { x: 10, p4: 0, d4: 0, tr: 0 }, history: { h: [0] } },
      // tick 2: x=20, sample -> [0, 20]; past(4): target t-4=-2 -> oldest = 0; delta 20; trend +1
      { tick: 2, values: { x: 20, p4: 0, d4: 20, tr: 1, pOld: 0 }, history: { h: [0, 20] } },
      // tick 4: [0,20,40]; past(4): target 0 -> sample at t=0 -> 0; delta 40
      { tick: 4, values: { x: 40, p4: 0, d4: 40 }, history: { h: [0, 20, 40] } },
      // tick 8: keep 6s/2s + 1 = 4 samples: [20,40,60,80]; past(4): target 4 -> 40; delta 40; pOld -> oldest 20
      { tick: 8, values: { x: 80, p4: 40, d4: 40, pOld: 20 }, history: { h: [20, 40, 60, 80] } },
      { tick: 12, values: { x: 120, p4: 80, d4: 40, pOld: 60 }, history: { h: [60, 80, 100, 120] } },
    ],
  },
});

// 10. schedule after as an expression: seconds -> ticks = max(1, ceil(s/dt)), capped.
cases.push({
  id: "timer-after",
  spec: "5.3 Timers: an Expr `after` is sim seconds, ticks = max(1, ceil(seconds / dt)), capped at maxDuration/tick + 1; a Duration literal is exact ticks; dt is an integer",
  doc: base({
    tick: "10s",
    maxDuration: "100s",
    params: { s: { value: 25, unit: "s", source: S } },
    phases: { main: { label: "Main", actions: ["go"], clock: "running" } },
    actions: {
      go: {
        label: "go",
        group: "g",
        effects: [
          { schedule: "a", after: "s" }, // 25 s -> ceil(2.5) = 3 ticks -> due 3
          { schedule: "b", after: "0 - 5" }, // negative -> 1 tick -> due 1
          { schedule: "c", after: "10000" }, // capped: 1000 ticks -> maxTick+1 = 11 -> due 11
          { schedule: "d", after: "30s" }, // literal: 3 ticks -> due 3
          { schedule: "e", after: "s / 10" }, // 2.5 s -> ceil(0.25) = 1 -> due 1
        ],
      },
    },
    timers: {
      a: { label: "a", instances: "many", source: S, effects: [] },
      b: { label: "b", instances: "many", source: S, effects: [] },
      c: { label: "c", instances: "many", source: S, effects: [] },
      d: { label: "d", instances: "many", source: S, effects: [] },
      e: { label: "e", instances: "many", source: S, effects: [] },
    },
  }),
  seed: 1,
  script: [{ command: act(1, 0, "go") }],
  expect: { ticks: [{ tick: 0, afterSeq: 1, timers: [["b", 2, 1], ["e", 5, 1], ["a", 1, 3], ["d", 4, 3], ["c", 3, 11]] }] },
});

// 11. Timer payloads and cancel ... where.
cases.push({
  id: "timer-with-cancel",
  spec: "4.1, 4.3, 5.3: schedule `with` is evaluated once at scheduling and read as timer.with.<field> when the instance fires; cancel ... where removes only the instances for which the predicate is true, checked in instance-id order",
  doc: base({
    state: { n: num(0, 0, 100), got: { type: "set", of: ["x", "y", "z"], init: [] } },
    phases: { main: { label: "Main", actions: ["go", "cut"], clock: "running" } },
    actions: {
      go: {
        label: "go",
        group: "g",
        effects: [
          { set: "n", to: "7" },
          { schedule: "t", after: "2s", with: { tag: "'x'", k: "n" } },
          { set: "n", to: "9" },
          { schedule: "t", after: "2s", with: { tag: "'y'", k: "n" } },
          { schedule: "t", after: "2s", with: { tag: "'z'", k: "n + 1" } },
        ],
      },
      cut: { label: "cut", group: "g", effects: [{ cancel: "t", where: "timer.with.k == 9" }] },
    },
    timers: {
      t: {
        label: "t {timer.with.tag}",
        instances: "many",
        with: { tag: { type: "enum", values: ["x", "y", "z"] }, k: { type: "number" } },
        source: S,
        effects: [{ push: "got", value: "timer.with.tag" }, { set: "n", to: "timer.with.k" }],
      },
    },
    maxDuration: "5s",
  }),
  seed: 1,
  script: [{ command: act(1, 0, "go") }, { command: act(2, 0, "cut") }, { advance: 2 }],
  expect: {
    ticks: [
      { tick: 0, afterSeq: 2, timers: [["t", 1, 2], ["t", 3, 2]] }, // instance 2 (k = 9) cancelled; instance 3 has k = 10
      { tick: 2, values: { got: ["x", "z"], n: 10 }, timers: [] },
    ],
  },
});

// 12. time_up by tick count, after that tick's settle.
cases.push({
  id: "time-up",
  spec: "5.3 Advance step 6: time_up is reached only when tick = maxDuration/tick and nothing else ended the run; an ending whose when includes t >= limit is evaluated in that settle first",
  doc: base({
    state: { x: num(0, 0, 100) },
    processes: [{ id: "grow", update: { x: "x + 1" } }],
    endings: {
      atLimit: { label: "At the limit", class: "target", when: "t >= 5 and x >= 5", narrative: "Made it to the limit.", terminal: true },
      time_up: { label: "Time up", class: "harm", narrative: "Time is up.", terminal: true },
    },
    maxDuration: "5s",
  }),
  seed: 1,
  script: [{ advance: 5 }],
  expect: { final: { tick: 5, ended: "atLimit", class: "target" } },
});

cases.push({
  id: "time-up-plain",
  spec: "5.3 Advance step 6: with nothing else true, time_up is reached at the last tick with its authored class",
  doc: base({ state: { x: num(0, 0, 100) }, processes: [{ id: "grow", update: { x: "x + 1" } }], maxDuration: "3s" }),
  seed: 1,
  script: [{ advance: 3 }],
  expect: { final: { tick: 3, ended: "time_up", class: "recovered" }, ticks: [{ tick: 3, values: { x: 3 } }] },
});

// 13. pick and chance draw exactly one value each; stream counters are state.
cases.push({
  id: "random-streams",
  spec: "4.3, 5.6: pick/chance draw one mulberry32 value per call from the named stream (seeded by seed and stream name); a call in a branch not taken draws nothing; an empty list still draws",
  doc: base({
    random: { streams: ["a", "b"] },
    state: { p1: num(0, 0, 100), p2: num(0, 0, 100), c: { type: "bool", init: false }, skipped: num(0, 0, 100), bBefore: num(0, 0, 10), bAfter: num(0, 0, 10) },
    phases: { main: { label: "Main", actions: ["go"], clock: "running" } },
    actions: {
      go: {
        label: "go",
        group: "g",
        effects: [
          { set: "p1", to: "pick(a, [3, 5, 6])" },
          { set: "p2", to: "pick(a, [3, 5, 6])" },
          { set: "c", to: "chance(b, 0.5)" },
          { set: "skipped", to: "false ? pick(a, [1]) : 42" },
          { set: "bAfter", to: "pick(b, [])" },
        ],
      },
    },
  }),
  seed: 4127,
  script: [{ command: act(1, 0, "go") }],
  // the expected draws are pinned by the manifest hash and by the property
  // that stream a advanced exactly twice and stream b exactly twice
  expect: { ticks: [{ tick: 0, afterSeq: 1, values: { skipped: 42, bAfter: 0 }, streamsAdvanced: { a: 2, b: 2 } }] },
});

// 14. Command dispatch with typed captures and the unmatched line.
cases.push({
  id: "command-dispatch",
  spec: "4.1 Command dispatch: whitespace split, literals case-insensitive, typed captures bound only inside the matched pattern's cases, cmd.matched is the pattern id or none, unmatched input is a valid command that outputs the authored line",
  doc: base({
    state: { lastHost: { type: "enum", values: ["", "10.0.0.5", "10.0.1.9"], init: "" }, n: num(0, 0, 1000), matched: { type: "enum", values: ["none", "ping", "route"], init: "none" } },
    phases: { main: { label: "Main", actions: ["sh"], clock: "running" } },
    actions: {
      sh: {
        label: "shell",
        group: "g",
        params: [
          {
            id: "cmd",
            kind: "command",
            label: "Command",
            maxLength: 200,
            unmatched: "That command is not available in this lab.",
            patterns: [
              { id: "ping", pattern: "ping {host:ipv4}", cases: [{ when: "host == '10.0.0.5'", then: [{ set: "lastHost", to: "host" }, { output: "Reply from {host}" }] }, { when: "true", then: [{ output: "Request timed out." }] }] },
              { id: "route", pattern: "ip route add {dst:cidr} via {gw:ipv4} metric {m:int}", cases: [{ when: "true", then: [{ set: "n", to: "m" }, { output: "{dst} via {gw}" }] }] },
            ],
          },
        ],
        effects: [{ set: "matched", to: "cmd.matched" }],
      },
    },
  }),
  seed: 1,
  script: [
    { command: act(1, 0, "sh", { cmd: "PING 10.0.0.5" }) },
    { command: act(2, 0, "sh", { cmd: "ping 10.0.1.9" }) },
    { command: act(3, 0, "sh", { cmd: "ip route add 10.1.0.0/16 via 10.0.0.1 metric 20" }) },
    { command: act(4, 0, "sh", { cmd: "show ip route" }) },
    { commandRejected: act(5, 0, "sh", { cmd: "ping 300.1.1.1\u0007" }) },
  ],
  expect: {
    ticks: [{ tick: 0, afterSeq: 4, values: { lastHost: "10.0.0.5", n: 20, matched: "none" }, outputs: ["Reply from 10.0.0.5", "Request timed out.", "10.1.0.0/16 via 10.0.0.1", "That command is not available in this lab."] }],
  },
});

// 15. pow, lists, maps, seq, in, records lookups.
cases.push({
  id: "expressions",
  spec: "4.3: pow by repeated squaring and exp/ln; list index clamps like seq; map index by enum key; `in` over sets and lists; find returns an empty record whose fields read as zero; sortBy/take/groupCount order",
  doc: base({
    params: { peak: { value: { "250": 0.05, "500": 0.1 }, source: S }, curve: { value: [1, 2, 3], source: S } },
    state: {
      a: num(0, -1e9, 1e9),
      b: num(0, -1e9, 1e9),
      c: num(0, -1e9, 1e9),
      d: num(0, -1e9, 1e9),
      e: num(0, -1e9, 1e9),
      f: { type: "bool", init: false },
      g: { type: "bool", init: false },
      reg: { type: "set", of: ["R1", "R2"], init: ["R2"] },
      recs: { type: "records", fields: { v: { type: "number" }, tag: { type: "string", max: 5 } }, max: 10, init: [{ v: 3, tag: "p" }, { v: 1, tag: "q" }, { v: 3, tag: "p" }] },
      top: num(0, -1e9, 1e9),
      emptyV: num(0, -1e9, 1e9),
      grp: num(0, -1e9, 1e9),
    },
    phases: { main: { label: "Main", actions: ["go"], clock: "running" } },
    actions: {
      go: {
        label: "go",
        group: "g",
        params: [{ id: "ml", kind: "choice", label: "ml", options: [{ value: "250", label: "250" }, { value: "500", label: "500" }] }],
        effects: [
          { set: "a", to: "pow(0.6, 3)" },
          { set: "b", to: "pow(2, -2) + pow(0, 0)" },
          { set: "c", to: "seq(curve, 7) + curve[-3] + curve[1]" },
          { set: "d", to: "peak[ml] * 100 + num(ml)" },
          { set: "e", to: "round(pow(9, 0.5) * 1000)" },
          { set: "f", to: "'R2' in reg and not ('R1' in reg) and 2 in [1, 2]" },
          { set: "g", to: "find(recs, v > 100)._id == 0" },
          { set: "emptyV", to: "find(recs, v > 100).v" },
          { set: "top", to: "take(sortBy(recs, v, 'desc'), 1)[0].v * 10 + take(sortBy(recs, v, 'asc'), 1)[0]._id" },
          { set: "grp", to: "groupCount(recs, tag)[0].n" },
        ],
      },
    },
  }),
  seed: 1,
  script: [{ command: act(1, 0, "go", { ml: "500" }) }],
  expect: { ticks: [{ tick: 0, afterSeq: 1, values: { a: 0.216, b: 1.25, c: 3 + 1 + 2, d: 0.1 * 100 + 500, e: 3000, f: true, g: true, emptyV: 0, top: 32, grp: 2 } }] },
});

// 16. Derived values are always current.
cases.push({
  id: "derived-current",
  spec: "5.3 Derived values: reading a derived value returns its expression on the state at that instant, including inside the command that wrote the state",
  doc: base({
    state: { x: num(1, 0, 100), seen: num(0, 0, 100), seen2: num(0, 0, 100) },
    derived: { dbl: { expr: "x * 2" }, quad: { expr: "dbl * 2" } },
    phases: { main: { label: "Main", actions: ["go"], clock: "running" } },
    actions: { go: { label: "go", group: "g", effects: [{ set: "seen", to: "quad" }, { set: "x", to: "5" }, { set: "seen2", to: "quad" }] } },
  }),
  seed: 1,
  script: [{ command: act(1, 0, "go") }],
  expect: { ticks: [{ tick: 0, afterSeq: 1, values: { seen: 4, seen2: 20, quad: 20 } }] },
});

// 17. Records: push ids are monotonic and never reused; update and remove; each/cases/if.
cases.push({
  id: "records",
  spec: "4.1 records: every pushed record gets the next _id for that variable, never reused after a remove; update changes matching records' fields; remove drops matches; each iterates in order; cases takes the first match",
  doc: base({
    state: {
      items: { type: "records", fields: { kind: { type: "enum", values: ["a", "b"] }, n: { type: "number" } }, max: 10, init: [] },
      total: num(0, 0, 1000),
      branch: num(0, 0, 10),
    },
    phases: { main: { label: "Main", actions: ["fill", "edit", "sum"], clock: "running" } },
    actions: {
      fill: { label: "fill", group: "g", effects: [{ push: "items", value: { kind: "'a'", n: "1" } }, { push: "items", value: { kind: "'b'", n: "2" } }, { push: "items", value: { kind: "'a'", n: "3" } }] },
      edit: { label: "edit", group: "g", effects: [{ update: "items", where: "kind == 'a'", set: { n: "n * 10" } }, { remove: "items", where: "_id == 2" }, { push: "items", value: { kind: "'b'", n: "4" } }] },
      sum: {
        label: "sum",
        group: "g",
        effects: [
          { each: "it", in: "items", do: [{ add: "total", by: "it.n" }] },
          { cases: [{ when: "total > 100", then: [{ set: "branch", to: "1" }] }, { when: "total > 10", then: [{ set: "branch", to: "2" }] }, { when: "true", then: [{ set: "branch", to: "3" }] }] },
          { if: "branch == 2", then: [{ add: "branch", by: "5" }], else: [{ set: "branch", to: "0" }] },
        ],
      },
    },
  }),
  seed: 1,
  script: [{ command: act(1, 0, "fill") }, { command: act(2, 0, "edit") }, { command: act(3, 0, "sum") }],
  expect: {
    ticks: [{ tick: 0, afterSeq: 3, values: { items: [{ _id: 1, kind: "a", n: 10 }, { _id: 3, kind: "a", n: 30 }, { _id: 4, kind: "b", n: 4 }], total: 44, branch: 7 } }],
  },
});

// 18. Command validation: wrong phase, unavailable, bad params, seq gap, backwards tick.
cases.push({
  id: "command-validation",
  spec: "5.3 Apply: an invalid command is rejected with its seq and reason and applies nothing: not in the phase, unavailable, a param outside its options, an unknown param, a sequence gap, a tick behind the run, a skip naming the wrong instance or due tick",
  doc: base({
    state: { x: num(0, 0, 100) },
    phases: { main: { label: "Main", actions: ["a", "gated"], clock: "running" }, other: { label: "Other", actions: ["b"], clock: "running" } },
    actions: {
      a: { label: "a", group: "g", params: [{ id: "v", kind: "choice", label: "v", options: [{ value: "1", label: "1" }] }], effects: [{ add: "x", by: "num(v)" }, { schedule: "w", after: "5s" }] },
      b: { label: "b", group: "g", effects: [{ add: "x", by: "100" }] },
      gated: { label: "gated", group: "g", available: "x >= 50", why: "Needs x at 50.", effects: [{ add: "x", by: "100" }] },
    },
    timers: { w: { label: "w", wait: { skipLabel: "w" }, instances: "one", source: S, effects: [] } },
  }),
  seed: 1,
  script: [
    { commandRejected: act(1, 0, "b") },
    { commandRejected: act(1, 0, "gated") },
    { commandRejected: act(1, 0, "a", { v: "2" }) },
    { commandRejected: act(1, 0, "a", { v: "1", extra: "1" }) },
    { commandRejected: act(2, 0, "a", { v: "1" }) },
    { command: act(1, 0, "a", { v: "1" }) },
    { advance: 1 },
    { commandRejected: act(2, 0, "a", { v: "1" }) },
    { commandRejected: skip(2, 1, "w", 2, 5) },
    { commandRejected: skip(2, 1, "w", 1, 4) },
    { command: skip(2, 1, "w", 1, 5) },
  ],
  expect: { ticks: [{ tick: 5, values: { x: 1 } }], final: { tick: 5 } },
});

// 19. Stopped and turns phases: time moves only by advancing to a wait.
cases.push({
  id: "turns-phase",
  spec: "5.4: in a stopped phase nothing ticks; in a turns phase time moves only by a skip to a pending wait and real-time advance is refused",
  doc: base({
    tick: "1h",
    maxDuration: "48h",
    state: { x: num(0, 0, 100), week: num(0, 0, 100) },
    processes: [{ id: "grow", update: { x: "x + 1" } }],
    phases: { build: { label: "Build", actions: ["start"], clock: "stopped" }, run: { label: "Run", actions: [], clock: "turns" } },
    initialPhase: "build",
    actions: { start: { label: "start", group: "g", effects: [{ phase: "run" }, { schedule: "next", after: "24h" }] } },
    timers: { next: { label: "next day", wait: { skipLabel: "tomorrow" }, instances: "one", source: S, effects: [{ add: "week", by: "1" }, { if: "week < 2", then: [{ schedule: "next", after: "24h" }] }] } },
  }),
  seed: 1,
  script: [{ advanceExpect: false }, { command: act(1, 0, "start") }, { advanceExpect: false }, { command: skip(2, 0, "next", 1, 24) }, { command: skip(3, 24, "next", 2, 48) }],
  expect: { ticks: [{ tick: 24, values: { x: 24, week: 1 } }], final: { tick: 48, ended: "time_up" } },
});

// 20. Table application and into.
cases.push({
  id: "tables",
  spec: "4.1 Table: the first row whose when is true wins; its then writes happen together; text is logged; into receives the matched row index (-1 when none)",
  doc: base({
    state: { x: num(7, 0, 100), status: { type: "enum", values: ["none", "low", "mid", "high"], init: "none" }, row: num(0, -1, 10) },
    tables: {
      band: {
        rows: [
          { when: "x >= 10", then: { status: "'high'" }, text: "high at {x}" },
          { when: "x >= 5", then: { status: "'mid'" }, text: "mid at {x}" },
          { when: "x >= 1", then: { status: "'low'" } },
        ],
      },
    },
    phases: { main: { label: "Main", actions: ["apply", "zero"], clock: "running" } },
    actions: {
      apply: { label: "apply", group: "g", effects: [{ table: "band", into: "row" }] },
      zero: { label: "zero", group: "g", effects: [{ set: "x", to: "0" }, { table: "band", into: "row" }] },
    },
  }),
  seed: 1,
  script: [{ command: act(1, 0, "apply") }, { command: act(2, 0, "zero") }],
  expect: { ticks: [{ tick: 0, afterSeq: 2, values: { status: "mid", row: -1 }, log: ["0:apply", "0:mid at 7", "0:zero"] }] },
});

// 21. Reasoning moment opened by a trigger blocks the clock; a skipped answer is still a command.
cases.push({
  id: "reasoning-moment",
  spec: "5.3, 10: a reasoning moment opened by its trigger blocks the clock; `reason { answered }` closes it at the same tick; a moment opens at most once per run",
  doc: base({
    state: { x: num(0, 0, 100) },
    processes: [{ id: "grow", update: { x: "x + 1" } }],
    reasoning: { why: { trigger: "x >= 2", question: "Why?", parts: [{ label: "p", criteria: "States the reason clearly.", modelAnswer: "Because the rule says so." }], pausesClock: true } },
    maxDuration: "6s",
  }),
  seed: 1,
  script: [{ advance: 2 }, { advanceExpect: false }, { command: { seq: 1, tick: 2, type: "reason", moment: "why", answered: false } }, { advance: 3 }],
  expect: { ticks: [{ tick: 2, openReasoning: "why" }, { tick: 5, values: { x: 5 }, openReasoning: null }] },
});

// ---- write / check ----

function sortedKeys<T>(o: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of Object.keys(o).sort()) out[k] = o[k];
  return out;
}

function main(): number {
  const check = process.argv.includes("--check");
  mkdirSync(CORPUS_DIR, { recursive: true });
  const manifest: { engine: string; status: "draft" | "frozen"; note: string; cases: Record<string, { hash: string; finalTick: number }> } = {
    engine: "1.0",
    status: "draft",
    note: "DRAFT until Phase 1a step 7 (docs/sims.md 5.3, 16, 17). A hash change needs a reason in the commit; after the freeze it means a new engine major.",
    cases: {},
  };
  let existingManifest: typeof manifest | null = null;
  if (existsSync(MANIFEST_PATH)) existingManifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as typeof manifest;
  if (existingManifest) manifest.status = existingManifest.status;
  let drift = 0;
  for (const c of cases) {
    const r = runCorpusCase(c);
    if (r.failures.length) {
      console.error(`${c.id}: HAND-COMPUTED EXPECTATION NOT MET\n  ${r.failures.join("\n  ")}`);
      drift++;
    }
    manifest.cases[c.id] = { hash: r.hash, finalTick: r.finalTick };
    const file = join(CORPUS_DIR, `${c.id}.json`);
    const text = `${JSON.stringify(c, null, 2)}\n`;
    if (check) {
      if (!existsSync(file) || readFileSync(file, "utf8") !== text) {
        console.error(`${c.id}: corpus file differs from the generator`);
        drift++;
      }
    } else writeFileSync(file, text);
  }
  manifest.cases = sortedKeys(manifest.cases);
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  if (check) {
    if (!existingManifest || readFileSync(MANIFEST_PATH, "utf8") !== manifestText) {
      console.error("manifest differs: a corpus hash changed. While the corpus is a draft, re-run `npm run sim:corpus` and explain the change in the commit; after the freeze this is a new engine major.");
      if (existingManifest) {
        for (const id of Object.keys(manifest.cases)) {
          const was = existingManifest.cases[id]?.hash;
          if (was !== manifest.cases[id].hash) console.error(`  ${id}: ${was ?? "(new)"} -> ${manifest.cases[id].hash}`);
        }
      }
      drift++;
    }
  } else writeFileSync(MANIFEST_PATH, manifestText);
  console.log(`${cases.length} corpus cases ${check ? "checked" : "written"}; manifest status ${manifest.status}`);
  return drift ? 1 : 0;
}

process.exit(main());

export type { Value };
