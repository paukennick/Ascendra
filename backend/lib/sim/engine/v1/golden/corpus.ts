// REQ-162 (docs/sims.md 5.3, 16): runs one corpus case and compares the
// engine against the case's hand-computed expectations. Pure (no node
// imports) so the same runner executes under Node, the app's engine copy and
// the cross-runtime jobs. The case files live in ./corpus/*.json and the
// manifest (manifest.json) records each case's state hash.

import type { Command, ScenarioDoc, Value } from "../types.ts";
import { advance, applyCommand, createRun, stateHash } from "../engine.ts";
import type { Run } from "../engine.ts";

export type ScriptStep =
  | { advance: number }
  | { advanceExpect: boolean }
  | { command: Command; expectStop?: number }
  | { commandRejected: Command };

export interface TickExpect {
  tick: number;
  afterSeq?: number; // check once this command seq has been applied (default: the first time the tick is observed)
  values?: Record<string, Value>;
  timers?: [string, number, number][]; // [timer, instance id, due]
  log?: string[]; // "tick:text"
  outputs?: string[];
  history?: Record<string, number[]>;
  phase?: string;
  openPrompt?: string | null;
  openReasoning?: string | null;
  streamsAdvanced?: Record<string, number>;
}

export interface CorpusCase {
  id: string;
  spec: string;
  doc: ScenarioDoc;
  seed: number;
  script: ScriptStep[];
  expect: {
    ticks?: TickExpect[];
    final?: { tick?: number; ended?: string | null; class?: string | null };
    skips?: { from: number; to: number; stoppedBy: string | null }[];
  };
}

export interface CorpusResult {
  hash: string;
  finalTick: number;
  failures: string[];
  tickHashes: Record<number, string>;
}

function same(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return a === b || Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
  return JSON.stringify(a) === JSON.stringify(b);
}

function readValue(run: Run, name: string): Value | undefined {
  return run.ctx.root(name);
}

function checkTick(run: Run, e: TickExpect, failures: string[]): void {
  const at = `tick ${e.tick}`;
  for (const k of Object.keys(e.values ?? {})) {
    const got = readValue(run, k);
    if (!same(got, (e.values ?? {})[k])) failures.push(`${at}: ${k} = ${JSON.stringify(got)}, expected ${JSON.stringify((e.values ?? {})[k])}`);
  }
  if (e.timers) {
    const got = run.state.timers.map((t) => [t.timer, t.id, t.due]);
    if (!same(got, e.timers)) failures.push(`${at}: timers ${JSON.stringify(got)}, expected ${JSON.stringify(e.timers)}`);
  }
  if (e.log) {
    const got = run.log.filter((l) => l.kind !== "skip" && l.kind !== "pause").map((l) => `${l.tick}:${l.text}`);
    if (!same(got, e.log)) failures.push(`${at}: log ${JSON.stringify(got)}, expected ${JSON.stringify(e.log)}`);
  }
  if (e.outputs) {
    const got = run.outputs.map((o) => o.text ?? "[table]");
    if (!same(got, e.outputs)) failures.push(`${at}: outputs ${JSON.stringify(got)}, expected ${JSON.stringify(e.outputs)}`);
  }
  for (const h of Object.keys(e.history ?? {})) {
    if (!same(run.state.history[h], (e.history ?? {})[h])) failures.push(`${at}: history ${h} ${JSON.stringify(run.state.history[h])}, expected ${JSON.stringify((e.history ?? {})[h])}`);
  }
  if (e.phase !== undefined && run.state.phase !== e.phase) failures.push(`${at}: phase ${run.state.phase}, expected ${e.phase}`);
  if (e.openPrompt !== undefined && run.state.openPrompt !== e.openPrompt) failures.push(`${at}: openPrompt ${run.state.openPrompt}, expected ${e.openPrompt}`);
  if (e.openReasoning !== undefined && run.state.openReasoning !== e.openReasoning) failures.push(`${at}: openReasoning ${run.state.openReasoning}, expected ${e.openReasoning}`);
}

export function runCorpusCase(c: CorpusCase): CorpusResult {
  const failures: string[] = [];
  const run = createRun(c.doc, c.seed);
  const tickHashes: Record<number, string> = {};
  const expects = c.expect.ticks ?? [];
  const seen = new Set<TickExpect>();
  // stream draw counting: compare each stream's state to a fresh run's
  const fresh = createRun(c.doc, c.seed);
  const drawsOf = (name: string): number => {
    let s = fresh.state.streams[name];
    const target = run.state.streams[name];
    for (let n = 0; n < 1000; n++) {
      if (s === target) return n;
      s = step32(s);
    }
    return -1;
  };
  const observe = (): void => {
    tickHashes[run.state.tick] = stateHash(run.state);
    for (const e of expects) {
      if (e.tick === run.state.tick && !seen.has(e) && (e.afterSeq === undefined || run.lastSeq >= e.afterSeq)) {
        seen.add(e);
        checkTick(run, e, failures);
        for (const s of Object.keys(e.streamsAdvanced ?? {})) {
          const n = drawsOf(s);
          if (n !== (e.streamsAdvanced ?? {})[s]) failures.push(`tick ${e.tick}: stream ${s} advanced ${n} times, expected ${(e.streamsAdvanced ?? {})[s]}`);
        }
      }
    }
  };
  observe();
  for (const st of c.script) {
    if ("advance" in st) {
      for (let i = 0; i < st.advance; i++) {
        if (run.state.ended) break; // a run that ended stops advancing; the final expectation says where
        if (!advance(run)) {
          failures.push(`advance refused at tick ${run.state.tick}`);
          break;
        }
        observe();
      }
    } else if ("advanceExpect" in st) {
      const ok = advance(run);
      if (ok !== st.advanceExpect) failures.push(`advance at tick ${run.state.tick} returned ${ok}, expected ${st.advanceExpect}`);
      if (ok) observe();
    } else if ("command" in st) {
      const r = applyCommand(run, st.command);
      if (!r.ok) failures.push(`command seq ${st.command.seq} rejected: ${r.reason}`);
      else if (st.expectStop !== undefined && r.stoppedAt !== st.expectStop) failures.push(`skip seq ${st.command.seq} stopped at ${r.stoppedAt}, expected ${st.expectStop}`);
      observe();
    } else {
      const before = stateHash(run.state);
      const r = applyCommand(run, st.commandRejected);
      if (r.ok) failures.push(`command seq ${st.commandRejected.seq} was accepted, expected a rejection`);
      if (stateHash(run.state) !== before) failures.push(`a rejected command changed the state`);
      observe();
    }
  }
  for (const e of expects) if (!seen.has(e)) failures.push(`tick ${e.tick} was never observed`);
  const f = c.expect.final;
  if (f) {
    if (f.tick !== undefined && run.state.tick !== f.tick) failures.push(`final tick ${run.state.tick}, expected ${f.tick}`);
    if (f.ended !== undefined && (run.state.ended?.ending ?? null) !== f.ended) failures.push(`final ending ${run.state.ended?.ending ?? null} (${run.state.ended?.detail ?? ""}), expected ${f.ended}`);
    if (f.class !== undefined && (run.state.ended?.class ?? null) !== f.class) failures.push(`final class ${run.state.ended?.class ?? null}, expected ${f.class}`);
  }
  if (c.expect.skips) {
    const got = run.skips.map((s) => ({ from: s.from, to: s.to, stoppedBy: s.stoppedBy }));
    if (!same(got, c.expect.skips)) failures.push(`skips ${JSON.stringify(got)}, expected ${JSON.stringify(c.expect.skips)}`);
  }
  if (run.state.ended?.reason === "engine_error") failures.push(`engine error: ${run.state.ended.detail}`);
  return { hash: stateHash(run.state), finalTick: run.state.tick, failures, tickHashes };
}

function step32(state: number): number {
  const a = (state + 0x6d2b79f5) | 0;
  return a >>> 0;
}
