// REQ-190 (docs/sims.md 5.2, 5.7, 7): the app's side of a run, pure. The app
// runs the engine on the client document for display; every learner input
// becomes a command stamped with the tick whose state the learner saw and
// the next seq, applied locally at once and queued for the server. The
// server replays the same commands and its replay is the record: the app
// never sends a state or a score.
import { advance, applyCommand, clockBlocked, clockMode, replay, stateHash } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import type { Command, ScenarioDoc } from "../engine/v1/types.ts";

// REQ-209: whether this scenario offers pacing, and the paces. A server that
// predates it sends nothing, which reads as "no pacing" (1x, no launch card).
export interface Pacing {
  eligible: boolean;
  studyPace: 3;
  examPace: 1;
  defaultPace: 3 | 1;
}
export const NO_PACING: Pacing = { eligible: false, studyPace: 3, examPace: 1, defaultPace: 1 };

export interface RunPayload {
  run: { id: string; simId: string; versionId: string; version: number; status: "open" | "ended" | "abandoned"; seed: number; leaseEpoch: number; lastSeq: number; lastTick: number; engineVersion: string };
  clientHash: string;
  clientDocument?: ScenarioDoc;
  commands: Command[];
  graded: string[];
  pacing?: Pacing;
}

export interface Session {
  runId: string;
  leaseEpoch: number;
  doc: ScenarioDoc;
  run: Run;
  // Applied locally, not yet accepted by the server, in seq order.
  pending: Command[];
  graded: string[];
  pacing: Pacing;
}

// Rebuilds the server's state: the accepted commands from tick 0 with the
// run's seed, then real time up to the server's last tick (a heartbeat may
// have moved it past the last command).
export function openSession(payload: RunPayload, doc: ScenarioDoc): Session {
  const r = replay(doc, payload.run.seed, payload.commands);
  if (r.rejected) throw new Error(`The saved run could not be replayed (${r.rejected.reason}).`);
  const run = r.run;
  while (run.state.tick < payload.run.lastTick && !run.state.ended && clockMode(run) === "running" && !clockBlocked(run)) advance(run);
  return { runId: payload.run.id, leaseEpoch: payload.run.leaseEpoch, doc, run, pending: [], graded: payload.graded.slice(), pacing: payload.pacing ?? NO_PACING };
}

// Distributes Omit over the command union, so each member keeps its fields.
type Unstamped<T> = T extends Command ? Omit<T, "seq" | "tick"> : never;
export type CommandInput = Unstamped<Command>;

// Stamps a command at the current tick with the next seq, applies it, and
// queues it. Returns the engine's reason when the command is not legal now
// (nothing is queued then).
export function issue(s: Session, input: CommandInput): { ok: true; command: Command; stoppedAt?: number; stoppedBy?: string | null } | { ok: false; reason: string } {
  const command = { ...input, seq: s.run.lastSeq + 1, tick: s.run.state.tick } as Command;
  const r = applyCommand(s.run, command);
  if (!r.ok) return { ok: false, reason: r.reason };
  s.pending.push(command);
  return { ok: true, command, stoppedAt: r.stoppedAt, stoppedBy: r.stoppedBy };
}

// Applies a command the server built (the skip route) and was stored there.
export function applyServerCommand(s: Session, command: Command): { ok: boolean; reason?: string } {
  if (command.seq <= s.run.lastSeq) return { ok: true };
  const r = applyCommand(s.run, command);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason };
}

export function accepted(s: Session, through: number): void {
  s.pending = s.pending.filter((c) => c.seq > through);
}

export function localHash(s: Session): string {
  return stateHash(s.run.state);
}

// One real-time tick, if the clock runs (a running phase, not blocked, not ended).
export function step(s: Session): boolean {
  return advance(s.run);
}

export function clockRuns(s: Session): boolean {
  return !s.run.state.ended && clockMode(s.run) === "running" && !clockBlocked(s.run);
}
