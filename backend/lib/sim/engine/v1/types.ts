// REQ-162 (docs/sims.md 4.1, 5.2, 8.2, 9.1): the scenario document and the
// engine's public shapes. These types are the source of truth; the zod schema
// in backend/lib/sim/schema.ts must stay mutually assignable with them
// (lib/sim/schema-conformance.test.ts). Rules for this folder: erasable
// TypeScript only, `.ts` on every relative import, no imports outside it.

// Durations are strings with a unit ("90s", "8min", "2h", "7d") so authors
// never confuse seconds and minutes. Every duration must be an exact multiple
// of the clock tick. The tick itself is a whole number of seconds, at least 1.
export type Duration = string;
export type Expr = string; // the expression language, docs/sims.md 4.3
export type Template = string; // plain text with {expr|format} slots, never HTML
export type Id = string; // ^[a-z][a-zA-Z0-9_]{0,47}$
export type Literal = number | boolean | string | Literal[] | { [k: string]: Literal };
export type Unit = string; // "mmHg", "mL/h", "/min", "$", "pts", "%"; dimension-checked by the linter

export interface Source {
  cite: string;
  url?: string;
  note?: string;
  checkedAt: string; // ISO date the author last checked the number against the source
  recheckBy?: string; // default checkedAt + 12 months (+ 6 for clinical and cloud); excluded from the content hash
}

export interface ScenarioDoc {
  schemaVersion: 1;
  engine: { major: 1; minor: number }; // the MINIMUM engine: exactly this major, minor >= this
  slug: string;
  title: string;
  screen: ScreenSpec;
  objective: string;
  secondaryObjectives?: string[];
  sources: Source[];
  brief: { situation: string; handover?: string[]; howItWorks?: string[] };
  safetyNote?: string; // author-facing context only; never shown as a disclaimer (REQ-165: one study notice covers every sim)
  clock: {
    start: string; // "14:00", or "2027-02-01T09:00" for dated sims; display only
    tick: Duration;
    maxDuration: Duration; // hard stop -> the "time_up" ending
    calendar?: "clock" | "date" | "week";
  };
  random?: { streams: Id[] };
  params: Record<Id, Param>;
  catalogs?: Record<Id, Catalog>;
  state: Record<Id, StateVar>;
  history?: Record<Id, History>;
  derived: Record<Id, Derived>;
  processes: Process[];
  tables?: Record<Id, Table>;
  phases: Record<Id, Phase>;
  initialPhase: Id;
  actions: Record<Id, Action>;
  timers: Record<Id, TimerSpec>;
  triggers: Trigger[];
  prompts?: Record<Id, Prompt>;
  reasoning: Record<Id, ReasoningMoment>;
  outcome: OutcomeSpec;
  endings: Record<Id, Ending>; // must include "time_up"
  scoring: Scoring;
}

export interface Param {
  value: Literal;
  unit?: Unit;
  source?: Source; // required by the linter for time, rate and threshold params
}

export interface Catalog {
  fields: Record<Id, FieldSpec>;
  entries: ({ id: string } & Record<Id, Literal>)[]; // at most 5,000 rows, ordered
  source?: Source;
}

export type FieldSpec =
  | { type: "number"; unit?: Unit }
  | { type: "bool" }
  | { type: "string"; max: number }
  | { type: "enum"; values: string[] }
  | { type: "list"; of: "number" | "string" };

export type StateVar =
  | { type: "number"; init: number | Expr; unit?: Unit; min: number; max: number }
  | { type: "bool"; init: boolean }
  | { type: "enum"; values: string[]; init: string }
  | { type: "set"; of: string[]; init: string[] }
  | { type: "time"; init: null }
  | { type: "records"; fields: Record<Id, FieldSpec>; max: number; init: Record<string, Literal>[] };

export interface History {
  of: Expr; // number-valued; may not read history
  every: Duration; // sample interval (multiple of the tick)
  keep: Duration; // how far back; at most 1,000 samples
}

export interface Derived {
  expr: Expr;
  unit?: Unit;
  precision?: number; // display only
}

export interface Process {
  id: Id;
  when?: Expr;
  update: Record<Id, Expr>; // every right-hand side reads the same state, then all writes happen
}

export interface Table {
  rows: { when: Expr; then: Record<Id, Expr>; text?: Template }[];
}

export interface Phase {
  label: string;
  actions: Id[];
  clock: "running" | "turns" | "stopped";
}

export interface Action {
  label: string;
  group: string;
  available?: Expr;
  why?: Template;
  params?: ActionParam[];
  effects: Effect[];
}

export interface Option {
  value: string;
  label: string;
}

// How a command carries each param kind (Command.params, docs/sims.md 5.2):
//   choice   params[id] = the option value; bound as a string-enum name `id`
//   form     params[fieldId] = the option value for each field; each field is
//            bound by its own bare id (the spec's `S == "stop"`)
//   slot     params[id] = the catalogue entry id, params[`${id}.slot`] = the
//            slot; bound as a record `{ id, slot }` (`place.id`, `place.slot`)
//   pick     params[id] = the record's `_id` (a number), or for max > 1 a
//            string of `_id`s joined by ","; bound as a record (or records)
//   command  params[id] = the typed line; bound as a record `{ text, matched }`
//            so `cmd.text` is the line and `cmd.matched` the string-enum of
//            pattern ids plus "none"; captures are bare names inside the
//            matched pattern's cases only
//   query    params[id] = the search text; bound as a string
export type ActionParam =
  | { id: Id; kind: "choice"; label: string; options: Option[] }
  | { id: Id; kind: "form"; label: string; fields: { id: Id; label: string; options: Option[] }[] }
  | { id: Id; kind: "slot"; label: string; catalog: Id; slots: string[] }
  | { id: Id; kind: "pick"; label: string; from: Expr; show: Template; max?: number }
  | { id: Id; kind: "command"; label: string; maxLength: 200; patterns: CommandPattern[]; unmatched: Template }
  | { id: Id; kind: "query"; label: string; fields: Id[]; maxLength: 200 };

export interface CommandPattern {
  id: Id;
  pattern: string; // "ping {host:ipv4}", "show ip route"; capture types word, int, ipv4, cidr, enum(a|b|c)
  cases: { when: Expr; then: Effect[] }[]; // first match; the last case must be unconditional
}

export type Effect =
  | { set: Id; to: Expr }
  | { add: Id; by: Expr }
  | { push: Id; value: Expr | Record<Id, Expr> }
  | { update: Id; where: Expr; set: Record<Id, Expr> }
  | { remove: Id; where: Expr }
  | { schedule: Id; after: Expr | Duration; with?: Record<Id, Expr> }
  | { cancel: Id; where?: Expr }
  | { log: Template; kind?: "act" | "find" | "sys" | "good" | "bad" | "alarm" }
  | { finding: Template }
  | { output: Template | TableView }
  | { phase: Id }
  | { prompt: Id }
  | { reason: Id }
  | { end: Id }
  | { table: Id; into?: Id }
  | { if: Expr; then: Effect[]; else?: Effect[] }
  | { cases: { when: Expr; then: Effect[] }[] }
  | { each: Id; in: Expr; do: Effect[] };

export interface TableView {
  rows: Expr; // records- or catalogue-valued
  columns: { label: string; value: Expr; format?: string }[];
}

export interface TimerSpec {
  label: Template;
  wait?: { skipLabel: Template };
  instances: "one" | "many";
  interruptsSkip?: boolean;
  with?: Record<Id, FieldSpec>;
  source: Source;
  effects: Effect[];
}

export interface Trigger {
  id: Id;
  when: Expr;
  mode: "once" | "edge";
  interruptsSkip?: boolean;
  effects: Effect[];
}

export interface Prompt {
  title: string;
  context: Template;
  choices: { id: Id; label: string; effects: Effect[]; feedback?: Template }[];
}

export interface ReasoningMoment {
  trigger?: Expr;
  question: string;
  parts: { label: string; criteria: string; modelAnswer: string }[]; // server-only
  pausesClock: true;
}

export type OutcomeClass = "target" | "recovered" | "harm";
export type OutcomeProfile = "clinical" | "cloud" | "project" | "fitness" | "security" | "infrastructure" | "data";

export interface OutcomeSpec {
  profile: OutcomeProfile;
  thresholds: Record<Id, { value: number; source: Source }>; // bound as names in expressions; never looser than the profile default
  // docs/sims.md 9.2: "safe but little or no progress" is classified per case,
  // never by a family default. The condition is the end state that means the
  // goal was not meaningfully reached; the class is what the scenario gives
  // it; the rationale says why, with a source. The linter requires it.
  noProgress: { when: Expr; class: OutcomeClass; rationale: string; source: Source };
}

export interface Ending {
  label: string;
  class?: OutcomeClass; // required on every terminal ending, time_up included
  when?: Expr; // required on every terminal ending EXCEPT time_up, which must not have one
  narrative: Template;
  terminal: boolean;
  phase?: Id; // a non-terminal ending is a branch point: the phase it moves to (required when terminal is false)
}

export interface ScreenSpec {
  type: "bedside" | "board" | "dashboard" | "trainer" | "session" | "security" | "terminal" | "data";
  level?: number;
  bedside?: {
    tiles: {
      id: Id;
      label: string;
      spokenLabel: string;
      value: Expr | [Expr, Expr];
      unit: Unit;
      sub?: Template;
      alarm?: { low?: number; high?: number };
      trend?: { history: Id; window: Duration; threshold: number };
      announce: { bands: number[] };
      colour: "ecg" | "art" | "cvp" | "pa" | "spo2" | "neutral";
      hiddenUntil?: Expr;
    }[];
    waveforms?: { kind: "ecg" | "art" | "pleth"; from: { hr: Id; sys?: Id; dia?: Id; flat?: Expr } }[];
    infusions?: Template;
    banner?: { when: Expr; text: Template }[];
  };
  // REQ-190: the architecture board's topology, display-only like the
  // bedside tiles. Each zone (an edge, a subnet per AZ, a Region, an
  // account) lists the items whose `when` holds on the current state;
  // meters are short read-outs (cost, availability). The renderer evaluates
  // the bindings; it never holds a rule of its own (docs/sims.md 3, 8.2).
  board?: {
    zones: { id: Id; label: string; spokenLabel: string; items: { label: Template; when: Expr }[] }[];
    meters?: { id: Id; label: string; value: Template }[];
  };
}

export type CriterionScore = "met" | "partial" | "missed";
// REQ-190: a criterion row may also score "na" (not applicable), left out of
// the process score's numerator and denominator, like a grader failure (9.1).
// A spliced module's criteria use it when the module never ran (a code
// criterion in a run with no arrest). Reasoning grades never use it.
export type CriterionRowScore = CriterionScore | "na";

export interface Scoring {
  criteria: {
    id: Id;
    label: string;
    weight: number;
    critical?: boolean;
    rows: { when: Expr; score: CriterionRowScore; why: Template }[]; // first match
  }[];
  reasoningCriteria: { moment: Id; label: string; weight: number; critical?: boolean }[];
  kpis: { id: Id; label: string; value: Expr; format: "duration" | "number" | "usd"; expert?: string }[];
  expertPath: { at: string; text: string }[];
  debrief: Record<Id, { headline: string; body: Template }>;
  modelReasoning: string;
}

// ---- Commands (docs/sims.md 5.2) ----

export type CommandParams = Record<string, string | number>;

export type Command =
  | { seq: number; tick: number; type: "act"; action: Id; params?: CommandParams }
  | { seq: number; tick: number; type: "choose"; prompt: Id; choice: Id }
  | { seq: number; tick: number; type: "skip"; timer: Id; instance: number; to: number }
  | { seq: number; tick: number; type: "pause"; reason: "learner" | "background" | "stall" | "idle" }
  | { seq: number; tick: number; type: "resume" }
  | { seq: number; tick: number; type: "reason"; moment: Id; answered: boolean }
  | { seq: number; tick: number; type: "end"; reason: "learner_quit" };

// ---- Engine values and run state ----

export type RecordValue = { _id: number; [field: string]: number | boolean | string | (number | string)[] };

export type Value = number | boolean | string | null | Value[] | RecordValue | { [k: string]: Value };

export interface TimerInstance {
  id: number;
  timer: Id;
  due: number;
  with: Record<string, Value>;
}

export interface LogEntry {
  tick: number;
  kind: "act" | "find" | "sys" | "good" | "bad" | "alarm" | "skip" | "pause";
  text: string;
}

export interface OutputBlock {
  tick: number;
  text?: string;
  table?: { columns: string[]; rows: string[][] };
}

export interface SkipRecord {
  seq: number;
  from: number;
  to: number; // the tick the skip stopped at
  target: number;
  timer: Id;
  instance: number;
  stoppedBy: string | null;
}

export interface RunEnd {
  ending: Id | null; // null when the learner quit
  class: OutcomeClass | null;
  tick: number;
  reason: "ending" | "time_up" | "learner_quit" | "engine_error";
  detail?: string;
}

// Everything the state hash covers and a checkpoint restores. Plain data
// only, so it can be cloned and serialised without engine code.
export interface SimState {
  tick: number;
  phase: Id;
  vars: Record<Id, Value>;
  recordCounters: Record<Id, number>;
  history: Record<Id, number[]>;
  timers: TimerInstance[]; // sorted by (due, id)
  timerCounter: number;
  streams: Record<Id, number>; // mulberry32 state per stream
  triggerPrev: boolean[]; // one per trigger, document order
  triggerFired: boolean[];
  firedEndings: Id[]; // non-terminal endings already fired
  openPrompt: Id | null;
  openReasoning: Id | null;
  reasoningOpened: Id[]; // every moment opened so far (once each)
  ended: RunEnd | null;
}

export interface Checkpoint {
  engine: string; // ENGINE_VERSION
  tick: number;
  lastSeq: number;
  state: SimState;
  log: LogEntry[];
  outputs: OutputBlock[];
  findings: { tick: number; text: string }[];
  skips: SkipRecord[];
  commands: Command[];
  realtimeTicks: number;
  skippedTicks: number;
  evaluations: number;
}

export interface WaitInfo {
  timer: Id;
  instance: number;
  due: number;
  label: string;
  skipLabel: string;
}

export type Rating = "good" | "mediocre" | "bad";

export interface CriterionResult {
  id: Id;
  label: string;
  weight: number;
  critical: boolean;
  score: CriterionRowScore;
  why: string;
}

export interface ReasoningGrade {
  moment: Id;
  score: CriterionScore | "grader_failed";
}

export interface DebriefData {
  ending: Id | null;
  endingLabel: string;
  outcomeClass: OutcomeClass | null;
  rating: Rating | null;
  processScore: number | null;
  criteria: CriterionResult[];
  reasoning: { moment: Id; label: string; weight: number; critical: boolean; score: CriterionScore | "grader_failed" }[];
  kpis: { id: Id; label: string; value: string; raw: Value; expert?: string }[];
  headline: string;
  body: string;
  timeline: { tick: number; time: string; text: string; kind: "act" | "choose" | "skip" | "pause" | "resume" | "reason" | "end" }[];
  skippedTicks: number;
  realtimeTicks: number;
  skips: number;
  pausedSeconds: number;
  seed: number;
  expertPath: { at: string; text: string }[];
  modelReasoning: string;
}

export type Problem = { level: "error" | "warning"; path: string; message: string };
