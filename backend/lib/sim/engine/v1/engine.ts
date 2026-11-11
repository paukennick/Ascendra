// REQ-162 (docs/sims.md 5.1-5.6): engine major 1. State is a pure function
// of (document, seed, command log). This file implements the tick contract
// of 5.3 exactly: Pre/Post(n), Advance (processes, timers, history, settle,
// time_up), Apply (validate, effects, settle), Skip (advance until the target
// or an interrupt), timer instances, clamping at every write, no rounding of
// state, the blocked clock, and checkpoints as plain data.

import type {
  Action,
  ActionParam,
  Chapter,
  Checkpoint,
  Command,
  CommandParams,
  Duration,
  Effect,
  Ending,
  Id,
  LogEntry,
  OutcomeClass,
  OutputBlock,
  Pace,
  RecordValue,
  ScenarioDoc,
  SimState,
  SkipRecord,
  StateVar,
  TableView,
  TeachingPrompt,
  TimerInstance,
  Value,
  WaitInfo,
} from "./types.ts";
import type { Ast, TemplatePart } from "./parser.ts";
import { parseCached, parseTemplate } from "./parser.ts";
import type { EvalCtx, Frame } from "./eval.ts";
import { asBool, asNum, asStr, EngineError, evaluate, frameWith } from "./eval.ts";
import { hasherNew, hashHex, hashNumber, hashString, hashTag, hashU32, mulberry32Step, sat, streamSeed } from "./math.ts";
import type { ClockBase } from "./format.ts";
import { applyFormat, parseClockStart } from "./format.ts";
import { commandInputOk, matchPattern, parsePattern, splitCommand } from "./text.ts";
import type { PatternToken } from "./text.ts";

export const ENGINE_MAJOR = 1;
// Minor 1 (REQ-209) adds pace/begin/teach/chapter commands, the calm-skip
// offer and the focused-start, chapter and teaching declarations. It adds
// things a minor-0 document cannot use; no stepping output changes, so every
// minor-0 document, golden hash and checkpoint is unchanged.
//
// Minor 2 (REQ-227, FAIL-1222) adds the optional `endingOrder` list: the
// order endings are checked in, which no longer depends on the key order of
// `endings` (a jsonb column, so the server, reorders keys). A document
// without it is stepped exactly as before, in key order, so every minor-0 and
// minor-1 document, golden hash, checkpoint and stored run is unchanged.
export const ENGINE_MINOR = 2;
export const ENGINE_VERSION = `${ENGINE_MAJOR}.${ENGINE_MINOR}`;

// Run-time budgets (4.3). A linted document stays far below them; they
// protect the server against a bad one and end the run with engine_error.
export const TICK_BUDGET = 20000;
export const COMMAND_BUDGET = 200000;
export const EACH_LIMIT = 500;
export const HISTORY_MAX_SAMPLES = 1000;

// Wall-clock pacing (REQ-209, docs/sims.md 5.4a). Study pace is the default
// for a scenario that offers pacing; exam realism is the old 1 tick per second.
export const PACE_STUDY: Pace = 3;
export const PACE_EXAM: Pace = 1;
export const DEFAULT_PACE: Pace = 1; // a run with no logged pace replays at 1x
// The calm-skip offer needs at least this much sim time to skip, and no timer
// of any kind due sooner (docs/sims.md 5.4c).
export const CALM_MIN_SPAN_SECONDS = 60;

// ---- durations ----

const UNIT_SECONDS: Record<string, number> = { s: 1, min: 60, h: 3600, d: 86400 };

// "90s" | "8min" | "2h" | "7d" -> seconds, or null when the text is not a duration literal.
export function parseDuration(d: string): number | null {
  let i = 0;
  while (i < d.length && d[i] >= "0" && d[i] <= "9") i++;
  if (i === 0) return null;
  const unit = d.slice(i);
  const mult = UNIT_SECONDS[unit];
  if (mult === undefined) return null;
  return Number(d.slice(0, i)) * mult;
}

export function isDurationLiteral(s: string): boolean {
  return parseDuration(s) !== null;
}

// ---- compiled document ----

export interface Compiled {
  doc: ScenarioDoc;
  dt: number;
  maxTick: number;
  base: ClockBase;
  params: Record<string, Value>;
  catalogs: Record<string, RecordValue[]>;
  thresholds: Record<string, number>;
  stateIds: string[];
  historyIds: string[];
  historyEvery: Record<string, number>; // ticks
  historyKeep: Record<string, number>; // samples
  derivedIds: string[];
  phaseIds: string[];
  endingIds: string[]; // document order
  timerWait: Record<string, boolean>;
  patterns: Record<string, Record<string, PatternToken[]>>; // action -> pattern id -> tokens
}

function literalValue(v: unknown): Value {
  if (Array.isArray(v)) return v.map((x) => literalValue(x));
  if (v && typeof v === "object") {
    const out: Record<string, Value> = {};
    for (const k of Object.keys(v as object)) out[k] = literalValue((v as Record<string, unknown>)[k]);
    return out;
  }
  return v as Value;
}

// The order endings are checked in (5.3 settle step 2, first true wins).
// A document with `endingOrder` (minor 2) uses it, so the result never
// depends on the key order of `endings`; any ending it fails to list (lint
// refuses that) goes after, sorted by id, which is also key-order free.
// A document without it keeps the key order, exactly as minor 0 and 1 did.
export function endingCheckOrder(doc: ScenarioDoc): string[] {
  if (!Array.isArray(doc.endingOrder)) return Object.keys(doc.endings);
  const listed = doc.endingOrder.filter((id, i, all) => Object.prototype.hasOwnProperty.call(doc.endings, id) && all.indexOf(id) === i);
  const rest = Object.keys(doc.endings)
    .filter((id) => listed.indexOf(id) < 0)
    .sort();
  return [...listed, ...rest];
}

export function compileDoc(doc: ScenarioDoc): Compiled {
  const dt = parseDuration(doc.clock.tick);
  if (dt === null || dt < 1 || dt !== Math.floor(dt)) throw new EngineError("bad_tick", `clock.tick "${doc.clock.tick}" is not a whole number of seconds`);
  const maxSeconds = parseDuration(doc.clock.maxDuration);
  if (maxSeconds === null || maxSeconds % dt !== 0 || maxSeconds < dt) throw new EngineError("bad_duration", `clock.maxDuration "${doc.clock.maxDuration}" is not a multiple of the tick`);
  const base = parseClockStart(doc.clock.start);
  if (!base) throw new EngineError("bad_clock", `clock.start "${doc.clock.start}" is not HH:MM or an ISO date-time`);
  const params: Record<string, Value> = {};
  for (const k of Object.keys(doc.params)) params[k] = literalValue(doc.params[k].value);
  const catalogs: Record<string, RecordValue[]> = {};
  for (const k of Object.keys(doc.catalogs ?? {})) {
    catalogs[k] = (doc.catalogs ?? {})[k].entries.map((e, i) => {
      const rec: RecordValue = { _id: i + 1 };
      for (const f of Object.keys(e)) (rec as Record<string, Value>)[f] = literalValue((e as Record<string, unknown>)[f]);
      return rec;
    });
  }
  const thresholds: Record<string, number> = {};
  for (const k of Object.keys(doc.outcome.thresholds)) thresholds[k] = doc.outcome.thresholds[k].value;
  const historyEvery: Record<string, number> = {};
  const historyKeep: Record<string, number> = {};
  for (const k of Object.keys(doc.history ?? {})) {
    const h = (doc.history ?? {})[k];
    const every = parseDuration(h.every);
    const keep = parseDuration(h.keep);
    if (every === null || every % dt !== 0 || every < dt) throw new EngineError("bad_duration", `history ${k}.every must be a multiple of the tick`);
    if (keep === null || keep % every !== 0) throw new EngineError("bad_duration", `history ${k}.keep must be a multiple of its every`);
    historyEvery[k] = every / dt;
    historyKeep[k] = keep / every + 1;
    if (historyKeep[k] > HISTORY_MAX_SAMPLES + 1) throw new EngineError("bad_duration", `history ${k} keeps more than ${HISTORY_MAX_SAMPLES} samples`);
  }
  const timerWait: Record<string, boolean> = {};
  for (const k of Object.keys(doc.timers)) timerWait[k] = !!doc.timers[k].wait;
  const patterns: Record<string, Record<string, PatternToken[]>> = {};
  for (const aid of Object.keys(doc.actions)) {
    for (const p of doc.actions[aid].params ?? []) {
      if (p.kind !== "command") continue;
      const map: Record<string, PatternToken[]> = {};
      for (const pat of p.patterns) {
        const toks = parsePattern(pat.pattern);
        if (typeof toks === "string") throw new EngineError("bad_pattern", `${aid}.${p.id}.${pat.id}: ${toks}`);
        map[pat.id] = toks;
      }
      patterns[`${aid}.${p.id}`] = map;
    }
  }
  return {
    doc,
    dt,
    maxTick: maxSeconds / dt,
    base,
    params,
    catalogs,
    thresholds,
    stateIds: Object.keys(doc.state),
    historyIds: Object.keys(doc.history ?? {}),
    historyEvery,
    historyKeep,
    derivedIds: Object.keys(doc.derived),
    phaseIds: Object.keys(doc.phases),
    endingIds: endingCheckOrder(doc),
    timerWait,
    patterns,
  };
}

// ---- the run ----

export interface Run {
  c: Compiled;
  seed: number;
  state: SimState;
  log: LogEntry[];
  outputs: OutputBlock[];
  findings: { tick: number; text: string }[];
  skips: SkipRecord[];
  commands: Command[];
  lastSeq: number;
  realtimeTicks: number;
  skippedTicks: number;
  evaluations: number; // total, for the server's per-request budget
  // REQ-209. Wall-clock accounting only: none of this is in SimState or the
  // state hash, because pacing never changes sim state. `pace` is the last
  // logged pace command (1 when none); `paceTicks` splits realtimeTicks by the
  // pace in force; `focusedAt` is the tick a `begin` started the run at.
  pace: Pace;
  paceTicks: { 1: number; 3: number };
  focusedAt: number;
  // transient
  ctx: EvalCtx;
  stateVersion: number;
  derivedVersion: number;
  derivedCache: Record<string, Value>;
  derivedBusy: Record<string, boolean>;
  skipping: boolean;
  skipInterrupt: string | null;
}

export type ApplyResult = { ok: true; stoppedAt?: number; stoppedBy?: string | null } | { ok: false; seq: number; reason: string };

function zeroForField(spec: { type: string }): Value {
  switch (spec.type) {
    case "number":
      return 0;
    case "bool":
      return false;
    case "list":
      return [];
    default:
      return "";
  }
}

function cloneValue(v: Value): Value {
  if (Array.isArray(v)) return v.map((x) => cloneValue(x));
  if (v && typeof v === "object") {
    const out: Record<string, Value> = {};
    for (const k of Object.keys(v)) out[k] = cloneValue((v as Record<string, Value>)[k]);
    return out;
  }
  return v;
}

export function cloneState(s: SimState): SimState {
  return {
    tick: s.tick,
    phase: s.phase,
    vars: cloneValue(s.vars) as Record<string, Value>,
    recordCounters: { ...s.recordCounters },
    history: Object.fromEntries(Object.keys(s.history).map((k) => [k, s.history[k].slice()])),
    timers: s.timers.map((t) => ({ id: t.id, timer: t.timer, due: t.due, with: cloneValue(t.with) as Record<string, Value> })),
    timerCounter: s.timerCounter,
    streams: { ...s.streams },
    triggerPrev: s.triggerPrev.slice(),
    triggerFired: s.triggerFired.slice(),
    firedEndings: s.firedEndings.slice(),
    openPrompt: s.openPrompt,
    openReasoning: s.openReasoning,
    reasoningOpened: s.reasoningOpened.slice(),
    ended: s.ended ? { ...s.ended } : null,
  };
}

function makeCtx(run: Run): EvalCtx {
  return {
    evals: 0,
    budget: TICK_BUDGET,
    t: 0,
    root: (name) => rootValue(run, name),
    historyPast: (name, seconds) => historyPast(run, name, seconds),
    historyNewest: (name) => {
      const buf = run.state.history[name];
      return buf && buf.length ? buf[buf.length - 1] : 0;
    },
    draw: (stream) => {
      const st = run.state.streams[stream];
      if (st === undefined) throw new EngineError("unknown_stream", `stream "${stream}" is not declared`);
      const r = mulberry32Step(st);
      run.state.streams[stream] = r.state;
      return r.u;
    },
    scoring: null,
  };
}

function rootValue(run: Run, name: string): Value | undefined {
  const s = run.state;
  const c = run.c;
  if (Object.prototype.hasOwnProperty.call(s.vars, name)) return s.vars[name];
  if (Object.prototype.hasOwnProperty.call(c.doc.derived, name)) return derivedValue(run, name);
  if (Object.prototype.hasOwnProperty.call(c.params, name)) return c.params[name];
  if (Object.prototype.hasOwnProperty.call(c.thresholds, name)) return c.thresholds[name];
  if (Object.prototype.hasOwnProperty.call(c.catalogs, name)) return c.catalogs[name];
  switch (name) {
    case "t":
      return s.tick * c.dt;
    case "dt":
      return c.dt;
    case "tick":
      return s.tick;
    case "phase":
      return s.phase;
  }
  return undefined;
}

// Derived values are always current: a memo keyed by the state version is an
// optimisation with no observable effect (5.3).
function derivedValue(run: Run, name: string): Value {
  if (run.derivedVersion !== run.stateVersion) {
    run.derivedCache = {};
    run.derivedBusy = {};
    run.derivedVersion = run.stateVersion;
  }
  if (Object.prototype.hasOwnProperty.call(run.derivedCache, name)) return run.derivedCache[name];
  if (run.derivedBusy[name]) throw new EngineError("derived_cycle", `derived "${name}" depends on itself`);
  run.derivedBusy[name] = true;
  const v = evaluate(parseCached(run.c.doc.derived[name].expr), null, run.ctx);
  run.derivedBusy[name] = false;
  run.derivedCache[name] = v;
  return v;
}

function historyPast(run: Run, name: string, seconds: number): number {
  const buf = run.state.history[name];
  if (!buf || !buf.length) return 0;
  const everyTicks = run.c.historyEvery[name];
  const everySec = everyTicks * run.c.dt;
  const t = run.state.tick * run.c.dt;
  const target = t - Math.max(0, seconds);
  const newestTime = Math.floor(run.state.tick / everyTicks) * everyTicks * run.c.dt;
  let back = Math.ceil((newestTime - target) / everySec);
  if (back < 0) back = 0;
  if (back > buf.length - 1) back = buf.length - 1;
  return buf[buf.length - 1 - back];
}

function bump(run: Run): void {
  run.stateVersion++;
}

// ---- writes, clamped at the moment of the write (5.3) ----

function writeVar(run: Run, id: string, v: Value): void {
  const spec = run.c.doc.state[id];
  if (!spec) throw new EngineError("unknown_state", `"${id}" is not a state variable`);
  run.state.vars[id] = coerceToVar(run, spec, v, id);
  bump(run);
}

function coerceToVar(run: Run, spec: StateVar, v: Value, id: string): Value {
  switch (spec.type) {
    case "number": {
      let x = sat(asNum(v));
      if (x < spec.min) x = spec.min;
      if (x > spec.max) x = spec.max;
      return x === 0 ? 0 : x;
    }
    case "bool":
      return asBool(v);
    case "enum": {
      const s = asStr(v);
      if (spec.values.indexOf(s) < 0) throw new EngineError("bad_enum", `"${s}" is not a value of ${id}`);
      return s;
    }
    case "set": {
      const items = Array.isArray(v) ? v.map((x) => asStr(x)) : [];
      const out: string[] = [];
      for (const x of items) if (spec.of.indexOf(x) >= 0 && out.indexOf(x) < 0) out.push(x);
      out.sort();
      return out;
    }
    case "time":
      return typeof v === "number" ? sat(v) : null;
    case "records": {
      const list = Array.isArray(v) ? (v as RecordValue[]) : [];
      return list.slice(0, spec.max).map((r) => normaliseRecord(spec, r, run, id));
    }
  }
}

function normaliseRecord(spec: { fields: Record<string, { type: string; values?: string[] }> }, r: RecordValue, run: Run, id: string): RecordValue {
  const out: RecordValue = { _id: typeof r._id === "number" ? r._id : nextRecordId(run, id) };
  for (const f of Object.keys(spec.fields)) {
    const fs = spec.fields[f];
    const raw = (r as Record<string, Value>)[f];
    let v: Value = raw === undefined ? zeroForField(fs) : raw;
    if (fs.type === "number") v = sat(asNum(v));
    else if (fs.type === "bool") v = asBool(v);
    else if (fs.type === "enum") {
      v = asStr(v);
      if ((fs.values ?? []).indexOf(v) < 0) throw new EngineError("bad_enum", `"${v}" is not a value of ${id}.${f}`);
    } else if (fs.type === "string") v = asStr(v);
    else if (fs.type === "list") v = Array.isArray(v) ? v.map((x) => (typeof x === "number" ? x : asStr(x))) : [];
    (out as Record<string, Value>)[f] = v;
  }
  return out;
}

function nextRecordId(run: Run, id: string): number {
  const n = (run.state.recordCounters[id] ?? 0) + 1;
  run.state.recordCounters[id] = n;
  return n;
}

// ---- templates ----

export function renderTemplate(run: Run, tpl: string, frame: Frame | null): string {
  const parts: TemplatePart[] = parseTemplate(tpl);
  let out = "";
  for (const p of parts) {
    if ("text" in p) out += p.text;
    else {
      const v = evaluate(p.expr, frame, run.ctx);
      out += applyFormat(v, p.format, run.c.base, run.c.doc.clock.calendar);
    }
  }
  return out;
}

function renderTable(run: Run, view: TableView, frame: Frame | null): { columns: string[]; rows: string[][] } {
  const rowsV = evaluate(parseCached(view.rows), frame, run.ctx);
  const rows: string[][] = [];
  if (Array.isArray(rowsV)) {
    for (const r of rowsV.slice(0, EACH_LIMIT)) {
      const rf = r && typeof r === "object" && !Array.isArray(r) ? frameWith(frame, r as Record<string, Value>) : frameWith(frame, { item: r });
      rows.push(view.columns.map((col) => applyFormat(evaluate(parseCached(col.value), rf, run.ctx), col.format ?? null, run.c.base, run.c.doc.clock.calendar)));
    }
  }
  return { columns: view.columns.map((c) => c.label), rows };
}

function addLog(run: Run, kind: LogEntry["kind"], text: string): void {
  run.log.push({ tick: run.state.tick, kind, text });
}

// ---- effects ----

function timerFrame(inst: TimerInstance, parent: Frame | null): Frame {
  return frameWith(parent, { timer: { id: inst.id, with: inst.with } as unknown as Value });
}

function runEffects(run: Run, effects: Effect[], frame: Frame | null): void {
  for (const e of effects) runEffect(run, e, frame);
}

function ex(run: Run, src: string, frame: Frame | null): Value {
  return evaluate(parseCached(src), frame, run.ctx);
}

function runEffect(run: Run, e: Effect, frame: Frame | null): void {
  const s = run.state;
  if ("update" in e) {
    const spec = run.c.doc.state[e.update];
    if (!spec || spec.type !== "records") throw new EngineError("bad_update", `${e.update} is not a records variable`);
    const cur = s.vars[e.update] as RecordValue[];
    const where = parseCached(e.where);
    const next: RecordValue[] = [];
    let changed = false;
    for (const r of cur) {
      const rf = frameWith(frame, r as Record<string, Value>);
      if (asBool(evaluate(where, rf, run.ctx))) {
        const patch: Record<string, Value> = {};
        for (const f of Object.keys(e.set)) patch[f] = ex(run, e.set[f], rf);
        next.push(normaliseRecord(spec, { ...r, ...patch } as RecordValue, run, e.update));
        changed = true;
      } else next.push(r);
    }
    if (changed) {
      s.vars[e.update] = next;
      bump(run);
    }
  } else if ("set" in e) {
    writeVar(run, e.set, ex(run, e.to, frame));
  } else if ("add" in e) {
    writeVar(run, e.add, sat(asNum(s.vars[e.add]) + asNum(ex(run, e.by, frame))));
  } else if ("push" in e) {
    const spec = run.c.doc.state[e.push];
    if (!spec) throw new EngineError("unknown_state", `"${e.push}" is not a state variable`);
    if (spec.type === "set") {
      const cur = (s.vars[e.push] as string[]).slice();
      const v = asStr(typeof e.value === "string" ? ex(run, e.value, frame) : "");
      if (spec.of.indexOf(v) < 0) throw new EngineError("bad_enum", `"${v}" is not a value of ${e.push}`);
      if (cur.indexOf(v) < 0) cur.push(v);
      cur.sort();
      s.vars[e.push] = cur;
      bump(run);
    } else if (spec.type === "records") {
      const cur = (s.vars[e.push] as RecordValue[]).slice();
      if (cur.length >= spec.max) throw new EngineError("records_full", `${e.push} already holds ${spec.max} records`);
      const rec: RecordValue = { _id: 0 };
      if (typeof e.value === "string") {
        const v = ex(run, e.value, frame);
        if (v && typeof v === "object" && !Array.isArray(v)) for (const k of Object.keys(v)) (rec as Record<string, Value>)[k] = (v as Record<string, Value>)[k];
      } else {
        for (const k of Object.keys(e.value)) (rec as Record<string, Value>)[k] = ex(run, e.value[k], frame);
      }
      rec._id = nextRecordId(run, e.push);
      cur.push(normaliseRecord(spec, rec, run, e.push));
      s.vars[e.push] = cur;
      bump(run);
    } else throw new EngineError("bad_push", `push needs a set or records variable, ${e.push} is ${spec.type}`);
  } else if ("remove" in e) {
    const cur = s.vars[e.remove];
    const spec = run.c.doc.state[e.remove];
    if (!spec || !Array.isArray(cur)) throw new EngineError("bad_remove", `${e.remove} is not a records or set variable`);
    const where = parseCached(e.where);
    const next: Value[] = [];
    for (const r of cur) {
      const rf = r && typeof r === "object" && !Array.isArray(r) ? frameWith(frame, r as Record<string, Value>) : frameWith(frame, { item: r });
      if (!asBool(evaluate(where, rf, run.ctx))) next.push(r);
    }
    if (next.length !== cur.length) {
      s.vars[e.remove] = next;
      bump(run);
    }
  } else if ("schedule" in e) {
    scheduleTimer(run, e.schedule, e.after, e.with, frame);
  } else if ("cancel" in e) {
    const keep: TimerInstance[] = [];
    const where = e.where ? parseCached(e.where) : null;
    for (const inst of s.timers) {
      if (inst.timer !== e.cancel) {
        keep.push(inst);
        continue;
      }
      if (where && !asBool(evaluate(where, timerFrame(inst, frame), run.ctx))) keep.push(inst);
    }
    if (keep.length !== s.timers.length) {
      s.timers = keep;
      bump(run);
    }
  } else if ("log" in e) {
    addLog(run, e.kind ?? "act", renderTemplate(run, e.log, frame));
  } else if ("finding" in e) {
    const text = renderTemplate(run, e.finding, frame);
    run.findings.push({ tick: s.tick, text });
    addLog(run, "find", text);
  } else if ("output" in e) {
    if (typeof e.output === "string") run.outputs.push({ tick: s.tick, text: renderTemplate(run, e.output, frame) });
    else run.outputs.push({ tick: s.tick, table: renderTable(run, e.output, frame) });
  } else if ("phase" in e) {
    if (!run.c.doc.phases[e.phase]) throw new EngineError("unknown_phase", `phase "${e.phase}" does not exist`);
    if (s.phase !== e.phase) {
      s.phase = e.phase;
      bump(run);
      addLog(run, "sys", run.c.doc.phases[e.phase].label);
    }
  } else if ("prompt" in e) {
    if (!(run.c.doc.prompts ?? {})[e.prompt]) throw new EngineError("unknown_prompt", `prompt "${e.prompt}" does not exist`);
    if (s.openPrompt !== null) throw new EngineError("prompt_open", `prompt "${s.openPrompt}" is already open`);
    s.openPrompt = e.prompt;
    bump(run);
    if (run.skipping && !run.skipInterrupt) run.skipInterrupt = "a decision";
  } else if ("reason" in e) {
    openReasoning(run, e.reason);
  } else if ("end" in e) {
    const ending = run.c.doc.endings[e.end];
    if (!ending) throw new EngineError("unknown_ending", `ending "${e.end}" does not exist`);
    if (e.end === "time_up" || !ending.when) throw new EngineError("end_time_up", `{ end } may not name ${e.end}`);
    if (!asBool(ex(run, ending.when, frame))) throw new EngineError("ending_when_false", `{ end: ${e.end} } while its when is false`);
    reachEnding(run, e.end, ending);
  } else if ("table" in e) {
    const table = (run.c.doc.tables ?? {})[e.table];
    if (!table) throw new EngineError("unknown_table", `table "${e.table}" does not exist`);
    let matched = -1;
    for (let i = 0; i < table.rows.length; i++) {
      if (asBool(ex(run, table.rows[i].when, frame))) {
        matched = i;
        const row = table.rows[i];
        const writes: Record<string, Value> = {};
        for (const k of Object.keys(row.then)) writes[k] = ex(run, row.then[k], frame);
        for (const k of Object.keys(writes)) writeVar(run, k, writes[k]);
        if (row.text) addLog(run, "sys", renderTemplate(run, row.text, frame));
        break;
      }
    }
    if (e.into) writeVar(run, e.into, matched);
  } else if ("if" in e) {
    if (asBool(ex(run, e.if, frame))) runEffects(run, e.then, frame);
    else if (e.else) runEffects(run, e.else, frame);
  } else if ("cases" in e) {
    for (const c of e.cases) {
      if (asBool(ex(run, c.when, frame))) {
        runEffects(run, c.then, frame);
        break;
      }
    }
  } else if ("each" in e) {
    const list = ex(run, e.in, frame);
    if (Array.isArray(list)) {
      for (const item of list.slice(0, EACH_LIMIT)) runEffects(run, e.do, frameWith(frame, { [e.each]: item }));
    }
  } else throw new EngineError("bad_effect", "unknown effect");
}

function scheduleTimer(run: Run, id: string, after: string | Duration, withExprs: Record<string, string> | undefined, frame: Frame | null): void {
  const spec = run.c.doc.timers[id];
  if (!spec) throw new EngineError("unknown_timer", `timer "${id}" does not exist`);
  let ticks: number;
  const lit = parseDuration(after);
  if (lit !== null) {
    if (lit % run.c.dt !== 0 || lit < run.c.dt) throw new EngineError("bad_duration", `schedule ${id}: "${after}" is not a positive multiple of the tick`);
    ticks = lit / run.c.dt;
  } else {
    const seconds = asNum(ex(run, after, frame));
    ticks = Math.ceil(seconds / run.c.dt);
    if (!(ticks >= 1)) ticks = 1;
  }
  if (ticks > run.c.maxTick + 1) ticks = run.c.maxTick + 1;
  const payload: Record<string, Value> = {};
  for (const f of Object.keys(spec.with ?? {})) {
    const fs = (spec.with ?? {})[f];
    const raw = withExprs && withExprs[f] !== undefined ? ex(run, withExprs[f], frame) : zeroForField(fs);
    payload[f] = fs.type === "number" ? sat(asNum(raw)) : fs.type === "bool" ? asBool(raw) : fs.type === "list" ? (Array.isArray(raw) ? raw : []) : asStr(raw);
  }
  const s = run.state;
  if (spec.instances === "one") s.timers = s.timers.filter((t) => t.timer !== id);
  const inst: TimerInstance = { id: ++s.timerCounter, timer: id, due: s.tick + ticks, with: payload };
  s.timers.push(inst);
  s.timers.sort((a, b) => (a.due !== b.due ? a.due - b.due : a.id - b.id));
  bump(run);
}

function openReasoning(run: Run, id: string): void {
  const s = run.state;
  if (!run.c.doc.reasoning[id]) throw new EngineError("unknown_reasoning", `reasoning moment "${id}" does not exist`);
  if (s.reasoningOpened.indexOf(id) >= 0 || s.openReasoning !== null) return;
  s.openReasoning = id;
  s.reasoningOpened.push(id);
  bump(run);
  addLog(run, "sys", "Clock paused for your reasoning.");
  if (run.skipping && !run.skipInterrupt) run.skipInterrupt = "a reasoning moment";
}

function classKind(cls: OutcomeClass | undefined): LogEntry["kind"] {
  return cls === "target" ? "good" : cls === "harm" ? "bad" : "sys";
}

function reachEnding(run: Run, id: string, ending: Ending): void {
  const s = run.state;
  if (ending.terminal) {
    s.ended = { ending: id, class: ending.class ?? null, tick: s.tick, reason: id === "time_up" ? "time_up" : "ending" };
    bump(run);
    addLog(run, classKind(ending.class), renderTemplate(run, ending.narrative, null));
    if (run.skipping && !run.skipInterrupt) run.skipInterrupt = ending.label;
    return;
  }
  if (s.firedEndings.indexOf(id) >= 0) return;
  s.firedEndings.push(id);
  bump(run);
  addLog(run, "sys", renderTemplate(run, ending.narrative, null));
  if (ending.phase) runEffect(run, { phase: ending.phase }, null);
  if (run.skipping && !run.skipInterrupt) run.skipInterrupt = ending.label;
}

// ---- settle (5.3) ----

function settle(run: Run): void {
  const s = run.state;
  const doc = run.c.doc;
  for (let i = 0; i < doc.triggers.length && !s.ended; i++) {
    const tr = doc.triggers[i];
    if (tr.mode === "once" && s.triggerFired[i]) continue;
    const now = asBool(ex(run, tr.when, null));
    const fire = tr.mode === "once" ? now : now && !s.triggerPrev[i];
    if (fire) {
      if (tr.interruptsSkip && run.skipping && !run.skipInterrupt) run.skipInterrupt = tr.id;
      s.triggerFired[i] = true;
      runEffects(run, tr.effects, null);
    }
    s.triggerPrev[i] = now;
  }
  if (s.ended) return;
  for (const id of Object.keys(doc.reasoning)) {
    const m = doc.reasoning[id];
    if (!m.trigger || s.reasoningOpened.indexOf(id) >= 0 || s.openReasoning !== null) continue;
    if (asBool(ex(run, m.trigger, null))) openReasoning(run, id);
  }
  for (const id of run.c.endingIds) {
    if (s.ended) return;
    const en = doc.endings[id];
    if (!en.when) continue;
    if (!en.terminal && s.firedEndings.indexOf(id) >= 0) continue;
    if (asBool(ex(run, en.when, null))) {
      reachEnding(run, id, en);
      return;
    }
  }
}

// ---- init ----

export function createRun(doc: ScenarioDoc, seed: number): Run {
  const c = compileDoc(doc);
  const state: SimState = {
    tick: 0,
    phase: doc.initialPhase,
    vars: {},
    recordCounters: {},
    history: {},
    timers: [],
    timerCounter: 0,
    streams: {},
    triggerPrev: doc.triggers.map(() => false),
    triggerFired: doc.triggers.map(() => false),
    firedEndings: [],
    openPrompt: null,
    openReasoning: null,
    reasoningOpened: [],
    ended: null,
  };
  const run: Run = {
    c,
    seed: seed >>> 0,
    state,
    log: [],
    outputs: [],
    findings: [],
    skips: [],
    commands: [],
    lastSeq: 0,
    realtimeTicks: 0,
    skippedTicks: 0,
    evaluations: 0,
    pace: DEFAULT_PACE,
    paceTicks: { 1: 0, 3: 0 },
    focusedAt: 0,
    ctx: null as unknown as EvalCtx,
    stateVersion: 0,
    derivedVersion: -1,
    derivedCache: {},
    derivedBusy: {},
    skipping: false,
    skipInterrupt: null,
  };
  run.ctx = makeCtx(run);
  for (const name of doc.random?.streams ?? []) state.streams[name] = streamSeed(run.seed, name);
  guard(run, () => {
    run.ctx.evals = 0;
    run.ctx.budget = COMMAND_BUDGET;
    for (const id of c.stateIds) {
      const spec = doc.state[id];
      let init: Value;
      switch (spec.type) {
        case "number":
          init = typeof spec.init === "number" ? spec.init : ex(run, spec.init, null);
          break;
        case "records":
          init = spec.init.map((r) => {
            const rec: RecordValue = { _id: 0 };
            for (const k of Object.keys(r)) (rec as Record<string, Value>)[k] = literalValue(r[k]);
            rec._id = nextRecordId(run, id);
            return rec;
          });
          break;
        case "set":
          init = spec.init.slice();
          break;
        default:
          init = spec.init as Value;
      }
      state.vars[id] = coerceToVar(run, spec, init, id);
      bump(run);
    }
    for (const h of c.historyIds) state.history[h] = [sat(asNum(ex(run, (doc.history ?? {})[h].of, null)))];
    settle(run);
    run.evaluations += run.ctx.evals;
  });
  return run;
}

// Any exception inside stepping becomes a deterministic engine_error ending
// (4.3): the run ends, nothing is half-applied to the caller's view.
function guard(run: Run, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    const e = err as { code?: string; message?: string };
    run.state.ended = {
      ending: null,
      class: null,
      tick: run.state.tick,
      reason: "engine_error",
      detail: `${e.code ?? "error"}: ${e.message ?? String(err)}`,
    };
    bump(run);
    addLog(run, "bad", `Engine error: ${e.message ?? String(err)}`);
  }
}

// ---- advance (5.3) ----

export function clockMode(run: Run): "running" | "turns" | "stopped" {
  return run.c.doc.phases[run.state.phase]?.clock ?? "stopped";
}

export function clockBlocked(run: Run): boolean {
  return run.state.openPrompt !== null || run.state.openReasoning !== null;
}

// Real-time advance by one tick, legal only in a running phase that is not
// blocked. Returns false (and does nothing) when the clock cannot move.
export function advance(run: Run): boolean {
  if (run.state.ended || clockBlocked(run) || clockMode(run) !== "running") return false;
  stepTick(run);
  if (!run.skipping) {
    run.realtimeTicks++;
    run.paceTicks[run.pace]++;
  }
  return true;
}

function stepTick(run: Run): void {
  guard(run, () => {
    const s = run.state;
    const c = run.c;
    const doc = c.doc;
    run.ctx.evals = 0;
    run.ctx.budget = TICK_BUDGET;
    s.tick += 1;
    run.ctx.t = s.tick * c.dt;
    bump(run);
    // 2. processes, document order; one process reads one state then writes
    for (const p of doc.processes) {
      if (p.when && !asBool(ex(run, p.when, null))) continue;
      const writes: Record<string, Value> = {};
      for (const k of Object.keys(p.update)) writes[k] = ex(run, p.update[k], null);
      for (const k of Object.keys(writes)) writeVar(run, k, writes[k]);
    }
    // 3. timers due, ordered by (due, instance id)
    for (;;) {
      if (s.ended) break;
      let idx = -1;
      for (let i = 0; i < s.timers.length; i++) {
        if (s.timers[i].due <= s.tick && (idx < 0 || s.timers[i].due < s.timers[idx].due || (s.timers[i].due === s.timers[idx].due && s.timers[i].id < s.timers[idx].id))) idx = i;
      }
      if (idx < 0) break;
      const inst = s.timers[idx];
      s.timers.splice(idx, 1);
      bump(run);
      const spec = doc.timers[inst.timer];
      if (spec.interruptsSkip && run.skipping && !run.skipInterrupt) run.skipInterrupt = renderTemplate(run, spec.label, timerFrame(inst, null));
      runEffects(run, spec.effects, timerFrame(inst, null));
    }
    // 4. history samples
    for (const h of c.historyIds) {
      if (s.tick % c.historyEvery[h] !== 0) continue;
      const buf = s.history[h];
      buf.push(sat(asNum(ex(run, (doc.history ?? {})[h].of, null))));
      while (buf.length > c.historyKeep[h]) buf.shift();
    }
    // 5. settle
    if (!s.ended) settle(run);
    // 6. time_up
    if (!s.ended && s.tick >= c.maxTick) reachEnding(run, "time_up", doc.endings.time_up);
    run.evaluations += run.ctx.evals;
  });
}

// ---- commands (5.3 Apply, Skip) ----

interface ParamBinding {
  frame: Frame;
  reject?: string;
  // a matched command pattern's case effects, run with its captures bound
  // (captures are visible only there, 4.1)
  caseRuns: { effects: Effect[]; frame: Frame }[];
}

function paramFrame(run: Run, action: Action, actionId: string, params: CommandParams | undefined): ParamBinding {
  const given = params ?? {};
  const vars: Record<string, Value> = {};
  const used = new Set<string>();
  const caseRuns: { effects: Effect[]; frame: Frame }[] = [];
  const bad = (reject: string): ParamBinding => ({ frame: frameWith(null, {}), reject, caseRuns: [] });
  for (const p of action.params ?? []) {
    switch (p.kind) {
      case "choice": {
        const v = given[p.id];
        used.add(p.id);
        if (typeof v !== "string" || !p.options.some((o) => o.value === v)) return bad(`param ${p.id} is not one of its options`);
        vars[p.id] = v;
        break;
      }
      case "form": {
        for (const f of p.fields) {
          const v = given[f.id];
          used.add(f.id);
          if (typeof v !== "string" || !f.options.some((o) => o.value === v)) return bad(`form field ${f.id} is not one of its options`);
          vars[f.id] = v;
        }
        break;
      }
      case "slot": {
        const item = given[p.id];
        const slot = given[`${p.id}.slot`];
        used.add(p.id);
        used.add(`${p.id}.slot`);
        const entries = run.c.catalogs[p.catalog] ?? [];
        if (typeof item !== "string" || !entries.some((e) => e.id === item)) return bad(`param ${p.id} is not an entry of ${p.catalog}`);
        if (typeof slot !== "string" || p.slots.indexOf(slot) < 0) return bad(`param ${p.id}.slot is not one of its slots`);
        vars[p.id] = { id: item, slot } as Value;
        break;
      }
      case "pick": {
        const raw = given[p.id];
        used.add(p.id);
        const list = ex(run, p.from, frameWith(null, vars));
        const recs = Array.isArray(list) ? (list as RecordValue[]) : [];
        const ids = typeof raw === "number" ? [raw] : typeof raw === "string" ? raw.split(",").map((x) => Number(x.trim())) : [];
        if (!ids.length || ids.length > (p.max ?? 1)) return bad(`param ${p.id} picks ${ids.length} items (max ${p.max ?? 1})`);
        const picked: RecordValue[] = [];
        for (const id of ids) {
          const hit = recs.find((r) => r._id === id);
          if (!hit) return bad(`param ${p.id}: record ${id} is not in the list`);
          picked.push(hit);
        }
        vars[p.id] = (p.max ?? 1) > 1 ? picked : picked[0];
        break;
      }
      case "command": {
        const raw = given[p.id];
        used.add(p.id);
        if (typeof raw !== "string" || !commandInputOk(raw)) return bad(`param ${p.id} must be text of at most 200 characters with no control characters`);
        const words = splitCommand(raw);
        const toks = run.c.patterns[`${actionId}.${p.id}`] ?? {};
        let matched = "none";
        let captures: Record<string, Value> = {};
        for (const pat of p.patterns) {
          const m = matchPattern(toks[pat.id], words);
          if (m) {
            matched = pat.id;
            captures = m;
            break;
          }
        }
        vars[p.id] = { text: raw, matched } as Value;
        const pat = p.patterns.find((x) => x.id === matched);
        if (pat) {
          const frame = frameWith(frameWith(null, vars), captures);
          for (const c of pat.cases) {
            if (asBool(ex(run, c.when, frame))) {
              caseRuns.push({ effects: c.then, frame });
              break;
            }
          }
        } else run.outputs.push({ tick: run.state.tick, text: renderTemplate(run, p.unmatched, frameWith(null, vars)) });
        break;
      }
      case "query": {
        const raw = given[p.id];
        used.add(p.id);
        if (typeof raw !== "string" || !commandInputOk(raw)) return bad(`param ${p.id} must be text of at most 200 characters`);
        vars[p.id] = raw;
        break;
      }
    }
  }
  for (const k of Object.keys(given)) if (!used.has(k)) return bad(`unknown param ${k}`);
  return { frame: frameWith(null, vars), caseRuns };
}

export function applyCommand(run: Run, cmd: Command): ApplyResult {
  const s = run.state;
  const reject = (reason: string): ApplyResult => ({ ok: false, seq: cmd.seq, reason });
  if (cmd.seq !== run.lastSeq + 1) return reject(`sequence gap: expected ${run.lastSeq + 1}`);
  if (s.ended) return reject("run has ended");
  if (cmd.tick !== s.tick) return reject(cmd.tick < s.tick ? "tick goes backwards" : "tick is ahead of the run");
  const blocked = clockBlocked(run);
  let result: ApplyResult = { ok: true };
  switch (cmd.type) {
    case "act": {
      if (blocked) return reject("the clock is blocked by a prompt or reasoning moment");
      const action = run.c.doc.actions[cmd.action];
      if (!action) return reject(`unknown action ${cmd.action}`);
      if (run.c.doc.phases[s.phase].actions.indexOf(cmd.action) < 0) return reject(`action ${cmd.action} is not offered in phase ${s.phase}`);
      if (action.available && !asBool(ex(run, action.available, null))) return reject(`action ${cmd.action} is not available`);
      const pf = paramFrame(run, action, cmd.action, cmd.params);
      if (pf.reject) return reject(pf.reject);
      guard(run, () => {
        run.ctx.evals = 0;
        run.ctx.budget = COMMAND_BUDGET;
        addLog(run, "act", action.label);
        // a matched pattern's case effects run first, with its captures bound; then the action's shared effects
        for (const cr of pf.caseRuns) runEffects(run, cr.effects, cr.frame);
        runEffects(run, action.effects, pf.frame);
        settle(run);
        run.evaluations += run.ctx.evals;
      });
      break;
    }
    case "choose": {
      if (s.openPrompt !== cmd.prompt) return reject(`prompt ${cmd.prompt} is not open`);
      const prompt = (run.c.doc.prompts ?? {})[cmd.prompt];
      const choice = prompt.choices.find((c) => c.id === cmd.choice);
      if (!choice) return reject(`prompt ${cmd.prompt} has no choice ${cmd.choice}`);
      guard(run, () => {
        run.ctx.evals = 0;
        run.ctx.budget = COMMAND_BUDGET;
        s.openPrompt = null;
        bump(run);
        addLog(run, "act", choice.label);
        runEffects(run, choice.effects, null);
        if (choice.feedback) addLog(run, "sys", renderTemplate(run, choice.feedback, null));
        settle(run);
        run.evaluations += run.ctx.evals;
      });
      break;
    }
    case "skip": {
      if (blocked) return reject("the clock is blocked by a prompt or reasoning moment");
      if (clockMode(run) === "stopped") return reject("the clock is stopped in this phase");
      const inst = s.timers.find((t) => t.id === cmd.instance && t.timer === cmd.timer);
      if (!inst || !run.c.timerWait[inst.timer]) return reject(`no pending wait instance ${cmd.timer}#${cmd.instance}`);
      if (inst.due !== cmd.to) return reject(`wait ${cmd.timer}#${cmd.instance} is due at ${inst.due}, not ${cmd.to}`);
      if (inst.due <= s.tick) return reject("the wait is already due");
      result = runSkip(run, cmd);
      break;
    }
    case "reason": {
      if (s.openReasoning !== cmd.moment) return reject(`reasoning moment ${cmd.moment} is not open`);
      guard(run, () => {
        run.ctx.evals = 0;
        run.ctx.budget = COMMAND_BUDGET;
        s.openReasoning = null;
        bump(run);
        addLog(run, "sys", cmd.answered ? "Reasoning submitted. Clock resumed." : "Reasoning skipped. Clock resumed.");
        settle(run);
        run.evaluations += run.ctx.evals;
      });
      break;
    }
    case "pause":
      addLog(run, "pause", `Paused (${cmd.reason}).`);
      break;
    case "resume":
      addLog(run, "pause", "Resumed.");
      break;
    case "end":
      s.ended = { ending: null, class: null, tick: s.tick, reason: "learner_quit" };
      bump(run);
      addLog(run, "sys", "Run ended by the learner.");
      break;
    case "pace": {
      // Wall-clock pacing only (REQ-209): no state, no hash. Whether this
      // scenario offers pacing is the server's rule (family and a running
      // phase); the engine accepts the two paces anywhere.
      if (cmd.pace !== PACE_EXAM && cmd.pace !== PACE_STUDY) return reject("pace must be 1 or 3");
      run.pace = cmd.pace;
      addLog(run, "pause", cmd.pace === PACE_STUDY ? "Pace: study pace (3x)." : "Pace: exam realism (1x).");
      break;
    }
    case "begin": {
      const fs = run.c.doc.focusedStart;
      if (!fs) return reject("this scenario has no focused start");
      if (cmd.start !== "focused") return reject("begin needs start focused");
      if (cmd.seq !== 1 || s.tick !== 0 || run.commands.length > 0) return reject("a focused start can only be the first command of a run");
      const target = (parseDuration(fs.at) ?? 0) / run.c.dt;
      if (!(target >= 1 && target < run.c.maxTick)) return reject("the focused start point is outside the run");
      evolveTo(run, target);
      run.focusedAt = s.tick;
      addLog(run, "sys", `Started near the deterioration at ${timeText(run, s.tick)}.`);
      break;
    }
    case "teach": {
      const due = teachingDue(run);
      if (!due || due.id !== cmd.prompt) return reject(`teaching prompt ${cmd.prompt} is not offered now`);
      const picked = due.prompt.choices.find((c) => c.id === cmd.choice);
      if (!picked) return reject(`teaching prompt ${cmd.prompt} has no choice ${cmd.choice}`);
      addLog(run, "sys", `Your prediction: ${picked.label}.`);
      break;
    }
    case "chapter": {
      const due = chapterDue(run);
      if (!due || due.id !== cmd.chapter) return reject(`chapter ${cmd.chapter} is not due`);
      if (cmd.choice !== "continue" && cmd.choice !== "later") return reject("chapter needs continue or later");
      addLog(run, "sys", cmd.choice === "later" ? `Saved at the end of "${due.label}" to finish later.` : `Chapter done: ${due.label}.`);
      break;
    }
    default:
      return reject("unknown command type");
  }
  run.lastSeq = cmd.seq;
  run.commands.push(cmd);
  return result;
}

function runSkip(run: Run, cmd: Extract<Command, { type: "skip" }>): ApplyResult {
  const s = run.state;
  const from = s.tick;
  const logIndex = run.log.length;
  run.skipping = true;
  run.skipInterrupt = null;
  while (s.tick < cmd.to && !s.ended && !clockBlocked(run) && !run.skipInterrupt) {
    stepTick(run);
    if (run.skipInterrupt || s.ended || clockBlocked(run)) break;
  }
  run.skipping = false;
  const stoppedBy = s.tick < cmd.to ? run.skipInterrupt ?? (s.ended ? "the run ended" : "the clock was blocked") : null;
  run.skipInterrupt = null;
  const rec: SkipRecord = { seq: cmd.seq, from, to: s.tick, target: cmd.to, timer: cmd.timer, instance: cmd.instance, stoppedBy };
  if (cmd.calm === true) rec.calm = true;
  run.skips.push(rec);
  run.skippedTicks += s.tick - from;
  const spec = run.c.doc.timers[cmd.timer];
  const label = spec.wait ? spec.wait.skipLabel : spec.label;
  const text = `Skipped ahead ${fmtTicks(run, s.tick - from)} (${timeText(run, from)} → ${timeText(run, s.tick)}), waiting for ${plainLabel(run, label)}${cmd.calm === true ? " (skip offer)" : ""}.${stoppedBy ? ` Stopped early: ${stoppedBy}.` : ""}`;
  run.log.splice(logIndex, 0, { tick: from, kind: "skip", text });
  return { ok: true, stoppedAt: s.tick, stoppedBy };
}

function plainLabel(run: Run, tpl: string): string {
  try {
    return renderTemplate(run, tpl, null);
  } catch {
    return tpl;
  }
}

function fmtTicks(run: Run, ticks: number): string {
  return applyFormat(ticks * run.c.dt, "duration", run.c.base, run.c.doc.clock.calendar);
}

function timeText(run: Run, tick: number): string {
  return applyFormat(tick * run.c.dt, "time", run.c.base, run.c.doc.clock.calendar);
}

// ---- waits, hash, checkpoints, replay ----

export function waits(run: Run): WaitInfo[] {
  const out: WaitInfo[] = [];
  if (run.state.ended || clockBlocked(run) || clockMode(run) === "stopped") return out;
  for (const inst of run.state.timers) {
    const spec = run.c.doc.timers[inst.timer];
    if (!spec.wait || inst.due <= run.state.tick) continue;
    const frame = timerFrame(inst, null);
    const info: WaitInfo = { timer: inst.timer, instance: inst.id, due: inst.due, label: renderTemplate(run, spec.label, frame), skipLabel: renderTemplate(run, spec.wait.skipLabel, frame) };
    if (spec.wait.routine === true) info.routine = true;
    out.push(info);
  }
  out.sort((a, b) => (a.due !== b.due ? a.due - b.due : a.instance - b.instance));
  return out;
}

function hashValue(h: ReturnType<typeof hasherNew>, v: Value | undefined): void {
  if (v === null || v === undefined) {
    hashTag(h, 0);
    return;
  }
  if (typeof v === "number") {
    hashTag(h, 1);
    hashNumber(h, v);
    return;
  }
  if (typeof v === "boolean") {
    hashTag(h, v ? 3 : 2);
    return;
  }
  if (typeof v === "string") {
    hashTag(h, 4);
    hashString(h, v);
    return;
  }
  if (Array.isArray(v)) {
    hashTag(h, 5);
    hashU32(h, v.length);
    for (const x of v) hashValue(h, x);
    return;
  }
  hashTag(h, 6);
  const keys = Object.keys(v).sort();
  hashU32(h, keys.length);
  for (const k of keys) {
    hashString(h, k);
    hashValue(h, (v as Record<string, Value>)[k]);
  }
}

// 64-bit non-cryptographic hash of the state in canonical order (5.5).
export function stateHash(state: SimState): string {
  const h = hasherNew();
  hashU32(h, state.tick);
  hashString(h, state.phase);
  for (const k of Object.keys(state.vars).sort()) {
    hashString(h, k);
    hashValue(h, state.vars[k]);
  }
  for (const k of Object.keys(state.recordCounters).sort()) {
    hashString(h, k);
    hashU32(h, state.recordCounters[k]);
  }
  for (const k of Object.keys(state.history).sort()) {
    hashString(h, k);
    hashU32(h, state.history[k].length);
    for (const x of state.history[k]) hashNumber(h, x);
  }
  hashU32(h, state.timers.length);
  for (const t of state.timers) {
    hashU32(h, t.id);
    hashString(h, t.timer);
    hashU32(h, t.due);
    hashValue(h, t.with as unknown as Value);
  }
  hashU32(h, state.timerCounter);
  for (const k of Object.keys(state.streams).sort()) {
    hashString(h, k);
    hashU32(h, state.streams[k]);
  }
  for (const b of state.triggerPrev) hashTag(h, b ? 1 : 0);
  for (const b of state.triggerFired) hashTag(h, b ? 1 : 0);
  hashU32(h, state.firedEndings.length);
  for (const e of state.firedEndings) hashString(h, e);
  hashString(h, state.openPrompt ?? "");
  hashString(h, state.openReasoning ?? "");
  hashU32(h, state.reasoningOpened.length);
  for (const e of state.reasoningOpened) hashString(h, e);
  if (state.ended) {
    hashTag(h, 9);
    hashString(h, state.ended.ending ?? "");
    hashString(h, state.ended.class ?? "");
    hashU32(h, state.ended.tick);
    hashString(h, state.ended.reason);
  } else hashTag(h, 8);
  return hashHex(h);
}

export function checkpoint(run: Run): Checkpoint {
  return {
    engine: ENGINE_VERSION,
    tick: run.state.tick,
    lastSeq: run.lastSeq,
    state: cloneState(run.state),
    log: run.log.map((l) => ({ ...l })),
    outputs: run.outputs.map((o) => ({ tick: o.tick, text: o.text, table: o.table ? { columns: o.table.columns.slice(), rows: o.table.rows.map((r) => r.slice()) } : undefined })),
    findings: run.findings.map((f) => ({ ...f })),
    skips: run.skips.map((s) => ({ ...s })),
    commands: run.commands.map((c) => ({ ...c })),
    realtimeTicks: run.realtimeTicks,
    skippedTicks: run.skippedTicks,
    evaluations: run.evaluations,
    paceTicks: { 1: run.paceTicks[1], 3: run.paceTicks[3] },
    focusedAt: run.focusedAt,
  };
}

// A checkpoint is readable when it is from this major and not a later minor.
// Minor 0 checkpoints (every one stored before REQ-209) restore unchanged:
// they carry no pace data, which reads as all real-time ticks at 1x.
function engineReadable(cpEngine: string): boolean {
  const parts = cpEngine.split(".");
  if (parts.length !== 2) return false;
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  if (!Number.isInteger(major) || !Number.isInteger(minor) || parts[0] === "" || parts[1] === "") return false;
  return major === ENGINE_MAJOR && minor >= 0 && minor <= ENGINE_MINOR;
}

export function restoreRun(doc: ScenarioDoc, seed: number, cp: Checkpoint): Run {
  if (!engineReadable(cp.engine)) throw new EngineError("engine_mismatch", `checkpoint is from engine ${cp.engine}, this is ${ENGINE_VERSION}`);
  const c = compileDoc(doc);
  const run: Run = {
    c,
    seed: seed >>> 0,
    state: cloneState(cp.state),
    log: cp.log.map((l) => ({ ...l })),
    outputs: cp.outputs.map((o) => ({ ...o })),
    findings: cp.findings.map((f) => ({ ...f })),
    skips: cp.skips.map((s) => ({ ...s })),
    commands: cp.commands.map((x) => ({ ...x })),
    lastSeq: cp.lastSeq,
    realtimeTicks: cp.realtimeTicks,
    skippedTicks: cp.skippedTicks,
    evaluations: cp.evaluations,
    pace: lastLoggedPace(cp.commands),
    paceTicks: cp.paceTicks ? { 1: cp.paceTicks[1] ?? 0, 3: cp.paceTicks[3] ?? 0 } : { 1: cp.realtimeTicks, 3: 0 },
    focusedAt: cp.focusedAt ?? 0,
    ctx: null as unknown as EvalCtx,
    stateVersion: 1,
    derivedVersion: -1,
    derivedCache: {},
    derivedBusy: {},
    skipping: false,
    skipInterrupt: null,
  };
  run.ctx = makeCtx(run);
  run.ctx.t = run.state.tick * c.dt;
  return run;
}

// A tick is strictly inside a skip when some skip stamped n stopped at s with
// n < k < s; checkpoints are never taken there (5.3).
export function insideSkip(run: Run, tick: number): boolean {
  return run.skips.some((s) => tick > s.from && tick < s.to);
}

// Server-side replay: apply commands in seq order, advancing real time in a
// running phase to reach each command's tick. Stops at the first rejection.
export function replay(doc: ScenarioDoc, seed: number, commands: Command[], from?: Checkpoint): { run: Run; rejected: { seq: number; reason: string } | null } {
  const run = from ? restoreRun(doc, seed, from) : createRun(doc, seed);
  for (const cmd of commands) {
    if (cmd.seq <= run.lastSeq) continue; // already applied (idempotent resend is the server's concern)
    while (run.state.tick < cmd.tick) {
      if (!advance(run)) {
        const why = run.state.ended ? "run has ended" : clockBlocked(run) ? "the clock is blocked" : `phase ${run.state.phase} does not tick in real time`;
        return { run, rejected: { seq: cmd.seq, reason: `tick ${cmd.tick} is unreachable: ${why}` } };
      }
    }
    const r = applyCommand(run, cmd);
    if (!r.ok) return { run, rejected: { seq: r.seq, reason: r.reason } };
  }
  return { run, rejected: null };
}

// Current sim time in seconds and its display text.
export function simTime(run: Run): number {
  return run.state.tick * run.c.dt;
}

export function simTimeText(run: Run, tick?: number): string {
  return timeText(run, tick ?? run.state.tick);
}

export function readValue(run: Run, name: string): Value | undefined {
  return rootValue(run, name);
}

export function paramCount(action: Action): number {
  return (action.params ?? []).length;
}

export function actionParams(action: Action): ActionParam[] {
  return action.params ?? [];
}

// ---- REQ-209: pacing, focused start, calm skip, teaching prompts, chapters ----

// The last pace a command log set (1 when it never set one).
export function lastLoggedPace(cmds: Command[]): Pace {
  for (let i = cmds.length - 1; i >= 0; i--) {
    const c = cmds[i];
    if (c.type === "pace") return c.pace;
  }
  return DEFAULT_PACE;
}

// The fewest wall-clock seconds the real-time part of this run could have
// taken, each tick at the pace in force when it was played (docs/sims.md
// 5.7). With every tick at 1x this is realtimeTicks x dt, which is the old
// speed bound exactly. Skips, a focused start's evolved ticks and turns
// phases are not real time and are not counted.
export function minWallSeconds(run: Run): number {
  return (run.paceTicks[1] * run.c.dt) / PACE_EXAM + (run.paceTicks[3] * run.c.dt) / PACE_STUDY;
}

// Evolves the normal start to `target` with no learner actions: the same
// stepTick the real clock and a skip use, nothing hand-written. These ticks
// are not real time (not in realtimeTicks or paceTicks).
function evolveTo(run: Run, target: number): void {
  while (run.state.tick < target && !run.state.ended && !clockBlocked(run)) stepTick(run);
}

// Reads a boolean expression on the current state without changing it.
// Errors and budget overruns read as false.
function readBool(run: Run, src: string): boolean {
  run.ctx.evals = 0;
  run.ctx.budget = TICK_BUDGET;
  try {
    return asBool(ex(run, src, null));
  } catch {
    return false;
  }
}

// Every teaching prompt that could be offered now: not yet answered, its named
// wait pending, its optional condition true, the clock not blocked. Document
// order. Pure.
export function teachingAvailable(run: Run): { id: Id; prompt: TeachingPrompt }[] {
  const teaching = run.c.doc.teaching;
  const out: { id: Id; prompt: TeachingPrompt }[] = [];
  if (!teaching || run.state.ended || clockBlocked(run)) return out;
  for (const id of Object.keys(teaching)) {
    const tp = teaching[id];
    if (run.commands.some((c) => c.type === "teach" && c.prompt === id)) continue;
    if (!run.state.timers.some((t) => t.timer === tp.during && t.due > run.state.tick)) continue;
    if (tp.when && !readBool(run, tp.when)) continue;
    out.push({ id, prompt: tp });
  }
  return out;
}

// The one on offer: the first available, so the learner sees one at a time.
export function teachingDue(run: Run): { id: Id; prompt: TeachingPrompt } | null {
  return teachingAvailable(run)[0] ?? null;
}

// Whether a chapter's boundary condition holds now (the linter uses it to
// check that every declared chapter can be reached).
export function chapterHolds(run: Run, chapter: Chapter): boolean {
  return readBool(run, chapter.when);
}

// The chapter boundary reached and not yet answered: the first chapter, in
// document order, whose `when` holds and that has no `chapter` command. Pure
// (state plus the command log), so a second device offers the same one.
export function chapterDue(run: Run): Chapter | null {
  const chapters = run.c.doc.chapters;
  if (!chapters || run.state.ended || clockBlocked(run)) return null;
  for (const c of chapters) {
    if (run.commands.some((x) => x.type === "chapter" && x.chapter === c.id)) continue;
    if (readBool(run, c.when)) return c;
  }
  return null;
}

// The wait the "Skip to the next change" offer would skip to, or null when
// nothing should be offered (docs/sims.md 5.4c). Engine rules, all pure: a
// running phase, no prompt or reasoning open, no alarm condition true now (a
// trigger that interrupts a skip), no timer of any kind due inside
// CALM_MIN_SPAN_SECONDS, and a wait that is a change, not a routine check.
// The "nothing has changed for about 30 real seconds" rule is wall time and
// belongs to the app.
export function calmSkip(run: Run): WaitInfo | null {
  const s = run.state;
  if (s.ended || clockBlocked(run) || clockMode(run) !== "running") return null;
  const next = waits(run).find((w) => !w.routine);
  if (!next) return null;
  for (const tr of run.c.doc.triggers) if (tr.interruptsSkip && readBool(run, tr.when)) return null;
  const minTicks = Math.ceil(CALM_MIN_SPAN_SECONDS / run.c.dt);
  for (const t of s.timers) if (t.due - s.tick < minTicks) return null;
  return next;
}
