# Sim labs (REQ-141): engine design, Phase 1

**Status (2026-11-11): live in production.** The engine, server and app
screen shipped in release 2026-11-10 (REQ-162, REQ-190, REQ-199) and pacing
in release 2026-11-11 (REQ-209), and `SIMS_ENABLED` is on in production.
Two scenarios are seeded: tamponade after CABG (CCRN Adult) and the
TicketBurst launch day (AWS SAA, with an SAP band). Section 22 says what was
built and what is left.

This document began as the design, revised after an independent
architecture review (2026-11-07), and was written to be reviewed before any
code. Nick's decisions are in section 19; section 21 maps every review
finding to the change that resolves it.

### Pacing at a glance (REQ-209)

Whether a sim is paced depends on its kind, not its course:

- **Clinical, PT and body (fitness) sims** with a running clock: **Study
  pace (3x) is the default**, so one real minute is three sim minutes.
  **Exam realism (1x)** is opt-in on the launch card and can be switched
  mid-run; Pause works at either speed. The patient and the scoring are the
  same at both speeds.
- **Focused start**: the learner may start near the deterioration (tamponade:
  13 sim minutes in). Timing targets still count from onset.
- **Skip offer**: "Skip to the next change" appears after about 30 quiet
  seconds when nothing is alarming or due within a minute.
- **Prediction prompts**: tap-to-answer questions during named waits
  (four for tamponade), with a cited source, no AI call and no score.
- **Chapters**: at natural break points the learner chooses Continue or
  Save and finish later, and can resume on any device.
- **Project-management and IT/cloud sims are learner-paced**: they move only
  when the learner acts, have none of the above, and the server refuses
  pacing commands for them. Seeded: TicketBurst and, since REQ-233, the
  NAT gateway bill (both AWS SAA).
- **Security incidents (REQ-231) are learner-paced too**: the attacker
  works on the sim clock, and the clock moves by the analyst time each
  task takes (22.7).

The rule is `pacingEligible` in `backend/lib/sim/server-run.ts`: a running
phase and a clinical or fitness track (the safety family the seed derives
from the course category). The three DPT treatment sessions (REQ-232, 22.8)
are the first PT running sims and get study pace by default; no fitness
running sim exists yet. Details in 5.4a to 5.4f, 22.2 and 22.8.

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
4. The scenario document (schema, expressions, versioning, hashing, bands, modules)
5. Engine architecture and the time model
6. Persistence
7. API routes
8. Mobile architecture and the bedside-monitor renderer
9. Scoring, debrief and mastery
10. Grading the written-reasoning moments
11. Tiers, the switch, disclaimers and review
12. Authoring, seeding and generation (the generator, REQ-230)
13. Accessibility
14. Performance and cost per run
15. Security
16. Testing strategy
17. Rollout phases and exit criteria
18. Risks
19. Decisions
20. Sims for every subject family
21. Review resolution
22. Phase 1b as built (REQ-190), pacing (REQ-209), more CCRN cases (REQ-222),
    CNA cases (REQ-223), the client session (REQ-225), the security console
    (REQ-231) and the PT treatment session (REQ-232)

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
   one sample per course for Free and Plus, and are covered by the one
   study notice (REQ-165; it replaced the lab disclaimer, the clinical/fitness
   acknowledgement and the "Awaiting expert review" badge). Review status
   stays internal until a person approves the version. Unreviewed sims are served by default
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
logged and reported in the debrief. Authoring note (REQ-209, replacing an
earlier observation that a skip was available at almost every moment): the
q15 drainage check is always pending, and a skip to it used to be offered
nearly all the time. A recurring check is now marked `wait.routine: true`.
A routine wait keeps its "Skip to" button in the waits row (so "skip always
available" is still true of the row, as the learner may skip to the next
chart check), but it is never the target of the "Skip to the next change"
offer (5.4c), which would otherwise be on offer at every moment and could
skip over the recognition window. The linter's "some `wait` is pending at
every tick" warning ignores routine waits (16). Whether a recurring check is
`routine` is an authoring choice per scenario.

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

### 3.2 The tamponade port (Phase 1a step 5, REQ-162)

`backend/supabase/seed/sims/CCRNADULT/tamponade-after-cabg.sim.json` is the
first port. Seven golden paths were driven through the revised prototype's
`?test=1` hook and through the engine: the expert path (`early`, target,
Good), early escalation with phase 2 on fluid then a pressor and early
escalation ending phase 2 with no decision (`earlyUntreated`, recovered,
Mediocre), a page just inside 20 minutes (`bridge`, recovered, Mediocre), a
page at 20 minutes without preparation and phone orders then a late page
(`late`, recovered, Mediocre and Bad), and fluids and drips without
escalation (`arrest`, harm, Bad). The prototype's path, every criterion, the
three KPIs and the arrest tick match exactly; the twelve vitals match within
one display unit at ten snapshot ticks; the phase-2 numbers match exactly.
Deliberate differences, beyond the 3.1 reclassification:

- **Phase 2** is prompts: the first choice, a 30-minute reassessment the
  learner skips to (the prototype jumps), then a second choice among the
  other three unless the first was the inotrope; "End here" is a choice in
  each prompt. Phase 2 ends by itself after the inotrope or a second choice.
- **The arrest path** scores the phase-2 criterion `missed`; the prototype
  leaves it out, so its process scores are not comparable.
- **The arrest is a code (REQ-190).** Since REQ-190 the PEA arrest no longer
  ends the run: it enters the code/ACLS module (4.8) under the
  cardiac-surgery protocol, at the prototype's arrest tick. Untreated, the
  arrest path ends `code_noRosc` (harm). Three further golden paths go
  through the code: compressions and an early resternotomy call to ROSC and
  back through phase 2 (`arrestRosc`, recovered), the same with 1 mg of
  epinephrine (`code_epiHarm`, harm), and the paced (no tapping) mode with a
  shock to PEA and a late resternotomy. `lib/sim/ports.test.ts` compares the
  seven prototype paths as before, with the code's criteria `na` on the
  paths with no arrest.
- **Written reasoning** adds a scored criterion (weight 1), graded by the
  model in 1b; the prototype shows the model answer and does not score it.
- **At most three boluses run at once** (the action is unavailable while
  three run). The prototype has no limit; the cap keeps the per-tick bound
  within the 90-minute-skip budget. Finished boluses join one decaying
  accumulator, mathematically the same as the prototype's sum of
  exponentials.
- **Live timers are cancelled at re-exploration** (results, callbacks, the
  q15 check), as the prototype's jump to phase 2 never delivers them.
- **Drips** always offer "Turn off"; the prototype offers it only while one
  runs (turning off a drip that is off changes nothing).
- **Contraindicated actions: none in this case** (Nick, 2026-11-09: a harm
  ending only where a published guideline names the action). The 2025 ESC
  guideline on myocarditis and pericarditis (Schulz-Menger et al., Eur Heart
  J 2025;46(40):3952-4041, section 11.8.3, checked 2026-11-09) says to avoid
  diuretics and positive-pressure ventilation in tamponade; this case offers
  no diuretic and the patient is already ventilated, which the case does not
  change. The 2015 guideline (Adler et al., Eur Heart J 2015;36:2921-2964) is
  kept only for the point the 2025 text does not cover: vasodilators are "not
  recommended" in tamponade (class III, level C); this case offers none
  before re-exploration (nicardipine appears only in phase 2, after the
  tamponade is relieved). Protamine with a normal ACT and dobutamine in
  tamponade have no guideline naming them as contraindicated, so they stay
  poor choices in the scoring and are listed for clinical review (19.3).
- **The chest-tube tile** reads `history` in whole 5-second samples, so for
  a few seconds after clearing the tubes (when the 15-minute window's far
  edge crosses that moment) it differs from the prototype's interpolated
  ledger by up to the 120 mL removed.
- `time_up` (4 h) is never reached: every legal path arrests or reaches the
  OR first. An unreached `time_up` is a lint warning, not an error (Nick,
  2026-11-09).

### 3.3 The TicketBurst port (Phase 1a step 5, REQ-162)

`backend/supabase/seed/sims/AWSSAA/ticketburst-launch-day.sim.json` is the
second port. The prototype is a pure function of the design and the finance
picks (`simulate`, `financeSavings`, `score` in `cloud.html`), so its driver
calls those directly for each golden design rather than clicking through
the board. Six golden designs (the reference, a single box, an overbuilt
design, serverless, a fleet and its only NAT in AZ b, an ASG maximum below
the spike) give the same four domain scores, cost, day availability
(error-budget method), worst RTO and RPO and finance savings as the
prototype, exactly. Deliberate differences:

- **Outcome classes** follow 3.1 from those numbers: `harm` when RPO > 5,
  RTO > 15, availability < 99.85% or cost > 110% of budget; `target` when
  availability >= 99.9% and cost <= budget; otherwise `recovered`. Storing
  card data is not an option, so `harm` is reached through RPO/RTO and
  availability, as 3.1 allows.
- **One compute model and one orders database** per design: placing one
  replaces the other. The prototype replaces compute with compute and a
  relational database with a relational one, but lets DynamoDB sit beside
  RDS (its rules then read the relational one).
- **Facts, not records.** The design is held as flags and enums (CloudFront,
  NAT per AZ, compute kind and AZs, database kind and AZ, ...), set by the
  placement effects; the prototype derives the same facts from its item
  list. A misplaced component (not allowed in that slot) is logged and
  ignored instead of being refused by the UI.
- **Events** are timers on a 5-minute turn clock (09:00, 10:00, 10:50,
  14:10, 16:30), each evaluating the same first-match rule tables per area;
  the second-by-second sub-timelines are not modelled (they never change a
  status or a minute count).
- **Finance** is one form with a yes/no per option; an option that does not
  apply to the design is ignored. Written reasoning about the design is
  asked when launch day starts and is scored (weight 1).

### 3.4 The TicketBurst SAP band (REQ-190)

`backend/supabase/seed/sims/AWSSAP/ticketburst-launch-day-sap.band.json` is
the first difficulty band (4.7): the launch day of 3.3 re-set for the
Solutions Architect Professional. AWS now runs SAP-C03 (from 2026-11-17;
SAP-C02's last day is 2026-11-16, per AWS's comparison page, checked
2026-11-09) and the AWSSAP course teaches C03, so the band's objective and
criteria name SAP-C03 domains; the C02 guide was read as well, and the
events also cover its domains 1, 2 and 4. What the band changes, all as a
merge-patch plus appends over the base source:

- **Events.** A leaked deployment key at 09:30 (multi-account: Organizations
  SCPs and a compliance-mode Backup Vault Lock decide whether backups and
  CloudTrail survive; without them the backups are gone for the day), a
  us-east-1 Region impairment at 12:30 (backup and restore, pilot light or
  warm standby; a cross-Region database or not; health-checked DNS failover
  or a manual change), and the on-premises order-history cutover at 15:00
  (DMS with change data capture, or a dump reloaded).
- **Tighter targets.** RPO 1 minute (base 5), RTO 10 minutes (base 15),
  budget $2,400 (base $2,500). The band linter refuses any looser value.
- **Catalogue.** Seven entries appended (warm standby, pilot light, Aurora
  Global Database, DynamoDB global tables, Organizations guardrails, a
  locked cross-account backup vault, DMS) with two new slots (`region2`,
  `org`) and a finance option to stop DMS after the cutover.
- **AZ placement hidden.** Which AZ loses power is drawn from the run's seed
  (`pick(azFail, ["a", "b"])` when launch day starts) and named only when it
  happens; the base always failed AZ a, so a design could learn to live in
  AZ b. The AZ event's rules are rewritten symmetric in the failing AZ.
- **Objective tags.** The objective is SAP-C03 skill 4.2.4 (multi-Region DR)
  and four secondary objectives (organisations and guardrails, ransomware
  and deletion protection, database migration, DR to RTO/RPO/cost), each an
  exact AWSSAP objective title; the criteria are labelled by SAP-C03 domain,
  with two new ones (multi-Region DR, critical; migration).

Eight golden paths: the expert design and a serverless variant (Good), a
lucky all-in-AZ-b design (Good on outcome, the resilience criterion
partial), the expert design over budget and without DMS (Mediocre), and a
pilot light, the SAA reference design and a single-AZ design (Bad, harm).
Every terminal ending except `time_up` is reached.

## 4. The scenario document

### 4.1 Shape

A scenario is one JSON document. The TypeScript types below are the
source of truth and live **inside the engine folder**
(`backend/lib/sim/engine/v1/types.ts`), because the engine imports
nothing outside its folder and the mobile copy must carry them (5.8). The
zod schema in `backend/lib/sim/schema.ts` sits outside the engine (zod is
a dependency the engine must not import) and must **conform** to them: a
conformance test in CI checks, at compile time, that `z.infer<typeof
scenarioSchema>` and `ScenarioDoc` are mutually assignable (an
`Equals<A, B>` assertion in a typechecked test file, for the document and
each building block), and at run time that every corpus and golden
document parses (16). A JSON Schema is generated from the zod schema for
editors and the generator. Engine source uses only erasable TypeScript
(no `enum`, no parameter properties, no namespaces) with explicit `.ts`
import extensions, because the mobile copy runs under Node's type
stripping (5.8).

```ts
// Durations are strings with a unit ("90s", "8min", "2h", "7d") so authors
// never confuse seconds and minutes. Every duration must be an exact
// multiple of the clock tick (validation error otherwise). The tick itself
// is a whole number of seconds, at least 1, so `dt` is an integer.
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
                              // checkedAt and recheckBy are excluded from the content
                              // hash (4.5): bumping them never forces re-review.
}

interface ScenarioDoc {
  schemaVersion: 1;
  engine: { major: 1; minor: number };  // the MINIMUM engine: exactly this major, minor >= this (4.5, 5.10)
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
  safetyNote?: string;                  // author-facing context only, never shown as a
                                        // disclaimer (REQ-165: the one study notice covers sims)

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
  endings: Record<Id, Ending>;          // must include "time_up" (engine-defined, see Ending)
  endingOrder?: Id[];                   // REQ-227, engine minor 2: the order endings are checked in (5.3); see Ending
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
  of: Expr;                             // number-valued; may not read history (no cycles)
  every: Duration;                      // sample interval (multiple of the tick)
  keep: Duration;                       // how far back; at most 1,000 samples
}
// Sampling: one sample at tick 0 (taken after state init, before the
// initial settle, so Post(0) already has it), then one at every tick that
// is a multiple of `every` (5.3, Advance step 4). The buffer holds the
// newest keep/every + 1 samples, so it is never empty during a run.
// Short and empty buffers: see past/delta/trend in 4.3.

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
  | { id: Id; kind: "command"; label: string; maxLength: 200;
      patterns: CommandPattern[];       // tried in order; the first that matches wins
      unmatched: Template }             // authored line for input no pattern matches (below)
  | { id: Id; kind: "query"; label: string; fields: Id[]; maxLength: 200 };     // log search (20)

interface CommandPattern {              // matched by the engine's tokenizer, never a regex
  id: Id;
  pattern: string;                      // "ping {host:ipv4}", "show ip route", "ip route add {dst:cidr} via {gw:ipv4}"
                                        // capture types: word, int, ipv4, cidr, enum(a|b|c)
  cases: { when: Expr; then: Effect[] }[];  // per-pattern dispatch, first match; the last
                                        // case must be unconditional (`"when": "true"`, linted)
}
// Command dispatch. The input is split on whitespace (at most 200
// characters, no control characters; anything else is the only way a
// command param is rejected). Literal tokens compare case-insensitively.
// For the first pattern that matches, each capture is bound as a name, by
// its capture id, inside that pattern's `cases` only (each pattern has its
// own captures, so they are not visible in the action's shared `effects`,
// which run after the cases), typed and canonicalised:
//   word -> string, [A-Za-z0-9._:/-]{1,64}
//   int  -> number, a decimal integer within ±2^31
//   ipv4 -> string, dotted quad, each octet 0-255, written without leading zeros
//   cidr -> string, "a.b.c.d/n" with 0 <= n <= 32, canonicalised as ipv4 (host
//           bits kept as typed; ipInCidr and the route functions mask them)
//   enum(a|b|c) -> string-enum with exactly those values
// A capture id may not collide with any declared name (validation). The
// built-in `<paramId>.matched` is a string-enum of the pattern ids plus
// "none". Input that matches no pattern is still a valid command: it is
// stored in the log (so scoring can count it), the `unmatched` template is
// output ("That command is not available in this lab."), no case runs, the
// action's effects run with `matched = "none"`, and it is never rejected
// or answered with a 400.

type Effect =
  | { set: Id; to: Expr }
  | { add: Id; by: Expr }
  | { push: Id; value: Expr | Record<Id, Expr> }   // set or records
  | { update: Id; where: Expr; set: Record<Id, Expr> }   // fields of existing records
  | { remove: Id; where: Expr }
  | { schedule: Id; after: Expr | Duration; with?: Record<Id, Expr> }  // creates a timer instance;
      // a Duration is exact ticks; an Expr is SECONDS of sim time, converted
      // ticks = max(1, ceil(seconds / dt)) (5.3, Timers); `with` supplies exactly
      // the timer's declared `with` fields
  | { cancel: Id; where?: Expr }                   // pending instances of that timer: all, or those for which
                                                   // `where` (reading `timer.with.<field>`, 4.3) is true
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
  with?: Record<Id, FieldSpec>;         // payload fields, typed; every schedule supplies exactly these
  source: Source;                       // where the delay comes from (linter-enforced)
  effects: Effect[];                    // may read `timer.with.<field>` and `timer.id` (4.3)
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
  noProgress: { when: Expr; class: OutcomeClass; rationale: string; source: Source };
    // REQ-162 addition: the 9.2 "safe but little or no progress" rule, which
    // 9.2 requires per scenario; it had no field until the engine was built
}

interface Ending {
  label: string;
  class?: OutcomeClass;                 // required on every terminal ending, time_up included
  when?: Expr;                          // the state conditions that produce it; required on every
                                        // terminal ending EXCEPT time_up, which must not have one
  narrative: Template;                  // shown in the run
  terminal: boolean;                    // false = a branch point (e.g. go to phase 2)
  phase?: Id;                           // REQ-162 addition: the phase a non-terminal ending moves
                                        // to; required when terminal is false (5.3 says a branch
                                        // point "applies its phase change" but gave it no field)
}
// `endingOrder` (REQ-227, engine minor 2) lists every ending that has a
// `when` exactly once, never `time_up`, in the order they are checked: the
// first true one wins. It is required from minor 2 whenever two or more
// endings have a `when`, and refused below minor 2. It exists because a
// scenario is stored in a jsonb column, which does not keep the order of an
// object's keys (it returns shorter keys first, then bytewise): with no
// list the engine checks endings in the key order of `endings`, so the
// server and the app could end the same run differently. A module lists
// its own endings in its fragment's `endingOrder`; they go after the host's.
// `time_up` is the one engine-defined ending: it is terminal, carries an
// authored class and narrative, has no `when`, is never named by an
// `{ end }` effect, and is reached only by tick count (5.3, Advance step
// 6), after that tick's settle. A scenario whose result at the time limit
// depends on state writes ordinary terminal endings whose `when` includes
// `t >= <limit>`; they are evaluated in that settle, before `time_up`,
// which then only catches what they leave.
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
  id; inside a command pattern's `cases`, that pattern's captures by
  capture id, typed per capture (4.1), and `<paramId>.matched`; inside a
  timer's effects, `timer.id` (the instance id) and `timer.with.<field>`
  (that instance's payload, typed by the timer's declared `with` fields);
  inside a `cancel … where` predicate, `timer.with.<field>` and `timer.id`
  bound to each pending instance in turn (with the surrounding effect's
  names, such as action params, still in scope). Unknown names fail
  validation, not at run time.
- **Access**: `x[k]` indexes a list (integer `k`, clamped to the last item,
  as `seq`) or a map/catalogue (string key; a missing key is a validation
  error when `k` is a literal and yields the field type's zero value at run
  time otherwise, with a linter warning); `r.f` reads a declared field of a
  record, catalogue entry or map. So `paths[path].pain`,
  `components[item.type].cost` and `fluidPeak[ml]` type-check. There is no
  other property access. (REQ-162 addition: `records[i]` also indexes a record
  list by position, integer `i` clamped like a list, so a rule can read the
  first or last record without a predicate.)
- **Operators**: `+ - * /`, comparison, `and or not`, `? :`,
  `in` (membership in a set or list). No `**`, no bitwise ops, no
  assignment.
- **Functions** (a fixed whitelist):
  - maths: `min max clamp abs floor ceil round`, `exp ln sqrt sin cos`
    and `pow(x, y)` (engine implementations, 5.5), `lerp`, `num(s)`
    (an enum/option value to a number, validated at check time);
  - time and lists: `isNull`, `since(timeVar)`, `timeAt(timeVar)` (the
    time as a number of sim seconds, -1 when null; REQ-162 addition, so a
    rule can compare two recorded times), `seq(list, i)` (index
    with last-value repeat);
  - history (`seconds` is clamped to ≥ 0; the buffer always holds the
    tick-0 sample onward, 4.1): `past(h, seconds)` = the newest sample
    taken at or before `t - seconds`, or the oldest sample held if none is
    that old (so early in a run it is the tick-0 value); `delta(h,
    seconds)` = newest sample − `past(h, seconds)` (0 with one sample);
    `trend(h, seconds, threshold)` = 1 if `delta ≥ threshold`, -1 if
    `delta ≤ -threshold`, else 0 (0 with one sample; `threshold` must be a
    positive literal or param, checked at validation; a bedside tile's
    `trend` passes its own `threshold`, 8.2). An empty buffer cannot occur
    in a run; if one is ever read (a bug), `past` is 0, `delta` 0 and
    `trend` 0, never an error;
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
    prefix)`, `ipToInt`, `cidrPrefix(c)` (the prefix length `n` of
    `"a.b.c.d/n"`; -1 for an empty or malformed string, so an empty
    `find` result compares lowest), `cidrNetwork(c)` (the canonical
    network address with host bits cleared, as a string), and
    `longestPrefixMatch(coll, ip, field)` (the record or catalogue entry
    whose cidr-valued `field` contains `ip` with the largest prefix, ties
    by `_id` or entry order, or an empty record if none). A learner-added
    route (a `records` row pushed by `ip route add {dst:cidr} via
    {gw:ipv4}`) and the static table (a catalogue) are looked up with one
    call each and the longer `cidrPrefix` wins, which is longest-prefix
    routing without bitwise operators. All are implemented with integer
    arithmetic (division and remainder by powers of two) inside the
    engine; expressions still have no bitwise operators. Over a catalogue,
    `longestPrefixMatch` is a catalogue aggregate (command-time only,
    below);
  - randomness (5.6), allowed **only** in expressions inside effects (the
    `to`, `by`, `value`, `after`, `with`, `set`, `if` and `cases`
    conditions of action, prompt, timer and trigger effects), never in
    processes, derived values, `when`/`available` conditions or scoring:
    `pick(stream, list)` returns one item, uniformly, as `list[floor(u ×
    len)]`; `chance(stream, p)` returns `u < clamp(p, 0, 1)`. `stream` must
    be a literal id declared in `random.streams`. Determinism: `u` is the
    stream's next mulberry32 output divided by 2^32 (an exact double); each
    call draws exactly one value, even for an empty list (which returns the
    item type's zero value), so a stream's position never depends on a
    list's length; calls are evaluated in the fixed evaluation order
    (left to right, depth first), and `? :`, `and` and `or` short-circuit,
    so a call in a branch not taken draws nothing, which is itself a pure
    function of state. Stream counters are state (checkpointed and
    hashed).
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
  (`maxDuration / tick`) exceeds 50,000,000. It also bounds the **longest
  single skip**: a skip runs from a command boundary to its stop tick
  inside one request (checkpoints are never taken mid-skip, 5.3), so the
  per-tick bound times the longest possible skip span must be at most
  15,000,000, leaving 5,000,000 of the 20,000,000 per-request replay
  budget (7) for the commands stamped at the skip's tick and the settles
  around it. The span is the largest upper bound of any `wait` timer's
  `after`, in ticks, found by interval arithmetic over the declared
  `min`/`max` of state and the values of params; where the linter cannot
  bound an `after`, it uses `maxDuration / tick`. (Mid-skip resume was the
  alternative and is rejected: it would need checkpoints strictly inside a
  skip, breaking the rule that a checkpoint is a Pre state at a command
  boundary, and the learner never sees those ticks as separate states
  anyway. A document that fails this lint shortens its waits or splits
  them into chained waits.) Collection functions over a
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
   and one `critical` criterion (command or reasoning, 9.1); a `time_up`
   ending exists, is terminal, has a `class` and has **no** `when`; every
   other terminal ending has a `class` and a `when`; no `{ end: time_up }`
   effect; every other `{ end: id }` effect names an
   ending whose `when` the checker cannot prove false at that point (and
   the engine asserts it, 5.3); every `schedule` supplies exactly its
   timer's `with` fields with matching types; every command pattern's last
   case is unconditional; `engine.minor` is at least the minor that
   introduced every feature the document uses; every duration is a multiple of the tick;
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
   patient/client", fictional people; since REQ-165 no per-sim safety
   note is required, the one study notice covers sims); outcome rules
   (9.2): every outcome threshold is no looser than the profile default,
   each of `target`, `recovered` and `harm` is the class of some reachable
   terminal ending, and no explored path reaches a `target` ending with a
   critical **command-derived** criterion missed (reasoning criteria are
   out of this check, 9.2); the longest-skip bound (4.3); golden-path rules: every ending is reached,
   every criterion is both met and missed, and there is at least one Good,
   one Mediocre and one Bad path (9.2).

The seed, the tests and (later) the generator call the same function, as
they do for labs (`lib/lab-content.ts`).

### 4.5 Versioning and the content hash

- `schemaVersion` is the document format. A breaking format change bumps it
  and ships an upgrader (`upgradeScenario(doc): doc`) that the seed runs on
  older files; the stored document is always the current format.
- `engine: { major, minor }` is the **minimum** engine the document
  needs: exactly that major (stepping semantics) and that minor or later
  (the features it uses; validation checks the declared minor against a
  table of which minor introduced each function, param kind and effect).
  The engine refuses a document for another major or a higher minor than
  its own (5.8); the seed refuses a document whose minor is above the
  server's engine for that major. Apps are filtered by both (5.10).
- **Engine minor 2 (REQ-227, FAIL-1222): `endingOrder`.** A minor adds only
  what an existing document cannot use, so a document without `endingOrder`
  is stepped exactly as under minor 0 and 1 (endings in key order); its
  content hash, golden hashes, checkpoints and stored runs are unchanged,
  and a run keeps replaying on the version it pinned. A document that
  declares `endingOrder` declares minor 2 and is served only to an app
  whose engine is 1.2 or later (5.10). Neither the content hash (keys
  sorted) nor the state hash (keys sorted) depends on key order.
- **Content versions**: each change to a scenario's content creates a new
  **version row** with an incrementing `version`. Runs pin the version they
  started on, so a learner mid-run is never moved onto changed rules, and
  replay of an old run uses the version it ran.
- **Content hash**: SHA-256 (server-side, Node's `crypto`) of the canonical
  JSON of the **runtime and learner-facing content**: everything in the
  document **except every `Source`'s `checkedAt` and `recheckBy`**
  (decided by the review lead, 2026-11-07; 21). Those two dates are removed before hashing; the source's
  `cite`, `url`, `note` and every sourced value stay in. So re-checking a
  source and bumping its dates does not make a new version or reset
  review, while a changed value or URL does. When the hash is unchanged
  but the dates differ, the seed updates the dates in place on the
  existing version row (its `document` and `sources_recheck_by`), keeps
  its review status, and prints the change; the stale-sources report
  (11.4) reads `sources_recheck_by`, so it clears as soon as the dates are
  bumped and reseeded. Golden paths are not in the document (4.1), so editing a test
  fixture changes nothing stored and never resets review. Canonical JSON:
  keys sorted, no insignificant whitespace, numbers in shortest round-trip
  form. Labs hash an ordered array with MD5 (`labContentHash`); sims use
  canonical JSON because documents are objects whose key order is not
  meaningful. A changed hash makes a new version with `review_status =
  'needs_expert_review'`; an unchanged one is a no-op, so `npm run seed`
  stays idempotent. A file reverted to an earlier hash points the sim back
  at that existing version row (6) rather than inserting a duplicate.
- **Client document**: the server derives a **client document** from the
  full one by dropping `scoring`, reasoning `parts`, ending debrief
  text and every source's `checkedAt` and `recheckBy` (so a date bump
  leaves the client hash, and the app's cache, unchanged). The app receives only that (section 15 explains what that does
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

### 4.7 Difficulty bands (REQ-190; Nick, 19.4 item 1)

One scenario can serve two exams. A **band** is a file
`<course>/<slug>.band.json` beside the golden paths, naming its base
(`{ course, slug }` of a `.sim.json`), its own slug and label, and a patch:

```json
{ "band": "sap", "label": "Professional (SAP-C03)",
  "base": { "course": "AWSSAA", "slug": "ticketburst-launch-day" },
  "slug": "ticketburst-launch-day-sap",
  "tighten": { "params.budget": "lower" },
  "append": { "/catalogs/components/entries": [ ... ] },
  "patch": { "outcome": { "thresholds": { "rpoMinutes": { "value": 1, ... } } }, ... } }
```

Compile order (`lib/sim/documents.ts` `compileEntry`): read the base
**source**, apply `append` (JSON pointer to an existing array, items added
at its end), apply `patch` as an RFC 7396 merge-patch, set the band's slug,
splice modules (4.8), then validate and lint the result as its own document
with its own golden file. Its content hash and client hash are its own (4.5).
`append` is the one extension to RFC 7396: merge-patch replaces arrays
whole, and copying every base row into a band to add one would drift from
the base. Insertion inside an array is not offered; a band that must change
an array's order replaces it (the SAP band replaces the AZ and database
event timers' effects and the criteria).

The band linter (`lib/sim/overlay.ts`) adds:

- every patched or deleted path exists in the base, except new ids in the
  id-keyed maps (params, state, actions, timers, endings, ...) and optional
  schema fields; a typo in an existing object is an error;
- the patch may not change `schemaVersion`, `engine` or `outcome.profile`;
- every `append` pointer resolves to an array, its items' ids are new, and
  the patch does not also replace that array;
- **no threshold looser than the base**: every base outcome threshold is
  kept and no looser (direction from the profile defaults, 9.2, or the
  band's `tighten` map), and every param named in `tighten` is no looser.

The seed (1b) treats a band like any other document: its course's
objective resolves the `objective` title.

### 4.8 Capability modules: `modules/code-acls@1` (REQ-190)

A **module** is a document-level fragment a host scenario splices in before
validation. Modules are how the shared capabilities Nick ordered (19.4: crisis
modules first, then several patients on one clock, then a people layer)
reach many scenarios without engine changes. The host declares:

```json
"modules": { "code": { "use": "code-acls@1", "with": { "entry": "...", "protocol": "cals",
  "etiology": { ... }, "scope": [ ... ], "returnPhase": "reexp", "onEntry": [ ... ], "onRosc": [ ... ], "epiDoses": [ ... ] } } }
```

`lib/sim/modules.ts` loads `supabase/seed/sims/modules/<name>@<n>.module.json`,
substitutes the inputs (`"{{a.b}}"` takes the input's value, `"{{...a}}"`
spreads a list into an array, `{{a}}` inside a string takes its text, and an
entry with `"$onlyIf"` is spliced only for a given input value), merges the
fragment's maps and appends its arrays, and drops `modules`. The alias must
be the module's prefix and every id it adds starts with it, so it cannot
collide with the host; ids cannot contain dots, so `code.*` state is named
`code_*`. The spliced document is validated like any other: a module adds
nothing the engine does not already run.

**The code/ACLS module.** State `code_*`: active, start time, rhythm
(vf/pvt/pea/asystole/rosc), cycles and good/bad cycles, compression mode
(tap/paced), compression start, the last measured rate and longest pause,
shocks (first and third shock times), epinephrine (first and last time,
full doses, shocks before the first dose), the cause's fix time, wrong fixes,
ROSC time. Inputs: `entry` (the condition that starts the arrest), `protocol`
(`acls`, AHA 2025 adult ALS; `cals`, arrest after cardiac surgery, STS 2017
consensus and the EACTS 2009 guideline), `etiology` (starting rhythm, the
reversible cause, the fix options, which are correct, how long the fix
takes, the scored window, whether fixing it restores circulation at once,
and its source), `scope` (the code actions this band's learner may take:
scope of practice), `returnPhase`, and host effects `onEntry` and `onRosc`.

- **Compressions** come in as integers in a command: the tap pad sends
  `cpr <rate per minute> <longest pause in seconds>` through a `command`
  param with two `int` captures (19.4 item 3); the engine never reads live
  timing. Each 2-minute rhythm check scores the cycle: good when the last
  measure is 100-120 a minute with no pause over 10 s. **The paced mode**
  (no tapping) picks a rate and a pause length from a form; it is the
  accessible path (13) and must always be in scope (splice error otherwise).
  Its cycles are scored on the choices; the criterion's text and the run's
  `code_cprMode` say which mode was used, so the two are reported apart.
- **Endings**: `code_rosc` (non-terminal, moves to `returnPhase`),
  `code_noRosc` (harm, 30 minutes without ROSC, a teaching cut-off) and,
  only under `cals`, `code_epiHarm` (harm at ROSC after 1 mg of epinephrine:
  the STS 2017 consensus names epinephrine during an arrest after cardiac
  surgery as harmful, class III, unless an experienced clinician directs it,
  so this follows Nick's rule of harm endings only where a guideline names
  the action).
- **Criteria** (each `na` when no arrest happened, 9.1): compressions started
  without delay (critical; 30 s, or 90 s under `cals` with VF while the three
  stacked shocks come first), compression quality, defibrillation matched to
  the rhythm (VF/pVT: first shock within 2 min under ACLS, three shocks
  within 1 min under `cals`; PEA/asystole: no shock), epinephrine by the
  protocol (ACLS: within 5 min for a non-shockable rhythm, after the second
  shock for a shockable one; `cals`: no full dose), and the reversible cause
  treated within its window (critical).
- **Sources** (checked 2026-11-09): AHA 2025 Part 9, Circulation
  2025;152(16 suppl 2), doi:10.1161/CIR.0000000000001376 (citation checked
  on Crossref; the full text sits behind a browser check, so the
  recommendations are paraphrased as carried from the 2020 update and should
  be re-read against it); STS 2017, Ann Thorac Surg 2017;103(3):1005-1020
  (read in full); EACTS 2009, Eur J Cardiothorac Surg 2009;36(1):3-28. No
  AHA course text is reproduced.

Hosts: the tamponade case (3.2; `cals`, PEA, emergency resternotomy, the
nurse's scope) and a test fixture (`lib/sim/fixtures/code-vf-fixture.sim.json`;
`acls`, VF from hyperkalaemia, calcium as the fix), each with golden paths
built by `npm run sim:golden -- steps <name>` (driver scripts in
`scripts/sim-golden/*.steps.ts`; expectations are the engine's own results).

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
written, with the worked example below, and a **golden corpus** of
hand-computed cases (`backend/lib/sim/engine/v1/golden/`, 16) is written
**before** any engine code beyond the parser. Until the freeze in 17
(Phase 1a step 7) the corpus is a **DRAFT**: its manifest says
`"status": "draft"`, and a hash may change when a hand computation or the
spec is corrected, each change reviewed with its reason in the commit.
The freeze sets `"status": "frozen"`; **only after the freeze** does a
change that alters any corpus hash fail CI and mean a new engine major
(5.8).

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
integer id (the next value of a counter in state), its `with` payload
(evaluated once, at scheduling, and stored with the instance), and a due
tick `now + ticks`. A `Duration` literal is an exact number of ticks
(validation rejects less than 1 tick). An `Expr` is a number of **sim
seconds**, converted as `ticks = max(1, ceil(seconds / dt))`: rounded up
to the next whole tick, never earlier than asked, and at least 1 tick (a
zero or negative result also becomes 1). `dt` is an integer (4.1) and the
division is exactly rounded IEEE, so the conversion is identical on every
engine; the value is then capped at `maxDuration / tick + 1` (an instance
due after the end never fires). Example: `num(ml) / 50 * 60` for 250 mL
is 300 s, 300 ticks at a 1 s tick. For a timer with
`instances: "one"`, scheduling while an instance is pending cancels that
instance first; with `"many"`, instances coexist. `cancel` removes pending
instances of that timer: all, or those for which `where` is true with
`timer.with.<field>` and `timer.id` bound to each instance in turn (4.3),
checked in instance-id order. When an instance fires, its effects read
the same bindings.
Waits, skips and the debrief name instances, so "skip to the surgeon"
is never ambiguous.

**Settle** (run after every advance and after every command):
1. Evaluate `triggers` in document order. A `once` trigger fires the
   first time its condition is true; an `edge` trigger fires when its
   condition is true and was false at its previous evaluation (initially
   false). Each trigger's effects run immediately, so later triggers see
   their writes; a trigger's own previous value is updated after its
   effects run.
2. Evaluate `endings` that have a `when` (every ending except `time_up`),
   in `endingOrder` (engine minor 2, REQ-227) or, in a document without
   one (minor 0 and 1), in the key order of `endings`. The first
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
4. Record `history` samples whose interval divides *n+1* (the tick-0
   sample is taken at initialisation, 4.1).
5. Settle.
6. If *n+1* = `maxDuration / tick` and the run has not ended, reach the
   `time_up` ending. This is the only way `time_up` is reached; it is the
   one engine-defined ending and the only terminal ending without a
   `when` (4.1, 4.4).

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

**Checkpoints.** A checkpoint at tick *k* is exactly **Pre(k)**: the full
state on reaching *k* (variables, records with their `_id` counters,
history buffers, pending timer instances with their payloads, the
instance counter, random stream counters, each trigger's previous value
and fired-once flags, fired non-terminal endings, the phase, any open
prompt or reasoning moment), plus the seq of the last command applied
before it. It is a pure function of the commands with tick < *k*.
Checkpoints are taken **only at command boundaries**: a tick *k* not
strictly inside a skip (a skip stamped *n* that stopped at *s* covers
ticks *n+1* … *s−1*; *s* itself is a boundary, Pre(s) being the state the
skip stopped in). They are **never taken mid-skip**. The server writes
one at the latest boundary tick *k* at least 300 ticks after the previous
checkpoint and not beyond what it knows is final: *k* ≤ the larger of the
last accepted command's tick and `last_tick`, since every later command
is stamped at or after both (5.2). In a turns phase, where every tick is
inside a skip, this lands on skip stop ticks. **A checkpoint at 300 and a
command stamped 300 that arrives later:** the checkpoint is Pre(300),
which by definition excludes every command stamped 300, so it stays
valid; replay restores Pre(300), applies the late command (and any others
stamped 300, in seq order), settles, and continues. Nothing is
recomputed before 300. Checkpoint equivalence (restore, then continue,
equals a straight run) is a property test (16).

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
- **Speed.** Compressing time anywhere except an explicit wait would
  misteach how long things take, so the prototype's free 5x/10x/20x control
  is gone. The one exception is the approved two-position **pace** (5.4a):
  Study pace 3x (the default in clinical and fitness sims) and Exam realism
  1x, a logged command, so a replay matches.
- **Pause** is always available while the clock runs. It stops the clock
  and is logged. It is never penalised in scoring and there is no pause
  budget (decisions 2 and R2): timing criteria are measured on the **sim clock
  only**, so "tubes checked within 15 min of onset" means 15 sim minutes,
  however long the learner paused. The debrief shows total paused time for
  the learner's own information.

### 5.4a Pace (REQ-209; Nick, 2026-11-09)

In a `running` phase one sim minute used to take one real minute, so a full
tamponade case took 30 to 60 minutes on a phone. Pace is the approved fix.

- **Two positions.** *Study pace* (3x: one real minute is three sim minutes)
  and *Exam realism* (1x). Study pace is the default where pacing is offered;
  the learner chooses on the launch card (with the start point, 5.4b) and may
  change at any time while the run is open. Pause stays available at every
  speed (13.3, WCAG 2.2.1).
- **A logged command.** `pace { pace: 1 | 3 }`. It changes how fast real
  time runs the *same* ticks: sim state, the state hash, physiology and
  every delay are in sim time and are untouched. Pace is outside `SimState`
  and the hash, and is derived from the last `pace` command in the log
  (`Run.pace`, `lastLoggedPace`); a run with none replays at **1x**. The
  engine counts real-time ticks per pace (`Run.paceTicks`, also in
  checkpoints).
- **App.** At 3x the frame clock runs a tick every 333 ms
  (`tickMsFor`, `mobile/src/sim/runtime/pacing.ts`), with the same
  at-most-3-ticks-per-frame catch-up and 3 s stall rule as 5.4.
- **Server speed bound** (5.7). `minWallSeconds(run)` is the sum over paces
  of `paceTicks[p] * dt / p`: the least wall time the logged paces allow. A
  sync or finish is refused 409 `too_fast` when it exceeds the server's wall
  time since the run started plus the same tolerance (5 s plus 1%) as before.
  So a legitimate 3x run is accepted, and a client that plays faster than the
  speed it logged (or plays 3x without logging it, which reads as 1x) is
  refused. A run that only ever ran at 1x gets exactly the old check. The
  bound is cumulative, as before: each segment is charged at its own logged
  speed, but the comparison is against total wall time.
- **The clock and the debrief.** The sim clock is the largest text on the
  screen (`simClock`: time, minutes elapsed, and pace in a running phase) and
  is read aloud. The debrief reports sim minutes and the pace used
  (`DebriefData.pacing`: start and final pace, number of changes, real-time
  ticks at each pace, and a sentence).
- **Offline detection** divides the real-time span by 3 once the run has
  played at 3x, so 2 minutes of wall time at 3x is not read as 6 minutes
  offline. It can only under-flag, and offline play is recorded, not penalised.

**Who gets it.** Pacing (pace, focused start, the skip offer, teaching
prompts, chapters) applies only to a scenario that has a `running` phase
**and** sits in a clinical or fitness safety family (`pacingEligible`,
`lib/sim/server-run.ts`; mirrored by the lint rule `pacingRules`). Every
other sim, the IT, cloud and project-management ones, is unchanged and
byte-identical: the server answers 400 `pacing_not_available` to a pacing
command for them, the validator makes the new document keys a lint error for
the general family, and `RunPayload.pacing.eligible` is false so the app
shows none of it. Turn-based and stopped phases never tick in real time
(5.4), so nothing in them moves except by the learner's own action; this is
tested for every general-family scenario by ten idle minutes
(`lib/sim/idle.test.ts`, `mobile/src/sim/pacing.test.ts`).

### 5.4b Focused start (REQ-209)

A scenario may offer one **focused start** (`focusedStart: { label, at,
summary, source }`), chosen by the learner at launch. For tamponade it is
"Start near the deterioration" at 13 min (tick 780: 11 min after the
drainage stopped at 2 min, inside the brief's 10 to 12 min).

- **Reached through the engine.** The first command is `begin { start:
  "focused" }`; the engine evolves the normal start to `at` with **no learner
  actions** (the same `stepTick` real time uses), not counted as real time
  (so the speed bound charges nothing for it), and records `focusedAt`. It is
  valid only as the very first command, only where pacing is offered. The
  lint rule `pacingRules` runs it on three seeds and requires that it reaches
  `at` with no ending, no alarm interrupting and no prompt or reasoning
  moment open.
- **Fair scoring, exactly.** Timing is measured from **onset** exactly as in
  a full case, so the targets (page the surgeon by 20 min, re-exploration,
  and so on) are unchanged and a focused run does not get extra time. What
  changes is *recognition credit*: the `tubes` criterion ("noticed the
  sudden stop in chest tube drainage") has a first row `focusedAt >
  recognizeExpertAt -> na`. `recognizeExpertAt` is a sourced param (540 s: the
  expert path inspects the tubes 9 min into the case). A run that joins after
  the point where the expert path has already noticed the drainage stop is
  therefore not scored on noticing it, and `na` removes the criterion from
  the process score (it is not counted as missed). A focused start before
  that point (none exists for tamponade) would score `tubes` normally. The
  debrief marks the run as a focused start (`DebriefData.focusedStart`).
- **Mastery.** A focused run is an ordinary mastery attempt (a choice for
  Nick to confirm, 19.6): the criteria that are scored are the same ones.

### 5.4c The skip offer: "Skip to the next change" (REQ-209)

When nothing is happening, the app offers one button using the **existing
skip** (5.4), logged as a `skip` command with `calm: true`.

- **Engine rule** (`calmSkip(run)`, pure): a running phase; no prompt or
  reasoning moment open; no alarm condition true now (no `interruptsSkip`
  trigger holds); no timer of any kind due within 60 sim seconds
  (`CALM_MIN_SPAN_SECONDS`; "nothing urgent due"); and a pending wait that is
  not `routine`. It returns the wait to skip to.
- **App rule** (`calmOffer`): additionally nothing in the log, findings,
  phase or prompts has changed for about **30 real seconds** while the clock
  ran (`CALM_IDLE_MS`; paused time does not count).
- **Server.** The skip route accepts `calm`; it keeps the flag only if the
  server's own replay agrees the offer stood (else 409 `no_offer`), and
  refuses it where pacing is not offered (400).
- **Labels and the debrief.** The button reads "Skip to the next change" and
  its spoken label names the wait and the sim time skipped ("Skip to the next
  change: the echo result. Skips about 10 minutes of simulated time. It stops
  early if an alarm or a result comes in."). The log line ends "(skip offer)";
  the debrief counts them (`DebriefData.calmSkips`) beside the ordinary skips.
  A skip still stops early at an alarm or a result.

### 5.4d Teaching prompts during named waits (REQ-209)

A scenario may carry `teaching: { id: { during, ask, choices, expect,
explain, source } }`. While the named timer's wait is pending (for tamponade:
the fluid bolus, the echo, the surgeon's callback and the surgeon's walk) the
app shows one prediction question, answered by tapping a choice.

- **No model call, and not scored.** The answer is checked locally against
  `expect`, the feedback shows the explanation and the source, and the
  answer is logged as a `teach` command so a replay and the debrief ("Your
  predictions (not scored)") show it. **Decision: unscored**, not lightly
  scored. These are questions about what the learner expects, not about what
  they did, and a wrong prediction on a question the sources only partly
  support should not move the rating. They have no effect on state, the hash
  or the score.
- **Tamponade prompts** (each with a sourced rationale, `checkedAt`
  2026-11-09, and an explicit `FLAG` in its source note where the evidence
  is indirect). The primary source of three is the 2025 ESC guideline
  (Eur Heart J 2025;46:3952), read for this project through the publisher's
  free-access page; its section numbers and wording are relayed, not yet
  re-read by the author of the prompts. (1) CVP after a fluid bolus: the
  direction rests on Sagrista-Sauleda 2008 (medical tamponade, not
  post-surgical), and the guideline agrees that temporary fluid can
  stabilise a patient while drainage is arranged (11.8.3). (2) Whether a
  normal-looking echo rules tamponade out after cardiac surgery: grounded in
  11.8 (a clinical diagnosis that echo confirms; post-surgical collections
  may be loculated and compress one chamber). The guideline does not say
  whether a normal transthoracic echo excludes tamponade and does not cover
  transesophageal echo, so those statements are attributed to Eur J
  Cardiothorac Surg 2022 and J Card Surg 2008 instead. (3) Whether to wait
  for Beck's triad: the guideline says it is classically seen in surgical
  tamponade, so the prompt asks whether to wait for all three, not whether
  they will appear (the first version said the triad is uncommon, on a review
  of tamponade in general). (4) The least specific echo finding, from Table 17
  (11.8.2): a plethoric vena cava, sensitivity about 97% and specificity about
  40%; the ranges for the other signs overlap, so a "most specific sign"
  question is not supported. There is no prompt for "drainage stopped": no
  source was found for it. The 2025 guideline supersedes the 2015 one the
  scenario first cited; the 2015 entry stays only for vasodilators (3.2).
- **Family interruption.** Not added: the people layer is not in the engine.

### 5.4e Chapters: continue, or save and finish later (REQ-209)

A scenario may declare `chapters: [{ id, label, when }]`: natural break
points (for tamponade: the surgeon at the bedside, re-exploration begins,
back in the ICU). When a boundary's `when` first holds, the app pauses and
offers **Continue** or **Save and finish later**; both are logged as a
`chapter` command. The offer is a pure function of state and the command log
(`chapterDue`), so another device that replays the log offers the same
break or none, and does not ask again after it was answered. "Save and
finish later" is the existing checkpoint and resume: the run stays open on
the server, and "Continue the run" on any device replays it to the same
place (tested on a second device in `lib/sims.dbtest.ts` and
`mobile/src/sim/pacing.test.ts`). The chapter lint rule requires every
chapter to be reached by at least one golden path.

### 5.4f Compatibility (REQ-209)

- **Engine minor 1** (`ENGINE_VERSION` 1.1). The new document keys and
  `wait.routine` are minor-1 features (`FEATURE_MINOR`): a document that
  uses one must declare `engine.minor >= 1`, and a minor-0 document cannot.
  Stepping did not change, so there is no new major and every existing golden
  still matches at 1x.
- **Runs begun before REQ-209** are pinned to a minor-0 version and carry no
  pace command: they replay at 1x, resume, finish and score exactly as before,
  and the app does not show the launch card for any run that already has a
  command. A minor-0 checkpoint restores with all its ticks counted at 1x
  (`engineReadable`, `restoreRun`).
- **Old apps.** An open run on a minor-1 version is not handed to an app that
  lacks engine 1.1 (409 `app_update_required`, "Update the app to continue");
  the run is kept for the updated app. A minor-0 run is handed back to any app.
- **Schema.** Migration 073 widens the `sim_run_commands.type` check to allow
  `pace`, `begin`, `teach` and `chapter`. Apply it before the code that writes
  those commands (without it the first logged pace is a failed insert); runs
  that never log one are unaffected. `lib/schema-status.ts` probes for it.


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
  tolerance (5 s plus 1%). Since REQ-209 each real-time tick is charged at
  the pace the run had logged when it was played (1/3 of a second at 3x,
  5.4a), so the bound allows the logged speed and refuses anything faster.
  So a bot cannot play a 30-minute case in 2 seconds. Turns phases and skips are not real time and are bounded by the
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
things existing documents cannot use (a new function, a new param kind),
and a document that uses one declares that minor as its minimum (4.5).
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
cannot open. Every sims request carries `protocol: 1`, every engine the
build contains with its minor (`engines: [{ major: 1, minor: 0 }]`) and
each renderer with its feature level (`renderers: [{ type: "bedside",
level: 1 }]`). A document's `engine` is a minimum (4.5) and its
`screen.level` (8.2, default 1) is the renderer feature level it needs;
both are stored on the version (`engine_major`, `engine_minor`,
`renderer_level`, 6). The server treats a version as **runnable** by an
app only when the app lists an engine with the same major and a minor ≥
the version's, **and** the version's screen type with a level ≥ the
version's `renderer_level`. It filters by both: the list route marks a sim
the app cannot run as "Update the app to open this" (never hides progress
the learner already has), and the start route refuses it with 409
`app_update_required`. When the served version (6) is not runnable, the
server serves the latest approved version that is, if any. Seeding Phase
2 and 3 scenarios, or a version that needs a newer minor or renderer
level, is therefore safe for older apps.

Two of the new dependencies, `react-native-svg` and `expo-keep-awake`,
are native modules. The app's `runtimeVersion` uses the `fingerprint`
policy, so adding them changes the fingerprint and native learners need a
store build before they can receive any sim UI over the air; web gets it
first. Until a learner's native build includes them, it advertises no
renderers and sees "Update the app".

## 6. Persistence

Migration `<NNN>_sim_engine.sql`, numbered **the next free number at
implementation time** (built as `062_sim_engine.sql`, the number reserved
for the sim engine; section 22 lists what it holds): 055 is taken by PR #44
(`055_content_review_queue.sql`, REQ-142/143) and 056 by the
unrestricted-access PR. No number is fixed in this design; below, "the
sim migration" means that file. Additive only; follows 050's conventions
(lock_timeout 5 s, IF NOT EXISTS, guarded DO blocks, NOT VALID checks on
`attempts`), including 050's `kind::text` lesson (see `attempts` below). It follows
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
schema_version int, engine_major int, engine_minor int (the document's
minimum, 4.5), renderer_level int (5.10), document jsonb (runtime and
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
In every case the version must be runnable by the app: same engine major,
a minor and renderer level at least the version's (5.10). Rejecting a
version falls back to the latest approved one. A seed file reverted to an
earlier hash makes that existing row the head again (the unique
constraint means it is found, not re-inserted), and it keeps its review
status. **While nothing is approved** (the normal state today, with
review at Nick's pace), rejecting a bad head does not fall back to
anything: rule 2 has no approved version and rule 3 skips a rejected head,
so the sim is **unlisted** (open runs keep replaying their pinned
version). That is a stop, not a rollback. The real rollback is **reverting
the seed file** to the previous content and reseeding: the earlier row
becomes the head again and is served under rule 3 (6.1).

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
a `sim_id`. The check compares **`kind::text`** (`kind::text <>
'simtask'`, `kind::text = 'simtask'`), as 050's `attempts_labtask_shape`
does (050, lines 190-191): a new enum value cannot be used as a value in
the transaction that adds it, so the sim migration, which adds `simtask`
and this check together, must do the same. `question` is the sim's title, unique within its course, as
labs store their prompt, so 045's repeat ranking (which partitions by
`type_name || ':' || question`) ranks each sim separately; a null question
would collapse every sim on an objective into one. Partial index
`(user_id, sim_id) where sim_id is not null`, built CONCURRENTLY before
the migration in production as 050's was.

**`assessment_types`**: one row, `sim_run` (section 9.4).

**Item kinds**: `sim` added to the `item_flags`, `item_status` and
`item_holdbacks` checks. 050 does this for `lab` with a loop that drops
any item-kind check whose definition lacks `'lab'` and then adds
`<table>_item_kind_050` if that name is absent. The sim migration uses the
same shape for `'sim'` (drop any item-kind check lacking `'sim'`, add
`_<NNN>`). Because 050's guard looks for its own constraint name,
re-running 050 after it would re-add `_050` (without `'sim'`); re-running
the sim migration then drops it again, so applying the chain in order
converges. (`content_review_queue` from #44 needs no change: its
`item_kind` is a pattern check, not a list.) A dbtest applies every migration
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

**Where per-sim signals plug in: PR #44's review queue.** #44 (REQ-142/143)
adds `content_review_queue` and a signals job (`/api/cron/content-signals`,
`lib/content-signals.ts`) that reads one SELECT per content kind from
`ATTEMPT_SOURCES` in `lib/content-review-queue.ts`. Sims plug in with one
entry there, `sim`: `attempts a … where a.sim_id is not null`, `item_id` =
the sim id, label = the sim title, `correct` = verdict `correct` (a Good
rating). Its common filter already drops voided and `assisted` attempts,
so repeats do not count, and "Report a problem" flags for kind `sim` are
counted with no further change. Queue rows land with `item_kind = 'sim'`
and need no migration (its `item_kind` is a pattern, not a list). The
queue keys by sim, not version; the per-version view above stays the
evidence shown in the reviewer packet (11.4). Added in 1b with a dbtest.

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
  **switch off and leave the schema**: set `SIMS_ENABLED` off, leave the
  sim migration in place. If a full removal is ever required, a forward migration drops the
  sim tables, the column and the check after confirming no `simtask`
  attempt exists (or voiding them first), and leaves the enum value.
- **Content**: revert the seed file to the previous content and reseed;
  the earlier version row becomes the head again (6). Rejecting the bad
  version stops new runs on it at once, but while no version of that sim
  is approved it unlists the sim rather than rolling it back (6, "Which
  version is served"); with an approved version it falls back to that.
- **Runbook**: the sim migration gets a row in the migration table of
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
| `GET /api/sims/:id` | One sim: brief (no per-sim disclaimer; the study notice covers sims, REQ-165), client document of the served version (or the pinned version of an open run) with its hash, the open run if any, the latest finished run's summary. |
| `POST /api/sims/:id/runs { restart?, deviceId }` | Start or resume (one open run per learner and sim); takes the lease. A clinical or fitness sim needs the study notice (403 `study_notice_required`, REQ-165). Returns `{ run, seed, leaseEpoch, clientDocument?, checkpoint, commandsAfter, lastTick }`; the document is omitted when the app's cached hash matches. |
| `GET /api/sims/runs/:runId` | Resume on any device: checkpoint, commands after it, `lastTick`, waits pending, current lease holder. |
| `POST /api/sims/runs/:runId/lease { deviceId }` | "Continue on this device": take the lease; returns the new epoch and the checkpoint. |
| `POST /api/sims/runs/:runId/commands { leaseEpoch, fromSeq, commands[], stateHash, tick }` | Sync. 409 `lease_lost` on an old epoch. Idempotent by `seq` (a resent `seq` with the same payload is accepted; with a different one is 409). Locks the run row, replays from the checkpoint, validates, stores, writes a new checkpoint (Pre(k) at a command boundary at least 300 ticks after the last, never mid-skip; 5.3), returns `{ acceptedThrough, serverHash, rejected?, ended?, stoppedAt? }`. |
| `POST /api/sims/runs/:runId/reasoning { momentId, openedSeq, openedTick, answer, clientAttemptId }` | Grade one reasoning moment (section 10). `openedSeq` is the last command seq applied when the moment opened (0 if none) and `openedTick` the tick it opened at, so a moment opened by a trigger during an advance is covered. The server's replay must contain `openedSeq`, must have reached `openedTick` (`openedTick` ≤ the run's `last_tick`), and must show the moment opening at `openedTick` with `openedSeq` as the last applied seq; otherwise 409 `replay_behind` (the app syncs first and retries). Returns parts, feedback and the model answer. Replay of an already graded id returns the stored result. |
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
gets 413 `replay_budget` and the app syncs in smaller pieces. Pieces are
cut at command boundaries; a single skip cannot be cut, which is why the
linter bounds the longest skip to 15,000,000 evaluations (4.3).
Checkpoints at least every 300 ticks (5.3) keep a normal sync far below
the budget.

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
  level?: number;                                    // renderer feature level needed (default 1; 5.10)
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
  // REQ-190: the architecture board's topology. Each zone lists the items
  // whose `when` holds; meters are short read-outs. Display-only, validated
  // like tile bindings (bool `when`, templates over tick-scope names).
  board?: {
    zones: { id: Id; label: string; spokenLabel: string; items: { label: Template; when: Expr }[] }[];
    meters?: { id: Id; label: string; value: Template }[];
  };
  // REQ-225: the client session (the people layer, 20.2, 22.5).
  session?: {
    client: { name: string; presentation: Template };  // how the client presents now
    gauges: { id: Id; label: string; spokenLabel: string; value: Expr; max: number;
              bands: number[]; words: string[] }[];     // a number read in words: one word more than bands
    notes?: { id: Id; label: string; text: Template; when?: Expr; alert?: Expr }[];  // what the clinician knows
    record?: { label: string; items: { label: Template; when: Expr }[] };          // the documentation so far
  };
  // dashboard, trainer, security, terminal, data: later phases (20)
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
sum of their weights, rounded to an integer. A criterion row may also score
`na` (REQ-190): not applicable, left out of both sums like a grader
failure. Module criteria use it when the module never ran, so a run with no
arrest is not handed five free "met" scores. Both kinds may be
`critical`. A reasoning criterion marked critical and missed (including
skipped) blocks Good through the rating rule (9.2) like any other
critical miss; but the path-search lint against `target` with a critical
miss covers command-derived criteria only, because reasoning grades come
from the AI after the run and are not reachable state (9.2). A reasoning moment the
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

Every terminal ending except the engine-defined `time_up` declares its
class **and** the state conditions (`when`) that produce it, written against the scenario's
`outcome.thresholds`. The classes are exhaustive by construction: an
author writes the `harm` conditions first, then `target`, and anything
else is `recovered`. The built-in `time_up` and any `{ end }` ending carry
a class like every other terminal ending; `time_up` is the one ending
with no `when`, reached by tick count alone (4.1, 5.3). A run the learner quits
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
| Clinical session (REQ-225) | the session's safety or diagnostic task done within its window (`safetyWindow`, default 20 min from the cue), rapport >= 6/10 at the close (`allianceTarget`) | done late, partly, or at a cost to the alliance or the client's autonomy (an over-restrictive referral, a disclosure made on a guess) | a client left at foreseeable risk, a required protective step not taken, confidentiality broken beyond what the law allows, a diagnosis that misses a required rule-out, or a walk-out after a rupture |
| Security (REQ-231, 22.7) | contained within `containWindow` (default 60 min; the Security+ cases use 30) of the first alert, no asset newly compromised after it (`containSpread` 0), evidence preserved before anything is purged, wiped or terminated | contained, but late, after spread to another asset, with partial evidence (a disk image without memory), or with a costly recovery (an older backup past the RPO) | the attacker's impact reached (payment fraud, backups destroyed, data copied out), evidence destroyed before collection, a reinfection during recovery, or the incident closed with an attacker path still open |
| Physical therapy (REQ-232) | the session's goal reached with every stopping rule respected (activity eased within `stopWindow`, default 2 min, of a rule being crossed; SpO2 floor `spo2Floor`, default 88%) and any red flag escalated within `escalateWindow` (default 15 min) | the goal partly reached, a stopping rule acted on late, or a red flag escalated by a slower route (the patient told to call) or after it became an emergency | a fall, syncope, an embolism, rapid response, or a red flag left unescalated |
| Infrastructure (REQ-237, 22.10) | the service restored within `restoreWindow` (default 60 min; the cases use 30 or 45) of the first report, with no fault the fix introduced (`newFaults` 0) and the case's evidence step done first | restored late, by a guess, unsaved, or with a side effect (a weakened server, a fix that will not survive a reboot) | the outage spread to the authored secondary service, or a destructive command (data or WAL deleted, a config erased by a reload, a node wiped, a disruption budget bypassed) |
| Data | defined with its renderer (20) | | |

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

**Linted** (4.4, 16): every terminal ending has a class and, except
`time_up`, a `when` (`time_up` must not have one);
outcome thresholds are no looser than the profile default; every class is
reachable (by a golden path or the bounded path search, 12); no explored
path reaches a `target` ending with a critical **command-derived**
criterion (`scoring.criteria`) missed (if one does, the author either
makes the criterion part of the `target` condition or the criterion is
not really critical). **Reasoning criteria are outside that check**
(decided by the review lead, 2026-11-07; 21): they may be critical, a missed critical reasoning
criterion still blocks Good through the rating rule above, and the lint
and path search never treat a reasoning grade as reachable state (it is
an AI verdict after the run and never changes sim state, 10). Every
scenario has at least one critical criterion of either kind; the golden paths include at least one Good,
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
- `lib/item-report.ts`: the "Report a problem" body switch has a `case
  "lab"` (line 114) and a throwing `default` (line 123-124) that lists the
  accepted kinds. It gains `case "sim"` (`simId` must be a uuid of a sim
  this learner can open, else 404; the ref is `{ kind: "sim", itemId:
  sim.id, objectiveId, question: sim.title }`) and the default's message
  names `sim`, so an unknown kind still throws 400. The route's comment
  (`app/api/items/report/route.ts`, lines 13-16), which lists the body
  shapes and today omits even `lab`, gains `{ kind: "lab", labId }` and
  `{ kind: "sim", simId }`. A dbtest reports a sim (accepted, an
  `item_flags` row of kind `sim`) and a sim the learner cannot see (404).
- **The sim migration's check uses `kind::text`** (6): a new enum value
  cannot be used in the transaction that adds it, which is why 050
  compares `kind::text` in `attempts_labtask_shape`; the
  `attempts_simtask_shape` check must do the same, and the dbtest that
  applies every migration twice proves it.
- `lib/content-review-queue.ts` (from PR #44): an `ATTEMPT_SOURCES` entry
  for `sim` (6), with a dbtest.
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
- **Ordering**: a moment opens either from a command's effects or from a
  trigger during an advance (no command at that tick). The grading
  request therefore names `openedSeq`, the **last command seq applied
  when the moment opened** (0 if none), and `openedTick`, the tick it
  opened at; both are stored on `sim_run_reasoning` (`opened_seq`,
  `opened_tick`). The server grades only when its replay contains
  `openedSeq`, has reached `openedTick` (`opened_tick` ≤ `last_tick`,
  raised by any sync, 6), and shows that moment opening at `openedTick`
  with `openedSeq` as the last applied seq; otherwise it answers 409
  `replay_behind` and the app syncs first. Because the clock is blocked
  while the moment is open, the app's next sync always reports a tick ≥
  `openedTick`. The app always sends queued reasoning before `finish`.
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
(default `bedside,board` since REQ-190, because the first flagship is the
TicketBurst board, 19.4 item 1; `bedside,board,session` since REQ-225, so
testers see the client session; `bedside,board,session,security-console`
since REQ-231; `bedside,board,session,security-console,treatment-session`
since REQ-232, for the PT treatment session;
`bedside,board,session,security-console,treatment-session,terminal` since
REQ-237, for the terminal and network screen). A renderer can be launched, or pulled after a bad
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

REQ-165 (Nick, 2026-11-09): there is no per-sim or per-lab disclaimer and
no "Awaiting expert review" badge. The one **study notice**
(`mobile/src/lib/studyNotice.ts`, `backend/lib/study-notice.ts`), accepted
once at launch, names sims among the content it covers. The server should
refuse to start, resume, sync or grade a clinical or fitness sim until it is
accepted, as it does for labs (`requireStudyNotice`, 403
`study_notice_required`).

The sim-specific point -- the patient's (client's, system's) responses come
from a simplified teaching model written for exam practice, not a validated
model of the real thing -- belongs in the study notice when sims ship (a
meaning change: bump `STUDY_NOTICE_VERSION`, so everyone is asked once more).

### 11.4 Review workflow

Every version is stored `needs_expert_review` and served by default; since
REQ-165 the review status is not shown to learners. Review is
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
  Re-checking a source that has not changed means bumping its
  `checkedAt`/`recheckBy` and reseeding: the dates are outside the
  content hash (4.5), so this updates the existing version in place,
  keeps its review status, and clears it from the stale list. A changed
  value or URL is a content change and makes a new version for review.
- **Learner signals.** The per-version daily metrics (6) feed the
  learner-signal auto-flag being built for labs and items: rising "Report
  a problem" flags or a sudden drop in a version's Good rate flags it for
  review here, with the evidence (runs, Good/Mediocre/Bad over time, flag
  count) in the packet.

## 12. Authoring, seeding and generation

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
back at its existing row, 6). When the hash is unchanged but source dates
changed, it updates those dates and `sources_recheck_by` on the existing
row in place (4.5). The safety family is derived from the
objective's course, never read from the file. Removing a file retires the sim
(`retired_at`); runs and attempts stay.

**Generator.** Built in REQ-230; the design is 12.2 and the per-screen
authoring rules the generator hands the model are 12.1. The original plan
(a model writes a document, the pipeline fails closed through schema, lint,
a path search, golden paths and an independent fact check; stored as
generated, `needs_expert_review`; never run live until the authored set has
shown which shapes work) stands. What changed in the build: the model writes
the golden paths as move scripts and the engine fills their expectations,
the checker is the writer's model (REQ-187), and a passing draft is written
as files for a person to register, never registered by the script.

### 12.1 Generator authoring rules by screen (REQ-230)

`npm run sims:generate` reads the blocks between the `generator-rules`
markers below and puts them, word for word, in the writer's prompt: the
rules for every screen, then the requested screen's. Edit them here; the
test `lib/sim/generator/generator.test.ts` fails if a screen's block goes
missing.

<!-- generator-rules:all -->
- One scenario per document, built for exactly the objective title given
  (`objective`), for the screen type given (`screen.type`).
- `schemaVersion` 1, `engine` `{ "major": 1, "minor": 2 }`. Every ending
  that has a `when` is listed once in `endingOrder`, in the order it should
  win; `time_up` is never listed.
- Endings: at least one terminal ending of each outcome class (`target`,
  `recovered`, `harm`), each with a `when`, a label and a narrative; a
  `time_up` ending as the hard stop. `outcome.noProgress` says how safe but
  stalled is classed, with a rationale of a sentence and a source.
- Scoring: criteria with at least one critical criterion, each with rows
  ending in a `true` row; one reasoning moment (`reasoning`) and a matching
  `scoring.reasoningCriteria` entry; KPIs; an expert path; a debrief per
  terminal ending; `modelReasoning`.
- Numbers: every numeric param, every timer, every outcome threshold and the
  no-progress rule carries a `source` with `cite`, an ISO `checkedAt` (the
  day the source was read; never in the future) and a `url` or a `note`
  saying where in the source the number is. `sources` lists the exam outline
  by the course's own URL and every reference used. Never invent a number;
  when a source gives a range, use it and say so in the note.
- The people are fictional. Never address the learner's own patients or
  clients ("your patient"). US English. Plain words in everything the
  learner reads.
- Golden paths, as move scripts: at least the expert path, one slow but
  safe path and two failure paths; together at least one `good`, one
  `mediocre` and one `bad` rating, every terminal ending but `time_up`
  reached, and every criterion both met and missed by some path. Moves are
  `act` (action id and params), `choose` (a choice on the open decision
  card), `answer` (submit the open reasoning moment), `skip` (to the
  earliest wait, or a named timer's), `wait` (seconds of real time in a
  running phase), and for a paced clinical case `pace`, `begin` (the
  focused start, first move only), `teach` and `chapter`. Each path states
  the ending, class and rating it reaches; the engine checks it.
<!-- /generator-rules:all -->

<!-- generator-rules:bedside -->
- Bedside monitor (`screen.bedside`, level 3): tiles for the vitals that
  carry the case, each with `spokenLabel`, `unit`, alarm limits where the
  monitor would alarm, and `announce.bands` at the values that change what
  a nurse does. Hidden tiles (`hiddenUntil`) for results that come back
  later (labs, imaging).
- Physiology moves whether or not the learner acts: a `running` phase with
  processes that worsen the patient untreated and respond to the right
  treatment with sourced delays. Profile `clinical`; its thresholds may be
  tightened, never loosened (9.2).
- Pacing (5.4a): a clinical case may declare a focused start, chapters and
  teaching prompts during named waits; each needs a source.
- Actions are what the nurse or clinician in the exam's scope would do,
  grouped as the exam groups them (assess, intervene, call, document);
  results that take time come back by timer, with the wait labelled.
<!-- /generator-rules:bedside -->

<!-- generator-rules:board -->
- Board (`screen.board`): zones listing what is placed or running, with
  `spokenLabel`, and meters for the numbers the learner is judged on (cost,
  availability, schedule). Profile `cloud`, `project` or another fitting
  general profile, with its default thresholds or tighter.
- The learner builds or changes a design (catalog entries placed in slots,
  settings chosen in forms), starts it, and the scenario plays events
  against it by timer (load spikes, failures, a finance review). Each event
  and each limit or price is sourced and dated; cloud prices and service
  limits are re-checked every six months.
- Competing priorities are the point: cost against availability, speed
  against risk. The expert path names the trade-off it makes.
<!-- /generator-rules:board -->

<!-- generator-rules:session -->
- Client session (`screen.session`, 22.5): the client's name and a
  presentation template, gauges for the client's states (for example
  rapport, distress, disclosure) with words for each band, notes that appear
  as the learner learns things (an alert note for risk), and the record.
- Learner-paced: the session phase is `turns`, not `running`. Each exchange
  shows the client's answer at once and schedules the conversation wait,
  which moves the session clock by the minutes that kind of exchange takes.
  The hour ends at 50 minutes and moves to an after-session phase for the
  written formulation and documentation. No focused start, chapters or
  teaching prompts; one unscored prediction may be a decision card.
- Profile `clinical-session`, defaults `allianceTarget` 6,
  `allianceRecovered` 3, `safetyWindow` 1200 s or tighter. Harm is a client
  left at foreseeable risk, a required protective step not taken, or
  confidentiality broken without a legal basis; cite the ethics code,
  statute or guideline that makes it so.
<!-- /generator-rules:session -->

### 12.2 The generator as built (REQ-230)

Nick approved the sim library plan on 2026-11-11: the engine-order fix first
(done in engine 1.2, 22.6), learner-paced client sessions, measure the first
20 generated sims and then set a separate monthly sim budget, and breadth
before variants.

**Commands** (backend; nothing is sent without `--run`):

```
npm run sims:generate -- --select --course CCRNADULT
npm run sims:generate -- --course CCRNADULT --objective "<exact title>" --screen bedside [--idea "<seed scenario idea>"]
npm run sims:generate -- --course CCRNADULT --objective "<exact title>" --screen bedside --run [--max-usd 3]
npm run sims:generate -- --cost-summary
```

Without `--run` it builds the prompt, prints its size and an upper-bound
cost, and writes the prompt to the output folder so a person can read it.
With `--run` it needs `ANTHROPIC_PREGEN_API_KEY` (the pre-generation
workspace's key, docs/operations-runbook.md); with no key it refuses before
any call and says so. It never falls back to the app's key.

**Selection.** `--select` lists the course's active sub-objectives that meet
the selection rule (at least two of: time matters, cues to read, choices
with consequences, competing priorities), each with the words that matched
as the recorded reason, ranked by the unit's exam weight; objectives that
already have a sim go last (breadth before variants). It is a keyword screen
over the objective's title (`lib/sim/generator/selection.ts`), a shortlist
for a person, not a judgement. Generating for an objective that does not
qualify needs `--allow-unselected`, and the report records it.

**The prompt** is built from the course's own sources (the exam outline URL
and the unit's dated sources with the values the course uses, from the
seeded catalog), the 12.1 rules for the screen, one seeded document of the
same screen as the shape to follow, and the seed idea if given. The writer
returns `{ confidence, uncertainClaims, document, goldenPaths }`.

**Gates**, in order, each failing closed with a reason
(`lib/sim/generator/gates.ts`):

1. the reply is one JSON object of that shape, and the writer did not rate
   its own confidence low (REQ-216);
2. the zod scenario schema;
3. identity: the requested screen and exact objective title, a slug no
   seeded sim or earlier draft uses, the current engine minor (2), so
   `endingOrder` is required;
4. golden paths: each move script drives the server engine, every move is
   accepted, and the path ends at the ending, class and rating the model
   said; the expectations (score, criteria, KPIs, state hash) are then the
   engine's own result;
5. lint: `checkDocument` in full, as `npm run sims:lint` runs it
   (semantics, content rules, golden replays, ending order, the key-order
   rule), with today's date for source ages; its path search is left to
   gate 7 so it runs once;
6. key order: every golden path ends the same with the document's keys as
   written, reversed and in jsonb order (the storage-order test; like it,
   the reversal leaves the `teaching` map alone, FAIL-1250, FAIL-1300);
7. reachability: the bounded path search (`--search-nodes`, default 4000 as
   in `sims:lint`); every terminal ending but `time_up` is reached by a
   golden path or by the search, and no searched path reaches a `target`
   ending with a critical criterion missed; the report says which endings
   the bounded search found on its own;
8. replay: each golden path replayed as the sync route replays it
   (straight, resumed from a mid-run checkpoint, and as the client
   document) reaches the engine's state hash, and the engine bundle (engine
   major 1 transpiled to the one script Hermes and the browsers run) prints
   the same result;
9. sources: every number in params, timers, thresholds and the no-progress
   rule has a cite, an ISO `checkedAt` not in the future and a url or note,
   and the document cites at least one of the course's own sources by URL.
   This is stricter than the linter on purpose (several authored documents
   would fail it, mostly a missing url or note);
10. duplicate: not too close to a sim on the same objective (below);
11. fact check: a separate call, the writer's model (REQ-187), answers
    agree, disagree or unsure for claims taken from the document by code:
    every sourced number, each terminal ending's class, the no-progress rule
    and the expert path. Any disagreement fails the gate; unsure answers are
    logged; a claim with no answer, or a failed call, means the check did
    not run: the call is tried once more, and if it still fails the draft
    is held as "check did not run", not as wrong.

The fact check is only paid for when gates 1-10 pass.

**Retry and hold.** A draft that fails any gate is written once more, with
the failure reasons in the prompt. If the second draft fails too, both
drafts and their reasons go to `held/`; nothing held is ever registered.
A run that would pass `--max-usd` (default $3, an upper bound per call from
the prompt size and the output limit) stops before the call and holds what
it has with that reason.

**A passing draft** is written to `ready/<COURSE>/<slug>.sim.json` and
`<slug>.golden.json` (status `draft`) in the output folder (default
`backend/sim-drafts/`, git-ignored), with `<slug>.register.md`: the two
`mv` lines into `backend/supabase/seed/sims/<COURSE>/`, the
`entry("<COURSE>", "<slug>", { source: "generated" })` line for
`ALL_DOCUMENTS` in `lib/sim/documents.ts`, and the checks to run. The script
never edits `documents.ts`. Registered, it seeds as `needs_expert_review`
with `sim_versions.source = 'generated'` (Nick approved, REQ-236): the
`source` option on `entry()` (or `band()`) is what the seed writes, and an
entry without it is `'authored'`. A marking changed on unchanged content is
corrected in place on the same version row, like re-checked source dates (no
new version, review kept). Every sim registered before REQ-236 is authored
(`lib/sim/documents.test.ts`; `lib/sims-source.dbtest.ts` seeds one of each).

**Duplicate check** (`lib/sim/generator/similarity.ts`). Two Jaccard indexes
(shared divided by either): the story (three-word runs of the title,
situation and handover) and the decisions (content words of the action and
ending labels). The similarity is the story index, or the mean of the two
when that is higher; at 0.5 or above the draft is a duplicate of that sim.
Shared decisions alone never make a duplicate: a variant (the same skill on
a different patient or system) shares its decisions by design, as adult and
pediatric septic shock do (decisions 0.43, story 0.05; FAIL-1302). It is
compared with every seeded sim and every earlier ready draft on the same
objective. Across the seeded documents the highest pair on different cases
is 0.24 (adult and pediatric septic shock); a band over its base is 1.0.

**Cost.** Each call's input, output and cache tokens and its price
(`lib/ai-pricing.ts`) go into the draft's report,
`reports/<time>-<COURSE>-<slug>.json`, split by writer attempt and fact
check, with the retries counted; one line per draft is appended to
`reports/costs.jsonl`. `--cost-summary` reads that ledger and prints the
drafts, how many were ready, the mean, median and highest cost per draft,
and the cost per ready sim (all spend divided by ready drafts, which is the
per-sim number for the monthly budget after the first 20).

**Tests** (`lib/sim/generator/generator.test.ts`) use a mocked model only.
The mocked writer returns the seeded EPPP suicide-risk session re-aimed at
another EPPP objective (fast to replay), with its golden paths turned back
into move scripts: (a) a valid draft that passes every gate and the fact
check, (b) a draft with no `endingOrder` that fails lint and passes on the
steered retry, (c) a draft whose fact check disagrees twice and is held.
Also: the Whipple bleed's paths as moves (a running case with a focused
start and pacing) reproduce its golden hashes, the duplicate check, the
selection rule, the missing key, the budget stop, a failed fact-check call,
the writer's low confidence, the key-order gate and the rule blocks above.

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
| Server replay | from the last checkpoint (Pre(k) at a command boundary, at least every 300 ticks, 5.3) plus the new ticks; a typical sync is a few ms. Worst case is bounded by the linted per-run bound (≤ 50,000,000 evaluations), the longest-skip bound (≤ 15,000,000, 4.3) and the per-request replay budget (20,000,000, 7) |
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
interrupt, history sampling including the tick-0 sample and `past`/
`delta`/`trend` on a one-sample buffer, timer `after` conversion and
rounding, timer `with` payloads read by effects and `cancel … where`,
`time_up` by tick count, checkpoints including a late command stamped at
the checkpoint tick, `pick`/`chance` draws, command dispatch with typed
captures and the unmatched line, `pow`, saturation and `-0`) are written with
hand-computed expected states. The engine must reproduce them; their state
hashes are recorded as the `v1` corpus, which stays a **DRAFT** through
Phase 1a steps 3-6: a hash may change while the spec or a hand
computation is corrected, each change reviewed with its reason. At the
freeze (17, Phase 1a step 7) the manifest is marked frozen; **from then
on** any change to a corpus hash fails CI and means a new engine major
(5.8).

**Schema conformance.** A typechecked test asserts that the zod schema
in `backend/lib/sim/schema.ts` and the engine's types in
`backend/lib/sim/engine/v1/types.ts` are mutually assignable (an
`Equals<z.infer<…>, ScenarioDoc>` assertion, and one per building
block), and a runtime test parses every corpus, paper and seeded document
with the zod schema. Both run in CI from Phase 1a step 4 (4.1).

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
- **Checkpoint equivalence**: checkpoint Pre(k) at a command boundary,
  restore, continue = straight run (history, timer instances and
  payloads, stream counters and trigger previous values included); a
  command stamped *k* arriving after the checkpoint applies on top of it;
  no checkpoint is ever taken strictly inside a skip.
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
the revised prototype through a **driver**, and the drivers are not
uniform. Only `critical-care.html` has a `?test=1` hook (it steps in 1 s,
like the engine). The cloud and fitness prototypes have no hook; their
existing scripts, `test-cloud.js` and `test-fitness.js`, drive paths
through them. The project prototype has **neither**, so the PMP port
needs a **new driver** (a script in the style of `test-cloud.js`, or a
`?test=1` hook added to the prototype), written in Phase 1a step 5 before
its golden paths can be compared (17). (The prototypes are outside this
repository: `npm run sim:golden -- prototype <port> <dir>` drives them and
commits what they did as `<slug>.prototype.json`, and `lib/sim/ports.test.ts`
compares the engine with that recording in CI.) Endings and criteria must match the prototype exactly
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
profile default, no `target` with a critical command-derived criterion
missed, reasoning criteria excluded from that check, at least one
critical criterion); `time_up` without a `when` and every other terminal
ending with one; the longest-skip bound (4.3); golden-path rules (every ending reached, except that an unreached
`time_up` hard stop is a warning, every criterion both
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
   recorded as the **draft** v1 corpus before engine code beyond the
   parser (it stays a draft until step 7, 5.3).
4. Engine, parser, type checker, deterministic maths, history,
   catalogues, timer instances, the linter and the bounded path search;
   engine types in the engine folder and the zod conformance test (4.1,
   16).
5. **Ports**: all four prototypes as documents with golden paths (engine
   only, no renderer): tamponade, cloud launch day, the PMP project and
   the NASM client, using the revised prototypes' timings (3) and the
   outcome classes (3.1, 9.2). Expected values come from the prototype
   drivers (16): `?test=1` for critical care, the existing
   `test-cloud.js` and `test-fitness.js`, and a **new driver for the
   project prototype**, which has none.
6. **Paper scenarios**: one full scenario each for the security console,
   terminal/network and data/code console, written against the schema in
   `docs/sims/paper/` (not seeded), each with its outcome profile, every
   action and output it needs, and a note of any schema feature it used.
7. Freeze engine major 1 **and its corpus** (manifest `"status":
   "frozen"`). Only from here does a corpus hash change mean a new major.

*Exit*: the v1 corpus and all property tests pass on Node and in the
browser job, and on a Hermes VM if the spike found one; the four ported
scenarios pass the linter (every outcome class reachable, Good, Mediocre
and Bad golden paths) and their golden paths match the revised prototypes
(endings and criteria exactly except the deliberate changes in 3.1,
continuous values within ±1); the three paper scenarios needed no feature
outside the schema (any they needed was added, with tests, before the
freeze); the tamponade tick and 90-minute skip meet their benchmark
budgets; `./omni gate` passes.

**Phase 1b: server.** The sim migration (the next free number at
implementation time, currently 057; 6), with 050's `kind::text` rule for
its `simtask` check, its rollback notes and runbook rows, schema probe,
the `sim` entry in #44's `ATTEMPT_SOURCES`, routes (lease, row lock, per-run sync interval, replay
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
- **Decided (Nick, 2026-11-09):** harm endings for contraindicated actions
  only where a published guideline names them, with a dated source; the cap
  of three concurrent boluses stays; written reasoning is scored; an
  unreached `time_up` stays a lint warning (every other terminal ending must
  still be reached by a golden path).
- **For clinical review (tamponade, 3.2):** protamine 25 mg after the ACT is
  back near baseline, and dobutamine during tamponade. No guideline found
  names either as contraindicated in this setting (searched 2026-11-09), so
  neither is a `harm` ending; a reviewer may supply a source.

### 19.4 Nick's decisions, 2026-11-09 (recorded in REQ-162, PR #64; items 1-4 built in REQ-190)

1. **First flagship sims:** AWS SAA and SAP as one scenario with two
   difficulty bands (the TicketBurst launch day, 3.3, is the base), then
   CCRN (the tamponade case, 3.2). Bands are planned as overlays on one
   base document, each validated and golden-tested as its own document
   (not built yet).
2. **The app screen (Phase 1b/1c) ships together with the code/ACLS
   module**, not before it.
3. **Tap-to-the-beat compressions are in the code module's first
   release.** The learner taps the compression rhythm. The scored measures
   are a rate of 100-120 per minute and no pause over 10 s, computed from
   tap timestamps. For determinism the taps reach the engine as a command
   carrying the measured rate and the longest pause (integers, from the
   app's monotonic clock), never as live timing the engine reads itself, so
   a replay on any device scores the same.
4. **Lint:** an unreached `time_up` is a warning; every other unreached
   terminal ending is an error (the rule as implemented).
5. **Content is served to learners as built and deployed**, under the
   one-time study notice (REQ-165). There is no reviewer gate; review
   status stays internal (11.4).

### 19.5 Choices made in REQ-190, for Nick to confirm

- **SAP-C03, not SAP-C02.** The brief said SAP-C02; AWS retires it on
  2026-11-16 and the AWSSAP course already teaches SAP-C03, so the band's
  objective and criteria use C03 domains (C02 was read too).
- **"AZ placement hidden"** is read as: which AZ fails is hidden and drawn
  from the run's seed. The other reading (the board hides per-AZ subnets and
  AZ spread becomes one setting) is a renderer and catalogue change.
- **`append`** extends RFC 7396 for arrays (4.7).
- **`na` criterion score** (9.1): an engine scoring change before the
  major-1 freeze; state hashes and the corpus are unchanged.
- **Full-dose epinephrine after cardiac surgery is a harm ending**
  (`code_epiHarm`, reached at ROSC), because STS 2017 names it class III
  (harm) without expert direction.
- **The paced compression mode** is scored by the same rule on the rate and
  pause the learner picks, reported as its own mode; it is not a free pass.
- **Resternotomy window**: the cause criterion is met when the resternotomy
  is called within 2 minutes (opening takes 5 minutes with the tray at the
  bedside, 10 without), which keeps "open within about 5 minutes" (STS 2017)
  reachable only with preparation.
- **Phase 1b (section 22).** The tamponade sim counts toward "Care of the
  patient after cardiac surgery" (the document's own objective title is not
  in the CCRN catalog); `SIMS_RENDERERS` defaults to `bedside,board` so the
  TicketBurst flagship is not off by default; the board's topology is a
  declared `screen.board` binding (display-only) rather than renderer code;
  sims have their own `sims` feature key (11.2); the start route returns
  every accepted command and the app replays from tick 0 instead of a
  checkpoint; the run starts with the clock paused until the learner runs it.

### 19.6 Choices made in REQ-209, for Nick to confirm

1. A focused-start run counts toward mastery like any other attempt; the
   criterion it skips (`tubes`) is `na`, so it is left out of the process
   score rather than counted as missed (5.4b). The alternative is to record
   a focused run as practice that does not count toward mastery.
2. Teaching prompts are unscored (5.4d), logged and shown in the debrief.
3. Pace is the same for the whole scenario by default (3x); exam realism is
   a choice at launch or mid-run, not a separate "exam mode" that refuses
   3x.
4. Settled (Nick, 2026-11-09): focused runs count toward mastery as built, and exam realism stays a pace choice, not a separate mode. The 2025 ESC guideline was read against the tamponade sources (5.4d).

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
| **Treatment session** (REQ-232, 22.8) | Physical therapy: DPT now; NPTE-PT, NPTE-PTA and the ten ABPTS specialties later | Examine, choose tests and measures, treat and progress a patient across visits; vitals and red flags during exercise |
| **Security operations console** (REQ-231, 22.7) | Security: Security+ (SY0-701 and V8) now; CySA+, PenTest+, SecurityX, SecAI+ later | Triage alerts and logs during a live incident, contain, eradicate, recover, report; the attacker progresses on a clock |
| **Terminal and network** | Infrastructure: Tech+, Network+, Linux+, Server+, AutoOps+ | Diagnose and fix a broken network or server through a simulated shell (an authored fault tree, not an emulator) and topology; outages spread while you work |
| **Client session** (REQ-225, 22.5) | Mental health: EPPP, then NCE, NCMHCE and ASWB | Conduct a session with a client: ask, respond, intervene and document; rapport, distress, disclosure and risk move with each choice and with time |
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
`ipInCidr`, `sameSubnet` and record lookup over the topology; captures
are typed names inside the pattern's cases (4.1). A learner-added route
is a `routes` record (`dst` cidr, `via` ipv4); forwarding uses
`longestPrefixMatch` over that record list and over the static route
catalogue (command-time only), comparing `cidrPrefix` of the two results
(4.3), with no bitwise operators. Tabular
`show` output uses `TableView`. Anything not matched gets the action's
authored `unmatched` line ("command not available in this lab"), recorded
as a valid command, never a 400 and never an emulation. Outcome
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
executed. **End conditions read counters, never catalogues.** Conditions
such as "data altered beyond the fix" or "deleted beyond recovery" are
state counters (for example `rowsAlteredOutsideFix`, `rowsLost`,
`openQualityFlags`) that each action's effects compute **at command
time**, with catalogue aggregates, and write into state. Ending and
trigger `when` conditions read only those counters, because catalogue
aggregates are banned in anything evaluated per tick (endings, triggers,
processes, derived values; 4.3). Outcome profile `data`: `target` = the right root cause found
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

### 21.1 Re-review (2026-11-07)

A re-review found B3, S1, S2, S5 and S6 resolved and B1, B2, S3 and S4
partial. Each remaining item is closed below as a concrete spec change.
Items 1-12 had to be fixed before spec step 3 (the draft corpus, 17).
Items 17-20 were new issues; the review lead decided them and they are
recorded as decided. Repository facts were checked against the code
before use: `backend/lib/item-report.ts` (`case "lab"` at line 114, the
throwing default at 123-124), the route comment in
`backend/app/api/items/report/route.ts` (lines 13-16, which list neither
lab nor sim), 050's `kind::text` comment (lines 190-191), and PR #44's
`055_content_review_queue.sql` and `ATTEMPT_SOURCES` in
`lib/content-review-queue.ts` (on its branch). The prototype drivers
(item 20) live outside this repository and were taken from the review
lead, not re-checked here.

| # | Item (finding) | Resolution | Where |
|---|---|---|---|
| 1 | Checkpoints undefined (B2) | A checkpoint at *k* is Pre(k) plus the last applied seq, taken only at command boundaries, never strictly inside a skip, at most up to the larger of the last command's tick and `last_tick`. A later command stamped 300 applies on top of a checkpoint at 300, because Pre(300) excludes it | 5.3 Checkpoints, 7, 16 |
| 2 | `schedule.after` as an Expr (B2) | An Expr is sim seconds; `ticks = max(1, ceil(seconds / dt))`, capped at `maxDuration / tick + 1`; `dt` is an integer number of seconds | 4.1, 5.3 Timers |
| 3 | Timer `with` payloads unreadable (B1) | `TimerSpec.with` declares typed fields; `timer.with.<field>` and `timer.id` are names in the timer's effects and in `cancel … where` | 4.1, 4.3 Names, 5.3 |
| 4 | History start and short buffers (B2) | A sample at tick 0; `past` returns the oldest sample when the buffer is too short, `delta` and `trend` return 0 with one sample, and an empty buffer gives 0, never an error | 4.1, 4.3, 5.3 |
| 5 | `time_up` against "every terminal ending needs `when`" (B2) | `time_up` is the one engine-defined ending, reached by tick count only. It must have a class and must not have a `when`, and the lint says so | 4.1, 4.4, 5.3, 9.2, 16 |
| 6 | `openedSeq` for trigger-opened moments (S3) | `openedSeq` is the last applied seq when the moment opened. `openedTick` is sent and stored, and the server requires `openedTick` ≤ `last_tick` before grading | 7, 10 |
| 7 | Corpus frozen too early (B2) | The corpus is a DRAFT until 17 step 7 freezes it; only after the freeze does a hash change mean a new major | 5.3, 16, 17 |
| 8 | Command patterns underspecified (B1) | Per-pattern `cases` in the schema; captures are typed names inside their pattern's cases, plus `<paramId>.matched`; unmatched input runs the authored `unmatched` line as a valid command, never a 400 | 4.1, 4.3, 20.1 |
| 9 | No longest-prefix routing (B1) | Added `cidrPrefix`, `cidrNetwork` and `longestPrefixMatch(coll, ip, field)`; bitwise operators stay banned | 4.3, 20.1 |
| 10 | `trend` threshold implicit (B1) | `trend(h, seconds, threshold)`, with a positive literal or param as the threshold | 4.3, 8.2 |
| 11 | `pick`/`chance` missing from the whitelist (B1) | Added to 4.3, only in effect expressions. Each call draws exactly one value; evaluation order is fixed and short-circuiting is defined; stream counters are state | 4.3, 5.6 |
| 12 | Engine versioning (S4) | The document's `engine: {major, minor}` is a minimum. The app sends `engines: [{major, minor}]` and `renderers: [{type, level}]`, and the server filters by both (`engine_minor`, `renderer_level` stored per version) | 4.1, 4.5, 5.8, 5.10, 6, 8.2 |
| 13 | Skip span against the 20M request budget | Lint chosen over mid-skip resume: per-tick bound × the longest skip span must be ≤ 15,000,000. Mid-skip resume would need checkpoints inside a skip and would break the Pre(k) boundary rule | 4.3, 4.4, 7, 16 |
| 14 | Data console end conditions | End conditions read state counters computed at command time; catalogue aggregates are banned in endings, triggers, processes and derived values | 20.1 |
| 15 | S3 parity list incomplete | Added `item-report.ts` (`case "sim"`, a throwing default naming it), its route comment and a dbtest. The sim migration's check uses `kind::text`, as 050 does | 6, 9.5 |
| 16 | S6 rollback with nothing approved | While nothing is approved, rejecting the head unlists the sim; reverting the seed file is the real rollback | 6, 6.1 |
| 17 | Re-checking a source forced re-review (new; decided) | `checkedAt` and `recheckBy` are excluded from the content hash (and dropped from the client document); `cite`, `url`, `note` and the values stay in. The seed updates dates in place, which clears the stale report | 4.1, 4.5, 11.4, 12 |
| 18 | Critical reasoning criteria against the path search (new; decided) | The critical-miss lint covers command-derived criteria only. Reasoning criteria may be critical and still block Good through the rating rule; the lint never treats a reasoning grade as reachable state | 4.4, 9.1, 9.2, 16 |
| 19 | Where the engine types live (new; decided) | `engine/v1/types.ts` inside the engine folder; `backend/lib/sim/schema.ts` (zod) must pass a compile-time and runtime conformance test in CI | 4.1, 16, 17 |
| 20 | Golden-path drivers (new; decided) | Only `critical-care.html` has a `?test=1` hook; cloud and fitness use `test-cloud.js`/`test-fitness.js`; the project port needs a new driver in 1a step 5 | 16, 17 |

**Also updated (coordinator, 2026-11-07).** Migration 055 is now PR #44's
content review queue (REQ-142/143), and the unrestricted-access PR takes
056. The sim migration has no fixed number. It takes the next free number
at implementation time (currently 057), and 050's `kind::text` lesson
applies to it (6, 6.1, 9.5, 17). Per-sim learner signals plug into #44's
`content_review_queue` through a `sim` entry in `ATTEMPT_SOURCES` in
`lib/content-review-queue.ts`, which the signals job reads (6, 9.5, 17).

## 22. Phase 1b as built (REQ-190)

Nick ordered the app screen to ship with the code module (19.4 item 2), so
REQ-190 builds Phase 1b's server and the first version of the Phase 1c
screen together, for the tamponade case (CCRN, with the code module) and the
TicketBurst launch day (SAA base and SAP band). `SIMS_ENABLED` stays off by
default; with it off nothing here is visible.

**Migration 062** (`backend/supabase/migrations/062_sim_engine.sql`):
`sims`, `sim_versions`, `sim_reviews`, `sim_runs`, `sim_run_commands`,
`sim_run_reasoning`; attempt kind `simtask` with `attempts.sim_id` (no
foreign key) and `attempts_simtask_shape` comparing `kind::text`; the
`sim_run` assessment type (family `simulation`, weight 1.5, application
level, not unit-wide); RLS on every new table. Idempotent (a dbtest applies
it a second time); rollback notes in its header and rows in
`docs/deploy-runbook-integration.md`. The schema probe in
`lib/schema-status.ts` checks the tables, the column, the enum value, the
type and the check.

**Routes** (`app/api/sims/**`, thin over `lib/sims.ts`; every one 404
`sims_disabled` while the switch is off):

| Route | What it does |
|---|---|
| `GET /api/sims?trackId=` / `unitId` / `objectiveId` | The list: state, last rating, access (full / sample / locked), `runnable`. No review status (19.4 item 5). |
| `GET /api/sims/:id` | Brief, access, the open run, the latest finished run. |
| `POST /api/sims/:id/runs { restart?, deviceId?, cachedHash? }` | Start or resume; takes the lease (epoch + 1). Returns the run (seed, epoch), the client document unless the cached hash matches, and **every accepted command** (the app replays from tick 0). 409 `app_update_required` when the app cannot run the served version. |
| `POST /api/sims/runs/:runId/commands { leaseEpoch, commands[], tick?, stateHash? }` | The step route. Idempotent by seq (a changed resend is 409 `seq_conflict`), 409 `lease_lost`, `seq_gap`, `too_fast` (speed bound), 429 `sync_too_fast` (a heartbeat within 2 s), 413 `replay_budget`. Replays from the run's checkpoint; an illegal command is refused with its seq and the legal prefix is kept; a new checkpoint (Pre(k) at a command boundary, at least 300 ticks on) is stored; a client hash that differs from the server's at the same tick counts a desync. |
| `POST /api/sims/runs/:runId/skip { leaseEpoch, seq, tick, timer?, instance? }` | Skip to a pending wait (the named one, else the soonest). The server builds the skip command to its own due tick, stores it and returns it; the app applies that command. |
| `POST /api/sims/runs/:runId/reasoning { momentId, openedSeq, openedTick, answer, clientAttemptId }` | Grades one written-reasoning moment (10): only where the server's replay shows the moment open at `openedTick` with `openedSeq` the last command (else 409 `replay_behind`); replay by client id; one grade per moment; the lab grader, claim, rate limit and allowance; `grader_failed` after three failed model calls. |
| `POST /api/sims/runs/:runId/finish { leaseEpoch, tick? }` | The submit route. Replays from tick 0 (advancing real time to `tick` when the ending came with no command), refuses 409 `not_ended`, scores, and records one `simtask` attempt for a terminal ending with the rating as verdict. A learner quit records nothing and marks the run abandoned. Idempotent. |
| `GET /api/sims/runs/:runId/debrief` | The stored debrief. |

The app sends its capabilities as `x-sim-caps:
protocol=1;engine=1.0;renderers=bedside@3,board@3` (engine=1.1 since REQ-209, 5.4f). Access uses the `sims`
feature key (Pro; one sample per course on Free and Plus). A clinical or
fitness sim needs the study notice on every run route.

**The app** (`mobile/app/(app)/course/[trackId]/sims.tsx` and
`sim/[simId].tsx`, `mobile/src/sim/`): vitals tiles (bedside), the
architecture topology from `screen.board` (8.2), waits as "Skip to" or
"Advance to" buttons, the action groups with their parameter sheets
(choices, forms, slot placement, typed commands), decision cards and the
written-reasoning box (both stop the clock), the event log, and the
debrief. The pure parts are tested under `node --test`
(`src/sim/runtime/`): the frame clock (5.4), the announcement policy
(13.2), the view model, the local session and the tap pad.

**Compressions.** The tap pad measures the rate and the longest pause from
tap timestamps on the app's monotonic clock and sends `cpr <rate> <pause>`
as integers every 15 s while tapping and when the learner stops (19.4 item
3). The non-tap alternative is the module's paced form, offered beside the
pad and named on the pad when a screen reader is on; the run records which
mode was used, so the two are scored and reported apart (4.8).

**Objectives.** The seed resolves a document's objective by exact title in
its course. The tamponade document's title was not in the CCRN catalog, so
it now names "Care of the patient after cardiac surgery" (the case is a
post-CABG tamponade managed by re-exploration, with the cardiac-surgery
arrest protocol), with the CCRN tamponade and hemodynamic-monitoring
objectives as secondary. The TicketBurst base's three secondary objectives
now name AWSSAA catalog titles. `lib/sim/objectives.test.ts` pins this.

**Not built yet** (what is left of Phase 1b and 1c):

- `GET /api/sims/runs/:runId` and `POST .../lease` (resume and takeover go
  through the start route, which takes the lease), and the
  acknowledgement route (the study notice replaced it, REQ-165).
- The `coach-guard.ts` case (a running sim as an open item the coach must
  not answer), the `sim_version_daily` view, the stale-sources report, and
  a sim-specific review CLI. (The `sim` item kind and reporting are built:
  REQ-199 below.)
- Offline play measurement beyond `offline_ticks`, the per-minute command
  cap (a heartbeat is limited to one per 2 s; commands are limited per
  request and per run), and the observability counters.
- In the app: the web idle auto-pause, keep-awake, waveforms, the cached client document across app
  launches, and the manual accessibility pass on devices (VoiceOver,
  TalkBack, web at 400 px, 200% text). The run starts paused, leaving the
  app pauses it, and a frame gap over 3 s pauses it.

### 22.1 Follow-ups as built (REQ-199)

**The on-device command journal** (5.9; `mobile/src/sim/runtime/journal.ts`,
pure; `mobile/src/sim/journalStore.ts`, storage; wired in
`mobile/src/sim/useSimRun.ts`). Every command is written to device storage
with its seq and tick before it is sent: AsyncStorage on native, and
`window.localStorage` directly on web (synchronous, so the write lands
before the request leaves). Every storage call is wrapped; a blocked or full
store leaves the run working as before, from memory. The key is
`ascendra.simJournal.<userId>.<simId>`, so the logout sweep
(`src/lib/localData.ts`) removes it and the logout guard stops a late write
putting it back. Each acknowledgement (`acceptedThrough`) rewrites the
journal with what is still unsent; an empty journal is removed; writes for
one key are serialised so a removal is never overtaken by an older save.
Sends are cut to 500 commands per request (the step route's limit).

On "Continue the run" the app reads the journal, takes the lease through
the start route, and compares (`planJournal`):

| What the server returned | What happens | What the learner reads |
|---|---|---|
| Same run, open, same version and client hash; the journal's first unsent seq is `lastSeq + 1` and not behind the server's tick | Replay: the unsent commands are applied locally on top of the server's and sent through the step route (an identical resend of a stored seq is accepted) | "Restored N actions made before the app closed; sending them to the server." |
| Every journaled command already stored | Journal removed | nothing |
| Another run, or the run ended (finished, quit or restarted elsewhere) | Discarded | "This run ended on another device or was restarted, so N actions made here ... could not be added to it." |
| Another sim version or client document | Discarded | "This simulation was updated since you last played ..." |
| A different command at a stored seq, or the server's clock past the first unsent command (another device ran the run on) | Discarded | "This run continued on another device, so N actions made here that had not been saved yet were dropped." |

While a run is live, a 409 `lease_lost` drops the journal with the same
plain notice; `run_ended` drops it and shows the stored debrief if there is
one; `seq_conflict`, `seq_gap`, `too_fast` and a refused command drop it and
reload from the server, so a journal the server will never accept cannot
loop. A notice that announces a reload now survives the reload (it used to
be cleared by it, FAIL-790). Tests: `mobile/src/sim/journal.test.ts` (kill
mid-run, duplicate replay, stale journals, write order, storage failures,
the logout guard) and, against Postgres, `backend/lib/sims.dbtest.ts`
"journal replay through the step route".

**Updates.** `/sim/` is on the over-the-air reload protected list, now in
`mobile/src/updates/protectedRoutes.ts` so it can be tested; the sims list
(`/sims`) is not.

**Report a problem on a sim** (migration 067). The `sim` item kind joins
042/050's pipeline. The item is the **sim version** (`sim_versions.id`):
`POST /api/items/report { kind: "sim", runId, tick?, stateHash?, reason?,
note? }` resolves the version from a run the learner owns (404 for another
learner's run, and while `SIMS_ENABLED` is off; the study notice applies).
The learner's words stay in `item_flags.note`; the machine data goes in the
new `item_flags.context` (sim id, version id and number, run id and status,
the tick and state hash the app showed, the server's last tick and hash,
the engine version; at most 2000 bytes). A malformed tick or hash is stored
as null. No automated re-check (as labs). Reports join the content review
queue (`ATTEMPT_SOURCES.sim` counts finished runs per version for the
correct-rate signal). Quarantine (three learners) or a confirmation pulls
that version: `servedVersion` skips it, so new runs get the next approved
version or none. `confirmItemWrong` voids every scored attempt of that
version (through `sim_runs.attempt_id`); a run finishing on a confirmed
version records no attempt, and resuming an open run on one starts a new
run on the version served now. A quarantined version's open runs carry on
(a later confirmation voids them). `npm run items -- confirm sim
<versionId> "<note>"` works as for the other kinds. "Report a problem" is
on the sim screen (it sends the tick and hash at the moment of sending)
and on the debrief.

### 22.2 Pace, focused start, the skip offer, teaching prompts and chapters as built (REQ-209)

Design in 5.4a to 5.4f. What was built:

- **Engine** (`lib/sim/engine/v1/`, copied to `mobile/src/sim/engine/v1/` by
  `npm run sim:sync-engine`): `ENGINE_MINOR` 1; commands `pace`, `begin`,
  `teach`, `chapter` and `skip { calm }`; `Run.pace`, `paceTicks`,
  `focusedAt`; `lastLoggedPace`, `minWallSeconds`, `calmSkip`,
  `teachingDue`, `chapterDue`; the debrief fields `pacing`, `focusedStart`,
  `calmSkips`, `teaching`, `chapters`. The validator adds the structure
  rules, `FEATURE_MINOR`, and `pacingRules` (a running phase and a clinical
  or fitness family; `begin` reachable on three seeds; every chapter and
  teaching prompt reached by a golden path). Golden `expect` gains
  `minWallSeconds` and `focusedAt`.
- **Server** (`lib/sims.ts`, `lib/sim/server-run.ts`): `RunPayload.pacing`
  (`eligible`, `studyPace`, `examPace`, `defaultPace`); 400
  `pacing_not_available`; 409 `no_offer`; the paced speed bound at sync and
  finish; the open-run guard for old apps. **Migration 073** (5.4f).
- **App** (`mobile/src/sim/`): `runtime/pacing.ts` (pure), the launch card,
  pace control, skip offer, teaching card and chapter card in `SimPanels.tsx`,
  wired in `useSimRun.ts` and the sim screen. 48 dp targets and spoken labels
  throughout.
- **Tamponade** (`tamponade-after-cabg.sim.json`, engine minor 1): the
  focused start, three chapters, four teaching prompts, `q15check` marked
  routine, and the `tubes` row for a focused start. New goldens `expert3x`
  and `focused3x` are appended to its golden file; the ten existing paths are
  unchanged. TicketBurst (AWSSAA, AWSSAP band) got nothing and its documents
  and goldens are untouched.
- **Run lengths** of the expert path (real time at the screen, excluding
  reading and typing; 7,200 further sim ticks are skipped waits that cost no
  real time): 1x, 2,580 ticks = 43.0 min; 3x, 860 s = 14.3 min; 3x with the
  focused start, (2,440 - 780) / 3 = 553 s = 9.2 min.
- **Tests.** Engine and server: `lib/sim/pacing.test.ts`,
  `lib/sim/idle.test.ts`, the schema conformance and golden tests;
  `lib/sims.dbtest.ts` "pacing (REQ-209)" and the 073 schema test; app:
  `mobile/src/sim/pacing.test.ts`.
- **Not built.** A PT treatment-session sim and a fitness client-trainer
  change: no PT or fitness `running` sim exists in this codebase (the fitness
  client trainer is turns with a 1-day tick, so it needs nothing); the
  engine features apply to a new one by declaring them. A family
  interruption: no people layer.

### 22.3 Three more CCRN Adult cases (REQ-222, batch S2a)

Nick, 2026-11-10: "Sims seem to be vital to learning", quality over speed.
Three scenarios on the existing bedside renderer and engine 1.1, with no
engine, renderer or schema change and no migration. Each has a reasoning
moment, every outcome class reachable, critical criteria inside its
`target` condition, KPIs, an expert path, a debrief per ending, sourced
teaching prompts (unscored) and chapters. All run in one `running` phase,
so study pace (3x) and the skip offer apply as in 5.4a and 5.4c.

| Scenario | Objective | Endings (class) | Critical criteria |
|---|---|---|---|
| `sepsis-to-septic-shock` | Early sepsis identification and sepsis management | arrest (harm), stabilized (target), stabilizedLate (recovered), time_up: still in shock at 2.5 h (harm) | antibiotic within 1 h; early SBAR |
| `dka-first-six-hours` | Diabetic ketoacidosis (DKA) | arrhythmia, seizure (harm), resolving (target), time_up at 6 h (recovered) | K 3.5 or more before insulin; dextrose below 250 with insulin kept running |
| `acute-ischemic-stroke-lvo` | Stroke, hemorrhagic and ischemic, and neuroendovascular interventions such as coiling and thrombectomy | bleed (harm), toThrombectomy (target), toThrombectomyLate (recovered), time_up: no thrombectomy at 3 h (harm) | glucose before thrombolysis; BP below 185/110 before it; thrombectomy call at the CTA read |

- **Registration.** Documents are listed in `lib/sim/documents.ts`
  (`ALL_DOCUMENTS`); section 12's `seed/sims/index.ts` does not exist. The
  objectives already exist in `seed/tracks/ccrn.ts`; none was added.
- **Golden paths** are driver scripts (`scripts/sim-golden/sepsis.steps.ts`,
  `dka.steps.ts`, `stroke.steps.ts`; `npm run sim:golden -- steps <name>`),
  five per case: the expert path (Good), a slow-but-safe path (Mediocre) and
  failure paths covering Mediocre and Bad. Expectations are the engine's own
  results; there is no prototype to compare with.
- **No focused start.** In all three the patient needs action from the
  first minute (falling MAP, a potassium trap, a stroke alert), so there is
  no quiet stretch to skip; an evolved start would only remove the
  learner's first decisions.
- **Sources** carry `checkedAt` 2026-11-10 and say how each number was
  read. Read in primary text: the 2024 hyperglycemic-crises consensus
  (Diabetologia copy), parts of the 2026 AHA/ASA acute ischemic stroke
  guideline, the JBDS 2023 pathway and the Target: Stroke Phase III goals.
  Read through secondary summaries only: the 2026 Surviving Sepsis Campaign
  guideline (the publisher refused the fetch) and the SSC 2021 and Hour-1
  bundle details. Authored teaching-model numbers say so, and the ones that
  stand in for a probability or a missing guideline number carry `FLAG`
  (sepsis: fluid effect fading within the hour; DKA: the 100 mg/dL per hour
  limit and the ketone fall rate; stroke: a bleed made certain by BP above
  the thresholds, labetalol and nicardipine effect sizes).

### 22.4 Batch S2b: post-op hemorrhage (CCRN Adult), choking and a fall (CNA) (REQ-223)

Three new documents on the existing bedside renderer and engine 1.1; no
engine, renderer or schema change. Each has sourced params with `checkedAt`
2026-11-10 (or an older date where a number was relayed from the course seed
and not re-read, said in its note), a reasoning moment, every outcome class
reachable, critical criteria inside the `target` condition, KPIs, an expert
path, debriefs, teaching prompts with sources (indirect evidence marked
`FLAG` in the note), and goldens built by `npm run sim:golden -- steps
<bleeding-whipple|resident-chokes|resident-floor>`.

- **CCRNADULT/bleeding-after-whipple** (objective: tracing shock through its
  stages). A slipped tie in the operative bed bleeds 40 mL/min, faster with
  dilutional and hypothermic coagulopathy. Vital signs follow the ATLS class
  anchors; the hemoglobin lags (whole-blood loss, then refill and dilution).
  The learner checks the drains, pages the surgeon (SBAR), requests
  emergency-release blood, activates the massive transfusion protocol
  (blocked without the surgeon's order), keeps crystalloid to a short bridge,
  gives plasma with red cells, warms him and replaces calcium. Blood products
  and norepinephrine need the surgeon's order; crystalloid up to 1 L is a
  standing order. Endings: arrest (harm), to the OR early (target), to the OR
  by a slower route (recovered); `time_up` is harm. Focused start at 18:08;
  chapters at the surgeon's arrival and the first cooler. The permissive
  target is taught as a prompt, not scored: the 80-90 mmHg evidence is from
  trauma.
- **CNA/resident-chokes-at-lunch** (objective: the Heimlich maneuver). Aide
  scope only, as a stand-alone scenario: a band (4.7) patches another
  course's scenario, and no aide-scope base exists. Mild choking (let him
  cough), then severe: call for help without leaving, cycles of 5 back blows
  and 5 abdominal thrusts (AHA 2025), CPR from compressions and look before
  breaths if he goes limp, blind sweeps and water penalized, objective report
  and note. Endings: cleared while awake with help called (target),
  breathing again by a harder route (recovered), too long without air (harm).
- **CNA/resident-found-on-floor** (objective: safety and emergency
  procedures). Don't move her, call the nurse without leaving, tell her to
  stay still, blanket and gentle pressure on a skin tear, objective report
  with the care plan's blood-thinner flag, vital signs when the nurse asks,
  report a change in alertness at once, then an objective note and the
  universal fall precautions at the huddle (a stopped `after` phase).
  Endings: moved or got up (harm), safe handoff (target), handoff with gaps
  (recovered).
- **Pacing.** CNA sits under `nursing-licensure` in `healthcare-nursing`, so
  `labFamilySql` gives `clinical` and both CNA sims get study pace (3x) by
  default (checked on a seeded database). At 3x the choking crisis (about
  100 s from a silent cough to collapse) plays in about 35 s of real time;
  Exam realism (1x) and pause stay available.
- **Seed fix (FAIL-1190).** `earliestRecheck` added months without clamping
  the day, so a source checked on 2026-10-31 gave 2027-04-31 and Postgres
  stopped the seed. `addMonths` in `lib/sim/content-hash.ts` now clamps to
  the month's end. The engine's own copy in `validate.ts` (staleness warning
  only, string comparison) has the same arithmetic and was left alone, since
  engine changes were out of scope.

### 22.5 The client session and the first EPPP cases (REQ-225)

Nick approved the people layer on 2026-11-10 ("Sims seem to be vital to
learning"; quality over speed). The client session is the eighth row of 20:
mental-health courses (EPPP now; NCE, NCMHCE and ASWB later) where the
learner conducts a session with a fictional client.

**The renderer** (`screen.type: "session"`, `session@1`, behind
`SIMS_RENDERERS`, on by default). `SessionPanel` (`mobile/src/sim/SimPanels.tsx`)
shows the client's name and how they present now (a template over state),
what they said last, each client state as a word with a bar (rapport:
guarded, warming, engaged; distress: settled to overwhelmed; disclosure:
saying little to speaking freely), "What you know so far" (notes; an alert
note has a border and the word "Alert") and the record so far. Questions,
responses, plan steps and documentation are the scenario's action groups
(Open, Ask, Ask about risk, Respond, Plan, Close; after the session,
Document). The view model is `sessionView`/`sessionNews`/`sessionAlarmTexts`
in `src/sim/runtime/view.ts`. Accessibility as the bedside and board: every
block is one accessible element with its state in words, 48 dp targets,
"Read the client" speaks the whole panel, an alert note is announced at once
like an alarm, a gauge moving into another word and a new note are announced
politely (the announcer's `news`, at most one polite sentence per 10 s),
keyboard order on web is the order on screen. JS only, so it can ship over
the air; an app without `session@1` is told to update (5.10).

**Pacing: learner-paced, not the clinical rule (5.4a).** The clinical rule
(a running phase at 3x) exists because physiology moves whether or not the
clinician acts. A client's state in a talk session moves with what the
clinician says, and a real-time clock while the learner reads a client's
answer would score reading speed and race screen-reader users. So the
session phase is `turns`: each exchange shows the client's answer at once
and schedules the conversation wait ("Let the conversation continue (about
3 min)"), which moves the session clock by the minutes that kind of exchange
takes; the next question waits for it. Time still matters: the hour ends at
50 minutes (a trigger moves to the after-session phase and opens the written
formulation), and high rapport settles distress per minute while low rapport
frays it (processes). With no running phase, pace, the focused start, the
skip offer, 5.4d teaching prompts and chapters do not apply.

**Outcome profile `clinical-session`** (9.2): defaults `allianceTarget` 6,
`allianceRecovered` 3, `safetyWindow` 1200 s; `noProgress` per case.

**Cases** (`backend/supabase/seed/sims/EPPP/`, objective titles exactly as
the EPPP course defines them; the seed resolves course code + title and
says plainly when the course or an objective is missing):

| Slug | Objective | Core of the case |
|---|---|---|
| `suicide-risk-safety-plan` | Assess suicide risk and plan safety in a clinical interview | A positive PHQ-9 item 9: ask directly (C-SSRS screen questions), method, intent, plan, behavior, means; a Stanley-Brown plan with the handgun moved out; moderate risk, outpatient, a 48-hour check |
| `duty-to-protect-threat` | Apply duty-to-warn and duty-to-protect obligations | A vague remark that hides an actual threat (Washington): explore first, then warn the person and notify police with the threat only (RCW 71.05.120(3); Volk v. DeMeerleer; APA 4.04, 4.05) |
| `diagnostic-intake-mood` | Conduct a diagnostic intake using DSM-5-TR criteria | A major depressive episode plus a past hypomanic episode found only by a behavior-based screen: bipolar II, current episode depressed; rule-outs, a suicide screen |

Each has one written-reasoning moment, endings in all three classes,
criteria with at least three critical, KPIs, an expert path, a debrief per
ending, and five or six golden paths (Good, Mediocre, Bad; every ending but
`time_up` and every criterion both met and missed), built by
`npm run sim:golden -- steps eppp-suicide|eppp-duty|eppp-intake`. Each
carries one unscored prediction as a decision card (below). Sources are on
each document with `checkedAt` 2026-11-10.

**Findings against this design** (20: recorded, not worked around):

1. **The screen spec and the profile list are in the engine folder.** The
   session needed `screen.session` and the `clinical-session` profile in
   `engine/v1/types.ts` and the validator, as the board's bindings did in
   REQ-190. Display and lint only: stepping, the corpus and every existing
   hash are unchanged, and no engine minor was added (an older app is held
   back by the renderer level instead).
2. **Endings ran in jsonb key order on the server (FAIL-1221, FAIL-1222;
   fixed in REQ-227, 22.6).** The engine evaluated endings in `Object.keys`
   order, but `sim_versions.document` and `client_document` are jsonb, which
   returns keys shortest first, then bytewise. A document whose endings rely
   on first-match precedence ended differently in production than in its
   goldens. The EPPP cases use mutually exclusive conditions;
   `lib/sim/storage-order.test.ts` replays every golden path in jsonb order.
   The tamponade case failed it (`code_rosc` ran before `code_epiHarm`);
   22.6 gives endings an explicit order.
3. **Teaching prompts (5.4d) exist only for running phases.** A turn-based
   session cannot declare them, so each EPPP case carries its one
   prediction as a decision card (`prompts`) opened once by a trigger,
   with feedback and the source in the text and no criterion reading it.
   The debrief lists it in "What you did", not under "Your predictions (not
   scored)".
4. **Safety family.** The seed derives it from the EPPP course's category
   (`healthcare*` is clinical, otherwise general); the linter's
   `safetyFamilyOf` reads the profile and treats `clinical-session` as
   general. Pacing does not apply either way; the study-notice gate does
   only if the course sits in a `healthcare*` category.
5. **The "a wait is pending at every boundary" warning** fired for every
   path that never entered a running phase (FAIL-1220); it now needs one.

### 22.6 Explicit ending order, engine 1.2 (REQ-227, FAIL-1222)

Nick approved the engine approach on 2026-11-10. What changed:

- **`endingOrder`** (4.1, 4.5, 5.3): a list of the endings that have a `when`,
  checked in that order, first true wins. The engine reads it, so no key
  order can change a result. Engine minor 2 (`ENGINE_VERSION` 1.2). A
  document without it is stepped as before, so every older version row,
  golden hash, checkpoint and stored run replays unchanged; the v1 corpus
  gained one case (`endings-explicit-order`) and no existing hash moved.
- **Validator** (`validate.ts`, `endingOrderRules`): from minor 2 a document
  with two or more endings that have a `when` must list every one exactly
  once; `time_up`, unknown ids, duplicates and a list below minor 2 are errors.
- **Lint rule** (`lib/sim/lint.ts`, `endingOrderProblems`): a document with no
  `endingOrder` is replayed with its keys as written, reversed and in jsonb
  order; a golden path that ends differently in any of the three is an error
  ("an ending set whose result depends on key order"). It found a real case
  in the code/ACLS module's fixture host. Only golden paths are searched, so
  a new document declares `endingOrder` instead of relying on the rule.
- **Modules**: `code-acls@1` lists `code_noRosc`, `code_epiHarm`, `code_rosc`
  in its fragment; they are appended after the host's list, minus an ending
  `$onlyIf` dropped, and only when the host declares an order.
- **Migrated**: every seeded document (12, including the SAP band, which
  inherits the base list) and the module fixture host declare minor 2 and the
  order their author wrote the endings in, which is what the golden paths
  were written against. Behavior changes: tamponade's full-dose epinephrine
  path reaches `code_epiHarm` (harm) on the server and in the app. Nothing
  else was observed to change (every golden path is unchanged, in the file,
  jsonb and reversed key order).
- **Compatibility.** A new document hash means a new version row, seeded as
  `needs_expert_review`; the sims re-enter review. An app whose engine is
  still 1.1 cannot run a minor-2 version and falls back only to an approved
  version it can run (5.10); with none it is told "Update the app". A run
  already open stays on the version it pinned, so an in-progress tamponade
  run keeps its old (jsonb) order until it ends; new runs get the new version.
- **Not fixed (FAIL-1250).** The same flaw exists in the `teaching` map
  (`teachingDue` offers the first due prompt in key order). It is harmless
  while the app and server read the same jsonb order, and the storage-order
  test leaves that one map out of its reversal. A `teachingOrder` list would
  be the same kind of minor.

### 22.7 The security operations console and the Security+ incidents (REQ-231)

Security+ is a launch course, so its sims come first on the seventh renderer
of 20. The screen is `screen.type: "security-console"`, `security-console@1`,
behind `SIMS_RENDERERS` and on by default
(`bedside,board,session,security-console`). The design's placeholder type
`security` stays unused.

**The renderer** (`ConsolePanel`, `mobile/src/sim/ConsolePanel.tsx`; view
model `consoleView`/`consoleNews`/`consoleAlarmTexts`/`consoleSentence` in
`src/sim/runtime/consoleView.ts`). Three blocks in reading order:

- **Alert queue**: the alerts whose `when` holds, open ones first, then
  newest first by `at` (sim seconds), then by severity. Each shows a
  severity word and color, the time, a status in words and an optional
  detail.
- **Assets**: hosts, accounts and cloud identities, each with a kind, a
  status in words and a tone (`ok`, `watch`, `bad`, `held`) read as
  "normal", "under watch", "compromised", "contained". Meters (the
  attacker's stage, the case file, encryption or spend) sit under them.
- **Logs and events**: the lines whose `when` holds, newest first, at most
  40, each with the log it came from (sign-in log, EDR, audit trail).

Containment and investigation are the scenario's action groups (Investigate,
Contain, Evidence, Recover, Communicate, Wait, Close; after the incident,
Report), drawn by the shared `ActionBar`: isolate a host, disable an account,
block an indicator, preserve evidence, escalate and notify are actions with
`choice` or `form` params, so the panel holds no rule.

**Accessibility**, equal to the bedside, board and session: every alert,
asset, meter and log line is one accessible element whose label says its
state in words (severity and tone are a word plus a color, never color
alone); every element is at least 48 dp; "Read the console" speaks the open
alerts, every asset in words, the meters and the newest line. An open alert is
spoken at once, like a monitor alarm ("High severity: ..."), and again as
cleared when it closes; an asset's tone changing, a closed alert's new status
and new log lines are polite news through the announcer (at most one polite
sentence per 10 s), with a burst of lines summarized as one sentence ("3 new
log lines. Newest: ..."). Keyboard order on web is the order on screen
(queue, assets, logs, then the actions). JavaScript only, so it ships over the
air; an app without `security-console@1` is not offered these sims and is told
to update (5.10).

**Bindings** (`screen.console` in `engine/v1/types.ts`, the zod schema and
`validate.ts` `consoleCheck`): `alerts` (`severity` one of critical, high,
medium, low; `title`, `detail`, `status` templates; `when` and `open` bools;
`at` a number), `events` (`source`, `text`, `when`, `at`), `assets`
(`label`, `spokenLabel`, `kind`, `status`, `tone` an enum expression over the
four tones), `meters`. Ids are unique across the three lists. Display and lint
only: stepping, the corpus and every existing hash are unchanged, and there is
no engine minor (an older app is held back by the renderer, as for the
session).

**Pacing: learner-paced, with the attacker on the analyst's clock.** An
incident does evolve on its own clock, unlike a talk session, so the question
was study pace (3x) versus real time. Neither: a running phase at 1x would
score how fast someone reads log lines and race screen-reader users, and 3x
only shortens that; the clinical pacing rule (`pacingEligible`) is for bodies
that change on their own, and Security+ is a general-family course where the
server refuses pace commands anyway. What Security+ tests is the order and
choice of analyst actions (contain before eradicating, preserve before
wiping, scope before closing), so the incident phase is `turns`: each task
costs the analyst minutes it would take (a sign-in review 5, isolating a host
2, a memory capture and disk image 15, a rebuild 20) through one `work` wait
("Let the work finish"), and the attacker's steps are triggers on the same
sim clock. Investigating for 20 minutes before containing lets the attacker
build persistence or move laterally exactly as waiting 20 real minutes would,
without timing the learner's reading. A "Keep watching the console (10 min)"
action lets time pass on purpose. An attacker step stops the skip early
(`interruptsSkip`) so the new alert is seen at the minute it happens. With no
running phase, the focused start, the skip offer, 5.4d teaching prompts and
chapters do not apply. The attacker's step times are the author's, set against
CrowdStrike's 2026 average eCrime breakout time of 29 minutes, which also
sets the cases' tightened `containWindow` of 30 minutes.

**Outcome profile `security`** (9.2): defaults `containWindow` 3600 s and
`containSpread` 0; `noProgress` per case.

**Cases** (`backend/supabase/seed/sims/SECPLUS/`, each also a V8 band in
`SECPLUSV8/` that changes only `objective` and `secondaryObjectives`, so
SY0-801 learners get the same incident on the V8 objective):

| Slug | SY0-701 objective | SY0-801 objective (band) | Core of the case |
|---|---|---|---|
| `phish-to-account-takeover` | Application, cryptographic, and password attacks and their indicators (2.4) | Given authentication logs, identify credential attacks | Impossible travel and an approved MFA push: disable and revoke (a reset alone leaves the session), find the second recipient, block the domain, keep the message and logs before purging, remove the inbox rule and the added authenticator; else payment fraud at 75 min |
| `ransomware-file-server` | Incident response activities as SY0-701 names them (4.8) | Containment (quarantine/isolation), negotiation, and eradication/recovery | Network-isolate FS01 (power off only if it cannot be disconnected), disable the abused service account and isolate patient zero before it reaches the backup server, memory then disk before the rebuild, restore last night's backup after a scan, report to the FBI and CISA, do not pay |
| `cloud-iam-backdoor` | Identity and access management: provisioning/de-provisioning user accounts... (4.6) | Given a scenario, manage the account life cycle | A pipeline key leaked to a public repository made an administrator: deactivate the key, quarantine every identity it made (an IP block does not contain it), snapshot before terminating the miners, then eradicate and move the pipeline to a short-lived role; else customer data copied out at 55 min |

The three SY0-701 objectives meet the generator's selection rule
(`isPerformanceObjective`, a performance verb in the title); two of the V8
titles ("Given ... identify ...", "Containment ...") do not match that
rule's word list although they are the matching V8 objectives, so the bands
follow the topic, not the rule (a decision for Nick).

Each case has one written-reasoning moment, endings in all three classes and
an `endingOrder` (harm endings first), three or four critical criteria, KPIs,
an expert path, a debrief per ending, and six golden paths (Good, Mediocre,
Bad; every ending but `time_up` and every criterion both met and missed),
built by `npm run sim:golden -- steps secplus-phish|secplus-ransomware|secplus-cloud`
and the `-v8` variants. Sources are on each document with `checkedAt`
2026-11-11: NIST SP 800-61 Rev. 3 (April 2025, the current revision; it
replaces the Rev. 2 life cycle with the CSF 2.0 Functions, while Security+
still names the older phases), the CISA incident response playbooks (2021),
the #StopRansomware Guide (2023), the CompTIA SY0-701 objectives (v5.0) and
V8 page, vendor guidance for the account and cloud steps (Microsoft Learn,
AWS re:Post, named in the sources but not in the scenarios), and CrowdStrike's
2026 Global Threat Report. Every address and domain is a documentation range
(RFC 5737, RFC 2606).

**Findings** (20: recorded, not worked around):

1. **The capabilities header dropped a hyphenated screen type
   (FAIL-1320).** `parseCaps` accepted `[a-z]{1,20}`, so
   `security-console@1` was silently ignored and the server would have told
   every app to update. It now accepts a lower-case letter followed by up to
   39 letters or hyphens (the `screen_type` column is 40).
2. **The document schema could not name 17 catalog objectives
   (FAIL-1321).** `objective` was capped at 400 characters; SECPLUS titles
   run to 586 and a sim is registered by exact title. The cap is now 1000; a
   test checks every catalog title fits.
3. **The screen spec and the profile list are in the engine folder** again
   (as for the board and the session): display and lint only, no minor.

### 22.8 The PT treatment session and the first DPT cases (REQ-232)

**The renderer** (`screen.type: "treatment-session"`, `treatment-session@1`,
behind `SIMS_RENDERERS`, on by default). `screen.treatment` holds the
patient's name and presentation (a template), the vitals (the bedside tile
type, `VitalTile`, so alarms, bands, `hiddenUntil` and units work as on the
monitor; the validator checks them with the same `tileChecks`), `activity`
(what the patient is doing and how they move now), `measures` (each shown
once `when` holds; `flag` marks a red flag), `dosage` (the interventions
given, with their dose) and `rules` (the stopping and escalation rules,
always shown; `met` marks one crossed now; at least one is required).
`TreatmentPanel` (`mobile/src/sim/SimPanels.tsx`) sits above the vitals;
the view model is `treatmentView`, `treatmentAlarmTexts` and `treatmentNews`
in `src/sim/runtime/view.ts`, and `tileViews` reads the treatment vitals
when there is no bedside. Accessibility as the bedside, board and session:
every block is one accessible element with its state in words ("met now",
"not met", "Red flag"), never colour alone; a met rule or a red flag is
announced at once like an alarm; a new result, a change of activity and a
new dosage line are announced politely (the announcer's one sentence per
10 s); "Read the patient" speaks the vitals, activity, rules met and
results; 48 dp targets; web keyboard order is the order on screen. JS only,
so it ships over the air; an app without `treatment-session@1` is told to
update (5.10). Authors should change `activity` in steps, not every tick, or
the polite queue fills with stale sentences.

**Pacing: the clinical rule applies.** Heart rate, blood pressure, SpO2 and
breathing move on their own while a patient exerts and recovers (the acute
care guide's 10 beats/min and 10 mmHg per MET, recovering in 3-5 minutes),
and a stopping rule is about how long the clinician lets a bad value run.
That is the bedside situation, not the client session's (22.5), so each case
runs in a `running` phase; DPT sits under `healthcare-nursing`, so the seed
derives `clinical`, `pacingEligible` holds and study pace (3x) is the default
with exam realism (1x) and Pause available. Tests that take minutes (the Berg,
orthostatic vitals) are waits the learner can skip. The TKA case's three days
between visits are a `turns` phase with one wait.

**Outcome profile `physical-therapy`** (9.2): `stopWindow` 120 s,
`spo2Floor` 88%, `escalateWindow` 900 s; the cases tighten them where the
patient calls for it (ICU 5 min to call the team for a new rhythm; stroke
30 s to sit him down when light-headed; SpO2 90% without lung disease).
`safetyFamilyOf` reads the profile as clinical.

**Cases** (`backend/supabase/seed/sims/DPT/`, golden paths built by
`npm run sim:golden -- steps dpt-icu|dpt-tka|dpt-stroke`). Objectives are
DPT catalog titles chosen by the 12 step 1 rule (tested by recognition and
action over time):

| Slug | Objective | Endings (class) | Critical criteria |
|---|---|---|---|
| `icu-early-mobility` | Selecting and performing interventions for cardiovascular and pulmonary conditions to achieve patient goals | rapidResponse (harm), chairSafe (target), chairGaps, backInBed (recovered) | safety screen before standing; activity eased within 2 min of SpO2 below 88%; team called for a new rhythm |
| `tka-gait-dvt-red-flag` | Total knee arthroplasty rehabilitation per the 2026 APTA guideline (...) | peMissed, sentHome (harm), referredSameDay (target), peCaught, referredNoRehab, referredGaps (recovered) | screened before loading on Thursday; no leg exercise or calf massage once a clot is suspected; same-day call to the surgeon; 911 at once for lung-clot signs |
| `stroke-balance-fall-risk` | Selecting and performing interventions for neurological and musculoskeletal conditions | fell (harm), safePlan (target), noWalking, planGaps (recovered) | gait belt whenever upright; sat down within 30 s of light-headedness; the orthostatic drop and the new tamsulosin reported to his physician |

Each has one written moment, KPIs, an expert path, a debrief per ending,
`endingOrder` (engine minor 2), two chapters or teaching prompts where a
wait allows, and six golden paths (Good, Mediocre, Bad; every ending but
`time_up` and every criterion met and missed).

**Sources** carry `checkedAt` 2026-11-11 and say how each was read. Read in
primary text: the APTA acute care vital sign guide 2021 (through a text
extraction of the PDF), Hodgson 2014 (a hosted copy; its figures were not
readable, so no HR or MAP limit is taken from it), the 2026 TKA CPG, the 2025
fall-risk CPG and the 2018 neurologic core-set CPG (Europe PMC full text), the
2016 VTE CPG (a hosted copy), Hornby 2020 (a repository copy) and the ASNC
termination criteria. Read only through a summary: the 2022 VTE CPG (Guideline
Central). The CAPTE scope line is the course seed's reading of 2026-10-08.
Authored teaching-model sizes and timings say so and the ones that stand in
for a missing number carry `FLAG` (ICU desaturation per MET, oxygen gain and
the AF trigger; the PE timing and its vitals; the beta-blocker HR and BP
slopes, the orthostatic drop size, buckling and stumbling times).

**Findings against this design** (20: recorded, not worked around):

1. **The capability parser refused a hyphen (FAIL-1340).** `parseCaps` took
   letters only, so `treatment-session@1` was dropped and every app would
   have been told to update. Fixed in `lib/sim/server-run.ts`; no stepping
   change.
2. **Bindings and profile live in the engine folder**, as for the board and
   the session: `VitalTile` was factored out of the bedside type (same shape,
   so no document or hash changed), `screen.treatment` and the profile were
   added. Display and lint only; no engine minor.
3. **A moment that opens on the clock** is open at the tick of the command
   that answers it; the DB tests' helper (copied from the session tests)
   missed that (FAIL-1341).

### 22.9 Bedside wave 1: CCRN Pediatric, CCRN Neonatal, NCLEX-RN, NCLEX-PN and a second SAA board case (REQ-233)

Nine documents on the existing bedside and board renderers and engine 1.2;
no engine, renderer, schema or migration change. Each declares engine minor 2
and `endingOrder`, has endings in all three outcome classes, three or four
critical criteria inside its `target` condition, KPIs, an expert path, a
debrief per ending, one reasoning moment, sourced teaching prompts (the
clinical ones) and five or six golden paths built by
`npm run sim:golden -- steps <name>` (`scripts/sim-golden/<name>.steps.ts`).
The clinical cases run in one `running` phase, so study pace (3x) is the
default (5.4a). None has a focused start: each patient needs action from the
first minute.

| Course / slug | Objective (exact title, abridged) | Critical criteria | Steps name |
|---|---|---|---|
| CCRNPEDS/pediatric-septic-shock-fluids | Manage pediatric septic shock ... | antibiotics within 1 h; reassess after every bolus; stop at overload signs; epinephrine for fluid-refractory shock | peds-sepsis |
| CCRNPEDS/pediatric-dka-cerebral-edema | Recognize cerebral edema in DKA ... | hyperosmolar therapy within 20 min, no CT first; potassium with insulin; no insulin bolus, start at 1 h; dextrose with insulin kept running | peds-dka |
| CCRNNEO/neonatal-rds-escalating-support | Manage non-invasive support ... | surfactant (LISA) at FiO2 > 0.30 on CPAP >= 6; SpO2 90-94% without hyperoxia; slipped prongs found | neo-rds |
| CCRNNEO/neonatal-sepsis-hypoglycemia | Name maternal, neonatal and treatment-related risk factors for neonatal sepsis ... | IV dextrose for symptomatic hypoglycemia; ampicillin and gentamicin within 1 h; 1 mL culture first | neo-eos |
| NCLEXRN/med-surg-deterioration-sbar | Unstable versus stable ... | the unstable client seen first; effective escalation (SBAR, rapid response, chain of command); assessment not delegated | rn-deterioration |
| NCLEXRN/post-op-transfusion-reaction | Tell transfusion reactions apart ... | stop at the first sign; new tubing, no flush; provider and blood bank told | rn-transfusion |
| NCLEXPN/ltc-change-in-condition | Recognizing the client whose condition requires immediate RN or provider involvement | data compared with baseline; report to the RN that lands; within PN scope | pn-change |
| NCLEXPN/med-pass-error-caught | The rights of medication administration, applied rather than recited | card checked against the MAR; two identifiers; apical pulse and BP before holding | pn-mederror |
| AWSSAA/nat-gateway-bill-spike | Routing that minimizes transfer cost ... | cause confirmed with data first; a NAT gateway per AZ kept; S3 gateway endpoint on every private route table | aws-nat |

- **AWS SAA now has two sims** (plus the SAP band): TicketBurst (resilient
  design) and the NAT gateway bill (cost), learner-paced on the board screen
  (two `turns` phases; the server refuses pacing commands). Prices are the
  US East (Ohio) NAT rates read on the AWS VPC pricing page, so the scenario
  is set in us-east-2.
- **Sources** carry `checkedAt` 2026-11-11 (2026-10-31 where a title was
  relayed from the course seed, 2026-11-10 where the adult SSC 2026 summary
  was reused). Read in primary text: the SSC Children's 2020 sheets and
  algorithm (SCCM), ISPAD 2022 DKA (Glaser et al.), the European RDS
  consensus 2022 (Sweet et al.), AAP 2018 EOS (Puopolo et al.), the 2026
  NCLEX-RN and NCLEX-PN test plans, Lifeblood's suspected-reaction
  guidance, StatPearls "Transfusion Reactions", CHEMM's PALS values, and the
  AWS pages (VPC pricing, NAT gateway basics and pricing, gateway endpoints,
  Cost Anomaly Detection). Read only through summaries: the SSC Children's
  2026 update (the publisher text was not opened) and the AAP 2011 neonatal
  hypoglycemia report (values as relayed by the UCSF pathway). Authored
  teaching-model numbers say so; the ones standing in for a missing guideline
  number carry `FLAG` (for example the DKA edema onset and size, the RDS
  disease course, the transfusion slow-start rate and volume-to-harm,
  hospital rapid-response criteria, and the PN hold parameters).
- **Authoring findings (FAIL-1360, FAIL-1361).** In a `turns` phase every
  action happens at the same tick until a wait is skipped, so a criterion
  that orders actions by `timeAt` cannot tell "investigated first" from
  "changed first"; the board case orders them with a flag set by the change
  actions instead. And a `schedule.after` given a param is read in seconds
  whatever the param's `unit` says: a "1440 min" day became 24 minutes. The
  linter does not check the first; the goldens (`guessFirst`, and every
  path's final tick) pin both. Since REQ-236 the second is a lint error
  (`secondsUnitProblems`, lib/sim/lint.ts, run by `sims:lint` and the
  generator's lint gate): a param, state variable or derived value whose unit
  is a time unit other than seconds (ms, min, h, d, wk and their spellings)
  may not be read where the engine reads sim seconds, which is an expression
  `schedule.after`, a console alert's or event's `at`, and a template slot,
  table column or KPI with a seconds format (clock, clocks, date, dateShort,
  datetime, time, duration, min). Store it in seconds with unit `s` and show
  it with `|min` or `|duration`. A rate (mL/min) is not a duration and is
  not checked (the engine's dt warning covers rates). Lint only: the engine
  and its minor are unchanged.
- **Teaching key order (FAIL-1362, an instance of the open FAIL-1250).** Two
  teaching prompts due at once are offered in the teaching map's key order,
  which jsonb does not keep, so three goldens recorded in file order failed
  the storage-order test. Every REQ-233 document now writes its teaching keys
  in jsonb order (length, then bytewise); until a `teachingOrder` list exists,
  new documents should do the same or make overlapping prompts mutually
  exclusive.
- **`time_up`** is a reachable harm in the pediatric DKA, pediatric sepsis
  and neonatal sepsis cases; elsewhere every slow path ends in an earlier
  ending first, so the linter's `time_up` warning remains, as in the
  existing CCRN cases.

### 22.15 AWS board sims, wave 2: AWS MLA, Cloud Practitioner, Developer and SysOps (REQ-242)

Nine learner-paced documents on the existing board renderer and engine 1.2,
patterned on TicketBurst and the NAT gateway bill; no engine, renderer,
schema or migration change. Each declares engine minor 2 and `endingOrder`,
runs two `turns` phases (investigate and change, then the week, one skip per
day), has endings in all three outcome classes, three or four critical
criteria inside its `target` condition, KPIs, an expert path that names its
trade-off, a debrief per ending, one reasoning moment, one decision card and
five or six golden paths built by `npm run sim:golden -- steps <name>`
(`scripts/sim-golden/<name>.steps.ts`, the shared week in
`aws-board-helpers.ts`). Every objective is an exact catalog title that the
selection rule (12.2, `lib/sim/generator/selection.ts`) qualifies; the
examples in the brief that did not qualify (a DynamoDB hot partition, a
Lambda throttling case on its own) were folded into qualifying objectives or
left for a later wave. All durations are stored in seconds (unit `s`) and
shown with `|min` or `|duration`.

| Course / slug | Objective (exact title, abridged) | Critical criteria | Steps name |
|---|---|---|---|
| AWSMLA/fraud-model-drift | Creating performance baselines and implementing drift detection | evidence first; baseline from the training set; retrain on mature labels only; new model proven in shadow | aws-mla-drift |
| AWSMLA/endpoint-scaling-latency | Selecting the metrics that drive auto scaling | evidence first; scales on invocations or concurrency per instance; maximum covers the peak; CPU instance type within budget | aws-mla-scaling |
| AWSMLA/loan-data-bias | Identifying and mitigating sources of bias: dataset splitting, shuffling, augmentation | measured first; shuffled stratified split; oversampling after the split (no leakage); release through bias review | aws-mla-bias |
| AWSCLF/data-transfer-surprise | Data transfer costs: inbound, outbound, Region to Region, and within a Region | evidence first; owner confirms before the rule is turned off; backup replication kept; two AZs kept | aws-clf-transfer |
| AWSCLF/leaked-access-key | Managed policies versus custom policies, written to least privilege | full scope (CloudTrail and every Region); key deactivated with the quarantine kept; attacker's user disabled; customer managed policy | aws-clf-key |
| AWSDVA/canary-rollback-dlq | Troubleshooting deployment failures from output logs | logs first; permission on the one parameter; canary and alarm kept; DLQ redriven before it expires | aws-dva-canary |
| AWSDVA/phi-in-application-logs | Identifying sensitive data: PII and PHI | destinations found first; PHI stopped at the source; vendor feed off; privacy officer told | aws-dva-phi |
| AWSSOA/stack-update-rollback-failed | Identifying and remediating deployment issues: subnet sizing, CloudFormation errors, permissions problems | events first; continue-update-rollback skipping the deleted resource; new /24 subnets | aws-soa-cfn |
| AWSSOA/ec2-status-check-recovery | Analyzing performance metrics and automating remediation with CloudWatch, AWS Lambda, AWS Systems Manager, and CloudTrail | evidence first; cache off the instance store; recover on the system check; reboot on the instance check, 3 periods | aws-soa-recover |

- **One Region.** Every scenario is set in us-east-2 (US East, Ohio), as the
  NAT case is. Prices were read on 2026-11-11 from the AWS Price List API
  offer files (no JavaScript needed, so the numbers are the published ones):
  SageMaker hosting ml.c5.xlarge $0.204, ml.g5.xlarge $1.4084 an hour; data
  transfer out to the internet $0.09 per GB (first 10 TB), to us-west-2
  $0.02, within the Region between AZs $0.01, in $0; CloudFront US out $0.085
  per GB. Re-check every six months (12.1).
- **Sources** carry `checkedAt` 2026-11-11 and a quoted note each: SageMaker
  AI (Model Monitor data quality, schedule expressions, CloudWatch metrics,
  model quality, shadow tests, auto scaling policy, scaling policy
  definition, load testing, endpoint metrics), Application Auto Scaling
  scheduled scaling, SageMaker Clarify (CI, DPL, post-training metrics),
  Kapoor and Narayanan 2022 on leakage, Cost Explorer, AWS Budgets, the
  shared responsibility model, the AWSCompromisedKeyQuarantineV3 policy
  reference, IAM best practices and managed policies, Lambda asynchronous
  error handling and DLQs, CodeDeploy deployment configurations, SAM gradual
  deployments, SQS SetQueueAttributes, CloudWatch Logs masking and
  retention, HHS de-identification and breach notification guidance,
  CloudFormation continue-update-rollback, DeletionPolicy and change sets,
  VPC subnet sizing and CreateSubnet, EC2 instance recovery and CloudWatch
  alarm actions. The re:Post compromised-account article was read directly
  (it names the V2 quarantine policy; the policy reference documents V3).
- **Model Monitor is closed to new customers** (AWS's availability-change
  page, read 2026-11-11, gives no date). The drift case's team is an
  existing customer and its model reasoning names the replacement for new
  teams. The MLA-C02 outline still asks for drift detection, so the skill
  stands; whether to recast the case on the open-source monitoring
  solutions is a decision for Nick.
- **Flagged teaching values.** AWS publishes no recovery or scale-out times,
  so the endpoint case's failed-request minutes per policy and the
  recovery case's recovery and reboot outages carry `FLAG` notes. Everything
  else that is not an AWS figure is scenario data, labeled as such.
- **`time_up`** is not reached by any golden path in these cases (every
  path ends in an earlier ending), so the linter's `time_up` warning remains,
  as in the NAT case.

### 22.10 The terminal and network screen and the first Linux+, Network+ and CKA outages (REQ-237)

The design's terminal renderer (20.1, decision R3) as built: `screen.type:
"terminal"`, `terminal@1`, behind `SIMS_RENDERERS` and on by default
(`bedside,board,session,security-console,treatment-session,terminal`). It is
still an authored fault tree, never an emulator, and it does not use the
typed `command` param (4.1): **the command set is bounded.** Each command is
one of the phase's actions; its label is the command line (`df -h /var`,
`ACC-SW2# show interfaces trunk`, `kubectl drain w3`) and its arguments are
`choice` params whose option labels are the literal arguments. Nothing the
learner types reaches the engine as text.

**The renderer** (`TerminalPanel`, `mobile/src/sim/TerminalPanel.tsx`; view
model `terminalView`, `terminalCommands`, `matchCommand`, `suggestCommands`,
`commandProblem`, `terminalAlarmTexts`, `terminalErrors`, `terminalNews`,
`terminalSentence` in `src/sim/runtime/terminalView.ts`). Three blocks in
reading order and web keyboard order:

- **Map**: `nodes` (hosts, switches, cluster nodes, services, a deadline)
  and `links` between two of them, each with a status in words and a tone
  (`up`, `degraded`, `down`, `out` read as "up", "degraded", "down", "out of
  service"); meters under them.
- **Terminal**: the transcript, oldest first, at most 40 entries: every
  command's `output` effects at the tick it ran (the run's `outputs`, which
  the screen no longer shows as separate cards) merged with `lines` that
  appear on their own while `when` holds at `at` (sim seconds). At the same
  minute a line comes before command output (FAIL-1441). `error` marks a
  line the screen reader must hear at once.
- **Command line**: the prompt (a template), a text field and Run, and up to
  six suggestions (prefix matches first, then contains; available first).
  A typed line runs only when it is exactly one command of the set (case and
  spacing ignored, never a partial or fuzzy match); a command whose action
  needs a form (the write-up) is sent to the action list; anything else is
  answered on screen ("not available in this lab", or the action's `why`)
  and sends nothing. The same commands stay in the action list (ActionBar)
  for picking.

**Accessibility**, equal to the console: every node, link, meter and
transcript entry is one accessible element whose label says its state in
words (tone is a word plus a color); every element is at least 48 dp; a
node or link that goes down is an alarm (spoken at once, and again as
cleared); a new error line goes through the announcer's new `urgent` input,
spoken at once, never rate-limited, even while typing; new output and a tone
change other than down are polite news, at most one sentence per 10 s, a
burst summarized ("2 new output blocks. Newest: ..."); a refused typed line
is spoken at once. "Read the terminal" speaks the prompt, every node, the
links not up, the meters, the latest error and the latest output. JavaScript
only, so it ships over the air; an app without `terminal@1` is not offered
these sims and is told to update (5.10).

**Bindings** (`screen.terminal` in `engine/v1/types.ts`, the zod schema and
`validate.ts` `terminalCheck`): `prompt` (template), `lines` (`text`,
`when`, `at` a number, optional `error` bool), `nodes` (`label`,
`spokenLabel`, `kind`, `status`, `tone` an enum expression over the four
tones), `links` (`from` and `to` must be node ids and differ, `label`,
`status`, `tone`), `meters`. Ids are unique across lines, nodes, links and
meters. A line's `at` is checked by the seconds-unit lint (22.9). Display and
lint only: stepping, the corpus and every existing hash are unchanged, and
there is no engine minor.

**Pacing: learner-paced, as on the board and the console.** Every phase is
`turns`; each command costs the operator minutes through one `work` wait
("Let the command finish": a `df` 1, `du` 3, a console walk 15, a reboot 6
to 10), and the outage's next step (a job that needs the database, a
deadline, memory pressure) is a trigger on the same clock that stops the
skip early (`interruptsSkip`). The general family is not pace-eligible, so
the server refuses pace commands.

**Outcome profile `infrastructure`** (9.2, drafts in 20.1 now defaults):
`restoreWindow` 3600 s (restored within 60 minutes of the first report) and
`newFaults` 0 (faults the fix itself introduced). Target: restored in the
window with no new fault and the case's evidence step done first;
recovered: late, guessed, unsaved or with a side effect; harm: the outage
spread to the authored secondary service, or a destructive command (WAL
deleted, SELinux set to be disabled, a reload without saving, a node wiped,
a budget bypassed). Each case tightens `restoreWindow` (30 or 45 minutes).

**Cases** (golden paths by `npm run sim:golden -- steps <name>`, shared
driver `scripts/sim-golden/terminal-helpers.ts`):

| Course / slug | Objective (catalog title) | Critical criteria | Steps name |
|---|---|---|---|
| LINUXPLUS/full-var-stops-database | Diagnosing storage issues: full disks, inode exhaustion, failing drives | found the process holding the deleted log (lsof +L1) before freeing space; freed space without deleting WAL, data or logs; database back within 30 min | linux-full-var |
| LINUXPLUS/selinux-denies-moved-site | Managing users, groups, and permissions at the system level | proved SELinux (ausearch, ls -Z) before changing anything; kept SELinux enforcing and the permissions tight; restorecon within 30 min | linux-selinux |
| NETWORKPLUS/vlan-missing-from-trunk | Diagnosing network service issues: switching, routing, and address pool exhaustion | found VLAN 20 missing on the uplink trunk before changing it; `allowed vlan add` (a bare list drops voice and management); fixed within 30 min | net-trunk |
| NETWORKPLUS/branch-dns-route-typo | Applying a consistent troubleshooting methodology from problem identification through documentation | questioned users and checked what changed first; stated and tested the theory; restored within 45 min; no new fault | net-dns |
| CKA/crashloop-bad-configmap | Troubleshoot application failures from Pod status: Pending, CrashLoopBackOff, ... | `kubectl logs --previous` before changing anything; fixed the ConfigMap rather than relying on `rollout undo`; old pods kept serving; complete within 30 min | cka-crashloop |
| CKA/node-notready-swap-drain | Troubleshoot clusters and nodes: a NotReady node, ... | kubelet journal first; swap fix that survives a reboot; w3 drained through eviction with capacity back; w2 Ready within 30 min | cka-node |

Each case has one written-reasoning moment, endings in all three classes,
`endingOrder` (harm first), KPIs, an expert path, a debrief per ending and
six golden paths (Good, Mediocre, Bad; every ending but `time_up` and every
criterion met and missed, checked by `lib/sim/terminal.test.ts`). Every
objective is a catalog objective that meets the selection rule
(`isPerformanceObjective`).

**Sources** carry `checkedAt` 2026-11-11 and say how each was read. Read in
primary text: unlink(2) (man-pages 6.19), RFC 3927, PostgreSQL 18 (27.6.2
Disk Full Failure, 28.5 WAL configuration) and the CKA Curriculum v1.37 PDF.
Read through summarizing fetches: df(1), lsof(8) (the column list was not
reached), journald.conf(5), restorecon(8), setenforce(8), Red Hat's RHEL 9
SELinux troubleshooting and modes chapters, CompTIA's Linux+ and Network+
pages and the N10-009 comparison flyer, Pearson's N10-009 cert guide (only
methodology steps 1-4 were visible), the Cisco `switchport trunk` and `ip
route` references, RFC 1812 2.2.5.2, Microsoft's ipconfig and nslookup
pages, and the Kubernetes pages (Pod lifecycle, ConfigMaps, Deployments,
kubectl logs and drain, Nodes, Taints and Tolerations, Safely Drain a Node,
Installing kubeadm). Not reached: the CompTIA objectives PDFs (XK0-006,
N10-009). Command output layouts are authored renderings in each tool's
style; the facts they carry are the sources'. Authored values that stand in
for a missing source carry `FLAG`: equal-distance static defaults sharing
traffic, and whether a crash-looping container picks up a fixed ConfigMap
value without a restart (not modeled; the documented restart is required).

**Findings** (20: recorded, not worked around):

1. **The design's terminal (typed `command` patterns) was not used.** The
   task asked for no free shell, so commands are actions; the `command`
   param stays for a later typed-pattern console. A decision for Nick if a
   free-text-matching terminal is still wanted.
2. **A backslash escape in a document string (FAIL-1440).** The expression
   parser drops a backslash and keeps the next character, so `\n` in a slot
   renders the letter n. New lint error `backslashEscapeProblems`
   (lib/sim/lint.ts, run by `sims:lint` and the generator's lint gate); no
   seeded document had one.
3. **A gated command's reason (FAIL-1442).** An action's `why` is what the
   command line says when a command will not run, so a gate with two causes
   (busy, or the device unreachable) names both.
4. **The infrastructure thresholds were drafts** with an empty profile; they
   are now defaults (display and lint only, no engine minor).
