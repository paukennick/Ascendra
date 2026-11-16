# Mastery decay and predicted recall (REQ-291 design, REQ-301 shadow mode)

Status, 2026-11-14: Nick approved all eight recommendations below. Step 1
(shadow mode, REQ-301) is built; steps 2 and 3 are not. The model's
prediction is stored beside every review in `review_log` (migration 085) and
nothing decides from it: `schedulerFor()` still returns `fixed_v1` for every
row, readiness is unchanged and no learner sees a number. The model code
(`backend/lib/memory-model.ts`) is imported by `backend/lib/decay-shadow.ts`
(the live write and the backfill), `backend/lib/decay-sim.ts` and their tests.
See "Rollout" below and `docs/decay-shadow-calibration.md`.

Nick's decisions this builds on (2026-11-10): per-learner predicted recall,
FSRS-style and fitted from each learner's own review history; a "needs a
refresh" state instead of silent demotion; exam-day predicted recall in
readiness; and the per-course goal question as the starting prior, never job
titles. The goal sets starting decay, plan pacing, "what changed" emphasis and
review load, and the learner's own history takes over.

## Recommendation

Build it in three steps, and don't show learners a predicted-recall number
until step 2 proves it is calibrated on Ascendra data.

1. **Shadow mode (no learner-visible change).** Compute the proposed model's
   predicted recall on every review and store it beside the outcome in
   `review_log`. Scheduling stays `fixed_v1`. This costs one nullable column
   and a few arithmetic operations per answer.
2. **Calibrate on real reviews.** After a few weeks, compare predicted recall
   with what learners actually got right. Fit population defaults for
   Ascendra (objectives aren't flashcards) with the open-source FSRS optimizer,
   offline. Ship to learners only when the predicted recall is within about 5
   points of observed recall on held-out reviews.
3. **Switch scheduling to the hybrid.** Per-learner FSRS intervals that are
   never longer than `fixed_v1` would give for the same answers, plus the
   "needs a refresh" flag and the exam-day recall band in readiness.

Why the hybrid and not pure FSRS: in the simulation, pure FSRS beat
`fixed_v1` for six personas but lost about 8 points of exam-day recall for the
crammer and 12 for the two-days-a-week credential holder. Both losses came
from the default parameters expecting slower forgetting than the simulated
learners had. The hybrid kept recall at or above `fixed_v1` for all 8 personas
under both assumed forgetting curves. It cost 0 to 12 more reviews a week,
most of it for learners who were forgetting fastest.

Why shadow mode first: under the slower-growth assumption, the model
over-predicted exam-day recall for every persona, by 2 to 14 points. A
readiness number that is 10 points too high is the dishonest number REQ-117
removed. The simulation can't tell us which assumption real learners match.
Only `review_log` can.

## Model choice

**FSRS-6** (open-spaced-repetition), the current version. Formulas and the 21
default parameters come from the awesome-fsrs wiki page "The Algorithm" (last
edited 2026-07-28, read 2026-11-14). Recall after `t` days at stability `S` is
`(1 + factor * t / S) ^ -w20`, where `factor = 0.9^(-1/w20) - 1`, so recall is
90% when `t = S`. The default decay is `w20 = 0.1542`.

Why FSRS:

- It's the open, documented, most widely used per-learner memory model (Anki
  and others).
- `review_log` already stores what it fits on (037 was written for this).
- `review_state()` (045) already uses an FSRS power curve for retention, so
  readiness already speaks this language.

What we change for Ascendra, all in `memory-model.ts`:

- **Grades from verdicts.** A miss is Again, a partial or a correct answer
  with the choices shown is Hard, and a correct unaided answer is Good. There
  is no Easy.
- **Help barely grows memory.** A correct answer with the choices on screen
  grows stability at most 1.2x (`ASSISTED_MAX_GROWTH`), the same idea as
  `fixed_v1`'s `HELPED_MAX_STEP`. In the first simulation run, help counted as
  a plain Hard. The expert who hints a lot then ended at 65% recall against
  `fixed_v1`'s 80%.
- **One personal parameter, k**, the learner's memory clock. Their recall
  after `t` days is the default model's recall after `t / k` days. A full
  21-parameter fit per learner needs far more data than an Ascendra learner
  produces per course, and its errors are hard to explain. `k` is easy to
  explain ("you hold things about twice as long as average") and it can carry
  an honest uncertainty band.
- **No same-day modeling.** REQ-218 keeps reviews 24 hours apart.

Rejected alternatives:

- **Keep the fixed ladder and only add an FSRS readout.** It doesn't adapt to
  the learner, which was the decision.
- **Half-life regression (Duolingo).** It needs per-feature training data we
  don't have.
- **Full per-learner FSRS.** Too little data per learner (see below).

## Cold start: goal and level, then the learner's history

The starting `k` is a log-normal prior. Its median comes from the course goal
times the course level. Its spread is `PRIOR_LOG_SD = 0.5`, an 80% band of
about 1.9x either way. All values below are assumptions for Nick to approve.

| Goal | Start k | Target recall |
| --- | --- | --- |
| I use this at work regularly | 1.5 | 85% |
| Staying current / keeping a credential | 1.3 | 85% |
| In a program / studying for the exam now | 1.0 | 90% |
| Getting into the field / changing careers | 0.8 | 90% |
| Learning out of interest | 1.0 | 80% |
| Not answered | 1.0 | 90% |

What the goal sets:

- **Level** multiplies the start k: New 0.85, Some background 1.0,
  Experienced 1.2.
- **Exam date.** With an exam date set (`study_plans.exam_date`), the target
  is at least 90%. A clinical course never aims below 90% whatever the goal.
- **"What changed" emphasis** is high for work and current, normal otherwise.
- **Plan pacing** is maintain, exam, build or light.
- **Review load comes from the target only.** A lower target means longer gaps
  and fewer reviews. It never comes from a smaller daily cap. The first design
  capped work at 8 reviews a day and current and interest at 6. In the
  simulation, the credential holder who studies two days a week fell to 46%
  recall against `fixed_v1`'s 83% (sensitivity table in the appendix). Every
  learner keeps today's `SESSION_CAP` of 12.

**When the learner's history takes over.** `fitPersonalScale` combines the
prior with every unaided review into a posterior on a fixed grid of 61 `k`
values, from 0.05 to 8. Answers with help update memory but aren't evidence of
recall. Because it's a posterior, the prior fades smoothly; there is no
switch. The stage labels borrow the thresholds in fsrs-rs 6.6.2
`compute_parameters` (docs.rs, read 2026-11-14). That code returns default
parameters below 8 training items and fits initial stability only below 64.

- **starting** (fewer than 8 unaided reviews): "Based on your answers when you
  started."
- **learning** (8 to 63): "Getting to know how you remember."
- **fitted** (64 or more): "Based on your reviews."

In the simulation, every persona reached "fitted" before its exam, the
crammer included (95 to 135 unaided reviews in 3 weeks). The "says work,
experienced but forgets fast" persona started at k 1.8. The fit ended near
0.2 to 0.3, so the history overrode the wrong prior.

The fsrs-rs thresholds count FSRS training items, roughly one per review after
a card's first. That mapping is my reading, not stated on the page. Anki's
FAQ says its optimizer can now run on any number of reviews (Anki 24.06.3 and
newer). It gives no reliability threshold.

## "Needs a refresh"

It appears when an objective at Guided or above has a predicted recall below
70% now (`REFRESH_BELOW`), using the learner's fitted `k`.

- **Mastery level: unchanged.** Levels don't decay with time today (045) and
  still won't. The objective shows a "Needs a refresh" chip beside its level,
  never a lower level and never "forgotten". Readiness already multiplies by
  retention, so the readiness number falls on its own.
- **Review queue.** Due reviews are ordered by lowest predicted recall first,
  inside today's cap of 12. Objectives that need a refresh are due by
  definition, since the target is at least 80% and the flag is under 70%.
- **Clearing it.** A correct unaided answer at a due review clears it. A miss
  follows today's rules (a step back, a lapse; Needs review still needs two
  days of misses).
- **Reminders.** One line in the existing reminder ("4 topics could use a
  refresh"), never a reminder per objective and no extra emails.
- **After an absence**, the refreshes are spread over the following days by
  the cap, lowest recall first. The plan says "welcome back", not a count of
  what was lost.

What the simulation says about the flag: it fires far less than today's
`recheck_due`. For the learner who disappears for two weeks, the peak was 5
(hybrid) against 22. But it also missed most objectives that had truly fallen
below 70% by exam day, because the model is overconfident under the
slow-growth assumption. Under the fast-growth assumption, almost nothing falls
below 70%. That's one more reason to calibrate before showing it.

## Exam-day predicted recall in readiness

Per objective, it's the predicted recall on the exam date if nothing more is
reviewed. That's the floor the plan can only raise. The course figure is the
blueprint-weighted mean, using the same weights `rollupReadiness` uses
(`examDayRecall`).

How uncertainty is shown:

- The same calculation runs at the 10th and 90th percentile of `k`. The card
  shows a band, "about 80-86% on exam day", never a single number while the
  fit is starting or learning.
- The band narrows as reviews come in. In the simulation, the 80% band was 3
  to 7 points wide once fitted.
- Readiness keeps its existing gates: coverage, the kept share and the 0.6 cap
  on unconfirmed objectives. Exam-day recall is shown beside it and does not
  replace it.
- If the exam date has passed or isn't set, the card isn't shown.

Today's 045 retention factor reads 97-100% on exam day for every persona.
Simulated recall was 75-83% under the slow assumption and 89-93% under the
fast one. The factor is 1 until a review is due, so it can't serve as a
prediction. The proposed figure was closer for every persona.

## Migration from fixed_v1

- **Existing `review_schedule` rows keep `scheduler = 'fixed_v1'`.** A new
  scheduler name (`fsrs_v1`, within the varchar(20) limit) is registered in
  `SCHEDULERS`. The fallback for unknown names already exists.
- **Lazy conversion on the next review.** Rebuild that objective's FSRS state
  by replaying its `review_log` rows (verdict, assisted, `reviewed_at`) from
  enrollment, and store `{s, d}` in `review_schedule.state`, a jsonb column
  that already exists. With no log rows, start from `S = intervalFor(step)`.
  There is no mass backfill, no long lock and no recompute of levels.
- **The store needs one change.** `stepSchedule` passes `state` in and writes
  it back. `ScheduleState` gains an optional `memory?: {s, d}`.
- **`review_state()` retention** reads `state->>'s'` when the scheduler is
  `fsrs_v1`, and keeps the 045 formula for `fixed_v1`. It's a CREATE OR
  REPLACE that keeps its name, signature and `search_path`, and ends with
  `select app_runtime_sync();`.
- **Rollback.** Set the scheduler back to `fixed_v1`. The step and due date
  columns stay maintained throughout, so nothing is lost.

## Rollout

Nick's decisions (2026-11-14, relayed by the lead session): all eight open
decisions below are approved as recommended. Shadow mode first, then
calibrate, then the hybrid (never longer than `fixed_v1`); the goal starting
values as written; review load only through the target recall; "needs a
refresh" at 70%; personal `k` per course with a fallback to the learner's
other courses while a course is "starting"; the exam-day band only with an
exam date and only as a band, never on a clinical course before "fitted";
clinical courses a target of at least 90%.

### Step 1: shadow mode (built, REQ-301, migration 085)

What it does. After every review, `stepSchedule` (`backend/lib/review-step.ts`,
the only writer of `review_log`; it serves Today's review and spaced exam
answers) stores the model's predicted recall for that review and the state it
used, in the same row as the real outcome (`verdict`, `assisted`):

| Column | Holds |
| --- | --- |
| `predicted_recall` | probability of recall at review time, 0 to 1 |
| `model_stability`, `model_difficulty` | the objective's state just before the review |
| `model_k` | the course's memory clock: the posterior median over every earlier unaided review in the course |
| `model_fit_stage` | `starting`, `learning` or `fitted` (what `model_k` rests on) |
| `model_goal`, `model_level` | the prior used (`none` = the goal was not answered) |
| `model_version` | the parameter set (`MEMORY_MODEL_VERSION`; a test pins it to the model's constants) |
| `model_source` | `live`, or `backfill` (see below) |

The scheduler that ran is still `review_log.scheduler` (`fixed_v1`). No exam
date or clinical flag enters: they change the schedule's target, not the
recall the model predicts. Each prediction uses earlier reviews only, so it is
a prediction made before its outcome. A review that was never scheduled (the
objective never reached Guided) stores no prediction.

Safety. The write is a separate statement inside a savepoint with a 2 second
statement limit. Any failure (the migration not applied yet, a timeout, a bad
row, a bug in the model) rolls the savepoint back, logs one masked line
(`[decay-shadow] prediction skipped`) and the review commits as before. It
adds two reads and one update (and the savepoint bookkeeping) to a review that
was already writing three rows. `DECAY_SHADOW=off` stops all of it (`.env.example`, runbook). A course
history over 5,000 reviews is skipped, not truncated.

Backfill. `npm run decay:backfill` replays existing `review_log` history to
compute what the model would have predicted at each past review. It is a dry
run unless `--apply` is given, only fills rows with no prediction, never
overwrites one, and commits one learner-course at a time, so it can be
stopped and resumed. Backfilled rows are marked `model_source = 'backfill'`
because the goal and level are the course's current ones, not what they were
then; the report shows live and backfilled rows apart.

Calibration. `npm run decay:calibration` prints predicted against observed
recall by predicted bucket, fit stage, goal, level and course category, with
the gap in points against the 5-point bar. How to read it, and the order to
run things in, is in `docs/decay-shadow-calibration.md`.

Compatibility. Additive migration (nine nullable columns, one `NOT VALID`
check). Either deploy order is safe. The account export (`select *`) now
includes the columns, so a learner's export shows their own predicted recall;
the data inventory says so. Rolling back is `DECAY_SHADOW=off`, or the
rollback block at the top of 085.

### Step 2: calibrate (not built)

Run the report weekly. Fit Ascendra's population defaults offline with the
open-source FSRS optimizer on `review_log` (hold out whole learners, not rows),
bump `MEMORY_MODEL_VERSION` with the new parameters, and compare. Ship only
when predicted is within about 5 points of observed on held-out reviews, in
every slice that matters (clinical courses and every fit stage included), and
reviews per week by goal have been checked. Needs enough unaided reviews per
slice (the report refuses to judge a slice under 200).

### Step 3: hybrid scheduling (not built)

As described in "Migration from fixed_v1" above, plus the decisions Nick
approved: the `learner_memory_scale` table (k per course, fallback to the
learner's other courses while "starting"), the "needs a refresh" flag at 70%,
and the exam-day band. Not started until step 2's bar is met.

## Data needed

Most of it is already stored.

| Need | Where | Status |
| --- | --- | --- |
| Each review's verdict, help, time | `review_log` (037) | have it |
| Enrollment time | `review_schedule.enrolled_at` | have it |
| Days since the last review | `review_log.elapsed_days` (null if unenrolled) | have it, derivable |
| Goal, level | `learner_course_profiles` (078) | have it |
| Exam date | `study_plans.exam_date` | have it |
| Blueprint weights | `course_units.weight` | have it |
| Predicted recall at review time (calibration) | `review_log.predicted_recall` and eight `model_*` columns (085) | built (step 1); the column list is in the Rollout section |
| Fitted `k`, band, n | nothing yet | add `learner_memory_scale (user_id, track_id, k, k_low, k_high, n, fitted_at)` (step 3); also listed in the data inventory and account export |

Exam answers that step a due schedule (`advanceDueSchedule`) are already in
`review_log`. Lesson attempts aren't. They are learning, not retrieval after a
gap, and should stay out of the fit.

## Cost

There are no model calls. A review update is a handful of `exp` and `pow`
operations. A fit replays a learner's course history once per grid point: 61
x n reviews, about 120,000 operations at n = 2,000, a few milliseconds. The
whole 24-run simulation, refitting every study day, takes about 1.5 seconds.
Refit after each review session, or nightly. The population fit in step 2 is
an offline batch job using the open-source optimizer, with no runtime cost.

## Risks

- **Over-reviewing.** A higher target, a low `k` or the hybrid's ladder cap
  all add reviews. In the simulation, the hybrid added up to 12 a week for the
  learner who forgets fastest. Mitigations: the cap of 12 stays, the target is
  the only load lever, and step 2 checks reviews per week per goal before
  switching.
- **Discouragement.**
  - A wall of "needs a refresh" after an absence. Mitigations: one line in
    reminders, spread over days, never a level drop, and "welcome back"
    wording.
  - A low exam-day band can also discourage. It is always shown with what
    raises it ("3 reviews a day this week brings this to about 85-90%").
- **Overconfidence.** This is the biggest risk the simulation found. It is why
  step 1 is shadow mode and step 2 has a calibration bar.
- **Clinical courses.** A predicted 85% means 15% of safety-critical facts
  missed.
  - A clinical course has a target of at least 90% regardless of goal.
  - A clinical course never shows an optimistic point estimate, only the band.
  - High-stakes objectives (for example, dosage and contraindications) could
    get a stricter floor. That is an open decision below.
  - "Interest" never lowers a clinical target.
- **Gaming.** Hints can't inflate memory (the help growth cap), and answers
  with help aren't evidence in the fit.
- **Model-family mismatch.** One `k` corrects how fast someone forgets, not
  the shape of the curve. If Ascendra learners' curves differ from flashcard
  data, only step 2's population fit fixes that.

## Open decisions for Nick

All eight were approved as recommended on 2026-11-14 (see "Rollout").

1. **Ship order: shadow mode, then calibrate, then hybrid?** Recommend yes.
   Without real calibration, the simulation shows readiness could read about
   10 points high.
2. **Hybrid (never longer than fixed_v1) or pure FSRS?** Recommend the hybrid
   at first. It never lost recall to `fixed_v1` in the simulation. Revisit
   pure FSRS after step 2 if calibration is good and load matters.
3. **Goal prior values** (the table above): start k, target recall and level
   multipliers. Recommend them as written; they only matter for the first
   few dozen reviews.
4. **Review load by goal through the target only, not a daily cap?**
   Recommend yes (the capped design starved the two-days-a-week learner).
5. **Refresh threshold of 70%?** Recommend 70% for now, revisited after step
   2, since it only means something once the model is calibrated.
6. **Personal `k` per course or per learner?** Recommend per course: coding
   and clinical memory may differ. Fall back to the learner's other courses
   while a new course is in "starting".
7. **Exam-day band wording and when it shows.** Recommend showing it only
   with an exam date, only as a band, and never on a clinical course before
   "fitted".
8. **Which courses count as clinical, and whether high-stakes objectives get
   a stricter floor (95%).** Recommend the nursing, EMS, PT and mental health
   tracks as clinical. Flag high-stakes objectives as a content decision.

## Persona simulation

THIS IS A SIMULATION WITH ASSUMED FORGETTING CURVES, NOT LEARNER DATA.

Run it with `npm run sim:decay` (`--json` for raw numbers). The code is in
`backend/lib/decay-sim.ts`, and its pure functions and headline claims are
tested in `decay-sim.test.ts`. It is deterministic: every draw is a hash of
(persona, objective, day, purpose).

**The simulated learners**

- They forget on an exponential curve: recall is e^(-t/tau), and tau starts
  at 8 days x persona speed x a per-objective factor of 0.6-1.6. This is
  deliberately a different family from the model's power curve.
- An unaided recall grows tau by 1.2 + 2.5(1 - p) ("slow", the main run) or
  1.5 + 6(1 - p) ("fast", closer to what FSRS defaults expect).
- A correct answer with help grows tau 1.05 + 0.8(1 - p).
- A miss is re-taught and keeps the larger of 45% of tau and 70% of the
  first-learning tau.
- Each persona learns 40 objectives.
- Reviews come first each study day (cap 12, as `SESSION_CAP`), then new
  lessons.
- `fixed_v1` is the real `fixedScheduler`. Its "prediction" is 045's
  retention factor.

**Engines compared**

- **fixed_v1:** today's ladder.
- **proposed:** FSRS-6 with the goal prior and the personal fit.
- **hybrid:** proposed, never a longer gap than `fixed_v1` for the same
  answers.

**Personas**

- Working pro with strong recall: work, experienced, speed 2.0, 3 days a
  week, no exam, checked on day 90.
- Career changer: speed 0.7, weekdays, exam day 77.
- Crammer: program, every day for 3 weeks, exam day 21.
- Steady student: weekdays, exam day 70.
- Inconsistent: skips 30% of days, gone days 28-41, exam day 63.
- Expert who hints on 60% of reviews: work, experienced, speed 1.6, exam day
  56.
- Keeping a credential: current, 2 days a week, checked on day 90.
- Says "work, experienced" but forgets fast: speed 0.6, exam day 60.

### Headline numbers, main run (slow-growth truth)

Simulated recall on exam day (check day for the two without an exam), and
reviews per week:

| Persona | Recall fixed_v1 → hybrid | Reviews/wk fixed_v1 → hybrid | Hybrid predicted (band) |
| --- | --- | --- | --- |
| Working pro | 78% → 79% | 18.7 → 20.8 | 93% (90-95) |
| Career changer | 75% → 85% | 22.5 → 31.4 | 94% (92-96) |
| Crammer | 83% → 83% | 42.7 → 45.0 | 96% (94-97) |
| Steady student | 79% → 84% | 21.6 → 25.7 | 94% (92-96) |
| Inconsistent | 75% → 80% | 25.0 → 26.9 | 91% (88-93) |
| Expert who hints | 80% → 90% | 29.9 → 38.1 | 93% (91-95) |
| Keeping a credential | 83% → 84% | 18.8 → 19.0 | 93% (91-95) |
| Wrong prior | 79% → 93% | 34.7 → 46.8 | 95% (93-96) |

**What the main run shows**

- **Today's readiness factor is not a prediction.** It shows 97-100% for
  every persona.
- **The hybrid is closer to the truth but too high.** Its predicted recall is
  closer than 045's for every persona, but still 2 to 14 points too high under
  this assumption. Under the fast-growth assumption it is within 0 to 5
  points.
- **Pure proposed** (full table in the appendix):
  - It beat `fixed_v1` on recall for six personas.
  - It lost for the crammer (75% vs 83%) and the credential holder (71% vs
    83%).
  - It used fewer reviews for the working pro (14.2 vs 18.7 a week).
- **"Needs a refresh" peak counts:**
  - Inconsistent learner: 5 (hybrid) against 22 for today's `recheck_due`.
  - All others: 0-3.
  - At exam day it flagged almost none of the objectives that had truly
    fallen below 70%, the overconfidence again.
- **Fit stages:**
  - Every persona reached "fitted" by exam day.
  - The wrong prior (start k 1.8) was fitted to about 0.25.
  - The fit cannot recover the true speeds as numbers, because the true curve
    is a different shape. It only orders them, which is the point of the
    shadow-mode calibration.

### Appendix: full output

The output below was produced by `npm run sim:decay` on 2026-11-14. The
columns are reviews per week (peak week); simulated recall at exam; what the
engine would show (the 80% band for proposed and hybrid); Brier score of
predicted recall against unaided review outcomes (lower is better); objectives
flagged at exam (peak during the run), where proposed and hybrid flag "needs a
refresh" and fixed_v1 uses today's `recheck_due`; objectives truly under 70%
at exam (how many of them were flagged); and the fitted k (80% band, unaided
reviews used, stage).

<!-- sim-output -->
SIMULATION WITH ASSUMED FORGETTING CURVES, NOT LEARNER DATA.
Simulated learners forget exponentially (tau0 8 days x persona speed x item factor); the proposed model predicts with FSRS-6, awesome-fsrs wiki 'The Algorithm' (last edited 2026-07-28), read 2026-11-14.

#### Main run (slow-growth truth)

| Persona | Engine | Reviews/wk (peak wk) | Simulated recall at exam | Shown/predicted at exam | Brier | Flagged at exam (peak) | Truly <70% (flag hits) | Fit k (80% band, n, stage) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pro_strong (check day 90) | fixed_v1 | 18.7 (36) | 78% | 100% (045 retention) | 0.158 | 0 (0) | 9 (0) | - |
| pro_strong (check day 90) | proposed | 14.2 (27) | 82% | 91% (88%-93%) | 0.231 | 0 (1) | 7 (0) | 0.49 (0.32-0.75, 183, fitted) |
| pro_strong (check day 90) | hybrid | 20.8 (35) | 79% | 93% (90%-95%) | 0.146 | 0 (0) | 10 (0) | 0.69 (0.45-1.14, 267, fitted) |
| career_changer (exam day 77) | fixed_v1 | 22.5 (33) | 75% | 100% (045 retention) | 0.222 | 0 (0) | 16 (0) | - |
| career_changer (exam day 77) | proposed | 31.5 (43) | 82% | 91% (88%-93%) | 0.166 | 0 (1) | 5 (0) | 0.23 (0.15-0.35, 347, fitted) |
| career_changer (exam day 77) | hybrid | 31.4 (49) | 85% | 94% (92%-96%) | 0.132 | 0 (1) | 7 (0) | 0.30 (0.18-0.45, 345, fitted) |
| crammer (exam day 21) | fixed_v1 | 42.7 (56) | 83% | 100% (045 retention) | 0.102 | 0 (0) | 3 (0) | - |
| crammer (exam day 21) | proposed | 34.3 (45) | 75% | 92% (89%-95%) | 0.166 | 0 (0) | 13 (0) | 0.53 (0.32-0.89, 103, fitted) |
| crammer (exam day 21) | hybrid | 45.0 (57) | 83% | 96% (94%-97%) | 0.101 | 0 (0) | 2 (0) | 0.82 (0.49-1.35, 135, fitted) |
| steady (exam day 70) | fixed_v1 | 21.6 (34) | 79% | 99% (045 retention) | 0.207 | 2 (2) | 7 (2) | - |
| steady (exam day 70) | proposed | 26.9 (50) | 80% | 91% (88%-93%) | 0.177 | 1 (1) | 9 (1) | 0.30 (0.18-0.45, 269, fitted) |
| steady (exam day 70) | hybrid | 25.7 (43) | 84% | 94% (92%-96%) | 0.134 | 0 (1) | 3 (0) | 0.41 (0.25-0.63, 257, fitted) |
| inconsistent (exam day 63) | fixed_v1 | 25.0 (57) | 75% | 97% (045 retention) | 0.282 | 3 (22) | 8 (3) | - |
| inconsistent (exam day 63) | proposed | 24.8 (60) | 79% | 90% (88%-93%) | 0.192 | 0 (7) | 5 (0) | 0.27 (0.18-0.41, 223, fitted) |
| inconsistent (exam day 63) | hybrid | 26.9 (60) | 80% | 91% (88%-93%) | 0.182 | 0 (5) | 5 (0) | 0.27 (0.18-0.41, 242, fitted) |
| expert_hinter (exam day 56) | fixed_v1 | 29.9 (39) | 80% | 100% (045 retention) | 0.241 | 0 (0) | 8 (0) | - |
| expert_hinter (exam day 56) | proposed | 32.4 (48) | 84% | 89% (86%-92%) | 0.203 | 0 (2) | 5 (0) | 0.82 (0.49-1.24, 92, fitted) |
| expert_hinter (exam day 56) | hybrid | 38.1 (48) | 90% | 93% (91%-95%) | 0.134 | 0 (1) | 0 (0) | 0.89 (0.53-1.35, 113, fitted) |
| credential (check day 90) | fixed_v1 | 18.8 (24) | 83% | 100% (045 retention) | 0.226 | 0 (6) | 6 (0) | - |
| credential (check day 90) | proposed | 15.8 (24) | 71% | 83% (79%-86%) | 0.261 | 3 (6) | 16 (1) | 0.23 (0.15-0.35, 201, fitted) |
| credential (check day 90) | hybrid | 19.0 (24) | 84% | 93% (91%-95%) | 0.190 | 0 (3) | 8 (0) | 0.38 (0.25-0.58, 242, fitted) |
| prior_wrong (exam day 60) | fixed_v1 | 34.7 (50) | 79% | 100% (045 retention) | 0.301 | 0 (0) | 10 (0) | - |
| prior_wrong (exam day 60) | proposed | 48.8 (60) | 90% | 94% (92%-95%) | 0.196 | 0 (3) | 2 (0) | 0.18 (0.12-0.25, 418, fitted) |
| prior_wrong (exam day 60) | hybrid | 46.8 (60) | 93% | 95% (93%-96%) | 0.168 | 0 (1) | 0 (0) | 0.25 (0.16-0.38, 401, fitted) |

#### Sensitivity: fast-growth truth (closer to what FSRS defaults expect)

| Persona | Engine | Reviews/wk (peak wk) | Simulated recall at exam | Shown/predicted at exam | Brier | Flagged at exam (peak) | Truly <70% (flag hits) | Fit k (80% band, n, stage) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pro_strong (check day 90) | fixed_v1 | 15.6 (33) | 90% | 100% (045 retention) | 0.099 | 0 (0) | 0 (0) | - |
| pro_strong (check day 90) | proposed | 11.1 (24) | 92% | 93% (90%-95%) | 0.199 | 0 (1) | 0 (0) | 0.82 (0.49-1.24, 143, fitted) |
| pro_strong (check day 90) | hybrid | 15.9 (33) | 91% | 94% (92%-96%) | 0.096 | 0 (0) | 0 (0) | 1.05 (0.69-1.75, 204, fitted) |
| career_changer (exam day 77) | fixed_v1 | 18.0 (28) | 91% | 100% (045 retention) | 0.135 | 0 (0) | 0 (0) | - |
| career_changer (exam day 77) | proposed | 21.7 (32) | 90% | 94% (91%-96%) | 0.142 | 0 (1) | 5 (0) | 0.32 (0.21-0.53, 239, fitted) |
| career_changer (exam day 77) | hybrid | 23.8 (39) | 93% | 94% (92%-96%) | 0.108 | 0 (1) | 0 (0) | 0.38 (0.25-0.63, 262, fitted) |
| crammer (exam day 21) | fixed_v1 | 41.0 (56) | 92% | 100% (045 retention) | 0.089 | 0 (0) | 0 (0) | - |
| crammer (exam day 21) | proposed | 31.7 (42) | 86% | 94% (92%-96%) | 0.130 | 0 (0) | 5 (0) | 0.69 (0.41-1.05, 95, fitted) |
| crammer (exam day 21) | hybrid | 42.7 (57) | 92% | 97% (95%-98%) | 0.080 | 0 (0) | 0 (0) | 0.97 (0.58-1.60, 128, fitted) |
| steady (exam day 70) | fixed_v1 | 17.6 (25) | 92% | 100% (045 retention) | 0.095 | 0 (0) | 0 (0) | - |
| steady (exam day 70) | proposed | 20.0 (36) | 90% | 94% (92%-96%) | 0.147 | 0 (1) | 3 (0) | 0.41 (0.27-0.69, 200, fitted) |
| steady (exam day 70) | hybrid | 20.0 (28) | 93% | 96% (94%-97%) | 0.087 | 0 (1) | 0 (0) | 0.63 (0.38-0.97, 200, fitted) |
| inconsistent (exam day 63) | fixed_v1 | 21.0 (50) | 91% | 99% (045 retention) | 0.205 | 0 (21) | 1 (0) | - |
| inconsistent (exam day 63) | proposed | 22.2 (59) | 91% | 91% (89%-94%) | 0.179 | 0 (4) | 0 (0) | 0.30 (0.19-0.45, 200, fitted) |
| inconsistent (exam day 63) | hybrid | 23.8 (60) | 94% | 95% (93%-97%) | 0.134 | 0 (5) | 0 (0) | 0.41 (0.27-0.63, 214, fitted) |
| expert_hinter (exam day 56) | fixed_v1 | 29.1 (40) | 89% | 100% (045 retention) | 0.178 | 0 (0) | 1 (0) | - |
| expert_hinter (exam day 56) | proposed | 27.5 (42) | 88% | 92% (89%-94%) | 0.147 | 0 (1) | 3 (0) | 1.14 (0.69-1.90, 82, fitted) |
| expert_hinter (exam day 56) | hybrid | 38.0 (48) | 94% | 93% (91%-96%) | 0.131 | 0 (1) | 0 (0) | 0.89 (0.58-1.47, 118, fitted) |
| credential (check day 90) | fixed_v1 | 16.4 (23) | 93% | 100% (045 retention) | 0.167 | 0 (6) | 0 (0) | - |
| credential (check day 90) | proposed | 14.2 (23) | 91% | 92% (89%-94%) | 0.216 | 0 (2) | 2 (0) | 0.41 (0.27-0.63, 181, fitted) |
| credential (check day 90) | hybrid | 17.0 (24) | 94% | 94% (92%-95%) | 0.145 | 0 (3) | 0 (0) | 0.49 (0.32-0.75, 216, fitted) |
| prior_wrong (exam day 60) | fixed_v1 | 25.6 (43) | 92% | 100% (045 retention) | 0.169 | 0 (0) | 0 (0) | - |
| prior_wrong (exam day 60) | proposed | 34.9 (55) | 96% | 94% (92%-96%) | 0.168 | 0 (1) | 0 (0) | 0.27 (0.18-0.41, 299, fitted) |
| prior_wrong (exam day 60) | hybrid | 31.9 (52) | 96% | 96% (94%-97%) | 0.125 | 0 (0) | 0 (0) | 0.49 (0.32-0.75, 273, fitted) |

#### Sensitivity: goal-based daily caps (rejected design)

| Persona | Engine | Reviews/wk (peak wk) | Simulated recall at exam | Shown/predicted at exam | Brier | Flagged at exam (peak) | Truly <70% (flag hits) | Fit k (80% band, n, stage) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pro_strong (check day 90) | fixed_v1 | 18.7 (36) | 78% | 100% (045 retention) | 0.158 | 0 (0) | 9 (0) | - |
| pro_strong (check day 90) | proposed | 14.2 (24) | 84% | 90% (87%-93%) | 0.233 | 0 (1) | 7 (0) | 0.45 (0.30-0.69, 183, fitted) |
| pro_strong (check day 90) | hybrid | 21.5 (24) | 88% | 94% (92%-96%) | 0.172 | 0 (0) | 2 (0) | 0.58 (0.38-0.89, 277, fitted) |
| career_changer (exam day 77) | fixed_v1 | 22.5 (33) | 75% | 100% (045 retention) | 0.222 | 0 (0) | 16 (0) | - |
| career_changer (exam day 77) | proposed | 31.5 (43) | 82% | 91% (88%-93%) | 0.166 | 0 (1) | 5 (0) | 0.23 (0.15-0.35, 347, fitted) |
| career_changer (exam day 77) | hybrid | 31.4 (49) | 85% | 94% (92%-96%) | 0.132 | 0 (1) | 7 (0) | 0.30 (0.18-0.45, 345, fitted) |
| crammer (exam day 21) | fixed_v1 | 42.7 (56) | 83% | 100% (045 retention) | 0.102 | 0 (0) | 3 (0) | - |
| crammer (exam day 21) | proposed | 34.3 (45) | 75% | 92% (89%-95%) | 0.166 | 0 (0) | 13 (0) | 0.53 (0.32-0.89, 103, fitted) |
| crammer (exam day 21) | hybrid | 45.0 (57) | 83% | 96% (94%-97%) | 0.101 | 0 (0) | 2 (0) | 0.82 (0.49-1.35, 135, fitted) |
| steady (exam day 70) | fixed_v1 | 21.6 (34) | 79% | 99% (045 retention) | 0.207 | 2 (2) | 7 (2) | - |
| steady (exam day 70) | proposed | 26.9 (50) | 80% | 91% (88%-93%) | 0.177 | 1 (1) | 9 (1) | 0.30 (0.18-0.45, 269, fitted) |
| steady (exam day 70) | hybrid | 25.7 (43) | 84% | 94% (92%-96%) | 0.134 | 0 (1) | 3 (0) | 0.41 (0.25-0.63, 257, fitted) |
| inconsistent (exam day 63) | fixed_v1 | 25.0 (57) | 75% | 97% (045 retention) | 0.282 | 3 (22) | 8 (3) | - |
| inconsistent (exam day 63) | proposed | 24.8 (60) | 79% | 90% (88%-93%) | 0.192 | 0 (7) | 5 (0) | 0.27 (0.18-0.41, 223, fitted) |
| inconsistent (exam day 63) | hybrid | 26.9 (60) | 80% | 91% (88%-93%) | 0.182 | 0 (5) | 5 (0) | 0.27 (0.18-0.41, 242, fitted) |
| expert_hinter (exam day 56) | fixed_v1 | 29.9 (39) | 80% | 100% (045 retention) | 0.241 | 0 (0) | 8 (0) | - |
| expert_hinter (exam day 56) | proposed | 24.4 (32) | 78% | 90% (87%-93%) | 0.178 | 0 (1) | 9 (0) | 1.14 (0.69-1.90, 75, fitted) |
| expert_hinter (exam day 56) | hybrid | 28.3 (32) | 73% | 87% (83%-91%) | 0.176 | 1 (1) | 16 (1) | 0.97 (0.58-1.60, 82, fitted) |
| credential (check day 90) | fixed_v1 | 18.8 (24) | 83% | 100% (045 retention) | 0.226 | 0 (6) | 6 (0) | - |
| credential (check day 90) | proposed | 10.1 (12) | 43% | 75% (70%-79%) | 0.289 | 14 (18) | 30 (14) | 0.32 (0.19-0.49, 128, fitted) |
| credential (check day 90) | hybrid | 11.2 (12) | 46% | 76% (72%-80%) | 0.255 | 5 (8) | 32 (5) | 0.32 (0.21-0.49, 142, fitted) |
| prior_wrong (exam day 60) | fixed_v1 | 34.7 (50) | 79% | 100% (045 retention) | 0.301 | 0 (0) | 10 (0) | - |
| prior_wrong (exam day 60) | proposed | 35.8 (40) | 76% | 85% (81%-87%) | 0.259 | 0 (6) | 10 (0) | 0.14 (0.09-0.19, 307, fitted) |
| prior_wrong (exam day 60) | hybrid | 36.8 (40) | 81% | 88% (85%-91%) | 0.235 | 0 (4) | 7 (0) | 0.18 (0.12-0.27, 315, fitted) |

## Sources (read 2026-11-14)

- open-spaced-repetition, awesome-fsrs wiki, "The Algorithm" (last edited
  2026-07-28): FSRS-6 retrievability with trainable decay, the w0-w20
  defaults, FSRS-5 difficulty and same-day formulas, and the FSRS v4 recall
  and lapse formulas that later versions keep.
  https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
  (the old fsrs4anki wiki page now points there).
- fsrs-rs 6.6.2 (docs.rs, published 2026-10-20), `src/fsrs/training.rs`
  `compute_parameters`: fewer than 8 training items gives default parameters,
  and fewer than 64 fits initial stability only. Read through a summarizing
  fetch of the source page; the line quotes were given, but I did not see the
  file raw.
- Anki manual, FSRS FAQ: the optimizer runs on any number of reviews since
  Anki 24.06.3, and re-optimizing about once a month is enough. Read through a
  summarizing fetch.
- AnkiWeb forum, "How many reviews for accurate optimization?" (2024-12-18):
  a contributor recalls pretraining from 8 reviews and full optimization from
  64, hedged "IIRC". Used only as corroboration of the fsrs-rs code.
- Not read: py-fsrs scheduler source (the fetch was refused). The 1.2x help
  cap and the rule that a lapse never raises stability are our choices, not
  FSRS's.
