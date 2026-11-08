# Sim labs (REQ-141): engine design, Phase 1

**Status: design, proposed. Nothing in this document is built yet.** It is
the plan for Ascendra's interactive simulations ("sim labs"), written to be
reviewed before any code. Decisions that need Nick are collected at the end
under "Open questions for Nick", each with a recommendation.

Sim labs are the product's main paid differentiator. Nick's instruction for
this work: "I care little about the time it will take and more that overall
quality is present." The design therefore favours correctness, honesty about
time, and testability over the shortest path.

Related documents: `docs/labs.md` (build and case labs, whose patterns this
reuses), `docs/billing.md` (tiers), `docs/deploy-runbook-mastery.md` and
migrations 029-045 (the mastery rule), migrations 050 and 051 (the lab
engine and the practice-lab acknowledgement).

## Contents

1. Summary of the key decisions
2. Goals and non-goals
3. What the four prototypes teach us
4. The scenario document (schema, expressions, versioning, hashing)
5. Engine architecture and the time model
6. Persistence
7. API routes
8. Mobile architecture and the bedside-monitor renderer
9. Scoring, debrief and mastery
10. Grading the written-reasoning moments
11. Tiers, the switch, disclaimers and review
12. Authoring, seeding and (later) generation
13. Accessibility
14. Performance and cost per run
15. Security
16. Testing strategy
17. Rollout phases and exit criteria
18. Risks
19. Open questions for Nick

---

## 1. Summary of the key decisions

1. **A scenario is a versioned JSON document, not code.** One engine runs
   every sim. A scenario declares its state, parameters, rules, actions,
   timers, triggers, endings and scoring criteria, using a small expression
   language that is parsed and type-checked, never `eval`'d. New sims are
   authored (later generated), linted, seeded and reviewed the way labs are.
2. **One deterministic engine, run on both sides.** The same pure
   TypeScript engine runs in the app (so the monitor is live, smooth and
   works offline) and on the server (which replays the learner's action log
   to verify the run and compute the score). The server's replay is the
   record. A score the app reports is never trusted.
3. **Simulated time is real time.** One sim minute takes one real minute.
   The learner can skip ahead only while waiting on something the scenario
   names (a surgeon walking over, labs, a training week), the skip is shown
   and logged, and the state evolves through every skipped tick at real
   rates. A skip stops early if an alarm fires. The clock never runs while
   the learner is away; leaving the app pauses it.
4. **State is a pure function of (scenario version, seed, command log).**
   That one invariant gives replay, audit, resume on another device,
   cheat resistance and golden tests from a single mechanism. The engine
   uses its own deterministic maths (no `Math.exp`, `Math.sin`, `**`) so
   Hermes, V8 and JavaScriptCore produce bit-identical state.
5. **A finished run is one mastery attempt** on the scenario's objective,
   a new assessment type `sim_run` in a new format family `simulation`,
   weight 1.5, application level. Repeats count lightly through the
   existing repeat rule. The mastery rule itself is not changed.
6. **AI only grades writing.** Each written-reasoning moment is graded with
   the lab per-part pattern (fenced learner text, authored rubric, trivial
   answers never sent). No model call per tick, per action, or for the
   score. A debrief narrative from the model is optional and off.
7. **Gated like labs, plus a switch.** `SIMS_ENABLED` (off by default)
   hides sims everywhere. Sims are Pro with one sample per course for Free
   and Plus, carry the lab disclaimer and the one-time clinical/fitness
   acknowledgement, and show "Awaiting expert review" until a person
   approves the version. Unreviewed sims are served by default
   (`SIMS_SERVE_UNREVIEWED`), as labs are; review is Nick's, at his pace,
   and no rollout phase waits on it.
8. **Accessibility is designed in, not added.** Monitor values are read on
   demand and announced only when they cross an authored band or an alarm
   changes, never every second. Pause is always available (WCAG 2.2.1), so
   a screen-reader user is never raced by the clock.

## 2. Goals and non-goals

**Goals (Phase 1).**

- A sim engine that can run every planned subject family without engine
  changes: bedside monitor (clinical), architecture board (cloud), project
  dashboard (PM), client trainer (fitness), terminal/network (CompTIA),
  treatment session (physical therapy). Section 3 shows each prototype
  mapped onto the schema.
- Phase 1 ships one renderer, the **bedside monitor**, and a first set of
  clinical scenarios, starting with the post-cardiac-surgery tamponade case
  from the critical-care prototype.
- Realistic time, correct across backgrounding, phone sleep, app kill,
  sign-out and resume on another device.
- Deterministic, rules-based state and scoring; AI only for written
  reasoning.
- A finished sim counts as mastery evidence, once per run, lightly on
  repeats.
- Behind a switch, tier-gated, disclaimed, review-tracked, reportable.
- WCAG 2.1 AA, screen-reader operable, 48 dp targets, reduced motion, one
  hand on a phone.

**Non-goals (Phase 1).**

- Validated physiology. The models are simplified teaching models, and the
  disclaimer says so. Making them more faithful is content work inside the
  same schema, not engine work.
- Free-form natural-language actions. Actions are chosen from what the
  scenario offers (with parameters such as a dose or an SBAR form). The
  terminal renderer (later) maps typed commands through declared patterns,
  still without AI.
- Multiplayer, instructor dashboards, or live instructor control.
- A visual scenario editor. Authors write JSON with the linter; the review
  packet (section 12) is the readable view.
- The scenario generator. Designed for in section 12, built later.
- Renderers other than the bedside monitor.

## 3. What the four prototypes teach us

The prototypes (`critical-care`, `cloud`, `project`, `fitness`, plus the
shared brief) define the target experience: the learner acts, the situation
reacts over time, consequences show up, then a scored debrief. Each one
hand-codes a rules table; the engine's job is to make those tables data.
What each needs from the engine:

**Critical care (tamponade after CABG).** Continuous hidden state (`T`, clot
compression, growing at a fixed rate after drainage stops), derived vitals
that are formulas of state (HR, ABP, CVP, PAOP, CI, SvO2, urine, lactate),
decaying effects (each fluid bolus offsets compression with an
exponential decay, each later bolus smaller), drips with dose choices,
assessments whose text depends on state bands, an SBAR call built from four
choices whose combination decides whether the surgeon comes, delayed results
(echo in 5 min, labs in 4, surgeon in 8), a condition-triggered reasoning
pause, a terminal condition (PEA arrest when compression passes a
threshold), path classification at a moment (early / bridge / late), a second
phase with discrete choices, timed criteria ("tubes checked within 5 min of
onset"), KPIs (time to recognition) and an expert path. The revised version
runs a real-time 1x clock with "Skip to..." buttons while waiting.

**Cloud (ticket on-sale launch day).** Two phases. A **build phase**: place
components from a catalogue into slots (edge, public/private subnets per AZ,
regional), configure some (ASG size, min, max), within a budget, with a live
requirements checklist. Then a **run phase**: a fixed day of events (normal
traffic, on-sale spike, AZ failure, a finance cut) where, for each event and
each area (network, compute, edge, database), the first matching row of an
ordered rule table decides held / degraded / broke and the minutes charged
against the error budget. Everything is derived from the design.

**Project (hybrid PMP project, 12 weeks).** Weekly decision cards with 3-4
choices, each with effects on stakeholder scores, cost, velocity
multipliers over a week range, a risk register, flags, and **delayed
consequences** ("this traces back to week 2"). Earned-value numbers are
formulas over the weekly curve and the active multipliers.

**Fitness (NASM, 8 weeks).** An intake decision (PAR-Q+ red flag: refer,
modify, proceed), an assessment (overhead squat compensations to identify),
a program built from options, classification of the program into a path by
ordered predicates, weekly progression read from per-path arrays (last value
repeats), life events (DOMS after week 1, a missed week chosen by a **seeded
random generator**, a week-4 reassessment), and drop-out endings.

**What the engine must therefore provide.** Numeric, boolean, enum, set and
record-list state; derived values; per-tick continuous updates; one-shot
and decaying effects; scheduled timers; condition triggers; ordered
first-match tables; parameterised actions (choices, forms, catalogue
placement); phases with their own action sets; decision prompts that pause
the clock; seeded randomness; endings; criteria with access to the action
log; KPIs; and an expert path. Nothing in the list is subject-specific, which
is why one engine can serve all six families.

**Mapping the six renderers onto the schema** (later sections define the
terms):

| Renderer | State it binds | Typical actions | Time |
|---|---|---|---|
| Bedside monitor | numeric vitals, drips, pending results | assess, order, titrate, call (form) | 1 s tick, minutes |
| Architecture board | `items` record list (type, slot, config), derived facts | place, remove, configure, run day | build untimed; run 1 min tick, skips between events |
| Project dashboard | EV numbers, stakeholder scores, register set, modifiers | decision cards (prompts) | 1 h tick, skip to next week's card |
| Client trainer | pain, OHSA severity, body fat, adherence | intake, assessment picks, program form, weekly replies | 1 h tick, skip to next session |
| Terminal / network | devices as records (interfaces, ACLs, routes) | commands mapped by declared patterns | 1 s tick |
| Treatment session | pain, ROM, HR/BP response, fatigue | interventions with dose, rest, re-test | 1 s tick, skips during rest/sets |

The renderer decides how things look and how a learner picks actions. The
document decides what exists and what happens. A renderer never contains a
rule.

## 4. The scenario document

### 4.1 Shape

A scenario is one JSON document. TypeScript types (the zod schema in
`backend/lib/sim/schema.ts` mirrors these exactly; a JSON Schema is
generated from the zod schema for editors and the generator):

```ts
// Durations are strings with a unit ("90s", "8min", "2h", "7d") so authors
// never confuse seconds and minutes; the parser turns them into ticks.
type Duration = string;
type Expr = string;          // the expression language, section 4.3
type Template = string;      // plain text with {expr|format} slots, no HTML
type Id = string;            // ^[a-z][a-zA-Z0-9_]{0,47}$

interface Source {            // required on every timing, rate and threshold
  cite: string;               // a guideline, textbook, vendor doc or exam outline
  url?: string;
  note?: string;              // how the number was derived or simplified
}

interface ScenarioDoc {
  schemaVersion: 1;
  engine: { major: 1 };                 // engine semantics this was written for
  slug: string;                         // stable identity within the objective
  title: string;
  family: "clinical" | "fitness" | "general";
  screen: ScreenSpec;                   // renderer + bindings, section 8
  objective: string;                    // exact objective title (seed resolves it)
  secondaryObjectives?: string[];       // analytics only in Phase 1
  sources: Source[];                    // exam outline(s) and clinical refs
  brief: { situation: string; handover?: string[]; howItWorks?: string[] };
  safetyNote?: string;

  clock: {
    start: string;                      // "14:00" or "Mon 09:00"; display only
    tick: Duration;                     // engine step; also the real-time step
    maxDuration: Duration;              // hard stop -> ending "time_up"
    calendar?: "clock" | "day-week";    // how the renderer prints sim time
  };
  random?: { streams: Id[] };           // named seeded streams, section 5.6

  params: Record<Id, Param>;            // constants with units and sources
  state: Record<Id, StateVar>;          // everything that changes
  derived: Record<Id, Derived>;         // recomputed every tick, read-only
  processes: Process[];                 // continuous per-tick updates
  tables?: Record<Id, Table>;           // ordered first-match rule tables
  phases: Record<Id, Phase>;            // which actions/prompts are live
  initialPhase: Id;
  actions: Record<Id, Action>;
  timers: Record<Id, TimerSpec>;        // scheduled by effects, fire later
  triggers: Trigger[];                  // condition -> effects, each tick
  prompts?: Record<Id, Prompt>;         // decision cards (pause the clock)
  reasoning: Record<Id, ReasoningMoment>; // at least one per scenario
  endings: Record<Id, Ending>;
  scoring: Scoring;                     // server-only, section 9
  goldenPaths: GoldenPath[];            // tests, section 16; server-only
}
```

The building blocks:

```ts
type Unit = string;                     // "mmHg", "mL/h", "L/min/m²", "$", "pts", "%"

interface Param {
  value: number | boolean | string | number[];
  unit?: Unit;
  source?: Source;                      // required by the linter for time/rate/threshold params
}

type StateVar =
  | { type: "number"; init: number | Expr; unit?: Unit; min: number; max: number; precision?: number }
  | { type: "bool"; init: boolean }
  | { type: "enum"; values: string[]; init: string }
  | { type: "set"; of: string[]; init: string[] }             // e.g. the risk register
  | { type: "time"; init: null }                               // a tick, or null: "when X first happened"
  | { type: "records"; fields: Record<Id, FieldSpec>; max: number; init: object[] }; // cloud items

interface Derived { expr: Expr; unit?: Unit; precision?: number; min?: number; max?: number }

interface Process {                     // runs once per tick, in order
  id: Id;
  when?: Expr;                          // default: always
  update: Record<Id, Expr>;             // state var -> new value; "dt" is the tick in seconds
}

interface Table {                       // first row whose `when` is true wins
  rows: { when: Expr; then: Record<Id, Expr>; text?: Template }[];
}

interface Phase {
  label: string;
  actions: Id[];                        // which actions are offered in this phase
  clock: "running" | "stopped";        // "stopped" for an untimed build phase
}

interface Action {
  label: string;
  group: string;                        // renderer groups: "Assess", "Orders", "Drips", "Call"
  available?: Expr;                     // greyed out (with `why`) when false
  why?: Template;                       // shown and spoken when unavailable
  takes?: Duration;                     // sim time the action itself costs (default 0)
  params?: ActionParam[];               // chosen by the learner; never free numbers
  effects: Effect[];
}

type ActionParam =
  | { id: Id; kind: "choice"; label: string; options: { value: string; label: string }[] }
  | { id: Id; kind: "form"; label: string; fields: { id: Id; label: string; options: { value: string; label: string }[] }[] }
  | { id: Id; kind: "slot"; label: string; catalog: Id; slots: string[] };   // architecture board

type Effect =
  | { set: Id; to: Expr }
  | { add: Id; by: Expr }
  | { push: Id; value: Expr | Record<Id, Expr> }   // set or records
  | { remove: Id; where: Expr }
  | { schedule: Id; after: Expr | Duration; with?: Record<Id, Expr> }  // timer
  | { cancel: Id }
  | { log: Template; kind?: "act" | "find" | "sys" | "good" | "bad" | "alarm" }
  | { finding: Template }                          // assessment result card
  | { phase: Id }
  | { prompt: Id }                                 // opens a decision card
  | { reason: Id }                                 // opens a reasoning moment
  | { end: Id }                                    // ends the run
  | { table: Id; into?: Id }                       // apply a rule table
  | { if: Expr; then: Effect[]; else?: Effect[] }
  | { cases: { when: Expr; then: Effect[] }[] };   // first match

interface TimerSpec {
  label: Template;                      // "Surgeon arriving", shown with a countdown
  wait?: { skipLabel: Template };       // present = learner may skip to it while waiting
  source: Source;                       // where the delay comes from (linter-enforced)
  effects: Effect[];
}

interface Trigger {
  id: Id;
  when: Expr;
  mode: "once" | "edge";                // edge = fires each time it becomes true
  interruptsSkip?: boolean;             // an alarm: stops a skip at this tick
  effects: Effect[];
}

interface Prompt {                      // a decision card; the clock stops while open
  title: string;
  context: Template;
  choices: { id: Id; label: string; effects: Effect[]; feedback?: Template }[];
}

interface ReasoningMoment {             // the AI-graded part, section 10
  trigger?: Expr;                       // or opened by a { reason } effect
  question: string;
  parts: { label: string; criteria: string; modelAnswer: string }[]; // server-only
  pausesClock: true;                    // always; reasoning is never raced
}

interface Ending {
  label: string;
  tone: "good" | "warn" | "bad";
  when?: Expr;                          // checked every tick, in document order
  narrative: Template;                  // shown in the run
  terminal: boolean;                    // false = a branch point (e.g. go to phase 2)
}
```

`ScreenSpec` and `Scoring` are in sections 8 and 9.

### 4.2 An excerpt: the tamponade case as data

How the prototype's rules look as a document (abridged, illustrative):

```json
{
  "clock": { "start": "14:00", "tick": "1s", "maxDuration": "3h" },
  "params": {
    "onset":      { "value": 120, "unit": "s",
                    "source": { "cite": "Author's scenario timing", "note": "drainage stops 2 min after handover" } },
    "tampRate":   { "value": 0.035, "unit": "/min",
                    "source": { "cite": "Simplified teaching model", "note": "untreated compression reaches arrest ~28 min after onset; typical of acute post-op tamponade per <ref>" } },
    "surgeonWalk":{ "value": 480, "unit": "s", "source": { "cite": "<unit standard / literature>" } }
  },
  "state": {
    "T":        { "type": "number", "init": 0, "min": 0, "max": 1.5 },
    "norepi":   { "type": "number", "init": 0, "unit": "mcg/kg/min", "min": 0, "max": 0.5 },
    "surgeonCalledAt": { "type": "time", "init": null }
  },
  "derived": {
    "E":   { "expr": "clamp(T - fluidBoost, 0, 1.3)" },
    "hr":  { "expr": "clamp(88 + 40*E + 1.5*sin(t/37) + epi*1.5, 60, 150)", "unit": "bpm", "precision": 0 },
    "map": { "expr": "dbp + (sbp - dbp)/3", "unit": "mmHg", "precision": 0 }
  },
  "processes": [
    { "id": "tamponade", "when": "t >= onset", "update": { "T": "T + tampRate * (t < tubeRateUntil ? 0.6 : 1) * dt/60" } }
  ],
  "triggers": [
    { "id": "mapLow", "when": "map < 65", "mode": "edge", "interruptsSkip": true,
      "effects": [{ "log": "Alarm: MAP below 65.", "kind": "alarm" }] },
    { "id": "think", "when": "E >= 0.20 or t >= onset + 360", "mode": "once",
      "effects": [{ "reason": "whatIsHappening" }] }
  ],
  "endings": {
    "arrest": { "label": "PEA arrest", "tone": "bad", "when": "E >= arrestE", "terminal": true,
                "narrative": "The ECG still shows a rhythm, but there is no pulse on the arterial line..." }
  }
}
```

Note what moved: `sin(t/37)` is now a deterministic engine function, the
"6 minutes after onset" fallback cites where it comes from, and the MAP
alarm stops a skip.

### 4.3 The expression language

A deliberately small, total, side-effect-free language. It is **parsed** by
a hand-written Pratt parser into an AST at validation time and **interpreted**
by a tree walker; there is no `eval`, `Function`, template-string execution
or property access on host objects anywhere.

- **Literals**: numbers, `true`/`false`, `"strings"` (enum values),
  `null` (only for `time` vars).
- **Names**: only declared `params`, `state`, `derived`, the built-ins `t`
  (sim seconds since start), `dt` (tick seconds), `tick`, and `phase`.
  Unknown names fail validation, not at run time.
- **Operators**: `+ - * /`, comparison, `and or not`, `? :`,
  `in` (set membership). No `**`, no bitwise ops, no assignment.
- **Functions** (a fixed whitelist): `min max clamp abs floor ceil round`,
  `exp ln sqrt sin cos` (engine implementations, section 5.5), `seq(list,i)`
  (index with last-value repeat, for the fitness weekly arrays),
  `lerp`, `isNull`, `since(timeVar)`, and collection aggregates over sets
  and record lists with an inline predicate: `count(items, type == "nat")`,
  `any(items, slot in ["app-a","app-b"])`, `sum(items, cost)`,
  `product(mods, from <= week and week <= to, vel)`, `distinct(items, az)`.
  Inside a predicate, bare names resolve to the record's fields first.
- **Scoring-only functions** (section 9), unavailable to tick rules so a
  tick stays O(state): `firstAct(id, cond?)`, `countAct(id)`,
  `actedBefore(id, tick)`, `everTrue(triggerId)`, `ending`, `pausedTotal`,
  `skips`.
- **Types**: number, bool, string-enum, time (tick or null), set, records.
  The checker infers every expression's type and rejects mismatches, an enum
  compared with a value it cannot have, and a `time` used as a number
  without `isNull`/`since`.
- **Totality**: division by zero yields 0 and is a linter warning wherever
  the checker cannot prove a non-zero divisor; `ln` of a non-positive
  number yields 0, same warning; NaN and Infinity cannot arise. Every state
  write is clamped to the variable's declared `min`/`max` and rounded to its
  `precision`, so state stays bounded whatever a rule does.
- **Budgets**: AST depth at most 32, at most 400 nodes per expression, at
  most 20,000 node evaluations per tick for the whole document. The linter
  measures the static bound; the engine enforces it and ends the run with
  an `engine_error` if it is ever exceeded (it cannot be by a linted
  document; the check protects the server against a bad one).

**Templates** (`log`, `finding`, narratives) are plain text with slots:
`"PAOP {paop} mmHg with CVP {cvp}."` or `{t|clock}`, `{x|1dp}`, `{n|usd}`.
Only names and the format filters are allowed inside slots. The output is
rendered as text, never HTML or Markdown.

### 4.4 Validation rules

`validateScenario(doc)` returns a list of problems (empty = valid), the
shape `labContentProblems` already uses. Three layers:

1. **Schema**: the zod schema, string lengths (the lab limits where they
   apply: title 200, brief 6000, step text 3000), id patterns, counts
   (at most 60 actions, 40 timers, 80 triggers, 12 endings, 30 criteria,
   500 records).
2. **Semantic**: every expression parses and type-checks; every reference
   (timer, phase, prompt, ending, table, action, reasoning id) exists; at
   least one terminal ending and one reasoning moment; `maxDuration / tick`
   at most 50,000 ticks; every `wait` timer has a skip label; every
   `interruptsSkip` trigger has a log line; every reasoning part has
   criteria and a model answer; the screen bindings name real state.
3. **Content** (the linter, section 16): sources on every timing, rate and
   threshold; fictional framing and safety rules per family (the lab rules:
   no "your patient/client", fictional people, the safety note); every
   ending is reached by at least one golden path; every criterion reaches
   both `met` and `missed` across the golden paths.

The seed, the tests and (later) the generator call the same function, as
they do for labs (`lib/lab-content.ts`).

### 4.5 Versioning and the content hash

- `schemaVersion` is the document format. A breaking format change bumps it
  and ships an upgrader (`upgradeScenario(doc): doc`) that the seed runs on
  older files; the stored document is always the current format.
- `engine.major` is the engine semantics the document was written for. The
  engine refuses a document for another major (section 5.8).
- **Content versions**: each change to a scenario's content creates a new
  **version row** with an incrementing `version`. Runs pin the version they
  started on, so a learner mid-run is never moved onto changed rules, and
  replay of an old run uses the version it ran.
- **Content hash**: SHA-256 of the canonical JSON of the whole document
  (keys sorted, no insignificant whitespace, numbers in shortest
  round-trip form) minus nothing: rules, text, scoring and golden paths all
  count. Labs hash an ordered array with MD5 (`labContentHash`); sims use
  canonical JSON because documents are objects whose key order is not
  meaningful, and SHA-256 because the hash is also the integrity check on the
  client copy (section 15). A changed hash makes a new version with
  `review_status = 'needs_expert_review'`; an unchanged one is a no-op, so
  `npm run seed` stays idempotent.
- **Client document**: the server derives a **client document** from the
  full one by dropping `scoring`, `goldenPaths`, reasoning `parts` and
  ending debrief text. The app receives only that (section 15 explains what
  that does and does not protect). Its own hash is stored next to the full
  hash and sent with the run so the app can detect a stale cached copy.

### 4.6 The four prototypes, construct by construct

The proof that one schema fits: every rule in each prototype has a home.

**Critical care.** `T`, drip rates, fluid total, `boosts` (records:
volume, tick) are `state`; vitals are `derived` (the fluid offset is
`sum(boosts, v * exp(-(t - at)/decay))`); clot growth is a `process`;
"Check tubes" is an action whose `cases` give the first-time gush or the
repeat; the SBAR call is a `form` param and `cases` on
`S == "stop" or A == "tamp" or R == "come"` decide whether `surgeonArrives`
is scheduled; echo, labs, surgeon and setup are `timers` with `wait`;
alarms and the reasoning pause are `triggers`; arrest is an `ending` with
`when`; early/bridge/late is a `table` applied when re-exploration starts,
followed by a non-terminal ending that moves to phase `p2`; the OR time is a
`wait` timer ("Skip to: back in the ICU, 85 min"); phase 2's four options
are a `prompt` whose effects set the vitals and schedule the 30-minute
reassessment; the eight criteria are `scoring.criteria` using
`firstAct("tubes", t >= onset)` and the stored `surgeonCalledAt`.

**Cloud.** Phase `build` (clock stopped) offers `place` (a `slot` param
over the component catalogue, a `params` table), `remove` and `configure`
(ASG size/min/max as `choice` params); placed components are an `items`
record list; the requirements checklist is `derived` booleans plus a
`table` per requirement for the "why" text. "Run launch day" moves to phase
`run` (clock running, 1-minute tick from 08:55); each event is a timer
(normal, on-sale spike, AZ failure, finance cut) with a `wait`; its effects
apply one `table` per area (`EVENT_RULES` rows become `{when, then:
{status, downMin, degradedMin}, text}`), adding to `errorBudgetUsed`; the
finance cut is a `prompt`. Derived facts (`maxCap`, `nats`, `computeAzs`)
use `count`, `any`, `distinct` and `sum` over `items`.

**Project.** Weekly event cards are `prompts` opened by a `wait` timer
each Monday ("Skip to: week 3 status meeting"); choice `fx` become effects:
point changes are `add`, `register` is `push` onto a set, `flags` the same,
`lump` adds to `AC`, `mods` push records `{vel, cost, from, to, label}`,
and `later` is `schedule` of a delayed-consequence timer with the target
week. Weekly EV/AC/PV are `processes` at the week boundary using
`seq(pvCurve, week)` and `product(mods, from <= week and week <= to, vel)`.
Risk events read the register (`"R1" in register`) to pick the registered or
unregistered branch with `if`.

**Fitness.** Intake, the overhead squat observations and the program are
`prompts` and `form` params in an untimed `assess` phase; path
classification is a `table` in order (heavy, overtrain, plateau, partial,
good); weekly change uses `seq(paths.good.pain, weeksOnPath)` scaled by
adherence; DOMS and the week-4 reassessment are timers; the missed week is
`pick(missed, [3,5,6])` from a seeded stream at the start; drop-out is an
`ending` on `pain >= 8.5 or adherence < 45`.

## 5. Engine architecture and the time model

### 5.1 The invariant

> The state of a run at tick *n* is a pure function of
> (client document, seed, the commands with tick < *n*).

Everything else in this section exists to keep that true. Rendering,
networking, wall clocks and AI never feed the state.

### 5.2 Commands, not events

The learner's inputs are **commands**, each stamped with the tick it
applies at and a per-run sequence number:

```ts
type Command =
  | { seq: number; tick: number; type: "act"; action: Id; params?: Record<string, unknown> }
  | { seq: number; tick: number; type: "choose"; prompt: Id; choice: Id }
  | { seq: number; tick: number; type: "skip"; to: number; timer: Id }   // target tick
  | { seq: number; tick: number; type: "pause"; reason: "learner" | "background" | "interrupted" }
  | { seq: number; tick: number; type: "resume" }
  | { seq: number; tick: number; type: "reason"; moment: Id }            // submitted (text goes to the grading route)
  | { seq: number; tick: number; type: "end"; reason: "learner_quit" };
```

Reasoning **text** is not part of the command log: it never affects state,
and keeping it out keeps the log replayable without the AI. The `reason`
command only marks "submitted, the clock may resume".

### 5.3 One tick

`step(state) -> state` advances exactly one tick, in a fixed order:

1. Apply the commands stamped with this tick, in `seq` order (validated:
   the action is in the current phase, `available` is true, the params are
   among the declared options; an invalid command is rejected, not
   ignored, see 5.7).
2. Run `processes` in document order (continuous change: `x + rate*dt`).
3. Fire due timers, ordered by (due tick, schedule order).
4. Recompute `derived`.
5. Evaluate `triggers` in document order (once / edge semantics).
6. Evaluate `endings` with a `when`, in document order; the first true one
   ends the run or moves the phase.
7. Clamp and round every state variable to its declared bounds/precision.

Pending prompts and reasoning moments stop the clock: while one is open,
no tick advances until the learner answers (a `choose` or `reason`
command).

### 5.4 Real time, waits and skips

- **Default pace**: one tick of simulated time takes one tick of real time.
  The app computes the target tick from a monotonic clock anchored at the
  last resume: `target = anchorTick + floor((now - anchorWall) / tickMs)`,
  and steps the engine up to it. Timer drift and dropped frames do not
  accumulate because the target is recomputed from the anchor, not by
  counting intervals.
- **Waiting**: the engine reports `waits(state)`: every scheduled timer
  whose spec has a `wait`, with its due tick and label. The renderer shows
  them as "Skip to: Surgeon arrives (6 min)". Nothing else is skippable.
  A scenario where the learner is between weekly decisions (project,
  fitness) schedules the next week's card as a `wait` timer, which is how
  those sims become realistic-time without becoming a 12-week wait.
- **A skip** is a command `{ type: "skip", to, timer }`. The engine steps
  every tick from now to `to`, exactly as it would in real time (same
  processes, timers, triggers). It stops early, at that tick, if a trigger
  with `interruptsSkip` fires or an ending is reached; the log says
  "Skip stopped at 14:21: MAP below 65". The run records how much time was
  skipped. **Skip equivalence**, tested as a property (section 16): a run
  with a skip and the same run waiting in real time have identical state at
  every tick after the skip target.
- **No speed control.** The prototype's 5x/10x/20x control is gone, as the
  revised prototypes already do: compressing time anywhere except an
  explicit wait would misteach how long things take.
- **Pause** is always available while the clock runs. It stops the clock
  and is logged. It is never penalised in scoring (practice, and WCAG
  2.2.1); the debrief shows how long the clock was paused, for the learner's
  own information.

### 5.5 Determinism

- **Maths**: `+ - * /` and `sqrt` are exactly rounded in IEEE 754, so they
  agree on every engine. `Math.exp`, `Math.sin`, `Math.pow` and `**` are not
  specified to the last bit and do differ between engines. The engine ships
  its own `exp`, `ln`, `sin`, `cos` built only from basic operations (range
  reduction plus a fixed polynomial), and a source check forbids `Math.*`
  other than `Math.sqrt`, `Math.floor`, `Math.ceil`, `Math.abs`,
  `Math.round`, `Math.min`, `Math.max`, `Math.imul` inside the engine
  folder.
- **Rounding**: state is rounded to declared precision at the end of each
  tick (step 7). This bounds the state space and keeps snapshots small; it
  does not paper over non-determinism (the maths above handles that).
- **Ordering**: object iteration order is never relied on; everything the
  engine iterates is a document-ordered array or a sorted key list.
- **No wall clock, no `Math.random`, no locale** inside the engine. Number
  formatting for templates uses a fixed formatter, not `toLocaleString`.
- **State hash**: a SHA-256 (the engine's own small implementation, so it
  needs no platform crypto) of the canonical state, computed at checkpoints.
  The app and the server compare hashes on every sync.

### 5.6 Randomness

Seeded only. The server picks a 32-bit seed when the run starts; each named
stream (`random.streams`) gets an independent generator derived from
(seed, stream name), so adding a stream never shifts another. Expressions
call `pick(stream, list)` and `chance(stream, p)`, available only in
effects (not in derived values, which are recomputed and must be pure). The
generator is mulberry32 (integer ops and `Math.imul` only, deterministic
everywhere). The debrief shows the seed, as the fitness prototype does, and
"Try again" gets a new seed.

### 5.7 Server-authoritative timeline or client simulation?

The brief asked for this trade-off to be analysed. Three options:

**A. Server-authoritative ticking.** The server owns the clock and state;
the app sends actions and polls state. On Vercel there is no long-lived
process to tick, so this becomes lazy evaluation ("compute state at
now on each request"), which is option C without the client engine. Every
action waits on a network round trip (100-400 ms on mobile, failure when
offline); the monitor cannot update between polls without the engine on the
client anyway. Cheating is hardest. Battery: one request every few seconds
for the whole run, worse than a local 1 Hz engine. Rejected: a bedside
emergency that freezes in a lift is not a quality experience.

**B. Client simulation, client-reported result.** Fast and offline, but the
score is whatever the app says. Rejected: a sim is mastery evidence.

**C. Client simulation, server verification by replay (chosen).** The app
runs the engine for display and feel; it journals commands and syncs them.
The server replays the commands with the same engine and the pinned
document, and **its** replay decides validity, ending, score and the
mastery attempt.

How C handles each concern:

- **Cheating.** The app never sends a score or a state, only commands; the
  server rejects any command that is illegal at its tick (wrong phase,
  unavailable action, parameter not among the options, skip with no wait
  active or past the wait's due tick, tick going backwards, sequence gap).
  **Speed-up** is bounded: the real-time part of sim time (sim time minus
  skipped time) may not exceed the server-measured wall time since the run
  started plus a tolerance (5 s plus 1%). So a bot cannot play a
  30-minute case in 2 seconds. What remains possible is "playing with the
  answers in front of you" (a second device, the expert path from a
  previous run), which is exactly what the repeat rule already discounts
  (section 9), and what no design can stop in an untimed practice app.
- **Offline and low bandwidth.** Commands are about 100 bytes; the app
  batches them (every 10 s while running, and immediately on an action,
  skip, pause, reasoning submit or ending). Offline, the journal grows on
  the device and syncs later; the speed bound is one-sided, so late arrival
  never fails it. The debrief needs the server (it holds the criteria), so
  the app shows "Your run is saved. The debrief appears when you're back
  online."
- **Determinism.** Required by C, and testable: the app sends its state
  hash at each sync; a mismatch is logged as a `desync` telemetry event and
  the server's state wins (the app reloads from the server checkpoint). The
  target is zero desyncs; golden replays run on V8 and Hermes in CI to keep
  it there (section 16).
- **Battery.** One engine tick per second is microseconds of work. The
  costly part is drawing, which the renderer bounds (section 8.4). No
  network keep-alive while running.

### 5.8 Where the engine code lives

The engine is pure TypeScript with no imports outside its folder. Source of
truth: `backend/lib/sim/engine/`. The app gets a **generated copy** in
`mobile/src/sim/engine/` written by `npm run sim:sync-engine`, with a header
naming the source hash; a test in each package recomputes the hash and fails
CI on drift. A shared top-level package would be neater, but the Vercel
project builds from `backend/` and Metro resolves inside `mobile/`; a checked
copy avoids changing either build. `ENGINE_VERSION` (`major.minor`) is
recorded on every run. A breaking semantic change is a new major, shipped
**alongside** the old one until no open run or unreplayed run uses it, so an
app on an older OTA update never replays differently from the server.

### 5.9 Leaving and coming back

The clock never advances without the learner present:

- **App backgrounded or phone locked**: on `AppState` "background" the app
  appends `pause { reason: "background" }` at the current tick, writes the
  journal to storage and syncs if it can. Coming back shows "Paused while
  you were away" with Resume. This matters more than usual here: on a
  device without biometric unlock, backgrounding signs the learner out after
  a 1.5 s grace (`src/auth/AuthContext.tsx`, `src/lib/backgroundHold.ts`), so
  the run must survive a sign-out.
- **App killed, crash, battery dies**: no pause was written. The journal is
  written ahead of display (each command is stored before the state it
  causes is shown), so the last stored command is the truth. On reopen, the
  app and server both treat the gap after the last command as paused
  (`pause { reason: "interrupted" }` inserted at the last journaled tick plus
  the ticks the app had confirmed via its last `progress` sync).
- **Another device**: `GET /api/sims/runs/:runId` returns the latest server
  checkpoint and the commands after it; the new device replays and offers
  Resume. Commands the first device never synced are lost, at most the
  last sync interval; the journal is per user and run on each device and
  the sync is idempotent by `seq`, so nothing is double-applied.
- **Sign-out sweep**: the journal is under `ascendra.sim.*` and is removed by
  the logout sweep **after** a final sync attempt, like lab drafts
  (`ascendra.draft.lab.*`). An unsynced journal at an explicit sign-out is
  synced first; if that fails, the learner is warned once ("Your sim run has
  unsaved progress").

**Keeping the phone awake.** A real monitor does not dim. While the clock
is running (not paused, not in a wait), the renderer keeps the screen on;
paused or waiting, it lets the phone sleep normally. This needs
`expo-keep-awake` (open question 4).

## 6. Persistence

Migration `055_sim_engine.sql` (the next free number when it is written).
Additive only; follows 050's conventions (lock_timeout 5 s, IF NOT EXISTS,
guarded DO blocks, NOT VALID checks on `attempts`).

**`sims`**: one row per scenario identity.
`id uuid pk, objective_id uuid not null references objectives on delete
cascade, slug varchar(80), family ('clinical','fitness','general'),
screen_type varchar(40), title varchar(200), retired_at, created_at,
updated_at, unique (objective_id, slug)`.

**`sim_versions`**: one row per content version.
`id uuid pk, sim_id references sims on delete cascade, version int,
schema_version int, engine_major int, document jsonb (full),
client_document jsonb, content_hash char(64), client_hash char(64), source
('authored','generated'), review_status ('needs_expert_review','approved',
'rejected'), reviewed_by, reviewer_credential, reviewed_at, review_note,
model, created_at, unique (sim_id, version), unique (sim_id, content_hash)`.
The current version is the highest non-rejected one.

**`sim_reviews`**: the review trail (every decision, not just the latest):
`sim_version_id, reviewer, credential, decision, checklist jsonb (section
11.4), note, created_at`.

**`sim_runs`**: one learner's pass.
`id, user_id references app_users on delete cascade, sim_id, sim_version_id,
seed int, engine_version, started_at (server time), status ('open',
'ended', 'abandoned'), last_seq int, last_tick int, realtime_ticks int,
skipped_ticks int, paused_ms bigint, checkpoint_tick, checkpoint_state jsonb,
checkpoint_hash char(64), ending_id, ended_at, score jsonb (per-criterion
results, KPIs, verdict), attempt_id references attempts on delete set null,
desyncs int default 0`. One open run per learner and sim (partial unique
index, as `lab_runs_one_open`).

**`sim_run_commands`**: the event log for replay and audit.
`run_id, seq, tick, type, payload jsonb, client_sent_at, received_at,
primary key (run_id, seq)`. Append-only. Progress heartbeats are **not**
rows: they update `last_tick` on the run. A typical run is 30-200 rows.

**`sim_run_reasoning`**: one row per graded reasoning moment, the shape of
`lab_run_steps`: `run_id, moment_id, user_id, client_attempt_id (unique per
user), answer text, verdict, feedback, part_scores jsonb, missed_parts,
classification, created_at`.

**`attempts`**: new `attempt_kind` value `simtask`; column `sim_id uuid`
(no foreign key, for the reasons in 050 section 5, FAIL-480/481); check
`attempts_simtask_shape` (NOT VALID): a `simtask` row has
`assessment_type = 'sim_run'` and `format = 'open'`, and no other kind has
a `sim_id`. Partial index `(user_id, sim_id) where sim_id is not null`.

**`assessment_types`**: one row, `sim_run` (section 9.4).

**Item kinds**: `sim` added to `item_flags`, `item_status`,
`item_holdbacks` checks (as 050 section 6 did for `lab`).

**RLS** on every new table (052 requires it everywhere). Account export
gains `simRuns` (runs, commands, reasoning answers); deletion cascades.

**Schema probe** in `lib/schema-status.ts`: the `sim_runs` table and the
`simtask` enum value, so `/api/health` fails loudly if the backend ships
ahead of the migration.

**Retention**: commands and checkpoints are kept with the run (they are the
audit trail and are small). A later job may compact commands of runs older
than a year into one jsonb column; not in Phase 1.

## 7. API routes

All under `backend/app/api/sims/**`, thin routes over `lib/sim-routes.ts`,
the same split as labs. Every route returns 404 `{ code: "sims_disabled" }`
when `SIMS_ENABLED` is off.

| Route | What |
|---|---|
| `GET /api/sims?trackId=` / `?unitId=` / `?objectiveId=` | Sims the learner can open: title, family, screen type, objective, state ("In progress", "Done: some parts to revisit"), `access` (full/sample/locked), `reviewStatus`. |
| `GET /api/sims/:id` | One sim: brief, safety note, disclaimer payload, client document of the current version (or the pinned version of an open run) with its hash, the open run if any, the latest finished run's summary. |
| `POST /api/sims/:id/runs { restart? }` | Start or resume (one open run per learner and sim). Needs the family acknowledgement (403 `lab_disclaimer_required`, reused). Returns `{ run, seed, clientDocument?, checkpoint, commandsAfter }`; the document is omitted when the app's cached hash matches. |
| `GET /api/sims/runs/:runId` | Resume on any device: checkpoint, commands after it, waits pending. |
| `POST /api/sims/runs/:runId/commands { fromSeq, commands[], stateHash, tick }` | Sync. Idempotent by `seq` (a resent `seq` with the same payload is accepted; with a different one is 409). Replays from the checkpoint, validates, stores, writes a new checkpoint every 300 ticks, returns `{ acceptedThrough, serverHash, rejected?, ended? }`. |
| `POST /api/sims/runs/:runId/reasoning { momentId, answer, clientAttemptId }` | Grade one reasoning moment (section 10). Returns parts, feedback and the model answer. Replay of an already graded id returns the stored result. |
| `POST /api/sims/runs/:runId/finish` | Called when the app reaches a terminal ending (or the learner ends early). The server replays to the end, confirms the ending, computes criteria and KPIs, records the attempt, returns the debrief. Idempotent. |
| `GET /api/sims/runs/:runId/debrief` | The stored debrief of an ended run. |
| `POST /api/sims/:id/acknowledgement { version }` | The practice-lab acknowledgement for the sim's family; shares `lab_disclaimer_acknowledgements` (open question 5). |

Order inside the commands route mirrors the lab submit route: auth,
validation and visibility, replay of known `seq`s, run state check, rate
limit (`consumeRateLimit`: 120 syncs per 10 minutes per learner, generous
for 10 s batching), replay and validation, then one transaction for the
write. Limits: at most 500 commands per request, 5,000 per run, 64 KB per
request body.

"Report a problem" posts `{ kind: "sim", simId }` to the existing route;
enough independent flags (default 3) pull the sim (`servableSql("sim", ...)`).

## 8. Mobile architecture and the bedside-monitor renderer

### 8.1 Layers

```
app/(app)/course/[trackId]/sim/[simId].tsx    screen: load, gate, disclaimer, intro, run, debrief
src/sim/engine/                                generated copy of the engine (5.8)
src/sim/runtime/useSimRun.ts                   clock anchor, journal, sync queue, AppState, keep-awake
src/sim/runtime/journal.ts                     write-ahead journal in storage (pure, tested)
src/sim/renderers/index.ts                     screen type -> renderer component
src/sim/renderers/bedside/                     Phase 1 renderer
src/sim/a11y/announcer.ts                      announcement policy (pure, tested)
```

The screen owns lifecycle and gating; `useSimRun` owns time and sync; a
renderer only **reads** engine state and **emits** commands through a
callback. Renderers are pure functions of (state, client document, screen
spec) plus local UI state (which sheet is open), so they are testable
without the clock.

### 8.2 The screen spec

The document says what the renderer shows; the renderer decides how.

```ts
interface ScreenSpec {
  type: "bedside" | "board" | "dashboard" | "trainer" | "terminal" | "session";
  bedside?: {
    tiles: {
      id: Id; label: string; spokenLabel: string;   // "ABP" / "Arterial blood pressure"
      value: Expr | [Expr, Expr];                    // "hr", or ["sbp","dbp"] for 118/70
      unit: Unit; sub?: Template;                    // "MAP {map} · PP {sbp-dbp}"
      alarm?: { low?: number; high?: number };       // drawn and spoken
      trend?: { window: Duration; threshold: number }; // ▲ / ▼, spoken "rising"
      announce: { bands: number[] };                 // section 13.2
      colour: "ecg" | "art" | "cvp" | "pa" | "spo2" | "neutral";
      hiddenUntil?: Expr;                            // PAOP "--" until wedged
    }[];
    waveforms?: { kind: "ecg" | "art" | "pleth"; from: { hr: Id; sys?: Id; dia?: Id; flat?: Expr } }[];
    infusions?: Template;
    banner?: { when: Expr; text: Template }[];
  };
  // board, dashboard, trainer, terminal, session: later phases
}
```

### 8.3 The bedside layout on a phone

Designed for one thumb at 360-430 dp wide, portrait:

- **Top, sticky**: a compact monitor strip, two rows of the four most
  important tiles (author picks the order), the clock, and Pause. Large
  numerals, the monitor's own fixed dark palette (contrast-checked, 13.3).
- **Below**: full monitor (all tiles, waveforms), then the **waits row**
  ("Skip to: Surgeon arrives, 6 min"), then the latest finding card, then
  the log (newest first, collapsible).
- **Bottom, in the thumb zone**: an action bar with the scenario's groups
  (Assess, Orders, Drips, Call). Tapping a group opens a bottom sheet of
  actions; a parameterised action opens a second sheet (dose buttons, the
  SBAR form with four pickers, each a full-width 48 dp row). Nothing needs
  two hands, a drag, a long press or a precise tap.
- **Decision cards and reasoning** open as full-height sheets that stop the
  clock, with the question first and the monitor summary pinned above.
- **Tablets and desktop web** (Expo web, served by the backend): monitor
  left, actions right, log below; the same components.

### 8.4 Waveforms and battery

Waveforms are decoration: every fact they carry is also a number or a
finding. They are drawn with `react-native-svg` paths (open question 4),
regenerated at 15 fps from the current HR and pressures in a sweep, not a
per-frame re-render of the tree. Off-screen or paused: no drawing. Reduced
motion: a static strip redrawn once per beat change. The engine tick (1 Hz)
and the display refresh are separate; the numbers update once a tick,
like a real monitor.

## 9. Scoring, debrief and mastery

### 9.1 Criteria

```ts
interface Scoring {
  criteria: {
    id: Id; label: string; weight: number;          // 1 by default
    critical?: boolean;                             // missing it caps the verdict
    rows: { when: Expr; score: "met" | "partial" | "missed"; why: Template }[]; // first match
  }[];
  reasoningCriteria: { moment: Id; label: string; weight: number }[]; // from the AI grade
  kpis: { id: Id; label: string; value: Expr; format: "duration" | "number" | "usd"; expert?: string }[];
  expertPath: { at: string; text: string }[];
  debrief: Record<Id /* ending */, { headline: string; body: Template }>;
  modelReasoning: string;
}
```

Criteria are evaluated **once, on the server, after the run**, with the
scoring-only functions over the command log (`firstAct("tubes", t >= onset)`).
They are deterministic: the same run always scores the same.

### 9.2 Score and verdict

- Run score = sum of (weight x 1 / 0.5 / 0 for met / partial / missed) over
  every criterion and graded reasoning criterion, divided by the sum of
  weights.
- **correct**: every `critical` criterion met **and** score at least 0.85.
- **incorrect**: score below 0.40.
- **partial**: everything else.

Why these and not the lab rule ("correct only when every part is met"): a
sim has 8-12 criteria plus timing, and the lab rule would make a near-expert
run "partial" for one late minute. The critical flag keeps the bar where it
matters (calling the surgeon, referring the client with chest pain): one
critical miss can never be "correct". Thresholds are engine constants, not
per scenario, so a verdict means the same thing in every sim.

The **ending** affects the verdict only through criteria (authors include
an outcome criterion where it matters); a good outcome reached by luck is
not mastery, and a bad outcome after mostly right moves teaches more than
a red banner.

### 9.3 Debrief

Server-built from the replay: outcome headline (ending), KPIs with the
expert value beside them, each criterion with met / partial / missed and
its `why`, "What you did" (the command log rendered as a timeline, including
skips and pauses) beside "Expert path", the reasoning answer with its grade
and the model reasoning, the practice note from `LAB_RESULTS_NOTE`, the seed,
and "Try it again" (labelled as practice that counts lightly). Tone follows
labs: "Done: some parts to revisit", never "failed".

An optional AI-written narrative ("what turned this run") is designed but
**off** (`SIMS_DEBRIEF_NARRATIVE`, default off): it would be grounded only
on the structured debrief, cached per run, one fast-model call. Phase 1 uses
authored templates, which reviewers can check.

### 9.4 Mastery

A finished run records **one attempt**: kind `simtask`, `assessment_type
'sim_run'`, format `open`, `objective_id` = the scenario's objective,
`sim_id` set, verdict from 9.2, `answer` = the debrief transcript (what you
did, plus reasoning text) for history and export. The mastery rule
(`mastery_detail()`, 045) is **not changed**: its direct-answer branch counts
any attempt naming an `assessment_types` row.

| type | family | weight | application level | unit-wide |
|---|---|---|---|---|
| `sim_run` | `simulation` | 1.5 | yes | no |

**Why these values.**
- *Weight 1.5*: the same as `pbq`, `lab_build`, `lab_case` and the reserved
  `scenario`. docs/labs.md set the principle that no format weighs more than
  a PBQ, so no single format dominates weighted accuracy; a sim is richer
  evidence, but one run is still one judgement on one objective. (Open
  question 3 offers 2.0 for Nick to choose instead.)
- *A new family, `simulation`*: a sim is a genuinely different format from
  a written lab (time-pressured, cue recognition, acting and seeing
  consequences). So a lab and a sim on the same objective on different days
  are two format families, which is the rule's route to Transfer-ready. Two
  sims are still one family.
- *Application level*: like labs, one fully-correct first run at or above
  0.70 weighted accuracy opens Independent on that objective.
- *Not unit-wide*: counts only on its objective. `secondaryObjectives` are
  recorded on the run for analytics and the review schedule is not touched
  for them in Phase 1 (open question 6).

**Counts once per run.** Only `finish` records, inside the transaction that
ends the run, under the grade lock, idempotent on the run id.

**Repeats.** A run is a repeat (`assisted`, `assist_reason 'repeat'`) when
the learner has an earlier run of the same sim (any version) that reached a
debrief or had a graded reasoning moment: they have seen the expert path or
a model answer. Under 045 a repeat counts at a quarter of its weight, only
the latest repeat counts, and it is never format evidence. Decided under
the grade lock, as `labAssistReason` is.

**Review schedule.** As labs (REQ-124 decision 14): a first-run correct
moves due error-log entries and a due review schedule on; partial or
incorrect adds an error-log entry and steps a due schedule back; a repeat
moves nothing.

**Abandoned runs** (learner ends early before any terminal ending) record
nothing for mastery; their reasoning grades stay visible in history.

**Voiding.** A confirmed-wrong sim (`confirmItemWrong` on kind `sim`) voids
every attempt with that `sim_id` and recomputes mastery, as labs do.

## 10. Grading the written-reasoning moments

Each scenario has at least one reasoning moment. It reuses the lab grading
path almost unchanged, as `lib/sim-grading.ts` wrapping `lab-grading.ts`'s
prompt builder:

- **Rubric**: the moment's `parts` (label, criteria, model answer), authored
  and reviewed, server-only.
- **Context for the grader**: the brief and a **deterministic situation
  summary** at the moment's tick (the values of the bound tiles, the
  findings shown so far, the actions taken), built by the engine, never
  by the model, so the grader judges against what the learner could see.
- **Learner text** is fenced and escaped (`fenceLearnerText`), the
  trivial-answer rule skips the model for empty or stock answers, the
  consistency rule (`grade-consistency.ts`) applies, `key-suspect` flags the
  sim for review, the safety line per family is the lab's.
- **One model call per submission** (`withGradingClaim`), replay by
  `clientAttemptId`, rate limit shared with labs (40 per 10 minutes), counted
  toward the learner's daily graded total and, on Free, the daily typed
  answers.
- **The clock** is stopped while the moment is open (always). After
  submitting, the app resumes the clock right away and shows the model
  answer when the grade returns; offline, the answer is queued and the model
  answer appears when it syncs. The grade never changes sim state.
- **At finish**: each graded moment contributes its reasoning criterion
  (met / partial / missed from its verdict). If grading failed three times
  or the learner skipped the moment, that criterion is recorded as "not
  graded" and left out of the denominator, and the debrief says so.

## 11. Tiers, the switch, disclaimers and review

### 11.1 The switch

`SIMS_ENABLED`: unset, empty, `0`, `false`, `off`, `no` = **off** (the
default), the same parser as `billingEnabled`. Off: every sim route answers
404 `sims_disabled`, list routes omit sims, the course dashboard shows no
"Simulations" row, and seeding still loads scenarios (so they can be
reviewed before launch). Changeable in Vercel without an app release; the
app reads it from the course payload.

`SIMS_SERVE_UNREVIEWED`: like `LABS_SERVE_UNREVIEWED`, **on** by default
(Nick, 2026-11-07, for labs, and restated for sims: review happens at his
pace). Only an explicit off serves approved versions only.

### 11.2 Tier gating

A new feature key `sims` (`minTier: "pro"`, label "Simulation labs"),
`SIMS_FEATURE = "sims" as const satisfies Feature` (FAIL-510). Free and Plus
get **one sample sim per course**: the first approved sim in course order,
else the first served one (the labs rule). The list marks every sim
`full | sample | locked`; locked shows "Part of Pro". Viewing needs full or
sample access or an existing run; starting needs full or sample; resuming an
open run is always allowed (a downgrade never strands a patient mid-case).
With billing off, everything is open. A separate feature key (rather than
reusing `labs`) lets pricing treat sims on their own later without a
migration (open question 8).

### 11.3 Disclaimers

Every sim carries the lab disclaimer from `lib/lab-disclaimer.ts` (general
line, "not reviewed" line until approved, the clinical/fitness safety line
first), plus one sim-specific line, added there:

> The patient's (client's, system's) responses come from a simplified
> teaching model written for exam practice, not a validated model of the
> real thing.

The one-time **clinical and fitness acknowledgement** is the lab one: same
table, same family, same version. Accepting it once covers labs and sims
("these labs are practice only" reads correctly for sim labs). Adding the
sim line does not change the acknowledged text, so no version bump. The
server refuses to start, resume, sync or grade a clinical or fitness sim
without the acknowledgement (403, the lab message). The disclaimer stays
on the intro and above the debrief, as for labs.

### 11.4 Review workflow

Every version is stored `needs_expert_review`, served (by default) with the
"Awaiting expert review" badge and the "not reviewed" line. Review is
**not a gate on any rollout phase** (Nick, 2026-11-07: "Don't worry about
the realism checks, just produce. I'll take care of it at my pace."). The
mechanism exists so that review can happen whenever Nick chooses:

- `npm run sims:packet -- --sim <slug>` writes a reviewer packet (HTML):
  the brief, every parameter with its unit and source, every rule and
  timer in readable form, every ending, every criterion, the reasoning
  rubric and model answers, and a transcript of each golden path (what the
  monitor showed when). A reviewer never needs to read JSON.
- `npm run sims:review -- --sim <slug> --version <n> --approve|--reject
  --by "<name>" --credential "<e.g. RN, CCRN>" [--note "..."]` records a
  `sim_reviews` row and sets the version's status. For clinical sims the
  checklist recorded is: physiology directionally right, every dose and
  threshold within current guidance or explicitly "per protocol", every
  timing sourced and plausible, nothing unsafe if acted on, endings fair,
  criteria gradable and fair, people fictional. A critical-care nurse
  educator is the intended reviewer for CCRN scenarios; the tool records
  whoever signs and their credential, and does not block on who it is.
- A content change makes a new version (`needs_expert_review`); the
  previous approved version is still the one open runs replay.

## 12. Authoring, seeding and (later) generation

**Files.** `backend/supabase/seed/sims/<course-code>/<slug>.sim.json`, one
scenario per file, listed in `seed/sims/index.ts` with the course's exam
outline URLs. JSON (not TS like labs) because the documents are data the
generator will also produce and the JSON Schema gives editor completion.

**Authoring steps.**
1. Pick an objective the exam tests by recognition and action over time
   (CCRN: shock states, tamponade, sepsis; NCLEX: post-op haemorrhage,
   DKA). Not every objective needs a sim; a lab is often enough.
2. Port or write the model: params with sources, state with bounds,
   processes, actions, timers with sourced delays.
3. Write the reasoning moment, endings (at least two good, two bad),
   criteria, KPIs, expert path, debrief text.
4. Write golden paths: at least the expert path, one slow-but-safe path and
   two failure paths, each with its expected ending and criteria.
5. `npm test` (schema, linter, golden replays, property tests), then
   `npm run seed` twice (idempotent).

**Seeding** upserts `sims` by (objective, slug) and inserts a `sim_versions`
row only when the content hash is new. Removing a file retires the sim
(`retired_at`); runs and attempts stay.

**Generator (later phase).** `npm run sims:generate`, dry-run by default,
in the labs generator's shape: for a chosen objective and screen type, a
large model writes a document from the screen type's template and the
objective, then the pipeline **fails closed** through: schema and semantic
validation, the linter, an **automatic path search** (a bounded
breadth-first search over the action space at decision ticks, which must
find the expert path's ending and at least two distinct bad endings, and
must show no dominant shortcut), golden path generation from the search,
then an independent fast-model fact check of numbers and safety. Stored
`source 'generated'`, `needs_expert_review`. Never run live until the
authored set has shown which scenario shapes work.

## 13. Accessibility

Required, not optional. The lab screen's baseline (labelled fields, one
spoken element per result row, 48 dp, AA tokens, state always written out)
applies, plus what live data needs.

### 13.1 The monitor for screen readers

- Each tile is **one** accessible element: "Heart rate, 112 beats per
  minute, rising, high alarm". Units are spoken in words; trends as
  "rising/falling"; alarms as words, never colour alone.
- Waveform canvases are hidden from assistive technology; their facts are
  in tiles and findings.
- A **"Read vitals"** button (also in the action bar) speaks a one-sentence
  summary of every tile on demand.
- The clock is not a live region (it would speak every second). Its value
  is read when focused and in "Read vitals".

### 13.2 Announcements without spam

`src/sim/a11y/announcer.ts` (pure, tested) decides what to announce:

- An **alarm** entering or leaving: assertive, immediately ("Alarm: MAP
  below 65").
- A value crossing one of its tile's **authored bands** (for MAP:
  `[50, 65, 90]`): polite, coalesced. Crossing back and forth inside a
  band within 30 s is suppressed (hysteresis).
- New **findings** and **log entries** of kind `good`, `bad` or `find`:
  polite.
- Pending results arriving (labs, echo, surgeon): polite.
- At most one polite announcement per 10 s; several due at once are joined
  into one sentence in priority order. Nothing is announced while a sheet
  with a text field has focus, except alarms.

This uses `AccessibilityInfo.announceForAccessibility` (already used by the
teach cards) and `accessibilityLiveRegion` on Android.

### 13.3 Time, motion, contrast, touch

- **Time limits (WCAG 2.2.1)**: pause is always available and never
  scored. An accessibility setting, **"Stop the clock while a menu is
  open"**, defaults on when a screen reader is running; since scoring uses
  sim time, it costs nothing. Decision cards and reasoning always stop the
  clock.
- **Motion**: with reduced motion, waveforms are static, no sweeps or
  pulses, no animated scrolling (`useReducedMotion`). Alarms never flash
  (WCAG 2.3.1); they change text and border.
- **Contrast**: the monitor's fixed dark palette is checked against AA in
  `contrast.test.ts` like the theme tokens; trace colours carry a text label.
- **Touch**: 48 dp minimum, actions and sheets in the lower half,
  no drag, long-press or gesture-only control, works at 200% text size
  (tiles reflow to one column).
- **Keyboard and switch access** on web and with external keyboards: every
  control focusable in a logical order; sheets trap and return focus.

## 14. Performance and cost per run

| Item | Estimate |
|---|---|
| Engine tick (tamponade, ~25 state vars, ~40 expressions) | well under 1 ms on a mid phone; checked by a benchmark test with a budget |
| Server replay of a 45-minute run (2,700 ticks) | a few ms; replays from the last checkpoint only |
| Network | about 100 B per command, a sync every 10 s while running: under 50 KB per run |
| Database | 1 run row, 30-200 command rows, 1-2 reasoning rows, checkpoints in the run row: about 50 KB per run |
| AI | one fast-model call per reasoning moment: about $0.0005 at the labs' measured size; one moment per sim is about $0.0005 per run, two about $0.001. Optional narrative (off) would add about $0.001. |
| Client document | 20-60 KB JSON, cached by hash |

A Pro learner running 30 sims a month costs about 1.5-3 cents of AI, well
inside Pro's monthly cap ($2.21). Per-tick AI cost is zero by design.

## 15. Security

- **Tampering with results**: the app sends only commands; the server
  replays and scores. Illegal commands are rejected with the tick and the
  reason; the run continues from the last legal state (the app resyncs).
  The speed bound (5.7) stops faster-than-real-time play. Skips are only
  legal into a wait the server's own replay shows active.
- **Reading the rules**: the client document contains the model, so a
  determined learner can read how the patient responds. That is accepted:
  the document is no more secret than a textbook, the criteria, golden paths
  and model answers are never sent, and the repeat rule discounts runs made
  with the answers known. Honest framing: client-side secrecy is not a
  security control here; server replay is.
- **Client document integrity**: the app checks the document's hash against
  the run's `client_hash` before using a cached copy.
- **Injection in reasoning text**: fenced and escaped per answer, graded as
  data, never instructions (the lab grading rules), length-capped (2,000
  characters per moment), `hasUnstorableText` rejected. Learner text never
  reaches the engine, a template or another learner.
- **Injection through scenario content**: documents are authored or
  generated, so they are treated as untrusted at the engine boundary: no
  eval, a closed set of functions, static budgets plus a run-time evaluation
  budget, bounded state, bounded ticks. A malicious document can at worst
  produce a wrong sim, never code execution or a server hang.
- **Rendering**: templates render as text components, never HTML; on web,
  React escapes. No `dangerouslySetInnerHTML` in renderers (a test greps for
  it).
- **Abuse**: rate limits on sync and grading; caps on commands per request
  and per run; one open run per learner and sim; access checks on every
  route (run belongs to the learner; the sim is visible to them).
- **Privacy**: clinical sims never ask about real patients (the lab content
  rules); the reasoning box says not to enter real details. Runs are in the
  account export and deleted with the account.

## 16. Testing strategy

All model calls mocked; no test ever needs a real `ANTHROPIC_API_KEY`.

**Engine unit and property tests** (`backend/lib/sim/engine/*.test.ts`,
node:test, pure):
- Parser and type checker: valid and invalid programs, every operator and
  function, error messages naming the location.
- Deterministic maths: `exp`, `ln`, `sin`, `cos` against stored bit-exact
  expected outputs on a fixed grid, plus error bounds against a reference.
- **Determinism**: random command sequences replayed twice give identical
  state hashes at every tick.
- **Skip equivalence**: for random scripts, inserting a skip in place of
  waiting gives identical state from the skip target on; a skip stops at
  the first `interruptsSkip` trigger.
- **Checkpoint equivalence**: snapshot at tick *k*, restore, continue =
  straight run.
- **Bounds**: no state outside declared min/max, no NaN or Infinity, every
  run ends by `maxDuration`, random legal command fuzzing never throws.
- **Command validation**: illegal commands (wrong phase, bad params, skip
  without a wait, past due, time going backwards) are rejected, never
  applied.
- **Performance budget**: the tamponade case's tick under a fixed budget on
  CI hardware.

**Golden replays** (per scenario): each `goldenPaths` entry is replayed and
must reach its stated ending, KPIs and criteria scores, with state
snapshots at listed ticks. For the tamponade port, the expected values come
from playing the same path in the revised prototype, so the port provably
behaves like what Nick tried. **Cross-runtime**: the same golden replays
also run on Hermes (the `hermes` CLI from the React Native toolchain) in CI,
and their state hashes must equal Node's.

**The scenario linter** (`npm run sims:lint`, also run by `npm test`):
schema and semantics (4.4); every timing, rate and threshold has a source;
every ending reached and every criterion both met and missed somewhere in
the golden paths; no unreachable action (never `available` in any golden
path is a warning); every tile has a spoken label, unit and announce bands;
every wait has a skip label; alarms have `interruptsSkip`; family safety
text rules; tick budget; expression budgets; client document leaks nothing
server-only (a test diffs keys).

**Server** (`*.dbtest.ts` against Postgres with every migration): start,
sync, resume on a "second device", idempotent resend, 409 on a changed
resend, speed-bound rejection, skip validation, finish records exactly one
attempt, repeat rule both directions (first-run win reaches Independent at
1.5; a correct run after a debrief is a repeat and does not), review
schedule moves, voiding, tier gating (full/sample/locked, resume after
downgrade), acknowledgement required for clinical, switch off hides
everything, schema probe present, account export and deletion.

**Grading**: prompt shape (fenced parts, situation summary), trivial
answers skip the model, consistency downgrade, key-suspect flags, replay by
client attempt id, the "not graded" path at finish.

**Mobile** (`mobile/src/**/*.test.ts`, pure modules): journal write-ahead
and recovery after a simulated kill; clock anchor math across
background/foreground and clock jumps; sync queue idempotency; announcer
policy (alarms immediate, bands with hysteresis, rate limit, coalescing);
contrast of the monitor palette; renderer view-model functions (state to
tiles and spoken labels). Manual before each phase exit: VoiceOver (iOS),
TalkBack (Android), web at 400 px with no horizontal scroll, 200% text,
reduced motion, one-handed run of the expert path.

## 17. Rollout phases and exit criteria

No phase waits on an external reviewer; review status is tracked and shown.

**Phase 1a: engine and schema (pure, no database).**
Engine, parser, type checker, deterministic maths, linter, the tamponade
scenario ported to a document with golden paths.
*Exit*: all property tests and golden replays pass on Node and Hermes; the
tamponade golden paths reproduce the revised prototype's endings and
criteria; `./omni gate` passes.

**Phase 1b: server.** Migration 055, schema probe, routes, replay
verification, grading, mastery integration, tier gating, switch (off).
*Exit*: dbtests above pass in CI's Database job; seed twice is idempotent;
`/api/health` reports the probe; nothing visible with the switch off.

**Phase 1c: app.** Sim screen, runtime, journal, bedside renderer,
accessibility.
*Exit*: pure tests pass; the manual accessibility pass above is recorded;
expert and failure paths played on a real iPhone and Android phone,
including background mid-run, kill mid-run, and resume on web; no desync in
those runs.

**Phase 1d: first clinical set and launch.** Three to five clinical
scenarios (tamponade first; see open question 7), served with the badge.
`SIMS_ENABLED` on in a preview deployment for Nick to try, then on in
production when Nick says so.
*Exit*: Nick has played them; telemetry shows zero desyncs and no engine
errors over the first 100 runs; flag rate per sim watched.

**Phase 2: more renderers.** Architecture board (cloud prototype), project
dashboard, client trainer; each a renderer plus scenarios, no engine
change. If one does need an engine change, that is a finding to record
against this design.

**Phase 3: generator, terminal/network and treatment session renderers.**

## 18. Risks

- **The simplified models teach something wrong.** Mitigated by sources on
  every number, the reviewer packet, the badge and disclaimer, Report a
  problem, and key-suspect flags. Not mitigated by a gate, by Nick's choice;
  the residual risk is that an unreviewed clinical sim is served with a
  mistake, which the disclaimer and acknowledgement address.
- **Cross-engine float drift** breaks replay. Mitigated by the engine's own
  maths, the `Math.*` source check, rounding at each tick and Hermes golden
  replays in CI. Residual: browser engines on Expo web are not all in CI;
  the desync telemetry would show it, and the server's state wins.
- **Real time is long.** A 45-minute case at 1x asks a lot on a phone.
  Mitigated by skips during waits, pause, resume anywhere, and authoring
  guidance (keep the active window to 15-30 minutes). Watch completion
  rates.
- **Expression language creep.** Each new renderer will want "one more
  function". Rule: a function is added only with tests, a determinism proof
  and a linter rule, never as an escape hatch to JavaScript.
- **Scope of the engine copy**: a stale copy in the app after an OTA lag.
  Mitigated by the engine major running side by side and the server being
  authoritative.
- **Weight and family choices shift mastery.** A new family makes
  Transfer-ready reachable through lab plus sim. That is intended, and the
  dbtests pin it; open question 3.
- **Dependency additions** (`react-native-svg`, `expo-keep-awake`) need
  approval (project safety flags).

## 19. Open questions for Nick

1. **Should the clock keep running while the learner is away?**
   Recommendation: **no**. Leaving the app pauses it, and coming back says
   so. A phone call should not kill a practice patient, and the app already
   signs learners out on background. A later "exam mode" could keep it
   running for those who want the pressure.
2. **Should pausing cost anything?** Recommendation: **no**; show total
   paused time in the debrief only. Pause is the accessibility guarantee
   (WCAG 2.2.1), and practice is where thinking time belongs.
3. **Mastery weight for a finished sim.** Recommendation: **1.5 with a new
   `simulation` format family**, consistent with the "no format above a
   PBQ" principle in docs/labs.md. Alternative: 2.0, which says "a sim is
   the strongest single evidence we have" but lets sims dominate weighted
   accuracy where a learner does several.
4. **Two new app dependencies**: `react-native-svg` (waveforms) and
   `expo-keep-awake` (screen stays on while the clock runs).
   Recommendation: **approve both**; both are Expo-supported and work on
   web. Without svg, waveforms are dropped (numbers only); without
   keep-awake, the phone may lock mid-case and pause the sim.
5. **One acknowledgement for labs and sims?** Recommendation: **yes**,
   reuse the clinical/fitness acknowledgement; sims are "sim labs" and the
   text fits. A separate one would ask the same learner the same thing
   twice.
6. **Do secondary objectives get evidence?** Recommendation: **not in
   Phase 1**; one attempt on the primary objective, secondary ones recorded
   for analytics. Spreading credit needs its own rule and tests.
7. **Which clinical scenarios first?** Recommendation: CCRN Adult tamponade
   (the prototype), then CCRN Adult septic shock, NCLEX-RN post-op
   haemorrhage, and one pediatric or neonatal case, so the renderer is
   proven across adult and paediatric ranges before Phase 2.
8. **Are sims inside Pro, or priced above it?** Sims are "where the money
   is made". Recommendation: **inside Pro for launch** with the
   per-course sample as the hook, behind their own feature key (`sims`) so
   a later price change needs only configuration. Revisit with usage data.
