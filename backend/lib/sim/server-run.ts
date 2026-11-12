// REQ-190 (docs/sims.md 5.3, 5.7, 5.10, 7, 10): the server's side of a run,
// without the database. The routes (lib/sims.ts) load a run's pinned
// document, seed, checkpoint and stored commands, and call these to replay
// them through the deterministic engine. The server's replay is the record:
// the app sends commands only, never a state or a score.
import {
  advance,
  applyCommand,
  checkpoint as takeCheckpoint,
  clockBlocked,
  createRun,
  renderTemplate,
  restoreRun,
  simTimeText,
} from "./engine/v1/index.ts";
import type { Checkpoint, Command, Pace, Rating, Run, ScenarioDoc } from "./engine/v1/index.ts";
import { PACE_EXAM, PACE_STUDY } from "./engine/v1/index.ts";

// ---- switches (docs/sims.md 11.1) ----

function isOff(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  return s === "" || s === "0" || s === "false" || s === "off" || s === "no";
}

// SIMS_ENABLED: off unless set (the billingEnabled parser).
export function simsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return !isOff(env.SIMS_ENABLED);
}

// SIMS_RENDERERS: the screen types that are on. The design's default was
// "bedside"; Nick's first flagship is the TicketBurst board (19.4 item 1),
// so the default is both renderers this release ships. REQ-225 adds the
// client session (the people layer) to the default so testers see it;
// SIMS_RENDERERS=bedside,board turns it off again without a release.
// REQ-231 adds the security operations console ("security-console").
// REQ-232 adds the PT treatment session ("treatment-session") the same way.
// REQ-237 adds the terminal and network screen ("terminal").
export const DEFAULT_RENDERERS = ["bedside", "board", "session", "security-console", "treatment-session", "terminal"] as const;
export function renderersOn(env: Record<string, string | undefined> = process.env): string[] {
  const raw = env.SIMS_RENDERERS;
  if (raw === undefined || raw.trim() === "") return [...DEFAULT_RENDERERS];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// SIMS_SERVE_UNREVIEWED: on unless explicitly off (19.4 item 5: content is
// served as built, under the one study notice).
export function serveUnreviewed(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env.SIMS_SERVE_UNREVIEWED ?? "").trim().toLowerCase();
  return !(v === "off" || v === "0" || v === "false" || v === "no");
}

// ---- limits (docs/sims.md 7) ----

export const SIM_LIMITS = {
  commandsPerRequest: 500,
  commandsPerRun: 5000,
  replayBudget: 20_000_000, // expression evaluations per request
  checkpointEvery: 300, // ticks
  speedToleranceSeconds: 5,
  speedToleranceFraction: 0.01,
  heartbeatMinMs: 2000,
  reasoningMax: 2000, // characters per moment (15)
  paramTextMax: 200,
  offlineSeconds: 120, // real-time ticks unseen by the server before a sync counts as offline play (5.7)
} as const;

// ---- capabilities (docs/sims.md 5.10) ----

export interface SimCaps {
  protocol: number;
  engines: { major: number; minor: number }[];
  renderers: { type: string; level: number }[];
}

// The app sends `x-sim-caps: protocol=1;engine=1.0;renderers=bedside@3,board@3`.
// Anything malformed is "no capabilities": every version is "Update the app".
export function parseCaps(header: string | null | undefined): SimCaps | null {
  if (!header || header.length > 300) return null;
  const caps: SimCaps = { protocol: 0, engines: [], renderers: [] };
  for (const part of header.split(";")) {
    const [k, v] = part.split("=").map((s) => (s ?? "").trim());
    if (!k || v === undefined) continue;
    if (k === "protocol" && /^\d{1,3}$/.test(v)) caps.protocol = Number(v);
    if (k === "engine") {
      for (const e of v.split(",")) {
        const m = /^(\d{1,3})\.(\d{1,4})$/.exec(e.trim());
        if (m) caps.engines.push({ major: Number(m[1]), minor: Number(m[2]) });
      }
    }
    if (k === "renderers") {
      for (const r of v.split(",")) {
        // REQ-231 (FAIL-1320; REQ-232 found the same bug, FAIL-1340): a screen type may contain a hyphen
        // ("security-console"); the old pattern dropped it silently, so the
        // server thought the app could not run the console. Same 40-character
        // limit as sims.screen_type.
        const m = /^([a-z][a-z-]{0,39})@(\d{1,3})$/.exec(r.trim());
        if (m) caps.renderers.push({ type: m[1], level: Number(m[2]) });
      }
    }
  }
  return caps.protocol >= 1 ? caps : null;
}

export interface VersionNeeds {
  engine_major: number;
  engine_minor: number;
  renderer_level: number;
  screen_type: string;
}

export function runnable(v: VersionNeeds, caps: SimCaps | null): boolean {
  if (!caps) return false;
  const engineOk = caps.engines.some((e) => e.major === v.engine_major && e.minor >= v.engine_minor);
  const rendererOk = caps.renderers.some((r) => r.type === v.screen_type && r.level >= v.renderer_level);
  return engineOk && rendererOk;
}

// ---- commands from the app ----

const ID = /^[a-z][a-zA-Z0-9_]{0,47}$/;
const PAUSE_REASONS = new Set(["learner", "background", "stall", "idle"]);

function isInt(v: unknown, min = 0, max = 2 ** 31 - 1): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

// Shape-checks one command (the engine checks whether it is legal). Returns
// the clean command, or the reason it is malformed.
export function parseCommand(raw: unknown): Command | string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "a command must be an object";
  const c = raw as Record<string, unknown>;
  if (!isInt(c.seq, 1)) return "seq must be a positive integer";
  if (!isInt(c.tick, 0)) return "tick must be a non-negative integer";
  const base = { seq: c.seq, tick: c.tick };
  switch (c.type) {
    case "act": {
      if (typeof c.action !== "string" || !ID.test(c.action)) return "act needs an action id";
      let params: Record<string, string | number> | undefined;
      if (c.params !== undefined) {
        if (!c.params || typeof c.params !== "object" || Array.isArray(c.params)) return "params must be an object";
        const entries = Object.entries(c.params as Record<string, unknown>);
        if (entries.length > 20) return "too many params";
        params = {};
        for (const [k, v] of entries) {
          if (!/^[a-z][a-zA-Z0-9_.]{0,63}$/.test(k)) return `bad param name ${k.slice(0, 40)}`;
          if (typeof v === "string") {
            if (v.length > SIM_LIMITS.paramTextMax) return `param ${k} is too long`;
            // eslint-disable-next-line no-control-regex
            if (/[\u0000-\u001f\u007f]/.test(v)) return `param ${k} has control characters`;
            params[k] = v;
          } else if (typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && Math.abs(v) < 2 ** 31) {
            params[k] = v;
          } else return `param ${k} must be a string or an integer`;
        }
      }
      return params ? { ...base, type: "act", action: c.action, params } : { ...base, type: "act", action: c.action };
    }
    case "choose":
      if (typeof c.prompt !== "string" || !ID.test(c.prompt) || typeof c.choice !== "string" || !ID.test(c.choice)) return "choose needs a prompt and a choice";
      return { ...base, type: "choose", prompt: c.prompt, choice: c.choice };
    case "skip":
      if (typeof c.timer !== "string" || !ID.test(c.timer) || !isInt(c.instance, 1) || !isInt(c.to, 1)) return "skip needs a timer, an instance and a due tick";
      if (c.calm !== undefined && c.calm !== true) return "skip calm must be true when present";
      return c.calm === true ? { ...base, type: "skip", timer: c.timer, instance: c.instance, to: c.to, calm: true } : { ...base, type: "skip", timer: c.timer, instance: c.instance, to: c.to };
    case "pause":
      if (typeof c.reason !== "string" || !PAUSE_REASONS.has(c.reason)) return "pause needs a reason";
      return { ...base, type: "pause", reason: c.reason as "learner" };
    case "resume":
      return { ...base, type: "resume" };
    case "reason":
      if (typeof c.moment !== "string" || !ID.test(c.moment) || typeof c.answered !== "boolean") return "reason needs a moment and answered";
      return { ...base, type: "reason", moment: c.moment, answered: c.answered };
    case "end":
      if (c.reason !== "learner_quit") return "end needs reason learner_quit";
      return { ...base, type: "end", reason: "learner_quit" };
    // REQ-209: none of these four changes sim state
    case "pace":
      if (c.pace !== PACE_EXAM && c.pace !== PACE_STUDY) return "pace must be 1 or 3";
      return { ...base, type: "pace", pace: c.pace as Pace };
    case "begin":
      if (c.start !== "focused") return "begin needs start focused";
      return { ...base, type: "begin", start: "focused" };
    case "teach":
      if (typeof c.prompt !== "string" || !ID.test(c.prompt) || typeof c.choice !== "string" || !ID.test(c.choice)) return "teach needs a prompt and a choice";
      return { ...base, type: "teach", prompt: c.prompt, choice: c.choice };
    case "chapter":
      if (typeof c.chapter !== "string" || !ID.test(c.chapter) || (c.choice !== "continue" && c.choice !== "later")) return "chapter needs a chapter and continue or later";
      return { ...base, type: "chapter", chapter: c.chapter, choice: c.choice };
    default:
      return "unknown command type";
  }
}

export function parseCommands(raw: unknown): Command[] | string {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return "commands must be a list";
  if (raw.length > SIM_LIMITS.commandsPerRequest) return `at most ${SIM_LIMITS.commandsPerRequest} commands per request`;
  const out: Command[] = [];
  for (const r of raw) {
    const c = parseCommand(r);
    if (typeof c === "string") return `command ${out.length + 1}: ${c}`;
    if (out.length && c.seq !== out[out.length - 1].seq + 1) return "commands must have consecutive seq numbers";
    out.push(c);
  }
  return out;
}

// A stored command and a resent one are the same command (idempotent resend).
export function sameCommand(a: Command, b: Command): boolean {
  return canonical(a) === canonical(b);
}
function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(",")}}`;
}

// ---- replay ----

export class ReplayBudgetError extends Error {
  constructor() {
    super("This sync needs more work than one request allows. Send fewer commands at a time.");
    this.name = "ReplayBudgetError";
  }
}

export interface ReplayResult {
  run: Run;
  // The first command the engine refused, if any (later ones were not tried).
  rejected: { seq: number; reason: string } | null;
  // The highest seq applied.
  acceptedThrough: number;
  // A new checkpoint (Pre(k) at a command boundary at least `every` ticks
  // after the previous one), or null.
  checkpoint: Checkpoint | null;
  // Set when a skip stopped (the tick it stopped at, and why if early).
  stoppedAt: number | null;
  stoppedBy: string | null;
  // Set when `toTick` could not be reached (the clock is stopped, blocked or
  // in a turns phase, and the run has not ended).
  unreachable: string | null;
}

export interface ReplayInput {
  doc: ScenarioDoc;
  seed: number;
  from: Checkpoint | null;
  // Every command after the checkpoint, stored and new, in seq order.
  commands: Command[];
  // Advance real time to this tick after the last command (a heartbeat, or
  // the tick the app reached an ending at). Never past an ending.
  toTick?: number | null;
  every?: number;
  budget?: number;
}

function stepUntil(run: Run, tick: number, guardBudget: () => void): string | null {
  while (run.state.tick < tick && !run.state.ended) {
    if (!advance(run)) {
      return clockBlocked(run) ? "the clock is blocked by a prompt or reasoning moment" : `phase ${run.state.phase} does not run in real time`;
    }
    if (run.state.tick % 300 === 0) guardBudget();
  }
  return null;
}

// Restores the checkpoint (or starts the run) and applies the commands, as
// the engine's own replay() does, but also takes the next checkpoint, stops
// at the first rejection without throwing, and enforces the per-request
// evaluation budget (docs/sims.md 7). Deterministic.
export function replayRun(input: ReplayInput): ReplayResult {
  const every = input.every ?? SIM_LIMITS.checkpointEvery;
  const budget = input.budget ?? SIM_LIMITS.replayBudget;
  const run = input.from ? restoreRun(input.doc, input.seed, input.from) : createRun(input.doc, input.seed);
  const startEvals = run.evaluations;
  const guardBudget = () => {
    if (run.evaluations - startEvals > budget) throw new ReplayBudgetError();
  };
  let lastCpTick = input.from ? input.from.tick : 0;
  let cp: Checkpoint | null = null;
  let prevTick = -1;
  let stoppedAt: number | null = null;
  let stoppedBy: string | null = null;
  for (const cmd of input.commands) {
    if (cmd.seq <= run.lastSeq) continue;
    if (cmd.tick > run.state.tick) {
      const why = stepUntil(run, cmd.tick, guardBudget);
      if (why || run.state.tick !== cmd.tick) {
        return { run, rejected: { seq: cmd.seq, reason: `tick ${cmd.tick} is unreachable: ${why ?? "the run has ended"}` }, acceptedThrough: run.lastSeq, checkpoint: cp, stoppedAt, stoppedBy, unreachable: null };
      }
    }
    // Pre(k): we just reached this tick and nothing stamped k is applied yet.
    if (run.state.tick !== prevTick && run.state.tick - lastCpTick >= every && !run.state.ended) {
      cp = takeCheckpoint(run);
      lastCpTick = run.state.tick;
    }
    const r = applyCommand(run, cmd);
    guardBudget();
    if (!r.ok) return { run, rejected: { seq: r.seq, reason: r.reason }, acceptedThrough: run.lastSeq, checkpoint: cp, stoppedAt, stoppedBy, unreachable: null };
    if (r.stoppedAt !== undefined) {
      stoppedAt = r.stoppedAt;
      stoppedBy = r.stoppedBy ?? null;
    }
    prevTick = cmd.tick;
  }
  let unreachable: string | null = null;
  if (input.toTick != null && input.toTick > run.state.tick) {
    unreachable = stepUntil(run, input.toTick, guardBudget);
  }
  return { run, rejected: null, acceptedThrough: run.lastSeq, checkpoint: cp, stoppedAt, stoppedBy, unreachable };
}

// The speed bound (5.7): real-time ticks may not outrun the server's wall
// clock since the run started, plus 5 s and 1%.
export function withinSpeedBound(realtimeTicks: number, dtSeconds: number, wallSeconds: number): boolean {
  const simSeconds = realtimeTicks * dtSeconds;
  return simSeconds <= wallSeconds * (1 + SIM_LIMITS.speedToleranceFraction) + SIM_LIMITS.speedToleranceSeconds;
}

// The speed bound with pacing (REQ-209, 5.7). Each real-time tick is charged
// at the pace logged when it was played, so the fewest wall seconds the run
// could have taken is the sum over segments of (ticks x dt / pace), which the
// engine keeps as minWallSeconds(run). It may not exceed the server's wall
// clock since the run started plus the same 5 s and 1%. A run whose ticks are
// all at 1x (every run before REQ-209, and every run that never logs a pace)
// gets exactly the old check; a client that logs 1x and plays 3x is over the
// bound after the same tolerance. The bound is cumulative on purpose: offline
// play synced later carries no per-segment wall times the server could trust.
export function withinPacedSpeedBound(minWallSeconds: number, wallSeconds: number): boolean {
  return minWallSeconds <= wallSeconds * (1 + SIM_LIMITS.speedToleranceFraction) + SIM_LIMITS.speedToleranceSeconds;
}

// ---- who may use the pacing features (REQ-209, docs/sims.md 5.4a) ----

export type SimSafetyFamily = "clinical" | "fitness" | "general";

// The pacing features (pace 3x, focused start, calm-skip offer, teaching
// prompts, chapters) apply to a scenario with a `running` phase in a clinical
// or fitness track, and to nothing else: the cloud and PM sims are turn-based
// and stay exactly as they were.
export function pacingEligible(doc: Pick<ScenarioDoc, "phases">, family: SimSafetyFamily): boolean {
  if (family === "general") return false;
  return Object.keys(doc.phases).some((k) => doc.phases[k].clock === "running");
}

export const PACING_COMMAND_TYPES = new Set(["pace", "begin", "teach", "chapter"]);

// The reason a batch of commands may not be accepted for this scenario, or
// null. 1x is the default everywhere, so a pace of 1 is always fine; anything
// else, and the other three command types and the calm flag, need eligibility.
export function pacingRefusal(cmds: Command[], eligible: boolean): string | null {
  if (eligible) return null;
  for (const c of cmds) {
    if (c.type === "pace" && c.pace === PACE_EXAM) continue;
    if (PACING_COMMAND_TYPES.has(c.type)) return `${c.type} is not available in this simulation`;
    if (c.type === "skip" && c.calm === true) return "the skip offer is not available in this simulation";
  }
  return null;
}

// Whether the learner has acted or anything was revealed (9.4).
export function isRevealed(run: Run): boolean {
  return (
    run.commands.some((c) => c.type === "act" || c.type === "choose") ||
    run.state.reasoningOpened.length > 0 ||
    run.state.firedEndings.length > 0 ||
    (run.state.ended !== null && run.state.ended.reason !== "learner_quit")
  );
}

// The rating is the attempt's verdict (9.2).
export function verdictFor(rating: Rating): "correct" | "partial" | "incorrect" {
  return rating === "good" ? "correct" : rating === "mediocre" ? "partial" : "incorrect";
}

// Paused wall time for the debrief (pause changes no state, 5.2): from each
// pause command's arrival to the next resume's, as the server saw them.
// Display-only; never scored (5.4).
export function pausedSeconds(rows: { type: string; received_at: string | Date }[]): number {
  let total = 0;
  let since: number | null = null;
  for (const r of rows) {
    const at = new Date(r.received_at).getTime();
    if (r.type === "pause" && since === null) since = at;
    else if (r.type === "resume" && since !== null) {
      total += Math.max(0, at - since);
      since = null;
    }
  }
  return Math.round(total / 1000);
}

// ---- grading context (docs/sims.md 10) ----

function tileText(run: Run, tile: { label: string; value: string | [string, string]; unit: string }): string {
  try {
    const v = Array.isArray(tile.value) ? `{${tile.value[0]}|0dp}/{${tile.value[1]}|0dp}` : `{${tile.value}|1dp}`;
    return `${tile.label} ${renderTemplate(run, v, null)} ${tile.unit}`;
  } catch {
    return `${tile.label} unavailable`;
  }
}

// A deterministic summary of what the learner could see when the moment
// opened, built by the engine, never by the model: the bound tiles, the
// findings shown so far and the actions taken.
export function situationSummary(run: Run, maxItems = 12): string {
  const doc = run.c.doc;
  const lines: string[] = [`Sim time: ${simTimeText(run)}.`];
  const tiles = doc.screen.bedside?.tiles ?? [];
  if (tiles.length) lines.push(`Monitor: ${tiles.map((t) => tileText(run, t)).join("; ")}.`);
  const findings = run.findings.slice(-maxItems).map((f) => `- ${f.text}`);
  if (findings.length) lines.push(`Findings shown:\n${findings.join("\n")}`);
  const acts = run.log.filter((l) => l.kind === "act").slice(-maxItems).map((l) => `- ${simTimeText(run, l.tick)} ${l.text}`);
  if (acts.length) lines.push(`Actions taken:\n${acts.join("\n")}`);
  return lines.join("\n");
}
