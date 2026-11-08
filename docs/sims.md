# Sim labs (REQ-141): engine design, Phase 1

**Status: design, revised after an independent architecture review
(2026-11-07). Nothing in this document is built yet.** It is the plan for
Ascendra's interactive simulations ("sim labs"), written to be reviewed
before any code. Nick's decisions are in section 19; section 21 maps every
review finding to the change that resolves it.

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
19. Decisions
20. Sims for every subject family
21. Review resolution

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
3. **Simulated time is real time, or turns with real dates.** In a
   `running` phase one sim minute takes one real minute (the critical-care
   case). The learner can skip ahead only while waiting on something the
   scenario names (the surgeon's callback, an echo, labs); the skip is shown
   and logged, the state evolves through every skipped tick at real rates,
   and it stops early on an alarm or a result. In a `turns` phase (cloud
   launch day, project weeks, training weeks) time moves only when the
   learner advances to the next event, through the same skip mechanism,
   with real timestamps, dates and lead times. The clock never runs while
   the learner is away; leaving the app pauses it, and a stalled app
   auto-pauses instead of fast-forwarding (5.9).
4. **State is a pure function of (scenario version, seed, command log).**
   That one invariant gives replay, audit, resume on another device,
   cheat resistance and golden tests from a single mechanism. Its exact
   semantics (5.3) are specified with a worked example and pinned by a
   frozen golden corpus per engine major before any engine code. The
   engine uses its own deterministic maths (no `Math.exp`, `Math.sin`,
   `Math.pow`, `**`) so Hermes, V8 and JavaScriptCore produce
   bit-identical state; any change to stepping output is a new major.
5. **A finished run is one mastery attempt** on the scenario's objective,
   a new assessment type `sim_run` in a new format family `simulation`,
   weight 1.5, application level. Its verdict comes from a measured
   **rating** (Good / Mediocre / Bad) built from two numbers: the
   **outcome class** of the ending (`target`, `recovered`, `harm`, from
   authored end-state thresholds) and the **process score** (0-100,
   criteria met). Repeats count lightly through the existing repeat rule.
   The mastery rule itself is not changed.
6. **AI only grades writing.** Each written-reasoning moment is graded with
   the lab per-part pattern (fenced learner text, authored rubric, trivial
   answers never sent). No model call per tick, per action, or for the
   score. A debrief narrative from the model is optional and off.
7. **Gated like labs, plus switches.** `SIMS_ENABLED` (off by default)
   hides sims everywhere and `SIMS_RENDERERS` turns renderers on one at a
   time; the app tells the server which engine majors and renderers it
   can run, and is never offered a sim it cannot open. Sims are Pro with
   one sample per course for Free and Plus, carry the lab disclaimer and the one-time clinical/fitness
   acknowledgement, and show "Awaiting expert review" until a person
   approves the version. Unreviewed sims are served by default
   (`SIMS_SERVE_UNREVIEWED`), as labs are; review is Nick's, at his pace,
   and no rollout phase waits on it.
8. **Accessibility is designed in, not added.** Monitor values are read on
   demand and announced only when they cross an authored band or an alarm
   changes, never every second. Pause is always available (WCAG 2.2.1), so
   a screen-reader user is never raced by the clock.
9. **Engine major 1 is frozen only after it has been proven on every
   scenario shape we know of.** Before freezing, all four prototypes are ported to
   documents with golden paths (engine only), and one full scenario each
   for the security, terminal/network and data/code consoles is written on
   paper against the schema (17, Phase 1a).

## 2. Goals and non-goals

**Goals (Phase 1).**

- A sim engine that can run every planned subject family without engine
  changes once major 1 is frozen: bedside monitor (clinical), architecture
  board (cloud), project dashboard (PM), client trainer (fitness),
  treatment session (physical therapy), security console, terminal/network
  and data/code console. The first review showed concrete gaps (record
  updates, history, `pow`, list literals, catalogues, keyed lookup,
  dynamic pick lists, typed commands); they are now in the schema (4), and
  "no engine change per renderer" is earned by the Phase 1a ports and
  paper scenarios rather than asserted. Section 3 shows each prototype
  mapped onto the schema.
- Phase 1 ships one renderer, the **bedside monitor**, and a first set of
  clinical scenarios, starting with the post-cardiac-surgery tamponade case
  from the critical-care prototype.
- Realistic time, correct across backgrounding, phone sleep, OS
  suspension, app kill, sign-out (native background sign-out and web idle
  sign-out) and resume on another device, with exactly one device driving
  a run at a time.
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
- Emulation and code execution. The terminal/network console is an
  **authored fault tree** (a simulated shell whose command patterns and
  outputs are written by the author), not a routing, ACL or OS emulator.
  The data/code console is **guided**: the learner picks the query or fix,
  inspects authored result tables and reasons in writing; it never runs
  learner code or SQL, on the device or the server (decision R3, 19.2).
- Hidden rules. Practice sims ship their rules to the app, where a learner
  can read them (decision R4). A hidden-rules "exam mode" would be a
  server-run variant and is out of scope.
- A background hold. Leaving the app always pauses the run; nothing keeps
  the clock running in the background (decision R1).
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
All four have been revised to **realistic timing**: the critical-care case
runs in real time at 1x, and the other three are turn-based with real
timestamps or dates and realistic delays between cause and effect. The
numbers below are the revised prototypes' own (each is commented with its
basis in the prototype source); scenario documents carry them as sourced
`params`.

**Critical care (tamponade after CABG): real time, 1x.** One sim second is
one real second (the prototype ticks every 250 ms; its skips and test hook
step in 1 s, which is the engine's tick). Continuous hidden state (`T`, clot
compression) grows at 1/60 per minute after the drainage stops at 14:02, so
an untreated patient reaches the arrest threshold about 60 minutes after
onset. Derived vitals are formulas of state (HR, ABP, CVP, PAOP, CI, SvO2,
urine, lactate, and 15-minute chest-tube output, which needs the drainage
history, see `history` in 4.3). Every delay is a real one:

| What | Delay |
|---|---|
| Charted chest-tube drainage check | every 15 min (q15 in the first post-op hours) |
| Fluid bolus on a pressure bag | 50 mL/min: 250 mL over 5 min, 500 mL over 10 min; effect decays with a 20 min time constant; each later bolus 0.6x the last (`pow`) |
| Vasoactive drips | approach the set dose with time constants of 3-3.5 min; titrate every 5 min |
| Clearing clot from the tubes | relief over 2 min; flow for 6 min |
| Protamine | 25 mg over 10 min, BP dip easing over 3 min after |
| Surgeon | callback 2 min after the page; at the bedside 10 min after a callback that brings them; phone orders mean "call back in 15 min" |
| STAT bedside echo | 10 min |
| Labs | point-of-care gas and ACT 5 min; central-lab coags 45 min |
| To re-exploration after the surgeon decides | OR 15 min if OR and perfusion were notified, 30 min if not, +5 min without an echo; bedside resternotomy 5 min with the tray at the bedside, 10 min without |
| Written-reasoning pause | at the first clear deterioration (E ≥ 0.20, about 12 min after onset) or 15 min after onset, whichever is first |
| Phase 2 | back in the ICU 90 min after re-exploration starts; one decision, then reassessment 30 min later (turn-based) |
| Expert targets | recognise by the next q15 check (≤ 15 min), page the surgeon to the bedside ≤ 20 min, re-exploration ≈ 40 min after the drainage stops |

**Skips** appear only while the learner is waiting on something: the
callback, the surgeon's walk, the OR, the echo, labs, a running bolus or
protamine, the 5-minute drip reassessment, the surgeon's 15-minute recheck
and the next q15 drainage check. Each button reads "Skip to … (≈ N min)"
and its spoken label says how much real time it skips. A skip steps the
physiology second by second, stops early at a new alarm or result, and is
logged and reported in the debrief. One authoring observation: the q15
drainage check is always pending, so in the prototype a skip is available
at almost every moment of the live phase (alarms and results still stop
it). Whether a recurring check counts as a `wait` is an authoring choice
per scenario; the linter warns when some `wait` is pending at every tick
of a golden path (16).

Also needed: decaying effects, drips with dose choices, assessments whose
text depends on state bands, an SBAR call built from four choices whose
combination decides whether the surgeon comes, a condition-triggered
reasoning pause, a terminal condition (PEA arrest), path classification at
a moment (early / bridge / late), a second phase with discrete choices,
timed criteria ("tubes checked within 15 min of onset", measured on the
sim clock), KPIs and an expert path.

**Cloud (ticket on-sale launch day): untimed build, then turns with real
timestamps.** A **build phase**: place components from a catalogue into
slots (edge, public/private subnets per AZ, regional), configure some (ASG
size, min, max), within a $2,500/month budget, with a live requirements
checklist. Then a **run phase**, turn-based: the clock starts at 08:55 and
"Advance clock to HH:MM" jumps to the next event (09:00 doors open, 10:00
on-sale 10x spike, 10:50 AZ a power loss, 14:10 primary database host
failure, 16:30 finance asks for a 30% cut). Within each event a
second-by-second sub-timeline is derived from the design and sourced AWS
timings: ALB health checks every 30 s (2 failures unhealthy, 5 passes
healthy), 60 s DNS TTL, target-tracking alarm 180 s, EC2 launch 90 s, app
start 60 s (ASG scale-out ≈ 510 s from the spike, replacement ≈ 330 s), RDS
Multi-AZ failover 100 s, Aurora 30 s, ElastiCache 10 s, app reconnect 10 s,
PITR restore 40 min with 5 min of log lag, rebuild from a dump 80 min, NAT
fix by on-call 45 min, AZ power back after 45 min and instances after 60,
on-sale rush 40 min. For each event and area (network, compute, edge,
database, cache) the first matching row of an ordered rule table decides
held / degraded / broke and the minutes charged against a 43.2-minute
monthly error budget (99.9%).

**Project (hybrid PMP project): turns of one dated working week.** Twelve
weeks, week 1 = Mon 1 Feb 2027 (fictional), each turn a Mon-Fri week with a
decision card of 3-4 choices whose effects change stakeholder scores,
cost, velocity multipliers over a week range, a risk register and flags,
and schedule **delayed consequences** at realistic lead times: two weeks'
notice on a resignation, internal backfill in 2-4 weeks (external hire
6-10 weeks, so never inside the project), agency contractor placed in
about a week and productive 2-3 weeks later, an expedited change 1-2 days
versus the weekly change board, burnout about 3 weeks after sustained
overtime, defects from a cut test window surfacing in UAT 2-3 weeks later,
adoption measured on the first pilot week. Earned-value numbers are
formulas over the weekly S-curve and the active multipliers.

**Fitness (NASM): untimed assessment, then turns of one dated training
week.** Intake on Mon 4 Jan 2027 (fictional) with a PAR-Q+ red flag
(refer, modify, proceed); training starts the following Monday, or three
weeks later if the client is referred for clearance (primary-care
appointment plus an exercise ECG). An overhead squat assessment, a program
built from options, classification of the program into a path by ordered
predicates, weekly progression read from **per-path** arrays (pain about
-0.5 points a week on the good path at full adherence, body fat about
-0.18 points a week; last value repeats), DOMS after week 1, a missed week
chosen by a **seeded random generator** from weeks 3, 5 or 6, a week-4
reassessment (progress once compensations are ≤ 65% of intake), and
drop-out endings (pain ≥ 8.5 or weekly adherence < 45%).

**What the engine must therefore provide.** Numeric, boolean, enum, set,
time and record-list state; field updates on existing records; derived
values; sampled **history** of a value (15-minute drainage, trend arrows);
per-tick continuous updates; one-shot and decaying effects; `pow`;
scheduled timers with distinct instances; condition triggers; ordered
first-match tables; read-only **catalogues** (components, paths) with keyed
lookup; list literals; parameterised actions (choices, forms, catalogue
placement, picks from a dynamic list); phases with their own action sets
and clock mode (`running`, `turns`, `stopped`); decision prompts that stop
the clock; seeded randomness; endings with an outcome class; criteria
with access to the action log; KPIs; and an expert path. Nothing in the
list is subject-specific. The later consoles add typed-command patterns
with captures, tabular output, string and IP/CIDR functions and record
lookup (4.3, 20); they are designed now so major 1 does not need to change
when those renderers arrive.

**Mapping the renderers onto the schema** (later sections define the
terms):

| Renderer | State it binds | Typical actions | Time |
|---|---|---|---|
| Bedside monitor | numeric vitals, drips, pending results, history | assess, order, titrate, call (form) | `running`, 1 s tick, skips while waiting |
| Architecture board | `items` records (type, slot, config), catalogue, derived facts | place, remove, configure | build `stopped`; run `turns`, 10 s tick, advance to each event |
| Project dashboard | EV numbers, stakeholder scores, register set, modifiers | decision cards (prompts) | `turns`, 1 h tick, advance to next Monday's card |
| Client trainer | pain, OHSA severity, body fat, adherence | intake, assessment picks, program form, weekly replies | assess `stopped`; weeks `turns`, 1 d tick |
| Treatment session | pain, ROM, HR/BP response, fatigue | interventions with dose, rest, re-test | `running`, 1 s tick, skips during rest/sets |
| Security console | alerts, hosts, log records; attacker stage | pick from alert/host lists, search logs, contain | `running`, 1 s tick |
| Terminal / network | devices and links as catalogue + records | typed commands matched to patterns | `running`, 1 s tick |
| Data / code console | authored datasets (catalogues), findings | pick a query or fix, inspect result tables | `turns` or `running` |

The renderer decides how things look and how a learner picks actions. The
document decides what exists and what happens. A renderer never contains a
rule, and never samples or stores state of its own (a trend arrow reads
`history`, so it survives a resume on another device).

### 3.1 The prototypes' endings against the outcome classes

Section 9.2 defines three measured **outcome classes**: `target` (goal met,
no harm), `recovered` (goal met late or with avoidable harm or cost) and
`harm` (the bad thing happened). Mapping each prototype's existing endings
onto them, with the per-family default thresholds (9.2), shows where a
prototype's hand-written tone disagrees with the measured rubric. The
ports in Phase 1a follow the rubric, not the prototype's tone, and these
differences are deliberate.

**Critical care.**

| Prototype ending (tone) | Class | Notes |
|---|---|---|
| `early` (good) | `target` only if the surgeon was paged to the bedside ≤ 20 min and re-exploration started ≤ 45 min after the drainage stopped; otherwise `recovered` | **Contradiction**: the prototype calls it early when the effective page was ≤ 20 min and E < 0.6, but never checks the 45-minute window. A page at 20 min plus 2 min callback, 10 min walk and 15-30 min to the OR reaches re-exploration at 47-62 min. |
| `bridge` (good) | `recovered` | **Contradiction**: its narrative has 2 units of red cells and "slower and closer than it needed to be", which the clinical default puts in `recovered`, not with the expert path. |
| `late` (warn) | `recovered` | Bedside reopening is a rescue. Consistent. |
| `arrest` (bad) | `harm` | Consistent. The prototype has no ROSC branch; arrest is terminal. |
| Phase 2 choice | — | **Gap**: phase 2's fluid or pressor choice is graded only as a criterion; the ending stays early/bridge/late. Under the rubric "stabilised" includes the low-output state being treated, so the port makes an untreated low-output state demote `target` to `recovered`. |
| Contraindicated action | `harm` | **Gap**: the clinical default makes "a contraindicated action given" harm, but the prototype has no action it treats as contraindicated (protamine without an ACT and dobutamine in tamponade are logged as poor choices). The port must name which actions, if any, are contraindicated in this case, with a source; the reviewer checks it. |

**Cloud.** The prototype has no ending objects: a debrief headline is
picked from the four Well-Architected criteria. Classes from the cloud
default: `target` = availability ≥ 99.9% for the day by the error-budget
method (≤ 43.2 min), RPO ≤ 5 min and RTO ≤ 15 min met, cost ≤ $2,500;
`recovered` = one requirement missed by a small margin (availability
≥ 99.85%, cost ≤ 110% of budget; see the note on "10%" in 9.2); `harm` =
data loss beyond RPO, an outage beyond RTO, payment data stored, or cost
> 110%.

| Prototype headline | Class | Notes |
|---|---|---|
| "TicketBurst sold out and stayed up" (all four criteria met) | `target` | Consistent. |
| "A rough launch, and a useful one" (resilience missed: a failure broke the service, RTO > 15 or RPO > 5) | `harm` | Consistent in spirit; the port names the class from RPO/RTO directly. |
| "It held, but finance noticed" (over budget) | `recovered` if cost ≤ $2,750, else `harm` | **Contradiction**: the prototype treats any overrun alike. |
| "Survived, with a few scars" | `target`, `recovered` or `harm` by the numbers | **Contradiction**: this headline covers designs that missed the 99.9% availability target (for example a spike that broke checkout for 40 minutes), which the rubric calls `harm`, and designs with no backups, which meet every stated requirement and so are `target` on outcome (the missing backups cost process score instead). |
| Payment data stored | `harm` | **Gap**: no prototype option stores card data, so this class condition is unreachable in the cloud port unless an option is added. The linter requires every class reachable (9.2), so the port adds the option or reaches `harm` another way (it can: RTO/RPO). |

**Project.** Endings are checked in order, first match wins.

| Prototype ending (tone) | Class | Notes |
|---|---|---|
| `blocked` (bad) - privacy ignored | `harm` | Consistent (compliance gate failed). |
| `creep` (bad) - CPI < 0.88 with scope creep | `harm` if CPI < 0.85, else `recovered` | **Contradiction**: the prototype's cut is 0.88; the default is 0.85. Authors may tighten, so keeping 0.88 is allowed only if the port says so with a source; the default port uses 0.85. |
| `team` (bad) - attrition ≥ 2 or morale < 40 | `harm` for attrition ≥ 2 | **Contradiction**: low morale alone is not in the project default; the port either sources a morale threshold as a tightening or moves morale to a criterion. |
| `heroics` (bad) - CPI < 0.88 | as `creep` | Same 0.88 / 0.85 difference. |
| `clean` (good) - CPI ≥ 0.95, SPI ≥ 0.93, stakeholders ≥ 60 | `target` only with SPI ≥ 0.95 | **Contradiction**: the default asks SPI ≥ 0.95, the prototype 0.93. |
| `controlled` (good) - CPI ≥ 0.9, SPI ≥ 0.85, stakeholders ≥ 40 | `recovered` | **Contradiction**: tone good, class recovered. |
| `late` (warn) - everything else | `recovered` or `harm` by CPI/SPI | Split by the numbers. |

**Fitness.** Baseline knee pain is 6.0/10, so "reduced ≥ 50%" is ≤ 3.0
and "25-49%" is 3.0-4.5.

| Prototype ending (tone) | Class | Notes |
|---|---|---|
| `progressed`, `conservative` (good) - pain ≤ 3.0, compensations ≤ 45% | `target` when adherence ≥ 80% | **Gap**: the prototype does not check adherence; the port adds it. Screening is implicitly right on these paths (a "modify" or "proceed" intake ends in `stopped` at week 1-2). |
| `slow` (warn) | `recovered` | Consistent. |
| `plateau` (warn) | `recovered` | **Gap in the rubric**: the plateau path reduces pain by only about 0.35 points in 8 weeks (about 6%), below the 25% the default names for `recovered`, yet nothing harmful happened. Section 9.2 makes the classes exhaustive (harm first, then target, otherwise recovered), so it lands in `recovered` and its low process score makes it Mediocre or Bad. Flagged for Nick (19). |
| `knees`, `burnout` (bad) - drop-out | `harm` | Consistent. |
| `stopped` (bad) - chest symptoms in session | `harm` | Consistent (skipped required referral). |

## 4. The scenario document

### 4.1 Shape

A scenario is one JSON document. TypeScript types (the zod schema in
`backend/lib/sim/schema.ts` mirrors these exactly; a JSON Schema is
generated from the zod schema for editors and the generator). Engine
source uses only erasable TypeScript (no `enum`, no parameter properties,
no namespaces) with explicit `.ts` import extensions, because the mobile
copy runs under Node's type stripping (5.8).

```ts
// Durations are strings with a unit ("90s", "8min", "2h", "7d") so authors
// never confuse seconds and minutes. Every duration must be an exact
// multiple of the clock tick (validation error otherwise).
type Duration = string;
type Expr = string;          // the expression language, section 4.3
type Template = string;      // plain text with {expr|format} slots, no HTML
type Id = string;            // ^[a-z][a-zA-Z0-9_]{0,47}$
type Literal = number | boolean | string | Literal[] | { [k: string]: Literal };

interface Source {            // required on every timing, rate and threshold
  cite: string;               // a guideline, textbook, vendor doc or exam outline
  url?: string;
  note?: string;              // how the number was derived or simplified
  checkedAt: string;          // ISO date the author last checked the number against the source
  recheckBy?: string;         // default checkedAt + 12 months; clinical guidelines and
                              // cloud prices/limits default to + 6 months (by safety
                              // family / outcome profile). Past due: linter warning and
                              // the "stale sources" report (11.4); the sim keeps serving.
}

interface ScenarioDoc {
  schemaVersion: 1;
  engine: { major: 1 };                 // engine semantics this was written for
  slug: string;                         // stable identity within the objective
  title: string;                        // unique within the course (stored as attempts.question)
  // No "family" field: the safety family (clinical / fitness / general) is
  // derived on the server from the objective's course category, the same
  // rule as labs (labSafetyFamily), so a document cannot mislabel itself.
  screen: ScreenSpec;                   // renderer + bindings, section 8
  objective: string;                    // exact objective title (seed resolves it)
  secondaryObjectives?: string[];       // analytics only in Phase 1
  sources: Source[];                    // exam outline(s) and clinical refs
  brief: { situation: string; handover?: string[]; howItWorks?: string[] };
  safetyNote?: string;

  clock: {
    start: string;                      // "14:00", or "2027-02-01T09:00" for dated sims; display only
    tick: Duration;                     // engine step; in a running phase also the real-time step
    maxDuration: Duration;              // hard stop -> the scenario's "time_up" ending
    calendar?: "clock" | "date" | "week"; // how the renderer prints sim time
  };
  random?: { streams: Id[] };           // named seeded streams, section 5.6

  params: Record<Id, Param>;            // constants with units and sources
  catalogs?: Record<Id, Catalog>;       // read-only keyed tables (components, paths, hosts)
  state: Record<Id, StateVar>;          // everything that changes
  history?: Record<Id, History>;        // sampled past values, part of state
  derived: Record<Id, Derived>;         // pure functions of state, always current
  processes: Process[];                 // continuous per-tick updates
  tables?: Record<Id, Table>;           // ordered first-match rule tables
  phases: Record<Id, Phase>;            // which actions/prompts are live, and the clock mode
  initialPhase: Id;
  actions: Record<Id, Action>;
  timers: Record<Id, TimerSpec>;        // scheduled by effects, fire later
  triggers: Trigger[];                  // condition -> effects, each settle
  prompts?: Record<Id, Prompt>;         // decision cards (stop the clock)
  reasoning: Record<Id, ReasoningMoment>; // at least one per scenario
  outcome: OutcomeSpec;                 // class thresholds, section 9.2
  endings: Record<Id, Ending>;          // must include "time_up"
  scoring: Scoring;                     // server-only, section 9
}
```

Golden paths are **not** part of the document. They live next to it in
`<slug>.golden.json` (16) so that editing a test fixture never creates a
new content version or resets review.

The building blocks:

```ts
type Unit = string;                     // "mmHg", "mL/h", "/min", "$", "pts", "%"; dimension-checked (4.4)

interface Param {
  value: Literal;                       // numbers, lists, and maps such as paths.good.pain
  unit?: Unit;
  source?: Source;                      // required by the linter for time/rate/threshold params
}

interface Catalog {                     // read-only, keyed, ordered by `entries` order
  fields: Record<Id, FieldSpec>;
  entries: ({ id: string } & Record<Id, Literal>)[];   // at most 5,000 rows
  source?: Source;
}

type FieldSpec =
  | { type: "number"; unit?: Unit } | { type: "bool" } | { type: "string"; max: number }
  | { type: "enum"; values: string[] } | { type: "list"; of: "number" | "string" };

type StateVar =
  | { type: "number"; init: number | Expr; unit?: Unit; min: number; max: number }   // no rounding: precision is display-only
  | { type: "bool"; init: boolean }
  | { type: "enum"; values: string[]; init: string }
  | { type: "set"; of: string[]; init: string[] }             // e.g. the risk register
  | { type: "time"; init: null }                               // a tick, or null: "when X first happened"
  | { type: "records"; fields: Record<Id, FieldSpec>; max: number; init: object[] };
    // every record gets an engine-assigned integer `_id` (monotonic per variable, never reused)

interface History {                     // a ring buffer kept in state, so checkpoints and resume carry it
  of: Expr;                             // number-valued
  every: Duration;                      // sample interval (multiple of the tick)
  keep: Duration;                       // how far back; at most 1,000 samples
}

interface Derived { expr: Expr; unit?: Unit; precision?: number }   // precision: display only

interface Process {                     // runs once per tick, in document order
  id: Id;
  when?: Expr;                          // default: always
  update: Record<Id, Expr>;             // all right-hand sides read the same state, then all writes happen
}

interface Table {                       // first row whose `when` is true wins
  rows: { when: Expr; then: Record<Id, Expr>; text?: Template }[];
}

interface Phase {
  label: string;
  actions: Id[];                        // which actions are offered in this phase
  clock: "running" | "turns" | "stopped";
  // running: real time, 1 tick per tick of real time, skips while waiting
  // turns:   time moves only by "advance" (a skip to the next wait); no real-time ticking
  // stopped: time does not move (an untimed build or assessment phase)
}

interface Action {
  label: string;
  group: string;                        // renderer groups: "Assess", "Orders", "Drips", "Call"
  available?: Expr;                     // greyed out (with `why`) when false
  why?: Template;                       // shown and spoken when unavailable
  params?: ActionParam[];               // chosen by the learner; never free numbers
  effects: Effect[];
}

type Option = { value: string; label: string };
type ActionParam =
  | { id: Id; kind: "choice"; label: string; options: Option[] }
  | { id: Id; kind: "form"; label: string; fields: { id: Id; label: string; options: Option[] }[] }
  | { id: Id; kind: "slot"; label: string; catalog: Id; slots: string[] }        // architecture board
  | { id: Id; kind: "pick"; label: string; from: Expr; show: Template; max?: number }
      // pick one record (by _id) from a records-valued expression evaluated at the
      // command's tick: alerts to triage, hosts to isolate. Validated against that list.
  | { id: Id; kind: "command"; label: string; patterns: CommandPattern[] }      // terminal (20)
  | { id: Id; kind: "query"; label: string; fields: Id[]; maxLength: 200 };     // log search (20)

interface CommandPattern {              // matched by the engine's tokenizer, never a regex
  id: Id;
  pattern: string;                      // "ping {host:ipv4}", "show ip route", "ip route add {dst:cidr} via {gw:ipv4}"
}                                       // capture types: word, int, ipv4, cidr, enum(a|b|c)

type Effect =
  | { set: Id; to: Expr }
  | { add: Id; by: Expr }
  | { push: Id; value: Expr | Record<Id, Expr> }   // set or records
  | { update: Id; where: Expr; set: Record<Id, Expr> }   // fields of existing records
  | { remove: Id; where: Expr }
  | { schedule: Id; after: Expr | Duration; with?: Record<Id, Expr> }  // creates a timer instance
  | { cancel: Id; where?: Expr }                   // pending instances of that timer (all, or matching `with` values)
  | { log: Template; kind?: "act" | "find" | "sys" | "good" | "bad" | "alarm" }
  | { finding: Template }                          // assessment result card
  | { output: Template | TableView }               // terminal / console output block
  | { phase: Id }
  | { prompt: Id }                                 // opens a decision card
  | { reason: Id }                                 // opens a reasoning moment
  | { end: Id }                                    // ends the run; the ending's `when` must hold (5.3)
  | { table: Id; into?: Id }                       // apply a rule table
  | { if: Expr; then: Effect[]; else?: Effect[] }
  | { cases: { when: Expr; then: Effect[] }[] }    // first match
  | { each: Id; in: Expr; do: Effect[] };          // over a records/list value, at most 500 items

interface TableView {                   // tabular output without template loops
  rows: Expr;                           // records- or catalog-valued, after where/sortBy/take
  columns: { label: string; value: Expr; format?: string }[];
}

interface TimerSpec {
  label: Template;                      // "Surgeon arriving", shown with a countdown
  wait?: { skipLabel: Template };       // present = the learner may skip (or advance) to it
  instances: "one" | "many";            // one: scheduling while pending replaces the pending instance
  interruptsSkip?: boolean;             // a result: a skip stops when it fires
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

type OutcomeClass = "target" | "recovered" | "harm";

interface OutcomeSpec {                 // section 9.2
  profile: "clinical" | "cloud" | "project" | "fitness" | "security" | "infrastructure" | "data";
  thresholds: Record<Id, { value: number; source: Source }>;
    // keys and defaults per profile (9.2); the linter allows tighter values only
}

interface Ending {
  label: string;
  class?: OutcomeClass;                 // required on every terminal ending
  when?: Expr;                          // the state conditions that produce it; required on terminal endings
  narrative: Template;                  // shown in the run
  terminal: boolean;                    // false = a branch point (e.g. go to phase 2)
}
```

`ScreenSpec` and `Scoring` are in sections 8 and 9.

### 4.2 An excerpt: the tamponade case as data

How the revised prototype's rules look as a document (abridged,
illustrative):

```json
{
  "clock": { "start": "14:00", "tick": "1s", "maxDuration": "4h" },
  "params": {
    "onset":      { "value": 120, "unit": "s",
                    "source": { "cite": "Author's scenario timing", "note": "drainage stops 2 min after handover" } },
    "tampRate":   { "value": 0.016667, "unit": "/min",
                    "source": { "cite": "Simplified teaching model", "note": "untreated compression reaches the arrest threshold ~60 min after onset; post-op tamponade develops over tens of minutes to hours per <ref>" } },
    "callback":   { "value": 120, "unit": "s", "source": { "cite": "<unit standard>", "note": "surgeon in the OR: page to callback ~2 min" } },
    "surgeonWalk":{ "value": 600, "unit": "s", "source": { "cite": "<unit standard>", "note": "scrub out and walk to the ICU ~10 min" } },
    "fluidDiminish": { "value": 0.6, "source": { "cite": "Simplified teaching model" } },
    "fluidPeak":  { "value": { "250": 0.05, "500": 0.10 }, "source": { "cite": "Simplified teaching model" } }
  },
  "state": {
    "T":        { "type": "number", "init": 0, "min": 0, "max": 1.5 },
    "nBolus":   { "type": "number", "init": 0, "min": 0, "max": 20 },
    "boosts":   { "type": "records", "max": 20, "init": [],
                  "fields": { "v": { "type": "number" }, "at": { "type": "number" }, "dur": { "type": "number" } } },
    "cum":      { "type": "number", "init": 0, "unit": "mL", "min": 0, "max": 100000 },
    "surgeonCalledAt": { "type": "time", "init": null }
  },
  "history": {
    "cumH": { "of": "cum", "every": "5s", "keep": "20min" }
  },
  "derived": {
    "E":   { "expr": "clamp(T - fluidBoost, 0, 1.3)" },
    "ct15": { "expr": "cum - past(cumH, 900)", "unit": "mL", "precision": 0 },
    "hr":  { "expr": "clamp(88 + 40*E + 1.5*sin(t/37) + epiEff*1.5, 60, 150)", "unit": "bpm", "precision": 0 },
    "map": { "expr": "dbp + (sbp - dbp)/3", "unit": "mmHg", "precision": 0 }
  },
  "processes": [
    { "id": "tamponade", "when": "t >= onset",
      "update": { "T": "T + tampRate * (t < tubeRateUntil ? 0.6 : 1) * dt/60" } }
  ],
  "actions": {
    "fluid": { "label": "Fluid bolus", "group": "Orders",
      "params": [{ "id": "ml", "kind": "choice", "label": "Volume",
                   "options": [{ "value": "250", "label": "250 mL" }, { "value": "500", "label": "500 mL" }] }],
      "effects": [
        { "push": "boosts", "value": { "v": "fluidPeak[ml] * pow(fluidDiminish, nBolus)", "at": "t", "dur": "num(ml) / 50 * 60" } },
        { "add": "nBolus", "by": "1" },
        { "schedule": "bolusDone", "after": "num(ml) / 50 * 60" }
      ] }
  },
  "triggers": [
    { "id": "mapLow", "when": "map < 65", "mode": "edge", "interruptsSkip": true,
      "effects": [{ "log": "Alarm: MAP below 65.", "kind": "alarm" }] },
    { "id": "think", "when": "E >= 0.20 or t >= onset + 900", "mode": "once",
      "effects": [{ "reason": "whatIsHappening" }] }
  ],
  "outcome": { "profile": "clinical",
    "thresholds": { "callWindow": { "value": 1200, "source": { "cite": "Expert path: page within 20 min of onset" } },
                    "definitiveWindow": { "value": 2700, "source": { "cite": "Expert path ≈ 40 min; window 45 min" } } } },
  "endings": {
    "arrest": { "label": "PEA arrest", "class": "harm", "when": "E >= arrestE", "terminal": true,
                "narrative": "The ECG still shows a rhythm, but there is no pulse on the arterial line..." }
  }
}
```

Note what moved: `sin(t/37)` is a deterministic engine function, the
fifteen-minute chest-tube output reads `history` instead of a
renderer-side ledger, each later bolus is `pow(0.6, n)` as in the
prototype, the "15 minutes after onset" fallback is sourced, the MAP alarm
stops a skip, and the arrest ending carries its outcome class.

### 4.3 The expression language

A deliberately small, total, side-effect-free language. It is **parsed** by
a hand-written Pratt parser into an AST at validation time and **interpreted**
by a tree walker over engine values only; there is no `eval`, `Function`,
template-string execution or access to host objects anywhere.

- **Literals**: numbers, `true`/`false`, `"strings"` (enum values),
  `null` (only for `time` vars), and **list literals** `[1, 2, 3]`,
  `["app-a", "app-b"]` (homogeneous, at most 64 items).
- **Names**: only declared `params`, `catalogs`, `state`, `history`,
  `derived`, the built-ins `t` (sim seconds since start), `dt` (tick
  seconds), `tick`, `phase`, and inside an action's effects its params by
  id. Unknown names fail validation, not at run time.
- **Access**: `x[k]` indexes a list (integer `k`, clamped to the last item,
  as `seq`) or a map/catalogue (string key; a missing key is a validation
  error when `k` is a literal and yields the field type's zero value at run
  time otherwise, with a linter warning); `r.f` reads a declared field of a
  record, catalogue entry or map. So `paths[path].pain`,
  `components[item.type].cost` and `fluidPeak[ml]` type-check. There is no
  other property access.
- **Operators**: `+ - * /`, comparison, `and or not`, `? :`,
  `in` (membership in a set or list). No `**`, no bitwise ops, no
  assignment.
- **Functions** (a fixed whitelist):
  - maths: `min max clamp abs floor ceil round`, `exp ln sqrt sin cos`
    and `pow(x, y)` (engine implementations, 5.5), `lerp`, `num(s)`
    (an enum/option value to a number, validated at check time);
  - time and lists: `isNull`, `since(timeVar)`, `seq(list, i)` (index
    with last-value repeat);
  - history: `past(h, seconds)` (the sample at or before `t - seconds`,
    the oldest sample if older), `delta(h, seconds)`, `trend(h, seconds)`
    (-1, 0, 1 against the tile's threshold);
  - collections over sets, record lists and catalogues, with an inline
    predicate in which bare names resolve to the record's fields first:
    `count`, `any`, `all`, `sum`, `product`, `minOf`, `maxOf`, `distinct`,
    `find(coll, pred)` (first match or an empty record), `where(coll,
    pred)`, `sortBy(coll, field, "asc"|"desc")` (stable, then by `_id` or
    entry order), `take(coll, n)`, `groupCount(coll, field)` (records
    `{key, n}` sorted by `n` desc then `key`);
  - strings (for typed commands and log search, 20): `len`, `lower`,
    `startsWith`, `endsWith`, `contains`, `matchQuery(record, q, fields)`
    (the small search grammar of 20: terms, `field:value`, `AND`/`OR`/`NOT`,
    trailing `*`; no regex);
  - IP: `ipInCidr(ip, cidr)`, `cidrContains(a, b)`, `sameSubnet(a, b,
    prefix)`, `ipToInt` (implemented with integer arithmetic inside the
    engine; expressions still have no bitwise operators).
- **Scoring-only functions** (section 9), unavailable to tick rules so a
  tick stays bounded: `firstAct(id, cond?)`, `countAct(id)`,
  `actedBefore(id, tick)`, `everTrue(triggerId)`, `ending`,
  `outcomeClass`, `pausedTotal`, `skips`.
- **Types**: number, bool, string-enum, string (command captures and
  catalogue string fields only), time (tick or null), list, map, set,
  records, record. The checker infers every expression's type and rejects
  mismatches, an enum compared with a value it cannot have, and a `time`
  used as a number without `isNull`/`since`.
- **Totality and non-finite values** (exact rules, 5.5): division by zero
  yields 0; `ln` and `sqrt` of a non-positive number yield 0; `exp`
  clamps its argument to [-700, 700]; `pow` follows 5.5; and every
  arithmetic result is saturated to [-1e300, 1e300]. Because every operand
  is then finite, `Inf - Inf`, `0 * Inf` and NaN cannot arise, so `min`,
  `max` and comparisons never see NaN. The linter warns wherever it cannot
  prove a divisor non-zero or an `ln`/`sqrt` argument positive. Every
  state write is clamped to the variable's `min`/`max` at the moment it is
  written, and `-0` is stored as `0`.
- **Budgets**: AST depth at most 32, at most 400 nodes per expression.
  Each expression has a static cost (nodes, times the declared `max` of any
  collection it iterates). The linter computes a static **per-tick bound**
  (processes, history samples, triggers, endings and the derived values
  they read) and rejects a document whose per-tick bound exceeds 20,000
  evaluations or whose per-tick bound times its tick count
  (`maxDuration / tick`) exceeds 50,000,000. Collection functions over a
  **catalogue** are allowed only in action, prompt and timer effects (they
  run once per command, not per tick), with their own static bound of
  200,000 evaluations per command. The engine enforces both bounds at run
  time and ends the run with `engine_error` if one is ever exceeded (a
  linted document cannot; the check protects the server against a bad
  one). Servers also cap evaluations per request (14).

**Templates** (`log`, `finding`, `output`, narratives) are plain text with
slots: `"PAOP {paop} mmHg with CVP {cvp}."` or `{t|clock}`, `{t|date}`,
`{x|1dp}`, `{n|usd}`. Only expressions of scalar type and the format
filters are allowed inside slots; tabular output uses `TableView`, never a
template loop. The output is rendered as text, never HTML or Markdown.

### 4.4 Validation rules

`validateScenario(doc)` returns a list of problems (empty = valid), the
shape `labContentProblems` already uses. Three layers:

1. **Schema**: the zod schema, string lengths (the lab limits where they
   apply: title 200, brief 6000, step text 3000), id patterns, counts
   (at most 60 actions, 40 timers, 80 triggers, 12 endings, 30 criteria,
   500 records per records variable, 5,000 rows per catalogue).
2. **Semantic**: every expression parses and type-checks; every reference
   (timer, phase, prompt, ending, table, action, reasoning, catalogue,
   history id) exists; at least one terminal ending, one reasoning moment
   and one `critical` criterion; a `time_up` ending exists; every terminal
   ending has a `class` and a `when`; every `{ end: id }` effect names an
   ending whose `when` the checker cannot prove false at that point (and
   the engine asserts it, 5.3); every duration is a multiple of the tick;
   every history `every` is a multiple of the tick and `keep / every`
   ≤ 1,000; the budgets in 4.3 hold; every `wait` timer has a skip label;
   every `interruptsSkip` trigger has a log line; every reasoning part has
   criteria and a model answer; every `turns` phase has a `wait` timer
   that some effect schedules; the screen bindings name real state.
3. **Content** (the linter, section 16): sources on every timing, rate and
   threshold, each with `checkedAt` (a warning when its `recheckBy`, or
   the default, has passed); units are dimension-checked (a `/min` or `/h` rate
   multiplied by `dt` must be divided by 60 or 3,600; warning); fictional
   framing and safety rules per safety family (the lab rules: no "your
   patient/client", fictional people, the safety note); outcome rules
   (9.2): every outcome threshold is no looser than the profile default,
   each of `target`, `recovered` and `harm` is the class of some reachable
   terminal ending, and no explored path reaches a `target` ending with a
   critical criterion missed; golden-path rules: every ending is reached,
   every criterion is both met and missed, and there is at least one Good,
   one Mediocre and one Bad path (9.2).

The seed, the tests and (later) the generator call the same function, as
they do for labs (`lib/lab-content.ts`).

### 4.5 Versioning and the content hash

- `schemaVersion` is the document format. A breaking format change bumps it
  and ships an upgrader (`upgradeScenario(doc): doc`) that the seed runs on
  older files; the stored document is always the current format.
- `engine.major` is the engine semantics the document was written for. The
  engine refuses a document for another major (5.8).
- **Content versions**: each change to a scenario's content creates a new
  **version row** with an incrementing `version`. Runs pin the version they
  started on, so a learner mid-run is never moved onto changed rules, and
  replay of an old run uses the version it ran.
- **Content hash**: SHA-256 (server-side, Node's `crypto`) of the canonical
  JSON of the **runtime and learner-facing content**: everything in the
  document. Golden paths are not in the document (4.1), so editing a test
  fixture changes nothing stored and never resets review. Canonical JSON:
  keys sorted, no insignificant whitespace, numbers in shortest round-trip
  form. Labs hash an ordered array with MD5 (`labContentHash`); sims use
  canonical JSON because documents are objects whose key order is not
  meaningful. A changed hash makes a new version with `review_status =
  'needs_expert_review'`; an unchanged one is a no-op, so `npm run seed`
  stays idempotent. A file reverted to an earlier hash points the sim back
  at that existing version row (6) rather than inserting a duplicate.
- **Client document**: the server derives a **client document** from the
  full one by dropping `scoring`, reasoning `parts` and ending debrief
  text. The app receives only that (section 15 explains what that does
  and does not protect). Its hash is a SHA-256 stored next to the content
  hash; the app keys its cache by it and checks it with `expo-crypto`
  (already a dependency) or Web Crypto before using a cached copy.

### 4.6 The four prototypes, construct by construct

The proof that one schema fits: every rule in each prototype has a home.
Phase 1a makes this proof executable by porting all four (17).

**Critical care.** `T`, drip rates and effective drip levels, fluid total,
`nBolus`, `boosts` (records: peak, start, duration) and the drainage total
`cum` are `state`; vitals are `derived` (the fluid offset is `sum(boosts,
v * min(1, (t - at)/dur) * exp(-max(0, t - at - dur)/(decay*60)))`); the
15-minute output is `cum - past(cumH, 900)` over a `history` sampled every
5 s; clot growth and drips approaching their dose are `processes`; each
later bolus is `pow(fluidDiminish, nBolus)` smaller; "Check tubes" is an
action whose `cases` give the first-time clot and the repeat; the SBAR
call is a `form` param and `cases` on `S == "stop" or A == "tamp" or R ==
"come"` decide whether the arrival timer is scheduled after the 2-minute
callback; callback (2 min), surgeon walk (10 min), echo (10 min), POC labs
(5 min), coags (45 min), the bolus and protamine finishing, the 5-minute
drip reassessment, the surgeon's 15-minute recheck, the q15 drainage check
and the OR or bedside setup (15/30 min, +5 without echo; 5/10 min bedside)
are `timers` with `wait` and `interruptsSkip` where the prototype
interrupts; alarms and the reasoning pause (E ≥ 0.20 or 15 min after
onset) are `triggers`; arrest is a terminal `harm` ending with `when`;
early/bridge/late is a `table` applied when re-exploration starts, setting
the outcome inputs (time of the effective page, time to re-exploration,
units transfused, bedside reopening), followed by a non-terminal ending
that moves to phase `p2`; the OR is a `wait` timer ("Skip to: back in the
ICU (≈ 90 min)"); phase 2 is a `turns` phase whose four options are a
`prompt` that sets the vitals and schedules the 30-minute reassessment;
the terminal endings (`target`, `recovered`, `harm`) read those inputs
against the outcome thresholds (3.1); the criteria use `firstAct("tubes",
t >= onset)` and the stored `surgeonCalledAt`.

**Cloud.** Phase `build` (clock `stopped`) offers `place` (a `slot` param
over the `components` **catalogue**: name, group, slots, cost, max, flags),
`remove` and `configure` (ASG size/min/max as `choice` params, applied
with `update` on the placed record); placed components are an `items`
record list; the requirements checklist is `derived` booleans (`count`,
`any`, `distinct`, `sum` over `items`, with `components[type].cost` lookups)
plus a `table` per requirement for the "why" text. "Run launch day" moves
to phase `run` (clock `turns`, 10 s tick from 08:55); each event (09:00,
10:00, 10:50, 14:10, 16:30) is a `wait` timer the learner advances to; its
effects apply one `table` per area (`EVENT_RULES` rows become `{when, then:
{status, downMin, degradedMin, rpo, rto}, text}`), add to
`errorBudgetUsed`, and schedule the event's sub-timeline as timers at
their sourced offsets (ALB checks, failovers, ASG ramp 510 s), whose log
lines carry the second-level timestamps; the finance cut is a `prompt`;
the terminal ending is classified from availability, RPO, RTO and cost.

**Project.** The run is one `turns` phase (1 h tick from Mon 1 Feb 2027
09:00). Each Monday's card is a `prompt` opened by a `wait` timer ("Skip
to: week 3 status meeting, Mon 15 Feb"); choice `fx` become effects:
point changes are `add`, `register` is `push` onto a set, `flags` the
same, `lump` adds to `AC`, `mods` push records `{vel, cost, from, to,
label}`, and `later` is `schedule` of a delayed-consequence timer at the
lead time in 3 (two weeks' notice, 2-4 week backfill and so on). Weekly
EV/AC/PV are effects of the week-boundary timer using `seq(pvCurve, week)`
and `product(mods, from <= week and week <= to, vel)`. Risk events read
the register (`"R1" in register`) to pick the registered or unregistered
branch with `if`. Endings are classified by CPI, SPI, compliance flags,
stakeholder minimum and attrition.

**Fitness.** Intake, the overhead squat observations and the program are
`prompts` and `form` params in a `stopped` phase; path classification is a
`table` in order (heavy, overtrain, plateau, partial, good); training is a
`turns` phase (1 d tick, dated from the program start, which is the
following Monday or three weeks later after a referral); weekly change
uses `seq(paths[path].pain, weeksOnPath)` from the `paths` map param,
scaled by adherence; DOMS and the week-4 reassessment are timers; the
missed week is `pick(missed, [3, 5, 6])` from a seeded stream at the start;
drop-out is a `harm` ending on `pain >= 8.5 or adherence < 45`; the
week-8 endings are classified by pain reduction, adherence, screening and
adverse events.

## 5. Engine architecture and the time model

### 5.1 The invariant

> Let **Pre(n)** be the state on reaching tick *n* and **Post(n)** that
> state after the commands stamped *n* have been applied. Pre(n) is a pure
> function of (client document, seed, commands with tick < *n*); Post(n)
> of (client document, seed, commands with tick ≤ *n*). The learner always
> sees Post of the current tick, and a command is stamped with the tick
> whose Post state the learner was looking at.

Everything else in this section exists to keep that true. Rendering,
networking, wall clocks, pauses and AI never feed the state.

### 5.2 Commands, not events

The learner's inputs are **commands**, each stamped with the tick it
applies at and a per-run sequence number:

```ts
type Command =
  | { seq: number; tick: number; type: "act"; action: Id; params?: Record<string, string | number> }
  | { seq: number; tick: number; type: "choose"; prompt: Id; choice: Id }
  | { seq: number; tick: number; type: "skip"; timer: Id; instance: number; to: number }  // to = that instance's due tick
  | { seq: number; tick: number; type: "pause"; reason: "learner" | "background" | "stall" | "idle" }
  | { seq: number; tick: number; type: "resume" }
  | { seq: number; tick: number; type: "reason"; moment: Id; answered: boolean }
  | { seq: number; tick: number; type: "end"; reason: "learner_quit" };
```

In a `turns` phase the renderer's "Advance to 10:50" is a `skip` to the
earliest pending `wait` instance; there is no separate command.
`pause` and `resume` change no state: they exist so the server can account
for wall time (the speed bound, 5.7) and so the debrief can show paused
time. Reasoning **text** is not part of the command log: it never affects
state, and keeping it out keeps the log replayable without the AI. The
`reason` command marks the moment closed and records whether the learner
submitted an answer (`answered: false` is a skip, scored as missed, 10).

### 5.3 Tick semantics

This section is the specification the engine is built against. It is
written, with the worked example below, and a **golden corpus** is
generated from a reference run and frozen (`backend/lib/sim/engine/v1/
golden/`, 16) **before** any engine code beyond the parser is written. A
change that alters any corpus hash is a new engine major (5.8).

**Values.** Numbers are IEEE 754 doubles. Every state write is clamped to
the variable's `min`/`max` at the moment of the write, `-0` is stored as
`0`, and arithmetic is total (4.3). State is never rounded: `precision` is
display-only, so slow accumulators (a rate of 0.0006 per tick) are never
eaten by rounding.

**Derived values** are pure functions of current state and are always
current: reading one returns its expression evaluated on the state at that
instant. The engine implements this by dependency tracking (each derived
value records which state, history and derived names it reads, and is
recomputed only when one of them was written since its last evaluation),
which is an optimisation with no observable effect.

**Timers** are instances. `schedule` creates an instance with a run-unique
integer id (the next value of a counter in state) and a due tick
`now + after` (`after` ≥ 1 tick; validation rejects less). For a timer with
`instances: "one"`, scheduling while an instance is pending cancels that
instance first; with `"many"`, instances coexist. `cancel` removes pending
instances of that timer (all, or those whose `with` values match `where`).
Waits, skips and the debrief name instances, so "skip to the surgeon"
is never ambiguous.

**Settle** (run after every advance and after every command):
1. Evaluate `triggers` in document order. A `once` trigger fires the
   first time its condition is true; an `edge` trigger fires when its
   condition is true and was false at its previous evaluation (initially
   false). Each trigger's effects run immediately, so later triggers see
   their writes; a trigger's own previous value is updated after its
   effects run.
2. Evaluate `endings` that have a `when`, in document order. The first
   true one is reached: a terminal ending ends the run; a non-terminal
   ending fires once per run and applies its phase change.
3. If an effect opened a prompt or reasoning moment, the clock is blocked
   (below).

**Advance** from tick *n* to *n+1* (only when the phase clock is not
`stopped`, no prompt or reasoning moment is open, and the run has not
ended):
1. `tick := n + 1`, `t := tick × dt`.
2. Run `processes` in document order. Within one process every right-hand
   side is evaluated against the same state, then all its writes happen
   (clamped). A later process sees an earlier one's writes.
3. Fire every pending timer instance whose due tick ≤ *n+1*, ordered by
   (due tick, instance id). Its effects run in order.
4. Record `history` samples whose interval divides *n+1*.
5. Settle.
6. If *n+1* = `maxDuration / tick` and the run has not ended, reach the
   `time_up` ending.

**Apply** a command stamped *n* (in `seq` order, all before any advance
past *n*): validate it against Post-so-far (the action is in the current
phase and `available`; params are among the declared options or, for
`pick`, among the list evaluated now; a `skip` names a pending wait
instance and its due tick; commands stamped while the clock is blocked
can only be `choose`, `reason`, `pause`, `resume` or `end`), run its
effects, then settle. An invalid command is rejected with its seq and
reason, never silently ignored. An `{ end: id }` effect whose ending's
`when` is false is an `engine_error` (the linter catches it first).

**Skip** stamped *n* to *to*: repeat Advance until the tick is *to*, or
until an advance fired an `interruptsSkip` trigger or timer, reached an
ending, or opened a prompt or reasoning moment. The tick it stopped at is
deterministic and the server recomputes it; the next command must be
stamped at or after it.

**Blocked clock.** While a prompt or reasoning moment is open no advance
happens; the learner's answer is a command at the same tick.

**Worked example** (a toy, not a valid scenario). `tick 1s`; state `x`
(number, init 0, min 0, max 4); param `rate` 1 (/s); process `grow`:
`x = x + rate*dt`; action `boost`: `{add: x, by: 2}`, `{schedule: ding,
after: "2s"}`; timer `ding` (`instances: "one"`): `{log: "ding"}`;
trigger `hi` (`edge`): `x >= 3` → `{log: "hi"}`. Commands: `{seq 1, tick
1, act boost}`.

| Tick | Step | x | Pending timers | Log | Note |
|---|---|---|---|---|---|
| 0 | Post(0) = init, settle | 0 | - | - | `hi` evaluates false |
| 1 | Advance: process | 1 | - | - | Pre(1) |
| 1 | Apply seq 1: add 2, schedule | 3 | ding #1 due 3 | - | |
| 1 | Settle | 3 | ding #1 due 3 | hi @1 | Post(1); `hi` false → true |
| 2 | Advance: process | 4 | ding #1 due 3 | - | `hi` stays true, no fire |
| 3 | Advance: process, timers | 4 | - | ding @3 | 5 clamped to 4 at the write |

A `skip {seq 2, tick 1, timer ding, instance 1, to 3}` after seq 1 yields
exactly the rows for ticks 2 and 3, and the next command must be stamped
≥ 3. This table is the first entry of the golden corpus.

### 5.4 Real time, turns, waits and skips

- **Running phases** advance one tick per tick of real time. The app keeps
  an anchor (tick, monotonic time) set at each resume and, on each frame,
  computes `target = anchorTick + floor((now - anchorTime) / tickMs)`. It
  then steps at most **3 ticks per frame** toward the target; if it is
  still behind after that, it re-anchors at the tick it reached rather than
  jumping. A slow phone therefore runs the sim slightly slow, never in a
  burst. If the gap since the previous frame exceeds **3 s** (the OS
  suspended the app, the phone slept before the pause was written, the
  debugger stopped it), the app does not catch up at all: it appends
  `pause { reason: "stall" }` at the last stepped tick and shows "Paused:
  the app was interrupted". This makes the design independent of whether
  the platform's monotonic clock counts time asleep (iOS and Android
  differ). The last stepped tick is written to the journal every 5 ticks
  and at every pause (5.9).
- **Turns phases** never tick in real time. Time moves only by advancing
  to the next wait, through the same skip semantics, so cloud's launch day
  and the project and training weeks show real timestamps and dates while
  the learner reads at their own pace. A `turns` phase in which no wait is
  pending and no prompt is open would be stuck; the validator requires
  each `turns` phase to schedule a wait, the golden paths and path search
  check it, and the engine ends a stuck run with `engine_error`.
- **Waiting**: the engine reports `waits(state)`: every pending timer
  instance whose spec has a `wait`, with its instance id, due tick and
  label. The renderer shows them, soonest first, as "Skip to: the
  surgeon's callback (≈ 2 min)", and only while one is pending. Nothing
  else is skippable.
- **A skip** steps every tick from now to its target exactly as real time
  would (same processes, timers, triggers) and stops early on an
  `interruptsSkip` trigger or timer, an ending, or a prompt or reasoning
  moment opening; the log says "Skip stopped at 14:21: MAP below 65". The
  run records how much time was skipped. **Skip equivalence**, tested as a
  property (16): a run with a skip and the same run waiting in real time
  have identical Post states at every tick from the skip's stop tick on.
  On the phone a long skip is computed in chunks of at most 250 ticks per
  frame with a progress line, so a 90-minute skip (5,400 ticks) never
  freezes the UI thread on Hermes (14).
- **No speed control.** The prototype's old 5x/10x/20x control is gone, as
  in the revised prototypes: compressing time anywhere except an explicit
  wait would misteach how long things take.
- **Pause** is always available while the clock runs. It stops the clock
  and is logged. It is never penalised in scoring and there is no pause
  budget (decisions 2 and R2): timing criteria are measured on the **sim clock
  only**, so "tubes checked within 15 min of onset" means 15 sim minutes,
  however long the learner paused. The debrief shows total paused time for
  the learner's own information.

### 5.5 Determinism

- **Maths**: `+ - * /` and `sqrt` are exactly rounded in IEEE 754, so they
  agree on every engine. `Math.exp`, `Math.sin`, `Math.pow` and `**` are
  not specified to the last bit and do differ between engines. The engine
  ships its own `exp`, `ln`, `sin`, `cos` built only from basic operations
  (range reduction plus a fixed polynomial), and `pow(x, y)`: for an
  integer `y` with |y| ≤ 64, repeated squaring in a fixed order (negative
  `y` as `1 / pow(x, -y)`); otherwise `exp(y × ln(x))` for `x > 0` and 0
  for `x ≤ 0` (linter warning); `pow(0, 0) = 1`. Results saturate as in
  4.3. A source check forbids `Math.*` other than `Math.sqrt`,
  `Math.floor`, `Math.ceil`, `Math.abs`, `Math.round`, `Math.min`,
  `Math.max`, `Math.imul`, `Math.trunc` inside the engine folder, and
  forbids `**`.
- **No rounding of state** (5.3). Determinism comes from the maths above,
  not from rounding.
- **Ordering**: object iteration order is never relied on; everything the
  engine iterates is a document-ordered array, a sorted key list, or
  records in `_id` order.
- **No wall clock, no `Math.random`, no locale, no `Intl`** inside the
  engine. Number and date formatting for templates use a fixed formatter
  (UTC dates from the document's `clock.start`).
- **State hash** for desync detection: a 64-bit non-cryptographic hash
  (FNV-1a computed as two 32-bit lanes with `Math.imul`) over the state in
  canonical order, hashing each number's IEEE bits (via a `Float64Array`
  view, `-0` normalised to `0`), each string's UTF-16 code units, and
  explicit tags for types, lengths and nulls. No canonical JSON text, so
  number-to-string formatting can never differ between engines. It is not
  a security control (5.7, 15); the content hashes in 4.5 are SHA-256.

### 5.6 Randomness

Seeded only. The server picks a 32-bit seed when the run starts; each named
stream (`random.streams`) gets an independent generator derived from
(seed, stream name), so adding a stream never shifts another. Expressions
call `pick(stream, list)` and `chance(stream, p)`, available only in
effects (not in derived values, which must be pure). The generator is
mulberry32 (integer ops and `Math.imul` only, deterministic everywhere);
its counters are part of state. The debrief shows the seed, as the
fitness prototype does, and "Try again" gets a new seed.

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
document, and **its** replay decides validity, ending, outcome class,
score and the mastery attempt.

How C handles each concern:

- **One driver per run (lease).** Exactly one device drives a run at a
  time. Opening a run on a device takes the **lease**: the server
  increments `sim_runs.lease_epoch`, records the device id, and returns
  the epoch. Every sync carries the epoch; a sync with an older epoch gets
  409 `lease_lost` with the current checkpoint, and that device shows
  "This run continued on another device" and reloads; its unsynced
  commands are dropped (counted in telemetry). Taking over is always
  allowed and explicit ("Continue on this device"), so a lost or dead
  phone never strands a run. Every write route locks the run row
  (`select … for update`) before replaying, so two concurrent syncs never
  both replay from the same checkpoint (7).
- **Cheating.** The app never sends a score or a state, only commands; the
  server rejects any command that is illegal at its tick (5.3: wrong phase,
  unavailable action, parameter not among the options, a skip that names
  no pending wait instance or the wrong due tick, tick going backwards or
  inside a skip, sequence gap). **Speed-up** is bounded: the real-time
  part of sim time (ticks advanced in `running` phases outside skips) may
  not exceed the server-measured wall time since the run started plus a
  tolerance (5 s plus 1%). So a bot cannot play a 30-minute case in 2
  seconds. Turns phases and skips are not real time and are bounded by the
  waits the server's own replay shows.
- **Save-scumming and the other side of the bound.** The speed bound is
  one-sided: it stops playing too fast, not playing a branch, seeing it go
  badly and discarding it. Online, that window is closed in practice: the
  app syncs every 10 s while running and immediately on every command, and
  a terminal ending's headline and the debrief are shown only after the
  server's replay confirms them (`finish`), so the server already holds
  the branch before the learner learns how it ended. Offline, a learner
  could play on, see the patient deteriorate, wipe the app's storage and
  replay. The server measures this: a sync that brings more than **2
  minutes** of real-time ticks the server has not seen since the previous
  accepted sync marks those ticks as **offline play** (`offline_ticks` on
  the run, shown in the admin view and telemetry). In Phase 1 offline play
  is recorded and flagged, not penalised: a learner in a lift is the
  common case, and the repeat rule (9.4) already discounts a second run of
  the same sim. If telemetry shows abuse, `SIMS_OFFLINE_AS_REPEAT=on`
  records runs with offline play as repeats (quarter weight) without a
  release. Abandoning a run before its debrief does not reset the repeat
  rule either (9.4). What remains possible is "playing with the answers in
  front of you" (a second device, the expert path from a previous run),
  which the repeat rule discounts and no design can stop in an untimed
  practice app.
- **Offline and low bandwidth.** Commands are about 100 bytes; the app
  batches them (every 10 s while running, and immediately on an action,
  skip, pause, reasoning submit or ending). Offline, the journal grows on
  the device and syncs later. The debrief needs the server (it holds the
  criteria), so the app shows "Your run is saved. The ending and debrief
  appear when you're back online."
- **Determinism.** Required by C, and testable: the app sends its state
  hash at each sync; a mismatch is logged as a `desync` telemetry event and
  the server's state wins (the app reloads from the server checkpoint).
  The target is zero desyncs; golden replays run across engines in CI and
  on devices to keep it there (16).
- **Battery.** One engine tick per second is microseconds of work. The
  costly part is drawing, which the renderer bounds (8.4). No network
  keep-alive while running beyond the 10 s sync.

### 5.8 Where the engine code lives, and engine majors

The engine is pure TypeScript with no imports outside its folder. Source of
truth: `backend/lib/sim/engine/v1/`. The app gets a **generated copy** in
`mobile/src/sim/engine/v1/` written by `npm run sim:sync-engine`, with a
header naming the source hash. One drift test in the backend suite reads
`../mobile/src/sim/engine/` and fails CI if any file differs (the backend
build already depends on `../mobile` through `scripts/build-webapp.sh`, so
the backend may read it).

Why a copy rather than one shared package: an earlier draft said the
Vercel project builds from `backend/` only; that is wrong (the web app
build reads `../mobile`). The real reasons are that Metro, the mobile
typecheck and the mobile `node --test` suite all resolve inside `mobile/`
today, and that a copy makes "which engine an OTA update ships" an
explicit, reviewable diff in `mobile/`. Metro `watchFolders` plus a path
alias to `../backend/lib/sim/engine` would also work; it is the fallback if
the copy proves a burden.

Constraints both copies obey (they are what lets one source run under
`tsx` in the backend and Node's type stripping in `mobile/`): `.ts`
extensions on every relative import, erasable syntax only (no `enum`,
parameter properties, namespaces or decorators), no imports outside the
folder. Repo changes this needs, **to do in 1a, not in this design PR**:
`allowImportingTsExtensions` in `backend/tsconfig.json` (allowed there
because it is `noEmit`; `mobile/tsconfig.json` already has it); the
backend test script reaches `lib/sim/**/*.test.ts` (today it is
`lib/*.test.ts`, which does not); the mobile test script reaches
`src/sim/**/*.test.ts` (today it is `src/lib/*.test.ts` only, and the
mobile typecheck excludes tests, so mobile tests must stay pure and the
engine is typechecked through the backend copy); a CI job for the
cross-engine golden run (16).

**Engine majors.** `ENGINE_VERSION` (`major.minor`) is recorded on every
run. **Any change that alters the output of stepping for any valid
document, including a bug fix, is a new major**; a minor may only add
things existing documents cannot use (a new function, a new param kind).
Each major lives in its own directory (`engine/v1/`, `engine/v2/`) with its
own frozen golden corpus and is never edited after release except for
security fixes that do not change any corpus hash. The server keeps every
major that an open or unreplayed run or a served version uses.

### 5.9 Leaving and coming back

The clock never advances without the learner present (decisions 1 and R1):

- **App inactive, backgrounded or phone locked**: on `AppState`
  "inactive" (iOS: notification centre, an incoming call, the app
  switcher) or "background", the app appends `pause { reason:
  "background" }` at the last stepped tick, writes the journal and syncs
  if it can. Coming back shows "Paused while you were away" with Resume.
  If the OS suspends the app before the pause is written, the 3-second
  stall rule (5.4) pauses at the last stepped tick on return, so the clock
  never fast-forwards over time away.
- **Native background sign-out.** On a device without biometric unlock,
  backgrounding ends the session after a 1.5 s grace
  (`src/auth/AuthContext.tsx`, the `AppState` effect; `src/lib/
  backgroundHold.ts`). The refresh token is revoked, so a final sync often
  cannot happen. That is fine: a session end keeps the device's local data
  (only an explicit logout sweeps it), so the journal survives and syncs
  after the same learner signs in again. No background hold is added
  (decision R1).
- **Web idle sign-out.** On web, 30 minutes without mouse, keyboard,
  scroll or touch signs the learner out with a full logout that sweeps
  local data. A learner watching a monitor without touching anything would
  trip it. So while a run is in a `running` phase the app auto-pauses
  (`pause { reason: "idle" }`) after 10 minutes without learner input and
  asks "Still there?". The logout path calls the sim runtime first: it
  appends a pause and flushes the sync while the token is still valid,
  then the sweep runs.
- **Local data sweep.** The journal lives under
  `ascendra.sim.<userId>.<runId>`. `localDataOwner` in
  `mobile/src/lib/localData.ts` only recognises its listed prefixes (lab
  drafts were missed the same way, FAIL-235), so it gains `sim` (to do in
  1c, with a test). An explicit logout syncs first; if that fails the
  learner is warned once ("Your sim run has unsaved progress") before the
  sweep.
- **OTA updates.** `useAppUpdates` applies an update silently after five
  minutes in the background unless the current route is protected;
  `PROTECTED_ROUTE_FRAGMENTS` is `["/lesson", "/pbq", "/chat"]`. It gains
  `"/sim"` in 1c, so a reload never lands mid-run (the journal would
  survive it, but the learner would lose their place).
- **App killed, crash, battery dies**: no pause was written. The journal
  is written ahead of display (each command is stored before the state it
  causes is shown) and holds the last stepped tick. On reopen the app
  resumes, paused, at that tick: the gap after it is simply never stepped.
  The server needs no inserted command, because pause changes no state;
  it learns the tick from the next sync.
- **Another device**: `GET /api/sims/runs/:runId` returns the latest
  server checkpoint, the commands after it and the server's `last_tick`
  (the highest tick any sync from the lease holder reported, commands or
  heartbeat). The new device takes the lease (5.7), replays to `last_tick`
  and offers Resume. Anything the first device never synced is lost, at
  most the last sync interval (or its offline play, which it can no longer
  submit under the old epoch).
- **Switch turned off mid-run**: routes answer 404 `sims_disabled`; the
  app keeps the journal (never deletes it on that code) and retries when
  sims are on again.

**Keeping the phone awake.** A real monitor does not dim. While the clock
is running (not paused, not waiting on a skip button), the renderer keeps
the screen on with `expo-keep-awake`; on web it uses the Screen Wake Lock
API where the browser has it and otherwise relies on the idle auto-pause.
Paused or in a turns phase, the phone sleeps normally.

### 5.10 Versions the app can run

The app tells the server what it can run, so it is never offered a sim it
cannot open. Every sims request carries `protocol: 1`, the engine majors
the build contains (`engines: [1]`) and its renderers (`renderers:
["bedside"]`). The list route marks a sim the app cannot run as "Update
the app to open this" (never hides progress the learner already has), and
the start route refuses it with 409 `app_update_required`. A version's
`engine_major` must be one the app lists; if not, the server serves the
latest approved version the app can run, if any. Seeding Phase 2 and 3
scenarios is therefore safe for older apps.

Two of the new dependencies, `react-native-svg` and `expo-keep-awake`,
are native modules. The app's `runtimeVersion` uses the `fingerprint`
policy, so adding them changes the fingerprint and native learners need a
store build before they can receive any sim UI over the air; web gets it
first. Until a learner's native build includes them, it advertises no
renderers and sees "Update the app".

## 6. Persistence

Migration `055_sim_engine.sql` (the next free number when it is written).
Additive only; follows 050's conventions (lock_timeout 5 s, IF NOT EXISTS,
guarded DO blocks, NOT VALID checks on `attempts`). It follows
`.ai/playbooks/migration.md`: current state, target state, compatibility,
rollback (6.1) and validation are written in the migration header and the
runbook.

**`sims`**: one row per scenario identity.
`id uuid pk, objective_id uuid not null references objectives on delete
cascade, slug varchar(80), safety_family ('clinical','fitness','general';
derived by the seed from the objective's course category with the labs
rule, `labSafetyFamily`, never read from the document), screen_type
varchar(40), title varchar(200), head_version_id (the version matching the
current seed file), retired_at, created_at, updated_at, unique
(objective_id, slug)`.

Two different "families" exist and are named apart everywhere: the
**safety family** above (which disclaimer and acknowledgement apply) and
the **format family** of the mastery rule (`simulation`, 9.4).

**`sim_versions`**: one row per content version.
`id uuid pk, sim_id references sims on delete cascade, version int,
schema_version int, engine_major int, document jsonb (runtime and
learner-facing content only; golden paths stay in the repo), client_document
jsonb, content_hash char(64), client_hash char(64), sources_recheck_by date
(the earliest `recheckBy` in the document, for the stale-sources report),
source ('authored','generated'), review_status ('needs_expert_review',
'approved','rejected'), reviewed_by, reviewer_credential, reviewed_at,
review_note, model, created_at, unique (sim_id, version), unique (sim_id,
content_hash)`.

**Which version is served** (for new runs; open runs keep their pinned
version):
1. the head version, if it is approved;
2. otherwise the latest approved version, if one exists (so an unreviewed
   edit never displaces an approved version);
3. otherwise the head version, if it is not rejected and
   `SIMS_SERVE_UNREVIEWED` is on;
4. otherwise nothing (the sim is not listed).
In every case the version's `engine_major` must be one the app can run
(5.10). Rejecting a version is the rollback for content: it falls back to
the latest approved one. A seed file reverted to an earlier hash makes that
existing row the head again (the unique constraint means it is found, not
re-inserted), and it keeps its review status.

**`sim_reviews`**: the review trail (every decision, not just the latest):
`sim_version_id, reviewer, credential, decision, checklist jsonb (section
11.4), note, created_at`.

**`sim_runs`**: one learner's pass.
`id, user_id references app_users on delete cascade, sim_id, sim_version_id,
seed int, engine_version, started_at (server time), status ('open',
'ended', 'abandoned'), lease_epoch int, lease_device text, last_seq int,
last_tick int, last_sync_at timestamptz, realtime_ticks int, skipped_ticks
int, offline_ticks int default 0, paused_ms bigint, revealed boolean
default false (9.4), checkpoint_tick, checkpoint_state jsonb,
checkpoint_hash char(16), ending_id, outcome_class, rating
('good','mediocre','bad'), ended_at, score jsonb (per-criterion results,
KPIs, process score), attempt_id references attempts on delete set null,
desyncs int default 0, engine_errors int default 0`. One open run per
learner and sim (partial unique index, as `lab_runs_one_open`).

**`sim_run_commands`**: the event log for replay and audit.
`run_id, seq, tick, type, payload jsonb, lease_epoch, client_sent_at,
received_at, primary key (run_id, seq)`. Append-only. Heartbeats are
**not** rows: a sync with no new commands only raises `last_tick` (never
lowers it) after the same validation as a command at that tick (the speed
bound, the run not ended). That is safe because the state at `last_tick`
is a pure function of the stored commands. A typical run is 30-200 rows.

**`sim_run_reasoning`**: one row per reasoning moment opened, the shape of
`lab_run_steps`: `run_id, moment_id, user_id, opened_tick, opened_seq,
client_attempt_id (unique per user), answer text, status ('graded',
'skipped', 'grader_failed'), verdict, feedback, part_scores jsonb,
missed_parts, classification, created_at`.

**`attempts`**: new `attempt_kind` value `simtask`; column `sim_id uuid`
(no foreign key, for the reasons in 050 section 5, FAIL-480/481); check
`attempts_simtask_shape` (NOT VALID): a `simtask` row has
`assessment_type = 'sim_run'` and `format = 'open'`, and no other kind has
a `sim_id`. `question` is the sim's title, unique within its course, as
labs store their prompt, so 045's repeat ranking (which partitions by
`type_name || ':' || question`) ranks each sim separately; a null question
would collapse every sim on an objective into one. Partial index
`(user_id, sim_id) where sim_id is not null`, built CONCURRENTLY before
the migration in production as 050's was.

**`assessment_types`**: one row, `sim_run` (section 9.4).

**Item kinds**: `sim` added to the `item_flags`, `item_status` and
`item_holdbacks` checks. 050 does this for `lab` with a loop that drops
any item-kind check whose definition lacks `'lab'` and then adds
`<table>_item_kind_050` if that name is absent. 055 uses the same shape
for `'sim'` (drop any item-kind check lacking `'sim'`, add `_055`). Because
050's guard looks for its own constraint name, re-running 050 after 055
would re-add `_050` (without `'sim'`); re-running 055 then drops it again,
so applying the chain in order converges. A dbtest applies every migration
twice in order and asserts that a `sim` row is accepted and exactly one
item-kind check exists per table.

**Metrics for review and the learner-signal auto-flag.** A view
`sim_version_daily` (sim_id, sim_version_id, day, runs_started,
runs_finished, good, mediocre, bad, abandoned, median_minutes,
desyncs, engine_errors) over `sim_runs`, plus the existing `item_flags`
counts for kind `sim`. This is the shape the learner-signal auto-flag
being built for labs and items consumes: a rising "Report a problem"
count, or a Good-rate over the last N finished runs that falls well below
the version's own earlier rate, flags the sim for review (it keeps serving
unless flags reach the existing pull threshold). Per version, so a content
change is judged on its own runs.

**RLS** on every new table (052 requires it everywhere). Account export
(`lib/account-export.ts`) gains `simRuns`, `simRunCommands` and
`simRunReasoning`; deletion cascades.

**Schema probe** in `lib/schema-status.ts`: the `sim_runs` table, the
`simtask` enum value, the `sim_run` assessment type and the `sim` item
kind, so `/api/health` fails loudly if the backend ships ahead of the
migration.

**Retention**: commands and checkpoints are kept with the run (they are the
audit trail and are small). A later job may compact commands of runs older
than a year into one jsonb column; not in Phase 1.

### 6.1 Rollback

- **Code**: Vercel Instant Rollback to the previous deployment, as every
  release. With `SIMS_ENABLED` off (the default) nothing reads the new
  tables, so the previous backend runs against the new schema unchanged.
- **Schema**: the tables, `attempts.sim_id`, its index, the check, the
  `sim_run` type and the `sim` item kind are additive. The enum value
  `simtask` cannot be dropped in Postgres. The rollback is therefore
  **switch off and leave the schema**: set `SIMS_ENABLED` off, leave 055 in
  place. If a full removal is ever required, a forward migration drops the
  sim tables, the column and the check after confirming no `simtask`
  attempt exists (or voiding them first), and leaves the enum value.
- **Content**: reject the bad version (6, "Which version is served").
- **Runbook**: 055 gets a row in the migration table of
  `docs/deploy-runbook-integration.md` (what it adds, lock behaviour,
  build the attempts index CONCURRENTLY first) and a line in its rollback
  table ("sim tables, attempts.sim_id (enum value stays) | sim runs and
  reviews"), in 1b.

## 7. API routes

All under `backend/app/api/sims/**`, thin routes over `lib/sim-routes.ts`,
the same split as labs. Every route returns 404 `{ code: "sims_disabled" }`
when `SIMS_ENABLED` is off, and the app treats that code as "keep the
journal and retry later" (5.9). Every request carries the app's
capabilities (5.10).

| Route | What |
|---|---|
| `GET /api/sims?trackId=` / `?unitId=` / `?objectiveId=` | Sims the learner can open: title, screen type, objective, state ("In progress", "Done: Mediocre"), `access` (full/sample/locked), `reviewStatus`, `runnable` (false = "Update the app to open this"). |
| `GET /api/sims/:id` | One sim: brief, safety note, disclaimer payload, client document of the served version (or the pinned version of an open run) with its hash, the open run if any, the latest finished run's summary. |
| `POST /api/sims/:id/runs { restart?, deviceId }` | Start or resume (one open run per learner and sim); takes the lease. Needs the safety-family acknowledgement (403 `lab_disclaimer_required`, reused). Returns `{ run, seed, leaseEpoch, clientDocument?, checkpoint, commandsAfter, lastTick }`; the document is omitted when the app's cached hash matches. |
| `GET /api/sims/runs/:runId` | Resume on any device: checkpoint, commands after it, `lastTick`, waits pending, current lease holder. |
| `POST /api/sims/runs/:runId/lease { deviceId }` | "Continue on this device": take the lease; returns the new epoch and the checkpoint. |
| `POST /api/sims/runs/:runId/commands { leaseEpoch, fromSeq, commands[], stateHash, tick }` | Sync. 409 `lease_lost` on an old epoch. Idempotent by `seq` (a resent `seq` with the same payload is accepted; with a different one is 409). Locks the run row, replays from the checkpoint, validates, stores, writes a new checkpoint every 300 ticks, returns `{ acceptedThrough, serverHash, rejected?, ended?, stoppedAt? }`. |
| `POST /api/sims/runs/:runId/reasoning { momentId, openedSeq, answer, clientAttemptId }` | Grade one reasoning moment (section 10). The server's replay must already contain the command at `openedSeq` and show the moment open at that point; otherwise 409 `replay_behind` (the app syncs commands first and retries). Returns parts, feedback and the model answer. Replay of an already graded id returns the stored result. |
| `POST /api/sims/runs/:runId/finish` | Called when the app reaches a terminal ending (or the learner ends early). The server replays to the end, confirms the ending and its outcome class, computes criteria, process score, rating and KPIs, records the attempt, returns the debrief. Idempotent. |
| `GET /api/sims/runs/:runId/debrief` | The stored debrief of an ended run. |
| `POST /api/sims/:id/acknowledgement { version }` | The practice-lab acknowledgement for the sim's safety family; shares `lab_disclaimer_acknowledgements` (decision 5). |

Order inside the commands route mirrors the lab submit route: auth,
validation and visibility, lease check, `select … for update` on the run
row, replay of known `seq`s, run state check, rate check, replay and
validation, then the writes in the same transaction. **Rate check**: a
per-run minimum interval stored on the run row (`last_sync_at`; at most
one sync per 2 s, with command-carrying syncs allowed immediately but
counted against 60 per minute), which costs nothing extra because the row
is already locked. `consumeRateLimit` (an advisory lock, a count and an
`auth_events` insert per call) stays on run starts and grading only.
Limits: at most 500 commands per request, 5,000 per run, 64 KB per request
body, and a **replay budget** of 20,000,000 expression evaluations per
request (about 2 s worst case on the server); a sync that would exceed it
gets 413 `replay_budget` and the app syncs in smaller pieces. Checkpoints
every 300 ticks keep a normal sync far below it.

"Report a problem" posts `{ kind: "sim", simId }` to the existing route;
enough independent flags (default 3) pull the sim (`servableSql("sim", ...)`).

## 8. Mobile architecture and the bedside-monitor renderer

### 8.1 Layers

```
app/(app)/course/[trackId]/sim/[simId].tsx    screen: load, gate, disclaimer, intro, run, debrief
src/sim/engine/v1/                             generated copy of the engine (5.8)
src/sim/runtime/useSimRun.ts                   clock anchor, catch-up cap, stall pause, lease, sync queue, AppState, keep-awake
src/sim/runtime/clock.ts                       anchor, catch-up and stall rules (pure, tested)
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
  type: "bedside" | "board" | "dashboard" | "trainer" | "session" | "security" | "terminal" | "data";
  bedside?: {
    tiles: {
      id: Id; label: string; spokenLabel: string;   // "ABP" / "Arterial blood pressure"
      value: Expr | [Expr, Expr];                    // "hr", or ["sbp","dbp"] for 118/70
      unit: Unit; sub?: Template;                    // "MAP {map} · PP {sbp-dbp}"
      alarm?: { low?: number; high?: number };       // drawn and spoken
      trend?: { history: Id; window: Duration; threshold: number }; // ▲ / ▼ from engine history, spoken "rising"
      announce: { bands: number[] };                 // section 13.2
      colour: "ecg" | "art" | "cvp" | "pa" | "spo2" | "neutral";
      hiddenUntil?: Expr;                            // PAOP "--" until wedged
    }[];
    waveforms?: { kind: "ecg" | "art" | "pleth"; from: { hr: Id; sys?: Id; dia?: Id; flat?: Expr } }[];
    infusions?: Template;
    banner?: { when: Expr; text: Template }[];
  };
  // board, dashboard, trainer, session, security, terminal, data: later phases (20)
}
```

### 8.3 The bedside layout on a phone

Designed for one thumb at 360-430 dp wide, portrait:

- **Top, sticky**: a compact monitor strip, two rows of the four most
  important tiles (author picks the order), the clock, and Pause. Large
  numerals, the monitor's own fixed dark palette (contrast-checked, 13.3).
- **Below**: full monitor (all tiles, waveforms), then the **waits row**
  ("Skip to: surgeon arrival (≈ 10 min)", shown only while something is
  pending), then the latest finding card, then
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
finding. They are drawn with `react-native-svg` paths (decision 4),
regenerated at 15 fps (the prototype's canvas sweep is the
reference) from the current HR and pressures in a sweep, not a
per-frame re-render of the tree. Off-screen or paused: no drawing. Reduced
motion: a static strip redrawn once per beat change. The engine tick (1 Hz)
and the display refresh are separate; the numbers update once a tick,
like a real monitor. Battery drain over a 30-minute expert run is
measured on one iPhone and one mid-range Android before 1c exits, with
and without waveforms; if it exceeds 8% of a full charge, waveforms drop
to 10 fps.

## 9. Scoring, debrief and mastery

Every run is measured on two things, and its rating comes from both,
never from a hand-written label alone (Nick, 2026-11-07):

1. the **outcome class** of the ending (what happened to the patient,
   system, project or client), from authored end-state thresholds;
2. the **process score**, 0-100, from the criteria (what the learner did).

### 9.1 Criteria and the process score

```ts
interface Scoring {
  criteria: {
    id: Id; label: string; weight: number;          // 1 by default
    critical?: boolean;                             // missing it is unsafe or defeats the point
    rows: { when: Expr; score: "met" | "partial" | "missed"; why: Template }[]; // first match
  }[];
  reasoningCriteria: { moment: Id; label: string; weight: number; critical?: boolean }[]; // from the AI grade
  kpis: { id: Id; label: string; value: Expr; format: "duration" | "number" | "usd"; expert?: string }[];
  expertPath: { at: string; text: string }[];
  debrief: Record<Id /* ending */, { headline: string; body: Template }>;
  modelReasoning: string;
}
```

Criteria are evaluated **once, on the server, after the run**, with the
scoring-only functions over the command log (`firstAct("tubes", t >=
onset)`). They are deterministic: the same run always scores the same.
Timing criteria use the **sim clock only** (5.4): "within 15 minutes"
means 15 sim minutes, and paused time never counts for or against.

**Process score** = 100 × sum of (weight × 1 / 0.5 / 0 for met / partial /
missed) over every criterion and every reasoning criterion, divided by the
sum of their weights, rounded to an integer. A reasoning moment the
learner skipped (`reason { answered: false }`, or never answered before
the run ended) counts as **missed**. Only a demonstrated grader failure
(`status 'grader_failed'`, after the three attempts in 10) is left out of
both numerator and denominator, and the debrief says so. Every scenario has
at least one critical criterion (validated, 4.4).

### 9.2 Outcome classes and the rating

**Outcome classes.**

| Class | Meaning |
|---|---|
| `target` | goal met, no harm |
| `recovered` | goal met late, or with avoidable harm or cost (needed rescue) |
| `harm` | the bad thing happened: arrest or death, data loss beyond RPO or SLA breach, a compliance block or a budget overrun past the threshold, client injury or drop-out |

Every terminal ending declares its class **and** the state conditions
(`when`) that produce it, written against the scenario's
`outcome.thresholds`. The classes are exhaustive by construction: an
author writes the `harm` conditions first, then `target`, and anything
else is `recovered`. The built-in `time_up` and any `{ end }` ending carry
a class like every other terminal ending. A run the learner quits
(`learner_quit`) has no class and records no attempt (9.4).

**Per-profile default thresholds** (Nick-approved defaults, pending his
review at his pace; each scenario carries them as sourced params; authors
may tighten them, never loosen them, and the linter enforces the
direction):

| Profile | `target` | `recovered` | `harm` |
|---|---|---|---|
| Clinical | stabilised, no arrest, key interventions within the scenario's expert window (tamponade: surgeon paged to the bedside ≤ 20 min and re-exploration ≤ 45 min after the drainage stops) | definitive care reached but beyond the window, or rescue needed (≥ 2 units of blood, bedside reopening, ROSC after a brief arrest) | unrecovered arrest or death, or a contraindicated action given |
| Cloud | every stated requirement met: availability ≥ the stated SLA over the day by the error-budget method, RPO and RTO met, cost ≤ budget | one requirement missed by a small margin: availability ≥ 99.85% against 99.9%, or cost ≤ 110% of budget | data loss beyond RPO, an outage beyond RTO, payment data stored, or cost > 110% of budget |
| Project | CPI ≥ 0.95 and SPI ≥ 0.95 at close, every compliance item met, every stakeholder ≥ 60/100 | CPI or SPI 0.85-0.95, or one stakeholder 40-59 | a compliance gate failed, CPI or SPI < 0.85, or team attrition ≥ 2 |
| Fitness | no adverse event, screening done correctly, primary goal met (for example knee pain reduced ≥ 50%), adherence ≥ 80% | safe, goal partly met (pain reduced 25-49%) or adherence 60-79% | an adverse event, a required referral skipped, injury, or drop-out |
| Security, infrastructure, data | defined with their renderers (20) | | |

Two readings are written down so they are not re-decided per scenario.
The cloud "missed by ≤ 10%" is read as the example Nick gave: 99.85%
against a 99.9% SLA (half again the allowed downtime) and 110% of budget;
a stricter reading (10% of the error budget) is a one-line threshold
change. **Safe but little or no progress is classified per case, never by a
family default (Nick, 2026-11-07: "whether that kind of situation is good,
mediocre or bad should depend on the case/injury").** Every scenario must
declare an explicit `noProgress` rule: the end-state condition that means
"safe, but the goal was not meaningfully reached" (for example knee pain
reduced < 25%), the outcome class it maps to (`target`, `recovered` or
`harm`), and a one-line clinical or domain rationale with its source (for
example a self-limiting complaint where waiting is reasonable, versus a
progressive condition where eight lost weeks cause harm). The linter fails
a scenario with no `noProgress` rule, and the reviewer packet shows it.
The fitness plateau path (about 6% pain reduction, 3.1) gets its rule when
the client-trainer scenario is ported. The cloud reading is recorded in 19.

**The rating** (shown in the debrief; it is the attempt's verdict):

| Rating | Verdict | Rule |
|---|---|---|
| **Good** | `correct` | outcome `target` **and** every critical criterion met **and** process score ≥ 85 |
| **Bad** | `incorrect` | outcome `harm`, **or** process score < 60, **or** two or more critical criteria missed |
| **Mediocre** | `partial` | everything else: for example outcome `recovered`, one critical criterion missed without harm, or a score of 60-84 |

Bad is checked before Good, so a run is never both. The thresholds are
engine constants, not per scenario, so a rating means the same thing in
every sim.

**Why this and not the lab rule** ("correct only when every part is met",
`runVerdict`): a sim has 8-12 criteria plus timing, and the lab rule would
make a near-expert run Mediocre for one late minute. The critical flag and
the outcome class keep the bar where it matters: a harmful outcome is
never better than Bad, a lucky good outcome with a critical miss is never
Good, and a careful run that still needed rescue is Mediocre. The rating
weighs the same as a lab's verdict in the mastery rule (both are one
attempt at weight 1.5); the difference is only in how the verdict is
reached, which the debrief explains.

**Linted** (4.4, 16): every terminal ending has a class and a `when`;
outcome thresholds are no looser than the profile default; every class is
reachable (by a golden path or the bounded path search, 12); no explored
path reaches a `target` ending with a critical criterion missed (if one
does, the author either makes the criterion part of the `target`
condition or the criterion is not really critical); every scenario has at
least one critical criterion; the golden paths include at least one Good,
one Mediocre and one Bad run, and each states its expected class, score
and rating. "Reachable" is checked over the golden paths and the bounded
path search, not proved over every possible run.

### 9.3 Debrief

Server-built from the replay: the rating and outcome headline (ending and
class, in words: "Good: stabilised, surgeon at the bedside 13 min after
onset"), KPIs with the expert value beside them, the process score, each
criterion with met / partial / missed and its `why` (critical ones marked),
"What you did" (the command log rendered as a timeline, including skips
and pauses, and the total paused time) beside "Expert path", the reasoning
answer with its grade and the model reasoning, the practice note from
`LAB_RESULTS_NOTE`, the seed, and "Try it again" (labelled as practice
that counts lightly). Tone follows labs: "Done: some parts to revisit",
never "failed"; a Bad run is "the most useful kind of run to learn from",
as in the prototype.

An optional AI-written narrative ("what turned this run") is designed but
**off** (`SIMS_DEBRIEF_NARRATIVE`, default off): it would be grounded only
on the structured debrief, cached per run, one fast-model call. Phase 1 uses
authored templates, which reviewers can check.

### 9.4 Mastery

A finished run records **one attempt**: kind `simtask`, `assessment_type
'sim_run'`, format `open`, `objective_id` = the scenario's objective,
`sim_id` set, `question` = the sim's title, verdict from the rating (9.2),
`answer` = the debrief transcript (what you did, plus reasoning text) for
history and export. The mastery rule (`mastery_detail()`, 045) is **not
changed**: its direct-answer branch counts any attempt naming an
`assessment_types` row.

| type | format family | weight | application level | unit-wide |
|---|---|---|---|---|
| `sim_run` | `simulation` | 1.5 | yes | no |

**Why these values.**
- *Weight 1.5*: the same as `pbq`, `lab_build`, `lab_case` and the reserved
  `scenario`. docs/labs.md set the principle that no format weighs more than
  a PBQ, so no single format dominates weighted accuracy; a sim is richer
  evidence, but one run is still one judgement on one objective.
- *A new format family, `simulation`*: a sim is a genuinely different
  format from a written lab (time-pressured, cue recognition, acting and
  seeing consequences). So a lab and a sim on the same objective on
  different days are two format families, which is the rule's route to
  Transfer-ready (the dbtests pin the 0.80 weighted accuracy, the 72-hour
  gap and the spaced last win with one lab and one sim). Two sims are
  still one family.
- *Application level*: like labs, one Good first run at or above 0.70
  weighted accuracy opens Independent on that objective.
- *Not unit-wide*: counts only on its objective. `secondaryObjectives` are
  recorded on the run for analytics and the review schedule is not touched
  for them in Phase 1 (decision 6).

**Counts once per run.** Only `finish` records, inside the transaction that
ends the run, under the grade lock, idempotent on the run id.

**Repeats.** A run is a repeat (`assisted`, `assist_reason 'repeat'`) when
the learner has an earlier run of the same sim (any version) marked
`revealed`. A run becomes `revealed` as soon as the learner has acted in
it (any `act` or `choose` command) or anything was revealed (a reasoning
moment opened, any ending reached), whether or not it reached a debrief.
So abandoning a run before its debrief and starting again does not make
the next run a first run; restarting before doing anything does. Under
045 a repeat counts at a quarter of its weight, only the latest repeat
counts (ranked per sim, because `question` is the sim's title), and it is
never format evidence. Decided under the grade lock, as `labAssistReason`
is.

**Review schedule.** As labs (REQ-124 decision 14): a first-run Good
moves due error-log entries and a due review schedule on; a first-run
Mediocre or Bad adds an error-log entry and steps a due schedule back; a
repeat moves nothing, and in particular writes no error-log entry (9.5).

**Abandoned runs** (the learner ends early before any terminal ending)
record nothing for mastery; their reasoning grades stay visible in
history, and they count as `revealed` for the repeat rule.

**Voiding.** A confirmed-wrong sim (`confirmItemWrong` on kind `sim`) voids
every attempt with that `sim_id` and recomputes mastery, as labs do.

### 9.5 Code that must learn the new kind

A new attempt kind and item kind touch more than the migration. Checked
against the current code; each is part of 1b with a test:

- `lib/grading-service.ts`: the `AttemptInput.kind` union (line 31) gains
  `simtask`; `recordAttemptTx` refuses a `simtask` without `simId` and
  `objectiveId` (as it does for `labtask`, lines 403-410);
  `assistReasonFor` returns `simAssistReason` when `simId` is set, before
  the `typedAssistReason` fallback (line 647); the review-schedule gate
  `labReview` (line 532) and the error-log gate `labMiss = input.kind ===
  "labtask" ? labReview : true` (line 593) cover `simtask` the same way,
  otherwise a repeat sim miss would write an error-log entry, which 9.4
  says it must not.
- `lib/item-quality.ts`: `ITEM_KINDS` (line 25) gains `sim`, with
  `itemCheck` and `confirmItemWrong` cases (lines 250, 384) and the
  automatic recheck skipped for sims as for labs (line 348).
- `lib/coach-guard.ts`: `OPEN_ITEM_KINDS` (line 17) gains `sim`, and an
  open sim run is an open item, so the tutor will not talk the learner
  through the case mid-run. The guard's own comment requires this: a new
  item kind cannot be added without it.
- `lib/account-export.ts` (the three sim tables), `lib/schema-status.ts`
  (the probe, 6), and in the app the history screen's `KINDS`
  (`app/(app)/course/[trackId]/history.tsx`, line 12) and the attempt
  types gain `simtask`.

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
  sim for review, the safety line per safety family is the lab's.
- **One model call per submission** (`withGradingClaim`), replay by
  `clientAttemptId`, rate limit shared with labs (40 per 10 minutes), counted
  toward the learner's daily graded total and, on Free, the daily typed
  answers.
- **The clock** is stopped while the moment is open (always). Closing it
  is a `reason { answered }` command; after submitting, the app resumes
  the clock right away and shows the model answer when the grade returns;
  offline, the answer is queued and the model answer appears when it
  syncs. The grade never changes sim state.
- **Ordering**: the grading request names the `seq` of the command at
  which the moment opened (`openedSeq`). The server grades only when its
  replay contains that command and shows the moment opened there;
  otherwise it answers 409 `replay_behind` and the app syncs its commands
  first. The app always sends queued reasoning before `finish`.
- **At finish**: each moment contributes its reasoning criterion (met /
  partial / missed from its verdict). A moment the learner skipped, or
  never answered, is **missed** (9.1): skipping the written part cannot
  raise the score. Only a demonstrated grader failure (the model call
  failed three times, `status 'grader_failed'`) is left out of the
  denominator, and the debrief says so.

## 11. Tiers, the switch, disclaimers and review

### 11.1 The switch

`SIMS_ENABLED`: unset, empty, `0`, `false`, `off`, `no` = **off** (the
default), the same parser as `billingEnabled`. Off: every sim route answers
404 `sims_disabled`, list routes omit sims, the course dashboard shows no
"Simulations" row, and seeding still loads scenarios (so they can be
reviewed before launch). Changeable in Vercel without an app release; the
app reads it from the course payload. An open run's journal is kept on the
device while sims are off (5.9).

`SIMS_RENDERERS`: a comma-separated allowlist of screen types that are on
(default `bedside`). A renderer can be launched, or pulled after a bad
scenario, without touching the others. A sim whose screen type is not
listed behaves as if `SIMS_ENABLED` were off for that sim.

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
migration (decision 8).

### 11.3 Disclaimers

Every sim carries the lab disclaimer from `lib/lab-disclaimer.ts` (general
line, "not reviewed" line until approved, the clinical/fitness safety line
first), plus one sim-specific line, added there:

> The patient's (client's, system's) responses come from a simplified
> teaching model written for exam practice, not a validated model of the
> real thing.

The one-time **clinical and fitness acknowledgement** is the lab one: same
table, same safety family, same version. Accepting it once covers labs and sims
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
- A content change makes a new version (`needs_expert_review`). New runs
  get the served version (6: an approved head, else the latest approved,
  else the unreviewed head when serving unreviewed is on); open runs keep
  replaying the version they pinned.
- **Stale sources.** `npm run sims:stale` (and the same list in the admin
  view) names every served version whose earliest `recheckBy` has passed,
  with the parameters due. Stale sims keep serving; the list is the
  reviewer's queue. `recheckBy` defaults to `checkedAt` + 12 months, and
  to + 6 months for clinical guidelines and cloud prices and limits.
- **Learner signals.** The per-version daily metrics (6) feed the
  learner-signal auto-flag being built for labs and items: rising "Report
  a problem" flags or a sudden drop in a version's Good rate flags it for
  review here, with the evidence (runs, Good/Mediocre/Bad over time, flag
  count) in the packet.

## 12. Authoring, seeding and (later) generation

**Files.** `backend/supabase/seed/sims/<course-code>/<slug>.sim.json`, one
scenario per file, with its golden paths beside it in
`<slug>.golden.json` (not part of the stored document, 4.1), listed in
`seed/sims/index.ts` with the course's exam outline URLs. JSON (not TS like labs) because the documents are data the
generator will also produce and the JSON Schema gives editor completion.

**Authoring steps.**
1. Pick an objective the exam tests by recognition and action over time
   (CCRN: shock states, tamponade, sepsis; NCLEX: post-op haemorrhage,
   DKA). Not every objective needs a sim; a lab is often enough.
2. Port or write the model: params with sources (each with `checkedAt`),
   state with bounds, processes, actions, timers with sourced delays.
3. Write the outcome profile and thresholds (9.2), the reasoning moment,
   endings with their class and `when` (each class reachable), criteria
   (at least one critical), KPIs, expert path, debrief text.
4. Write golden paths: at least the expert path, one slow-but-safe path and
   two failure paths, including at least one Good, one Mediocre and one
   Bad run, each with its expected ending, class, criteria, score and
   rating.
5. `npm test` (schema, linter, golden replays, property tests), then
   `npm run seed` twice (idempotent).

**Seeding** upserts `sims` by (objective, slug) and inserts a `sim_versions`
row only when the content hash is new (a reverted file points the head
back at its existing row, 6). The safety family is derived from the
objective's course, never read from the file. Removing a file retires the sim
(`retired_at`); runs and attempts stay.

**Generator (later phase).** `npm run sims:generate`, dry-run by default,
in the labs generator's shape: for a chosen objective and screen type, a
large model writes a document from the screen type's template and the
objective, then the pipeline **fails closed** through: schema and semantic
validation, the linter, an **automatic path search** (a bounded
breadth-first search over the action space at decision ticks, which must
find the expert path's ending, every outcome class, and no `target`
ending with a critical criterion missed, and must show no dominant
shortcut; the same search runs in the linter for authored scenarios, with
a smaller bound), golden path generation from the search,
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
teach cards) and `accessibilityLiveRegion` on Android. On iOS, polite
announcements use `announceForAccessibilityWithOptions` with `queue: true`
so they wait for VoiceOver to finish speaking; alarms are not queued and
interrupt. Alarms also play a distinct haptic pattern (`expo-haptics` if
already present, otherwise the platform vibration API), so a learner who
is not looking still knows; it respects the system haptics setting.

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

Estimates, to be replaced by the benchmarks named in 17:

| Item | Estimate |
|---|---|
| Engine tick (tamponade, ~25 state vars, ~40 expressions, about 800 evaluations with dependency-tracked derived values) | well under 1 ms on V8; Hermes is an interpreter and several times slower, so the 1a benchmark sets the budget from a Hermes run, not V8 |
| Longest skip in the tamponade case (back from the OR, 90 min = 5,400 ticks) | must finish within 1 s on a mid-range Android under Hermes, computed in chunks of ≤ 250 ticks per frame (5.4); measured before 1c exits |
| Server replay | from the last checkpoint (every 300 ticks) plus the new ticks; a typical sync is a few ms. Worst case is bounded by the linted per-run bound (≤ 50,000,000 evaluations) and the per-request replay budget (20,000,000, 7) |
| Network | about 100 B per command, a sync every 10 s while running: under 50 KB per run |
| Database | 1 run row, 30-200 command rows, 1-2 reasoning rows, checkpoints in the run row: about 50 KB per run |
| AI | one fast-model call per reasoning moment: about $0.0005 at the labs' measured size; one moment per sim is about $0.0005 per run, two about $0.001. Optional narrative (off) would add about $0.001. |
| Client document | 20-60 KB JSON for a bedside case; a data-console case with catalogues up to a few hundred KB, cached by hash |

A Pro learner running 30 sims a month costs about 1.5-3 cents of AI, well
inside Pro's monthly cap ($2.21). Per-tick AI cost is zero by design.

Why per-tick cost is bounded: derived values are recomputed only when a
dependency changed (5.3); aggregates over catalogues (the large tables a
data console needs) are allowed only in command-time effects, not in
per-tick rules (4.3); and records variables are capped at 500 with static
per-tick bounds. A `count` over 500 records with a 10-node predicate is
5,000 evaluations, so four such aggregates per tick would exceed the
20,000 per-tick bound; the linter rejects that document rather than the
server discovering it.

## 15. Security

- **Tampering with results**: the app sends only commands; the server
  replays and scores. Illegal commands are rejected with the tick and the
  reason; the run continues from the last legal state (the app resyncs).
  The speed bound (5.7) stops faster-than-real-time play; the lease stops
  two devices forking a run; offline play is measured and flagged (5.7).
  Skips are only legal into a wait instance the server's own replay shows
  pending.
- **Reading the rules (decision R4)**: the client document contains the
  model, so a learner can read how the patient responds. That is accepted
  for practice sims and recorded as a decision: the document is no more
  secret than a textbook, the criteria and model answers are never sent,
  and the repeat rule discounts runs made with the answers known.
  Client-side secrecy is not a security control here; server replay is. A
  hidden-rules "exam mode" would have to run on the server and is out of
  scope.
- **Client document integrity**: the app checks a cached document's
  SHA-256 against the run's `client_hash` before using it (4.5). The
  engine's 64-bit state hash detects desyncs only and is not a security
  control.
- **Injection in reasoning text**: fenced and escaped per answer, graded as
  data, never instructions (the lab grading rules), length-capped (2,000
  characters per moment), `hasUnstorableText` rejected. Learner text never
  reaches the engine, a template or another learner.
- **Learner text inside commands** (typed terminal commands and log
  searches, later renderers): at most 200 characters from a restricted
  character set, tokenised by the engine against declared patterns or the
  search grammar (no regex, so no catastrophic backtracking), echoed back
  only as text. It never reaches a model or another learner.
- **No code execution.** The data/code console never runs learner code or
  SQL (decision R3); "running" a query shows the authored result for the
  chosen option. Running learner code on the server would be remote code
  execution and a separate sandboxed system; it is out of scope.
- **Injection through scenario content**: documents are authored or
  generated, so they are treated as untrusted at the engine boundary: no
  eval, a closed set of functions, static budgets plus run-time evaluation
  budgets per tick, per command and per request, bounded state, bounded
  ticks. A malicious document can at worst produce a wrong sim, never code
  execution or a server hang.
- **Rendering**: templates render as text components, never HTML; on web,
  React escapes. No `dangerouslySetInnerHTML` in renderers (a test greps for
  it).
- **Abuse**: the per-run sync interval and `consumeRateLimit` on starts and
  grading; caps on commands per request and per run; one open run per
  learner and sim; access checks on every route (run belongs to the
  learner; the sim is visible to them; the caller holds the lease).
- **Privacy**: clinical sims never ask about real patients (the lab content
  rules); the reasoning box says not to enter real details. Runs are in the
  account export and deleted with the account.

## 16. Testing strategy

All model calls mocked; no test ever needs a real `ANTHROPIC_API_KEY`.
Test locations match the scripts that run them; extending those scripts is
a 1a prerequisite (5.8), and until then a test under `lib/sim/` or
`src/sim/` would silently not run.

**Semantics corpus first.** Before engine code beyond the parser, the
worked example in 5.3 and a set of small documents covering each step of
5.3 (process ordering, simultaneous writes inside a process, clamping at
the write, timer instance ordering and replacement, edge and once
triggers, endings in order, blocked clock, skip stopping on each kind of
interrupt, history sampling, `pow`, saturation and `-0`) are written with
hand-computed expected states. The engine must reproduce them; their state
hashes are then frozen as the `v1` golden corpus. Any change to a corpus
hash fails CI and means a new engine major (5.8).

**Engine unit and property tests** (`backend/lib/sim/engine/v1/**/*.test.ts`,
node:test, pure):
- Parser and type checker: valid and invalid programs, every operator and
  function, list literals, indexing and field access, error messages
  naming the location.
- Deterministic maths: `exp`, `ln`, `sin`, `cos`, `pow` against stored
  bit-exact expected outputs on a fixed grid, plus error bounds against a
  reference; saturation, division by zero and `-0`.
- **Determinism**: random command sequences replayed twice give identical
  state hashes at every tick.
- **Skip equivalence**: for random scripts, inserting a skip in place of
  waiting gives identical Post states from the skip's stop tick on; a skip
  stops at the first interrupt.
- **Checkpoint equivalence**: snapshot at tick *k*, restore, continue =
  straight run (history and timer instances included).
- **Bounds**: no state outside declared min/max, every run ends by
  `maxDuration`, random legal command fuzzing never throws, the budgets
  trip on a document crafted to exceed them.
- **Command validation**: illegal commands (wrong phase, bad params, a
  `pick` not in the list, a skip naming the wrong instance or due tick,
  time going backwards, a command inside a skip) are rejected, never
  applied.
- **Performance budget**: the tamponade case's tick and its 90-minute skip
  under fixed budgets.

**Golden replays** (per scenario): each entry in `<slug>.golden.json` is
replayed and must reach its stated ending, outcome class, criteria, score,
rating and KPIs, with state snapshots at listed ticks. For the four
prototype ports, the expected values come from playing the same path in
the revised prototype through its `?test=1` hook (which steps in 1 s, like
the engine; `test-cloud.js` and `test-fitness.js` already script paths for
two of them). Endings and criteria must match the prototype exactly
except where 3.1 records a deliberate change; continuous values such as
vitals must match within ±1 display unit at the listed ticks. This shows
the port behaves like what Nick tried; it does not prove the two are
identical.

**Cross-runtime.** The v1 corpus and every golden replay must produce the
same state hashes on every engine the app runs on. Phase 1a starts with a
**spike**: can CI run a Hermes VM binary on Linux? React Native 0.86's npm
packages ship the `hermesc` compiler, and a runnable VM is not confirmed
(not checked here: the worktree has no `node_modules`). If the spike finds
one (an official release binary, or Hermes built from source and cached),
CI runs the corpus on it. Either way CI also runs it in a headless browser
job on V8, SpiderMonkey and JavaScriptCore (Playwright's Chromium,
Firefox and WebKit), which covers Expo web. And before 1c exits, a
developer-only screen runs the corpus on a real iPhone and Android phone
(the app's real Hermes) and the hashes are recorded.

**The scenario linter** (`npm run sims:lint`, also run by `npm test`):
schema and semantics (4.4); every timing, rate and threshold has a source
with `checkedAt`, and past-due `recheckBy` dates warn; unit dimensions;
outcome rules (each class reachable, thresholds no looser than the
profile default, no `target` with a critical miss, at least one critical
criterion); golden-path rules (every ending reached, every criterion both
met and missed, at least one Good, one Mediocre and one Bad path); no
unreachable action (never `available` in any golden path is a warning); a
`wait` pending at every tick of a golden path is a warning (3); every tile
has a spoken label, unit and announce bands; every wait has a skip label;
alarms have `interruptsSkip`; safety-family text rules; tick and
expression budgets; client document leaks nothing server-only (a test
diffs keys).

**Server** (`*.dbtest.ts` against Postgres with every migration): start,
sync, resume on a "second device", lease takeover and 409 `lease_lost`,
two concurrent syncs serialised by the row lock, idempotent resend, 409 on
a changed resend, speed-bound rejection, offline play measured, skip
validation, reasoning 409 `replay_behind`, a skipped reasoning moment
scored as missed, finish records exactly one attempt with the rating as
verdict, repeat rule both directions (a first-run Good reaches Independent
at 1.5; a run after an abandoned-but-revealed run is a repeat), a repeat
miss writes no error-log entry, Transfer-ready with one lab and one sim
(0.80 weighted accuracy, the 72-hour gap and the spaced last win), review
schedule moves, voiding, the served-version rule (approved head, latest
approved, unreviewed head, rejected), a reverted hash, tier gating
(full/sample/locked, resume after downgrade), acknowledgement required for
clinical, the switches, capability negotiation (`app_update_required`),
the `sim` item kind after applying every migration twice, schema probe
present, account export and deletion.

**Grading**: prompt shape (fenced parts, situation summary), trivial
answers skip the model, consistency downgrade, key-suspect flags, replay by
client attempt id, the `grader_failed` path at finish.

**Mobile** (`mobile/src/sim/**/*.test.ts` and `src/lib/*.test.ts`, pure
modules run by `node --test`): journal write-ahead and recovery after a
simulated kill (resume at the last stepped tick); the clock rules (anchor,
3-tick catch-up cap, re-anchoring, the 3 s stall pause, `inactive` and
`background`); sync queue idempotency and lease loss; `localDataOwner`
recognises `ascendra.sim.*`; `/sim` is a protected route for updates;
announcer policy (alarms immediate, bands with hysteresis, rate limit,
coalescing); contrast of the monitor palette; renderer view-model
functions (state to tiles and spoken labels). Manual before each phase
exit: VoiceOver (iOS), TalkBack (Android), web at 400 px with no
horizontal scroll, 200% text, reduced motion, one-handed run of the
expert path.

**Observability.** Counters, from 1b: `engine_error` (by sim version),
replay rejections (by reason), desyncs, lease takeovers, offline-play
runs, sync latency (p50/p95) and replay time per request. The operations
runbook gains a "bad scenario" step: pull the version (reject it) or the
renderer (`SIMS_RENDERERS`), check the counters, then fix and reseed.

## 17. Rollout phases and exit criteria

No phase waits on an external reviewer; review status is tracked and shown.

**Phase 1a: engine semantics, engine and schema (pure, no database).**
In this order:
1. **Repo prerequisites** (the only config changes this work needs, made
   here and not earlier): `allowImportingTsExtensions` in
   `backend/tsconfig.json`; the backend test script reaches
   `lib/sim/**/*.test.ts`; the mobile test script reaches
   `src/sim/**/*.test.ts`; the engine-copy drift test (5.8).
2. **Hermes spike**: find or build a Hermes VM that CI can run; record the
   result. Add the headless-browser corpus job (Chromium, Firefox,
   WebKit) regardless.
3. **Semantics spec and corpus**: the 5.3 rules as hand-computed cases,
   frozen as the v1 corpus before engine code beyond the parser.
4. Engine, parser, type checker, deterministic maths, history,
   catalogues, timer instances, the linter and the bounded path search.
5. **Ports**: all four prototypes as documents with golden paths (engine
   only, no renderer): tamponade, cloud launch day, the PMP project and
   the NASM client, using the revised prototypes' timings (3) and the
   outcome classes (3.1, 9.2).
6. **Paper scenarios**: one full scenario each for the security console,
   terminal/network and data/code console, written against the schema in
   `docs/sims/paper/` (not seeded), each with its outcome profile, every
   action and output it needs, and a note of any schema feature it used.
7. Freeze engine major 1.

*Exit*: the v1 corpus and all property tests pass on Node and in the
browser job, and on a Hermes VM if the spike found one; the four ported
scenarios pass the linter (every outcome class reachable, Good, Mediocre
and Bad golden paths) and their golden paths match the revised prototypes
(endings and criteria exactly except the deliberate changes in 3.1,
continuous values within ±1); the three paper scenarios needed no feature
outside the schema (any they needed was added, with tests, before the
freeze); the tamponade tick and 90-minute skip meet their benchmark
budgets; `./omni gate` passes.

**Phase 1b: server.** Migration 055 with its rollback notes and runbook
rows, schema probe, routes (lease, row lock, per-run sync interval, replay
budget, capability negotiation, reasoning ordering), replay verification,
grading, outcome classes and ratings, mastery integration and the code in
9.5, tier gating, switches (off), metrics view and the stale-sources
report, observability counters.
*Exit*: the dbtests in 16 pass in CI's Database job; seed twice is
idempotent; every migration applied twice keeps the `sim` item kind;
`/api/health` reports the probe; nothing visible with the switch off.

**Phase 1c: app.** A store build with `react-native-svg` and
`expo-keep-awake` (5.10); sim screen, runtime (clock rules, journal,
lease, sync), `localDataOwner` and protected-route changes, bedside
renderer, accessibility.
*Exit*: pure tests pass; the manual accessibility pass is recorded; the
v1 corpus run on a real iPhone and Android phone matches Node's hashes;
expert and failure paths played on both phones and web, including
background mid-run, an OS suspension (stall pause), kill mid-run, native
background sign-out with the journal kept, web idle auto-pause, takeover
on a second device, and resume on web; no desync in those runs; the
90-minute skip stays within budget on the Android phone; battery drain over
a 30-minute run measured (8.4).

**Phase 1d: first clinical set and launch.** Three to five clinical
scenarios (tamponade first; decision 7), served with the badge.
`SIMS_ENABLED` on with `SIMS_RENDERERS=bedside` in a preview deployment
for Nick to try, then on in production when Nick says so.
*Exit*: Nick has played them; telemetry shows zero desyncs and no engine
errors over the first 100 runs; flag rate and Good/Mediocre/Bad rates per
version watched.

**Phase 2: more renderers.** Architecture board, project dashboard, client
trainer, each a renderer plus scenarios on the already-ported documents.
Engine major 1 does not change; if a renderer needs an engine change, that
is a finding recorded against this design and shipped as a minor (if it
cannot change existing output) or major 2 (5.8).

**Phase 3: generator, treatment session, security console,
terminal/network and data/code console renderers.**

## 18. Risks

- **The simplified models teach something wrong.** Mitigated by sources on
  every number with re-check dates, the reviewer packet, the badge and
  disclaimer, Report a problem, the learner-signal auto-flag, and
  key-suspect flags. Not mitigated by a gate, by Nick's choice; the
  residual risk is that an unreviewed clinical sim is served with a
  mistake, which the disclaimer and acknowledgement address.
- **Cross-engine float drift** breaks replay. Mitigated by the engine's own
  maths, the `Math.*` source check, hashing IEEE bits rather than text,
  the frozen corpus, the browser job in CI and the on-device corpus run.
  Residual: if the Hermes spike fails, Hermes is checked on devices, not
  on every CI run; desync telemetry would show drift, and the server's
  state wins.
- **Real time is long.** The tamponade expert path takes about 40 sim
  minutes to re-exploration and a slow path an hour or more. Mitigated by
  skips during waits, pause, resume anywhere, and authoring guidance (keep
  the active window to 15-30 minutes). Watch completion rates.
- **Expression language creep.** Each new renderer will want "one more
  function". Rule: a function is added only with tests, a determinism proof
  and a linter rule, never as an escape hatch to JavaScript, and never as a
  change to the output of an existing major.
- **Offline save-scumming** is measured and flagged but not prevented
  (5.7). Residual risk accepted for practice; a switch turns flagged runs
  into repeats.
- **The engine copy**: a stale copy in the app after an OTA lag.
  Mitigated by majors side by side, capability negotiation and the server
  being authoritative.
- **Outcome thresholds are defaults.** They were approved before Nick
  reviewed them in detail; a change after launch changes which runs are
  Good. Ratings are stored per run with the version, so old runs keep
  their rating.
- **Weight and family choices shift mastery.** A new format family makes
  Transfer-ready reachable through lab plus sim. That is intended, and the
  dbtests pin it.
- **Dependency additions** (`react-native-svg`, `expo-keep-awake`) are
  native and need a store build before native learners see sims (5.10).

## 19. Decisions

### 19.1 First round (were open questions; Nick, 2026-11-07: "Approve all")

Every recommendation below is adopted as written: the clock pauses when
the learner leaves; pausing costs nothing; weight 1.5 in a new
`simulation` family; `react-native-svg` and `expo-keep-awake` approved; one
acknowledgement for labs and sims; secondary objectives recorded only; the
four clinical scenarios listed in 7; sims inside Pro behind their own
`sims` feature key. Nick also asked for sims in every subject family; see
section 20.

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

### 19.2 Second round: the architecture review (Nick, 2026-11-07, approved)

The reviewer raised four questions for Nick, and the scoring and content
rules below followed. Nick approved all of them.

- **R1. No background hold.** Leaving the app pauses the run, as decided in
   19.1. The fast-forward risk is fixed in the clock instead: at most 3
   ticks of catch-up per frame, an automatic pause when more than about 3
   s passed since the last frame, the last stepped tick persisted in the
   journal, and resume from the server checkpoint after a sign-out
   (5.4, 5.9). The background sign-out policy is unchanged.
- **R2. Timing criteria use the sim clock only.** There is no pause budget;
   the debrief shows total paused time (consistent with decision 2 in 19.1).
- **R3. Terminal/network is an authored fault-tree sim**: a simulated shell
   with scripted command patterns and authored outputs, not an emulator.
   Real code or SQL execution is out of scope. The data/code console is
   guided (pick the query or fix, inspect authored result tables, reason
   in writing) and never runs learner code.
- **R4. Client-side rules are readable by learners** for practice sims, and
   that is accepted. A future hidden-rules "exam mode" would be a
   server-run variant and is out of scope.
- **R5. Scoring.** Every run is rated Good, Mediocre or Bad from a measured
   outcome class (`target`, `recovered`, `harm`, from authored end-state
   thresholds) and a 0-100 process score; a skipped written-reasoning
   moment counts as missed (only a demonstrated grader failure is
   excluded); every scenario has at least one critical criterion, an
   ending in every class and Good, Mediocre and Bad golden paths, all
   linted (9.1, 9.2). The per-profile default thresholds are approved
   defaults, pending Nick's detailed review at his pace.
- **R6. Content currency.** Every sourced number carries `checkedAt` and a
   `recheckBy` date (default 12 months; 6 months for clinical guidelines
   and cloud prices and limits); past-due sources warn in the linter and
   appear in a stale-sources report while the sim keeps serving. Sims feed
   the learner-signal auto-flag through per-version metrics (6, 11.4).

### 19.3 Still open (not blocking Phase 1a)

- **Cloud "missed by ≤ 10%".** This design reads it as Nick's example,
  99.85% against 99.9% and cost ≤ 110% (9.2). The stricter reading (10%
  of the error budget, about 99.89%) is a one-line threshold change.
- **Safe but no progress: decided.** Classified per case/injury through
  each scenario's required `noProgress` rule (9.2), not a family default.
- **Prototype thresholds that differ from the defaults** (3.1): the
  project prototype's SPI 0.93, CPI 0.88 and morale < 40, and the
  tamponade early path that can reach the OR after 45 minutes. The ports
  use the defaults; Nick may ask to keep a prototype value as a sourced
  tightening.

## 20. Sims for every subject family (Nick, 2026-11-07)

Nick: sims are "where the money is made", quality over speed, and every
category gets them. The engine does not change per family; each family
gets one renderer (screen type) and its own scenarios. Eight renderers
cover the whole catalog (95 courses):

| Renderer | Families and courses | What the learner does |
|---|---|---|
| **Bedside monitor** (Phase 1) | Nursing and critical care: CCRN Adult/Peds/Neo, NCLEX-RN, NCLEX-PN, ADN, BSN, LPN/VN, CNA | Read a live monitor, assess, place orders, escalate (SBAR), titrate drips; the patient responds at physiologic rates |
| **Architecture board** | Cloud: AWS (12), Azure (9), Google Cloud (11), Cloud+, CloudNetX | Place services across zones and regions under a cost meter, then survive spikes, outages, failovers and budget cuts |
| **Project dashboard** | Project management: PMP, CAPM, PgMP, PfMP, PMI-ACP, PMI-RMP, PMI-SP, PMI-PBA, PMO-CP, PMI-CP, CPMAI, Project+ | Run a project week by week: change requests, risks, team and stakeholder events, earned value; delayed consequences |
| **Client trainer** | Fitness: NASM, ACE, ACSM, NCCPT, NSCA-CPT, NSCA-CSCS | Screen, assess movement, program by phase, coach through weeks; adherence, pain and progress respond |
| **Treatment session** | Physical therapy: NPTE-PT, NPTE-PTA, DPT, the ten ABPTS specialties | Examine, choose tests and measures, treat and progress a patient across visits; vitals and red flags during exercise |
| **Security operations console** | Security: Security+, CySA+, PenTest+, SecurityX, SecAI+ | Triage alerts and logs during a live incident, contain, eradicate, recover, report; the attacker progresses on a clock |
| **Terminal and network** | Infrastructure: Tech+, Network+, Linux+, Server+, AutoOps+ | Diagnose and fix a broken network or server through a simulated shell (an authored fault tree, not an emulator) and topology; outages spread while you work |
| **Data and code console** | Data, AI and development: Data+, DataAI, AI-901, DP-300, DP-900, Python, JavaScript, MS Health Informatics (data quality and EHR rollout cases), MSCS | Guided: pick the query or fix, inspect authored result tables, reason in writing about a dataset or a failing program under a deadline; no learner code or SQL is ever run |

Order (each renderer ships behind `SIMS_ENABLED` with its first 3-5
scenarios; no external review gate):

1. **Phase 1**: engine + bedside monitor (sections 17.1a-1d).
2. **Phase 2**: architecture board, project dashboard, client trainer --
   the three prototypes that already exist.
3. **Phase 3**: treatment session, security operations console, terminal
   and network, data and code console; the scenario generator (section 12)
   so every course reaches two to three flagship sims.

The rule from section 17 stands: if a renderer needs an engine change,
that is a finding against this design, recorded and fixed in the engine
for every family, never worked around in one renderer. Because changing
major 1 after release is costly (5.8), the three consoles below were
stress-tested on paper against the schema before it is frozen, and Phase
1a writes one full scenario for each (17).

### 20.1 The three consoles against the schema

**Security operations console.** State: an attacker `stage` enum (initial
access, persistence, lateral movement, exfiltration or encryption)
advanced by a timer chain; `alerts`, `hosts` and `logs` as records with
status fields; detection triggers that push alerts when the stage or a
host changes. Actions: triage and containment use `pick` params over the
live `alerts` and `hosts` lists (not static options) and change status
with `update`; log search is a `query` param matched with `matchQuery`
over declared fields, and results are shown with `TableView` using
`where`, `sortBy`, `take` and `groupCount` (top-k source IPs, for
example). Outcome profile `security`: `target` = contained before
exfiltration or encryption with evidence preserved (images or logs taken
before reimaging); `recovered` = contained after partial spread (more
than one host, or a recoverable outage) with evidence preserved; `harm` =
exfiltration or ransomware spread beyond the authored threshold, or
evidence destroyed before collection.

**Terminal and network** (an authored fault tree, decision R3). Devices,
interfaces and links are catalogues plus records for the parts that
change (interface state, a route, an ACL line the learner adds). The
learner types commands; a `command` param matches them against declared
patterns with typed captures (`ping {host:ipv4}`, `show ip route`,
`ip route add {dst:cidr} via {gw:ipv4}`), and each pattern's `cases`
decide the authored output from the current fault state, using
`ipInCidr`, `sameSubnet` and record lookup over the topology. Tabular
`show` output uses `TableView`. Anything not matched gets an authored
"command not available in this lab" line, never an emulation. Outcome
profile `infrastructure`: `target` = service restored within the stated
outage window with no new fault introduced; `recovered` = restored late
or with a second, authored side effect (a route leak, a dropped
management session); `harm` = the outage spread to the authored secondary
service, or a destructive command (reload without saving, erasing the
config) was run.

**Data and code console** (guided, decision R3). Datasets are catalogues
(up to 5,000 rows, read-only); "running" a query or a fix is an action
whose option names an authored result (a `TableView` over a catalogue,
filtered by command-time aggregates) and whose effects move the case on:
stakeholder reactions, a deadline timer, quality flags. The learner's own
reasoning goes to a written-reasoning moment. Nothing the learner types is
executed. Outcome profile `data`: `target` = the right root cause found
and fixed before the deadline, with no data altered beyond the fix;
`recovered` = fixed late, or with a reversible side effect caught by a
check; `harm` = a wrong result shipped to the stakeholder (a published
report or a deployed change), or data deleted or corrupted beyond
recovery.

The thresholds for these three profiles are drafts written with this
design; they become defaults when each console's first scenario is
written, in the same way as 9.2, for Nick's review.

## 21. Review resolution

An independent architecture review (2026-11-07) found Phase 1a not ready
as written: three blockers about pinning down engine semantics before
major 1 is frozen, six should-fix findings and a set of suggestions. Each
is resolved below. Repository facts the review relied on were checked
against the code before use; two line references were slightly off (the
15-minute drainage lookup `cumAt(S.t - 900)` is at `critical-care.html`
line 487, with the q15 check's lookup at 529; `Math.pow(F.diminish,
S.nBolus)` is at 661 as stated), and whether a runnable Hermes VM ships
with React Native 0.86 could not be checked here, which is why 1a starts
with a spike.

| Id | Finding | Resolution | Where |
|---|---|---|---|
| B1 | "No engine change per renderer" was false: no record update, no history, no `pow`, no list literals, no catalogues, no keyed lookup | Added `update`, `history` with `past`/`delta`/`trend`, `pow`, list literals, `catalogs`, `x[k]` and `r.f`, `pick` params over dynamic lists, typed command patterns, query search, `TableView`, string and IP functions. 1a exit now requires all four prototypes ported with golden paths and one paper scenario each for the security, terminal and data consoles before major 1 is frozen | 4.1, 4.3, 4.6, 17, 20.1 |
| B2 | Tick semantics inconsistent (off-by-one, clamp after triggers, rounding eats accumulators, non-finite values, ambiguous timer instances) | Pre/Post(n) invariant; precise Advance/Apply/Settle/Skip rules with a worked example; clamp at every write; no state rounding (precision is display-only); saturation rules so NaN/Inf cannot arise; timer instance ids with `one`/`many`; spec and frozen golden corpus per major before engine code | 5.1-5.3, 4.3, 16 |
| B3 | 1a exit unmeetable: test globs miss `lib/sim/**` and `src/sim/**`; mobile typecheck excludes tests; no Hermes in CI; `.ts` import extensions; stale rationale for the copy; text-based hashing; "provably identical" | Prerequisites listed as 1a step 1 (not done now): test globs, `allowImportingTsExtensions` in the backend, drift test; erasable-only TypeScript; Hermes spike first, headless-browser job always, on-device corpus run before 1c exits; rationale corrected (the web build already reads `../mobile`); state hash over IEEE bits with `-0` normalised; golden comparison is exact for endings and criteria, ±1 for vitals, and claims likeness, not identity | 5.5, 5.8, 16, 17 |
| S1 | Client clock fast-forwards after OS suspension; native background sign-out revokes the token; web idle sign-out sweeps data; `ascendra.sim.*` not swept; `/sim` not protected from OTA reload; "interrupted" underspecified | 3-tick catch-up cap per frame with re-anchoring; auto-pause on a > 3 s frame gap; last stepped tick journaled; pause on iOS `inactive`; journal kept across session end; web idle auto-pause at 10 min and a sync before logout; `sim` prefix in `localDataOwner`; `/sim` in `PROTECTED_ROUTE_FRAGMENTS`; "interrupted" replaced by "resume at the last stepped tick" (pause changes no state). No background hold (R1) | 5.4, 5.9 |
| S2 | No run lease or row lock; save-scumming offline; abandon-and-restart resets the repeat rule | Lease with epoch and explicit takeover; `select … for update` on every write; ending headline and debrief only after server confirmation; offline play measured (> 2 min unseen) and flagged, with a switch to count it as a repeat; repeat rule keyed on `revealed` (any action or reveal), not on reaching a debrief | 5.7, 6, 7, 9.4 |
| S3 | Skipped reasoning dropped from the denominator; pass bar vs labs; no critical criterion required; bad endings not capped; reasoning before replay; TS kind parity; null `question`; item kinds; coach guard | Skipped = missed; Good/Mediocre/Bad rating from outcome class and process score (Nick's rubric) replaces the score-only verdict; ≥ 1 critical criterion and every class reachable, linted; `harm` is always Bad; reasoning requires `openedSeq` (409 `replay_behind`); code changes listed with file and line; `question` = sim title; `sim` item kind and open item | 9.1, 9.2, 9.5, 10, 6, 7 |
| S4 | No capability negotiation; native deps need a store binary; engine minor semantics unspecified | `protocol`, `engines`, `renderers` on every request; "Update the app" and 409 `app_update_required`; native store build named in 1c; any change to stepping output is a new major in its own directory | 5.8, 5.10, 7, 17 |
| S5 | Server CPU unbounded; aggregates over large record sets; derived recomputed every tick; Hermes skip may freeze UI | Lint per-tick bound × ticks ≤ 50,000,000; per-command bound for catalogue aggregates (allowed only in command-time effects); per-request replay budget with 413; dependency-tracked derived values; chunked client skips; Hermes benchmark budgets in 1a/1c | 4.3, 5.3, 5.4, 7, 14 |
| S6 | 050's item-kind loop; no rollback section; hash covered golden paths; "highest non-rejected" served unreviewed edits; unique hash blocks reverts; family in document; client on `sims_disabled` | Converging loop plus a dbtest applying every migration twice; rollback section (switch off, leave schema; enum stays; runbook rows); golden paths moved out of the document; served-version rule prefers approved; reverted hash re-uses its row; safety family derived server-side and named apart from format family; journal kept on `sims_disabled` | 6, 6.1, 4.5, 4.1, 7, 12 |

**Suggestions ("Consider").**

| Suggestion | Taken? | Where |
|---|---|---|
| Per-run sync interval instead of `consumeRateLimit` on every sync | Adopted | 7 |
| Queued iOS announcements, alarms interrupt, alarm haptics, waveform battery measurement, web Wake Lock | Adopted | 13.2, 8.4, 5.9, 17 |
| Record "client rules are readable" as a decision | Adopted (R4) | 19.2, 15 |
| No SHA-256 inside the engine | Adopted: 64-bit non-crypto state hash; SHA-256 server-side and via `expo-crypto`/Web Crypto for the document cache | 5.5, 4.5 |
| Per-family or per-renderer switch | Adopted: `SIMS_RENDERERS` | 11.1 |
| Observability counters and a "bad scenario" incident step | Adopted | 16 |
| Unit dimension check for `/min` against `dt` | Adopted as a linter warning (units stay strings; a full unit type system is deferred as not worth its cost yet) | 4.4 |

**Renderer stress tests.** Adopted in full: dynamic pick lists and status
updates for the security console, query search with group-by, sort and
top-k, typed commands with captures, tabular output, string and IP/CIDR
functions and topology lookup for the terminal console, and the data
console descoped to guided choices (R3). See 4.1, 4.3 and 20.1.

**Points the review confirmed as sound** (no change, now pinned by
tests): `mastery_detail` counts any direct-answer attempt with an
assessment type, so `sim_run` and `simulation` need no SQL change (045);
Transfer-ready works with one lab and one sim (dbtests added for the
spacing and the 72-hour gap); the `assessment_types` defaults suit
`sim_run`; fenced text, trivial-answer skipping, `withGradingClaim`,
`servableSql`, the acknowledgement table and `requireLabAcknowledgement`
exist and are reused; the tier pattern and feature key match. The
document DSL, replay, checkpoints and skip-equals-waiting stand.

**Deferred.** None of the blockers or should-fix findings. One
suggestion is only partly taken: units remain free strings with a
dimension heuristic rather than a typed unit system.

**Added after the review, at Nick's request:** the measured outcome
classes and rating rubric (9.2, 3.1), and source re-check dates with a
stale-sources report and learner-signal metrics (4.1, 6, 11.4).
