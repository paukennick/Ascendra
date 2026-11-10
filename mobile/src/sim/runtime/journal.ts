// REQ-199 (docs/sims.md 5.9, 22): the on-device command journal, pure.
//
// Every command the learner issues is written here BEFORE it is sent, and
// dropped from here once the server acknowledges it (acceptedThrough). An app
// kill, a crash or an over-the-air reload therefore loses nothing that was
// not already on the server. On the next "Continue the run" the app takes the
// lease through the start route, compares the journal with what the server
// already holds, and sends the rest through the ordinary step route, which is
// idempotent by seq (an identical resend is accepted, a changed one is 409
// seq_conflict).
//
// A journal is discarded, and the learner told so in plain words, when it can
// no longer be applied: the run ended or was restarted elsewhere, the served
// version changed, or another device moved the run on. This module decides;
// src/sim/journalStore.ts reads and writes device storage; src/sim/useSimRun.ts
// wires both into the run.
import type { Command } from "../engine/v1/types.ts";
import type { RunPayload } from "./session.ts";

export const JOURNAL_FORMAT = 1;
// The step route takes at most this many commands per request
// (backend/lib/sim/server-run.ts SIM_LIMITS.commandsPerRequest).
export const SEND_BATCH = 500;
// A run never holds more (SIM_LIMITS.commandsPerRun); anything longer is not
// a journal this app wrote.
export const JOURNAL_MAX_COMMANDS = 5000;

export interface Journal {
  format: typeof JOURNAL_FORMAT;
  simId: string;
  runId: string;
  versionId: string;
  clientHash: string;
  savedAt: number;
  // Applied on this device and not yet acknowledged, in seq order.
  commands: Command[];
}

// ascendra.simJournal.<userId>.<simId>: per user, so the logout sweep
// (src/lib/localData.ts) removes it and a second account never sees it.
export function journalKey(userId: string, simId: string): string {
  return `ascendra.simJournal.${userId}.${simId}`;
}

export function makeJournal(simId: string, run: { runId: string; versionId: string; clientHash: string }, commands: readonly Command[], nowMs: number): Journal {
  return { format: JOURNAL_FORMAT, simId, runId: run.runId, versionId: run.versionId, clientHash: run.clientHash, savedAt: nowMs, commands: commands.slice() };
}

export function encodeJournal(j: Journal): string {
  return JSON.stringify(j);
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 200;

// The stored journal for this sim, or null when there is none or it is not
// one this app wrote (wrong format, wrong sim, malformed or out-of-order
// commands). A null for a present value means "remove it".
export function parseJournal(raw: string | null, simId: string): Journal | null {
  if (raw == null) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(v) || v.format !== JOURNAL_FORMAT || v.simId !== simId) return null;
  if (!isStr(v.runId) || !isStr(v.versionId) || !isStr(v.clientHash) || typeof v.savedAt !== "number") return null;
  if (!Array.isArray(v.commands) || v.commands.length > JOURNAL_MAX_COMMANDS) return null;
  let prev = 0;
  for (const c of v.commands) {
    if (!isObj(c) || typeof c.type !== "string" || !Number.isInteger(c.seq) || !Number.isInteger(c.tick) || (c.tick as number) < 0) return null;
    if (prev && c.seq !== prev + 1) return null;
    if ((c.seq as number) < 1) return null;
    prev = c.seq as number;
  }
  return v as unknown as Journal;
}

export type DiscardReason = "ended" | "version" | "moved_on" | "refused";

export type JournalPlan =
  | { kind: "none" }
  // Already on the server: nothing to send, the journal can go.
  | { kind: "acknowledged" }
  // Send these (seq lastSeq+1 onwards) after applying them locally.
  | { kind: "replay"; commands: Command[] }
  | { kind: "discard"; reason: DiscardReason; lost: number };

// Same rule as the server's sameCommand (backend/lib/sim/server-run.ts):
// key order and undefined fields do not matter.
export function canonicalCommand(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalCommand).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalCommand(o[k])}`)
    .join(",")}}`;
}

// What to do with a journal, given what the start route returned (the
// server's run after this device took the lease).
export function planJournal(j: Journal | null, p: RunPayload): JournalPlan {
  if (!j || !j.commands.length) return { kind: "none" };
  // The start route returns the open run, or a new one when the journal's
  // run ended (finished, quit or restarted) somewhere else.
  if (p.run.id !== j.runId || p.run.status !== "open") {
    const unsent = j.commands.filter((c) => p.run.id !== j.runId || c.seq > p.run.lastSeq).length;
    return unsent ? { kind: "discard", reason: "ended", lost: unsent } : { kind: "acknowledged" };
  }
  if (p.run.versionId !== j.versionId || p.clientHash !== j.clientHash) {
    return { kind: "discard", reason: "version", lost: j.commands.filter((c) => c.seq > p.run.lastSeq).length };
  }
  const stored = new Map(p.commands.map((c) => [c.seq, canonicalCommand(c)]));
  for (const c of j.commands) {
    if (c.seq > p.run.lastSeq) break;
    // The server holds a different command at this seq: another device
    // continued the run after this one stopped.
    if (stored.get(c.seq) !== canonicalCommand(c)) {
      return { kind: "discard", reason: "moved_on", lost: j.commands.filter((x) => x.seq >= c.seq).length };
    }
  }
  const rest = j.commands.filter((c) => c.seq > p.run.lastSeq);
  if (!rest.length) return { kind: "acknowledged" };
  // A gap, or real time on the server already past the first unsent command
  // (another device ran the clock): the journal no longer fits.
  if (rest[0].seq !== p.run.lastSeq + 1 || rest[0].tick < p.run.lastTick) {
    return { kind: "discard", reason: "moved_on", lost: rest.length };
  }
  return { kind: "replay", commands: rest };
}

// What the learner reads when unsent actions could not be kept.
export function discardNotice(reason: DiscardReason | "lease_lost", lost: number): string {
  const n = lost === 1 ? "1 action" : `${lost} actions`;
  switch (reason) {
    case "ended":
      return `This run ended on another device or was restarted, so ${n} made here before the app closed could not be added to it.`;
    case "version":
      return `This simulation was updated since you last played, so ${n} made here before the app closed could not be added. Your run continues from the last saved point.`;
    case "moved_on":
    case "lease_lost":
      return `This run continued on another device, so ${n} made here that had not been saved yet were dropped. The run shows what the server has.`;
    case "refused":
      return `The server could not accept ${n} made here before the app closed, so they were dropped. The run continues from the last saved point.`;
  }
}

// Device storage, as the journal needs it. Both calls must never throw.
export interface JournalBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

// Serialises writes for one key, so a slow write can never land after a
// later one (an acknowledgement's removal after the next command's save).
export interface JournalWriter {
  // Resolves once this state is on the device (or the write failed).
  save(j: Journal | null): Promise<void>;
  // Resolves when every write so far has finished.
  settled(): Promise<void>;
}

export function journalWriter(backend: JournalBackend, key: string, mayWrite: () => boolean = () => true): JournalWriter {
  let chain: Promise<void> = Promise.resolve();
  return {
    save(j) {
      const next = chain.then(async () => {
        try {
          if (!j || !j.commands.length) await backend.remove(key);
          else if (mayWrite()) await backend.set(key, encodeJournal(j));
        } catch {
          /* storage full or blocked: the in-memory queue still sends */
        }
      });
      chain = next;
      return next;
    },
    settled: () => chain,
  };
}

export async function loadJournal(backend: JournalBackend, key: string, simId: string): Promise<Journal | null> {
  let raw: string | null = null;
  try {
    raw = await backend.get(key);
  } catch {
    return null;
  }
  const j = parseJournal(raw, simId);
  if (raw != null && !j) {
    try {
      await backend.remove(key);
    } catch {
      /* ignore */
    }
  }
  return j;
}
