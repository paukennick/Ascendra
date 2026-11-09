# Labs (REQ-123, REQ-124, REQ-125)

Labs are hands-on practice for the skills an exam tests by doing: writing a
least-privilege policy, laying out a work breakdown structure, prioritising
four patients, designing a first training program. They sit beside lessons,
PBQs, unit checks and practice exams, and a finished lab counts toward
mastery on the objective it names.

## Three kinds of lab

| Kind | What the learner does | Graded | Mastery evidence |
|---|---|---|---|
| **Self-reported** (REQ-106, `objectives.lab_prompt`) | A task on their own machine, then a short report | Yes, the report | **No.** Recorded as kind `lab` with `objective_id` null (035's `attempts_lab_not_mastery_evidence`). Unchanged by this work. |
| **Build** (`labs.kind = 'build'`) | Produces one professional artifact for a fictional brief: one answer field per rubric part | Per part: met / partial / missed, with the model answer and feedback | **Yes**, as `lab_build` |
| **Case** (`labs.kind = 'case'`) | An unfolding case in 2-4 steps. Each step reveals new, authored information (it never depends on what the learner typed) and asks for a decision | Each step per part, then one summary for the run | **Yes**, as `lab_case` |

Only the CompTIA courses have self-reported labs. Build and case labs are
the ones the server can verify from what the learner writes, which is why
they can count.

## How grading works

`lib/lab-grading.ts` grades one step at a time with the fast model, using the
PBQ per-part pattern (`lib/pbq-grading.ts`) with an authored rubric:

- Each rubric part has **criteria** and a **reference answer**. The grader
  judges each part against its criteria; a different answer that meets them
  is met. The reference answer the learner sees afterwards is the stored one,
  so it never changes between learners and costs no output tokens.
- Each part's answer is fenced and escaped on its own (`fenceLearnerText`),
  so learner text is data, never instructions.
- **Trivial answers** (blank, "idk", one word, a restated question) are
  missed for that part without asking the model; when every part is trivial
  there is no model call at all.
- **Consistency**: a "correct" that the grader's own part scores contradict
  is downgraded (`lib/grade-consistency.ts`). A grader list that can't be
  lined up with the rubric never shows a part as met.
- A run's verdict: **correct** only when every part of every step is met,
  **incorrect** when none is even partly met, **partial** otherwise -- the
  same thresholds a multi-part PBQ answer gets.
- A grader confident that the rubric itself is wrong says `key-suspect`;
  that is the learner's flag on the lab ("Report a problem" below).
- Safety framing per subject family is in the grading prompt: clinical and
  fitness answers that would be unsafe in the scenario are missed for that
  part, whatever else they get right.

Cost: one fast-model call per graded step, about $0.0005 (3,200 tokens in,
450 out at Haiku 5.5 prices). A learner who finishes ten labs averaging two
steps spends about one cent. Grading is not under the daily AI budget, like
every other grader (`lib/ai-budget.ts`); it is rate limited (40 steps per 10
minutes) and counts toward the learner's daily total.

## How labs count toward mastery

A finished run records **one attempt** (`attempts.kind = 'labtask'`,
`assessment_type` `lab_build` or `lab_case`, format `open`, `objective_id` =
the lab's objective, `lab_id` = the lab). Steps of a case are stored in
`lab_run_steps`; they are not separate attempts, so a four-step case weighs
the same as a build lab or a PBQ, not four times as much.

The mastery rule (`mastery_detail()`, migration 045) is **not changed**. Its
direct-answer branch already counts any attempt on the objective that names
an `assessment_types` row, and 042's voided-answer filter applies as to
everything else. Migration 050 only adds the two rows:

| type | family | weight | application level | unit-wide |
|---|---|---|---|---|
| `lab_build` | performance | 1.5 | yes | no |
| `lab_case` | performance | 1.5 | yes | no |

**Why these values.**
- *Weight 1.5*, the same as `pbq` and the reserved single-objective
  `scenario`: a lab is multi-part applied work graded per part, the same kind
  of evidence as a PBQ answer, and heavier than a typed free response (1.0)
  because it asks the learner to produce or decide, not recall. Not heavier
  than a PBQ, so no format dominates the weighted accuracy.
- *Application level, opens Independent*: one lab with every part met (and
  weighted accuracy at or above 0.70) is enough evidence to reach
  Independent on that objective, like a typed Solo answer.
- *One family for both kinds* ("performance", which PBQs no longer
  contribute to since 045): a build lab and a case lab on the same objective
  are still one format family, so labs alone never make an objective
  Transfer-ready; that still needs a second format (free response,
  explain-back, comparison) on a later day, as the rule requires.
- *Not unit-wide*: a lab counts only on the objective it names. A unit-wide
  PBQ is spread over the unit's objectives; a lab is aimed at one skill.

**Repeats.** Each graded step shows that step's model answer. So a run of a
lab is recorded as a **repeat** (`assisted`, `assist_reason 'repeat'`) when
the learner has any graded step of the same lab in an earlier run, finished
or abandoned (`lib/grading-service.ts` `labAssistReason`, decided under the
grade lock). Under 045's rule a repeat counts at a quarter of its weight,
only the latest repeat of an item counts at all, and a repeat is never format
evidence -- so pasting the model answer back in cannot lift the level.
`lib/labs.dbtest.ts` proves both directions: a first-run win makes the
objective Independent at weight 1.5; a correct run after a miss is a repeat
and does not.

**Review schedule (REQ-124, Nick's decision 14).** A first-try run (not a
repeat) is a retrieval of the objective, so it moves the objective's spaced
review the way a Solo answer does (`recordAttemptTx`, `labReview`):

- **correct**: due `error_log` entries for the objective move one step
  (1 / 7 / 21 days, then resolved), as a correct Solo answer moves them; and
  when the objective's `review_schedule` is due it steps on, logged in
  `review_log`, as a spaced exam answer does.
- **missed or partly there**: an `error_log` entry (first re-check in a
  day), as a missed Solo answer gets; and a due schedule steps back (a
  lapse).
- **a repeat run** moves nothing either way: it is practice after seeing
  the model answers.

`lib/labs.dbtest.ts` ("REQ-124 decision 14") tests all three. The mastery
rule itself is unchanged.

## What a learner sees

- **Course dashboard**: "Hands-on labs (n)" and, per unit, "Labs (n)" --
  only on courses that have labs.
- **Labs list** (`/course/[trackId]/labs`): grouped by unit, each with its
  kind, objective, state ("In progress: step 2 of 3", "Done: some parts to
  revisit" -- never "failed") and an "Awaiting expert review" badge until a
  lab is approved.
- **Lab screen** (`/course/[trackId]/lab/[labId]`): the practice-lab
  disclaimer (REQ-125, below) with "I understand" in place of Start on a
  learner's first clinical or fitness lab, the safety note, the brief, then the current step with one labelled field per part. A case's
  later steps are not sent to the app until the earlier step is graded.
  After grading: a row per part (Met / Partly there / Not yet), the learner's
  answer, the model answer and kind feedback; at the end a summary. "Try it
  again" starts a new run, labelled as practice that counts lightly. The
  disclaimer stays above the brief with the results, and the summary ends
  with a one-line practice note. "Report a problem" is on the screen from the
  start, because the disclaimer points to it.
- **Drafts** stay on the device until graded (`src/lib/useLabDraft.ts`),
  per user, lab, run and step, with the client attempt id of what was sent,
  so a resend after a dropped connection is replayed by the server. The
  logout sweep removes them (`ascendra.draft.lab.*`).
- **Accessibility**: every field carries its part label, every result row is
  one element with a spoken label, buttons are at least 48 dp, colours are
  the AA-checked theme tokens and state is always written out.

## API

| Route | What |
|---|---|
| `GET /api/labs?trackId=` / `?unitId=` / `?objectiveId=` | Labs the learner can open, with their state. No model call. |
| `GET /api/labs/progress?trackId=` | Per-unit totals: labs, finished, correct. |
| `GET /api/labs/:id[?runId=]` | One lab: brief, steps revealed so far, the open (or latest finished) run with per-part results and the rubric of graded steps only. |
| `POST /api/labs/:id/runs { restart? }` | Start or resume a run (one open run per learner and lab). A clinical or fitness lab needs the lab-disclaimer acknowledgement first (403, `code: "lab_disclaimer_required"`). |
| `POST /api/labs/:id/acknowledgement { version }` | REQ-125: accept the practice-lab disclaimer for this lab's subject family (clinical or fitness), at the version the app showed. 201; 400 for a general lab or a superseded version. |
| `POST /api/labs/:id/submit { runId, step, answers[], clientAttemptId? }` | Grade one step. Order: validation and visibility, replay of an already-graded id (same lab, run, step and answers, else the shared 409), the run/step check, rate limit, one grading call per submission (`withGradingClaim`), then the write. The last step records the attempt. |

Visibility: a lab is served when its objective is visible to the learner
(shared catalog or their own course), not retired, not pulled by "Report a
problem", not rejected, and either approved or awaiting review.
Disclaimer-gated courses are gated here too.

**Serving (REQ-125, Nick 2026-11-07: "For now we can make the labs
available but all labs should have a disclaimer to protect us").** Every lab
is available now, including unreviewed ones in every subject family:
`LABS_SERVE_UNREVIEWED` defaults to on, and only an explicit `off` (or `0`,
`false`, `no`) hides unreviewed labs again, everywhere, with no app update
(`servedReviewStatuses` in `lib/labs.ts`). This **reverses REQ-124 decision
11**, under which unreviewed nursing, CCRN, physical-therapy and fitness labs
were never served; the stronger clinical/fitness disclaimer and its
one-time acknowledgement (below) stand in its place. Every lab not yet
approved carries `reviewStatus`, which the app shows as an "Awaiting expert
review" badge in the list and on the lab screen, and the disclaimer adds a
"not reviewed" line. Tier gating is unchanged.

## The practice-lab disclaimer (REQ-125)

The wording lives in one place, `backend/lib/lab-disclaimer.ts`, and is
sent with every lab (`disclaimer` on `GET /api/labs/:id` and the run
routes, and on the self-reported lab card's `GET /api/objectives/:id/lab`),
so it can be changed without an app update. The app shows it above the
brief before the learner starts and keeps it there with the results; the
result summary adds a one-line note.

| Shown on | Text |
|---|---|
| Every lab | This lab is a practice exercise for exam preparation. It may contain errors and is not professional advice. Ascendra is not affiliated with or endorsed by the body that runs this exam. If something looks wrong, tap Report a problem. |
| Not yet expert-reviewed | This lab hasn't been reviewed by a subject-matter expert yet. |
| Clinical (nursing, NCLEX, CCRN, physical therapy) and fitness, shown first | The people and cases in this lab are fictional, for exam practice only. It is not medical, nursing, physical-therapy or fitness advice. Never use it to make decisions about real patients or clients. Follow your program, facility policy, licensed supervisors and current guidelines. In an emergency, call your local emergency services. |

The "not affiliated" sentence is the generic form of the app's vendor line
(`mobile/src/lib/vendor.ts`); there is no server-side copy of the per-vendor
wording to share. The subject family is the course category's (the
taxonomy's `healthcare-*` categories are clinical, `health-fitness` is
fitness), the same rule `labSafetyFamily` uses for the grading prompt.

**Acknowledgement.** Before a learner's first clinical lab, and again before
their first fitness lab, the lab screen shows "I understand -- these labs are
practice only" in place of Start. Accepting records a row in
`lab_disclaimer_acknowledgements` (migration 051: learner, family, version,
time), once per learner, family and version. The server refuses to start,
resume or grade a clinical or fitness lab without one (403, "Before your
first lab in this subject, read the practice-lab disclaimer and tap \"I
understand\"."). The rows are in the account export
(`labDisclaimerAcknowledgements`) and deleted with the account. The course
disclaimer (migration 012, `track_acknowledgements`) was not reused: it is
per course and keyed to the course's disclaimer version, while this one is
per subject family.

**Changing the wording.** Edit `lib/lab-disclaimer.ts`. Bump
`LAB_DISCLAIMER_VERSION` when the meaning changes (not for a typo): every
learner is asked to accept again before their next clinical or fitness lab.

**Tier gating (REQ-124, decision 10).** Labs are Pro: `LABS_FEATURE =
"labs"` (typed `satisfies Feature`, FAIL-510) is the one feature key, shared
with the self-reported CompTIA labs. Free and Plus get one sample lab per
course -- the first approved build or case lab in course order -- labelled
"Sample lab"; the list marks every lab `access: "full" | "sample" |
"locked"` and the app shows "Part of Pro" on locked ones. `lib/lab-routes.ts
gateLab`: viewing needs full or sample access, or a run of that lab already
(own results stay readable); starting or restarting a run needs full or
sample access; resuming an open run is always allowed, so a run in
progress can be finished after a downgrade. Free also studies one course
(`requireCourseAccess`, FAIL-511). On Free a graded lab step counts as one
of the day's graded typed answers. With billing off every lab is open to
everyone, as before.

## Report a problem, quarantine and voiding

Labs are item kind `lab` (migration 050) in `item_flags`, `item_status` and
`item_holdbacks`. "Report a problem" on the lab screen sends
`{ kind: "lab", labId }`; enough independent flags (default 3) pull the lab
from every list and screen. Labs have no automated re-check (an open-ended
rubric has no key a checker can answer), so a flagged lab goes to a person.
If the person confirms it wrong, `confirmItemWrong` voids every attempt with
that `lab_id` and recomputes the learners' mastery.

Below the quarantine threshold, rising reports and a sharp drop in a lab's
correct rate open an entry in the content review queue (REQ-143,
docs/content-review.md); the lab keeps being served.

## Safety rules per subject family

| Family | Courses | Rules |
|---|---|---|
| Clinical | NCLEX, CCRN (Adult, Pediatric, Neonatal), nursing degrees, physical therapy | Every patient, family and setting is fictional and the brief says so. Framed as "exam practice, not clinical guidance". Never ask about a real patient; the answer box reminds the learner not to enter real details. Conservative, widely taught practice; where facilities differ (restraint check intervals, oxygen targets), the rubric asks for "per protocol / per order" rather than one number. Generic or fictional drug names in calculations, with every number given. Distressing topics (suicide risk) carry a line pointing to support. |
| Fitness | NASM-CPT and the other fitness courses | Every client is fictional. Not exercise, nutrition or medical advice; never "program for your own client". Screening, referral and scope of practice first (no diagnosis, treatment or diet prescription). |
| General | Cloud, project management, programming, informatics | Fictional organisations; never ask for or show real credentials, keys or company data. |

The lab content test (`backend/lib/labs.test.ts`) checks that every
clinical and fitness lab carries the framing, calls its people fictional and
never asks about "your patient/client".

## Authoring a lab

Authored labs live in `backend/supabase/seed/labs/<course>.ts`, one
`SeedLabSet` per course with the exam outline(s) in `sources`, and are
listed in `seed/labs/index.ts`. Each source is dated (REQ-142,
`seed/sources.ts`): `source(url, kind, checkedAt, recheckBy?)`, where
`checkedAt` is the day you confirmed it and `kind` sets the default
re-check (`exam_outline` and `reference` 12 months, `clinical_guideline`
and `cloud_pricing_limits` 6 months). `npm test` fails on a source without
dates; `npm run currency:report` lists what is due. The database keeps the
URLs only (`labs.sources`). A clinical or fitness lab also names the
guideline its own values rest on, or why it names none, in
`seed/labs/value-sources.ts` (`labs.test.ts` requires one or the other);
those URLs are stored after the set's, and adding one does not change the
lab's content hash or review status.

1. **Pick the skill, not the topic.** Choose the 1-3 objectives per unit
   that the exam tests by doing (see "Density" below). An objective that is
   only "know the definition" gets no lab.
2. **Name the objective by its exact title** in the seed track. The seed and
   `labs.test.ts` fail if it doesn't match an active objective.
3. **Write the brief** with every fact the learner needs, in a fictional
   setting, 60-200 words. No trick facts; no detail that changes with a
   vendor release.
4. **Build or case.** A build lab has one step (`text: ""`) whose `ask` names
   the artifact, and 2-4 parts, each one field of it. A case has 2-4 steps;
   each `text` reveals new information that follows whatever the learner
   answered (fixed branching -- never "if you chose X"); each `ask` is a
   decision; 1-3 parts per step.
5. **Rubric parts**: a short `label` (shown as the field's name), `criteria`
   specific enough that two graders would agree, and a `modelAnswer` that
   meets its own criteria. Prefer "names X and why" over a single keyword.
6. **Safety note** from `seed/labs/types.ts` for the family.
7. Run `npm test` (content rules, objectives, density, safety framing) and
   `npm run seed` twice (idempotent).

Changing an approved lab's content sends it back to `needs_expert_review`
(the content hash moves). For a major change, add a new slug and remove the
old one from the seed; the old lab is retired, and its runs and attempts
stay.

## Density: how many labs per unit

**Decision (Nick, 2026-11-07): option (d), hybrid, is adopted** as the
generator's default plan (`DEFAULT_LAB_POLICY` in
`scripts/generate-labs-lib.ts`). The later path for NCLEX and CCRN, whose
exams are built of case studies, is (c) one lab per hands-on objective for
their clinical-judgment objectives, once the first wave has been reviewed
and learners' results and flags show which labs work:
`npm run labs:generate -- --tracks NCLEXRN,CCRNADULT,CCRNPEDS,CCRNNEO --policy per_objective`
(dry run; review the list and the expert-review hours it adds before any
`--submit`). The analysis below is what the decision rested on.

Nick asked whether "1-3 labs per unit" is right. Four options, measured over
the whole seeded catalog (95 courses, 543 active units, 5,435 objectives)
with `npm run labs:generate -- --compare` (`scripts/generate-labs-lib.ts`).
"Performance objectives" are those whose wording names a performance verb
(design, calculate, prioritise, interpret, configure, plan ...) or, on
clinical courses, a condition the exam presents as a case (shock, sepsis,
failure, crisis ...): 2,941 of 5,435 by that heuristic.

| Option | Labs | Units with a lab | Performance objectives covered | Max per unit | Median per course | Generation | Expert review |
|---|---|---|---|---|---|---|---|
| (a) fixed: 2 per unit (1 where a unit has one skill) | 954 | 543 / 543 | 32% | 2 | 10 | ~$17 | 469 labs, ~84 h |
| (b) by blueprint weight: 12 per course split by unit weight | 990 | 464 / 543 | 34% | 7 | 12 | ~$18 | 459 labs, ~80 h |
| (c) one per performance objective | 2,941 | 497 / 543 | 100% | 34 | 19 | ~$53 | 1,199 labs, ~209 h |
| **(d) hybrid: 1 per unit + 6 per course split by weight, max 3 per unit** | **1,006** | **543 / 543** | **34%** | **3** | **10** | **~$18** | **475 labs, ~84 h** |

Generation is about $0.018 a lab (Sonnet via the Batch API, plus one
fast-model check, plus a quarter for regenerations). Expert review assumes
every clinical and fitness lab is read in full (~12 minutes each) and a 20%
sample, at least two per course, of the rest (~8 minutes each). For the
brief's "1-3 per unit" over 543 units: 543 to 1,629 labs, about $10 to $30 to
generate.

**What each does for learners.**
- (a) is even but blind to the exam: a 10% domain gets as many labs as a 41%
  one, and a unit with one hands-on skill gets padding.
- (b) follows the exam but leaves 79 units with no lab at all (light domains
  round to zero) and piles up to 7 into one unit -- more repetition of one
  domain than spacing needs, while other domains get none.
- (c) gives every performance objective strong, single-objective evidence --
  the best match for "depth is weighted accuracy across all types" -- but it
  is three times the review work (209 expert hours, most of it clinical),
  and 19 labs per course median is a lot of long-form work for a learner who
  also does lessons, reviews and practice exams. Since a lab counts only on
  its objective and a repeat counts lightly, more labs per objective would
  not help; more objectives with a lab would.
- (d) guarantees every unit at least one performance check (so every domain
  is practised by doing) and gives the heavier domains up to three, without
  any unit becoming a lab marathon. Total work for a learner: about 10 labs
  per course, roughly two to three hours.

**Recommendation: (d) now, growing toward (c) where the exam is
performance-heavy.** The cost of generating labs is trivial in every option;
the constraint is expert review, which (d) keeps near 84 hours for the whole
catalog. For NCLEX and CCRN, where the exam itself is built of case studies,
the next step is (c) for the clinical-judgment objectives once the first
wave is reviewed and learners' flags and results show which labs work. The
pilot follows (d) unit by unit for the five full pilot courses (the content
test checks it).

## The pilot (authored, `needs_expert_review`)

| Course | Labs | Per unit (d) | Outline |
|---|---|---|---|
| AWS SAA-C03 | 10 (8 build, 2 case) | 3/3/2/2 | [SAA-C03 exam guide](https://docs.aws.amazon.com/aws-certification/latest/examguides/solutions-architect-associate-03.html) |
| PMP (July 2026 ECO) | 9 (6 build, 3 case) | 3/3/3 | [PMP ECO 2026](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf) |
| NCLEX-RN (2026 test plan) | 14 (7 build, 7 case) | 2/2/2/1/1/2/2/2 | [NCSBN 2026 RN Test Plan](https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf) |
| NASM-CPT | 11 (8 build, 3 case) | 2/2/2/2/2/1 | [NASM-CPT exam blueprint](https://www.nasm.org/docs/pdf/cpt7-nasm-exam-blueprint.pdf) |
| CCRN (Adult) | 12 (6 build, 6 case) | 2 per domain | [AACN CCRN exam handbook](https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en) |
| CCRN (Pediatric) | 12 (6 build, 6 case) | 2 per category (REQ-124) | same handbook, Pediatric test plan (PDF p.21-24) |
| CCRN (Neonatal) | 12 (6 build, 6 case) | 2 per category (REQ-124) | same handbook, Neonatal test plan (PDF p.27-30) |
| NCLEX-PN (2026 test plan) | 14 (6 build, 8 case) | 2/2/1/2/2/2/2/1 (REQ-148) | [NCSBN 2026 PN Test Plan](https://nclex.com/files/2026_PN_Test%20Plan-F.pdf) |
| Practical Nursing (LPN/LVN) | 12 (5 build, 7 case) | 2 per unit (REQ-148) | same PN test plan (the program's licensure outcome) |
| Certified Nursing Assistant | 12 (5 build, 7 case) | 2/2/2/2/1/2/1 (REQ-148) | [42 CFR 483.152](https://www.ecfr.gov/current/title-42/section-483.152) |
| Associate Degree Nursing (RN) | 12 (4 build, 8 case) | 2 per unit (REQ-148) | [NCSBN 2026 RN Test Plan](https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf) |
| BSN Nursing | 15 (6 build, 9 case) | 2/2/2/2/2/1/1/1/1/1 (REQ-148) | [AACN Essentials (2021)](https://www.aacnnursing.org/Portals/0/PDFs/Essentials/Essentials-Executive-Summary.pdf) |
| NPTE-PT (REQ-147) | 20 (7 build, 13 case) | 3/3/2/2 then 1 per domain | [FSBPT 2024 PT content outline](https://www.fsbpt.org/Portals/0/documents/free-resources/2024-PT-Test-Content-Outline-Bullets.pdf) |
| NPTE-PTA (REQ-147) | 19 (6 build, 13 case) | 3/3/2 then 1 per domain | [FSBPT 2024 PTA content outline](https://www.fsbpt.org/Portals/0/documents/free-resources/2024-PTA-Test-Content-Outline-Bullets.pdf) |
| DPT (REQ-147) | 14 (4 build, 10 case) | 2/2/2/2/2/2/1/1 (unweighted units) | [CAPTE 2024 PT standards](https://www.capteonline.org/globalassets/capte-docs/2024-capte-pt-standards-required-elements.pdf) |

That is 133 authored labs (80 in the first pilot, 53 for physical therapy). The CCRN Pediatric and Neonatal sets (Nick's
decision 13) follow (d) unit by unit (the content test checks it) and name
objectives that paraphrase each test plan's patient-care problems and
Testable Nursing Actions; the category weights were cross-checked on
2026-11-07 against a secondary summary because the AACN PDF could not be
fetched from that session (sources in `seed/labs/ccrn.ts`). Every one is
fictional, framed as "exam practice, not clinical guidance", and
`needs_expert_review`; a pediatric or neonatal critical-care nurse educator
must read each before it is served.

REQ-148 added the five remaining nursing courses (65 labs), at the
NCLEX-RN and CCRN depth (`backend/lib/labs-nursing.test.ts` checks them): unfolding clinical-judgment cases that walk
the NCSBN model (recognise and analyse cues, prioritise hypotheses, generate
solutions, act, evaluate), prioritisation and delegation, infection control
and medication calculations, each scoped to its licence. The LPN/VN and
NCLEX-PN labs collect data, give care within the RN's plan, reinforce
teaching and report to the RN; the CNA labs observe, measure, give personal
care and tell the nurse, and never assess or give medications; the ADN and
BSN labs carry RN assessment and judgment, and the BSN set adds population
health, evidence appraisal, quality improvement and root cause analysis,
speaking up, transitions, AI tools and ethics. Every guideline value quoted
(ADA hypoglycemia, the 2024 DKA consensus, Surviving Sepsis 2021, ACOG
Practice Bulletin 222, NICHD fetal heart rate definitions, the 2025 AHA
choking sequence, CDC precautions and PPE order, ISMP abbreviations, 42 CFR
483.12 reporting times, START triage) was read at its source on 2026-11-07;
`seed/labs/nursing-sources.ts` says which value each URL backs. The ADN,
BSN, LPN/VN and CNA weights are Ascendra's study-emphasis judgment, not a
vendor blueprint, so their per-unit counts follow the hybrid plan from
those weights. A nurse educator must read each before approval.

**Physical therapy (REQ-147).** The three entry-level PT courses follow (d)
unit by unit. Case labs dominate and walk the patient-management model
(examination, evaluation, diagnosis, prognosis, intervention, progression,
discharge or referral), with red flags, vital-sign and exercise stopping
criteria, and guideline-based interventions. NPTE-PTA rubrics keep PTA
scope: the PTA carries out and progresses care within the PT's plan,
collects data, holds treatment and reports to the PT, and never evaluates,
changes goals or the plan, or discharges (Medicare Benefit Policy Manual
ch. 15 sec. 230.1). Every value quoted as a standard (APTA/JOSPT guidelines,
ACSM-derived stopping criteria, the PVA autonomic dysreflexia guideline,
the ADA hypoglycemia guide, CMS rules, MCIDs from the original papers)
was verified on 2026-11-07 and is cited in each file's header; values that
could not be verified (a guideline SpO2 target, Wells point scores, resting
blood-pressure limits outside heart failure) appear only as a fictional
order or facility parameter. A licensed physical therapist (and, for PTA
labs, a PT or PTA educator) must read each before it is approved.

The PMP 2026 outline does not name earned value; its tasks ask for project
metrics and analysis of schedule and financial variation, which is how that
lab is framed.

### More project-management courses (REQ-150)

Authored to the same depth as the PMP pilot, one file per course
(`seed/labs/pm-*.ts`), each following (d) unit by unit
(`lib/labs-pm.test.ts` checks it, and that no objective gets two labs).
Every number in a rubric is worked in its reference answer.

| Course | Labs | Per unit (d) | Outline |
|---|---|---|---|
| CAPM (2023 ECO) | 10 (7 build, 3 case) | 3/2/2/3 | [CAPM ECO](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/capm-exam-content-outline-english.pdf) |
| PMI-ACP (Nov 2024 / Mar 2026 ECO) | 10 (6 build, 4 case) | 3/2/2/3 | [PMI-ACP ECO](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/agile-certified-exam-outline.pdf) |
| PMI-RMP (Jan 2023 ECO) | 11 (8 build, 3 case) | 2/3/2/2/2 | [PMI-RMP ECO](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/risk-management-exam-outline_updated-2024.pdf) |
| PMI-SP | 10 (6 build, 4 case) | 2/3/2/1/2 | [PMI-SP ECO](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/scheduling-professional-exam-outline.pdf) |
| PMI-PBA | 11 (8 build, 3 case) | 2/2/3/2/2 | [PMI-PBA ECO](https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/professional-business-analysis-exam-outline.pdf) |
| CompTIA Project+ (PK0-005) | 7 (5 build, 2 case) | 3/1/1/2 | [Project+](https://www.comptia.org/en-us/certifications/project/) |

Quantitative labs: CPM and float (CAPM, PMI-SP, Project+), PERT and
triangular three-point estimates with path variance, resource levelling,
earned schedule, least-cost crashing (PMI-SP), decision-tree EMV with a
break-even sensitivity and response cost-effectiveness (PMI-RMP), WSJF,
Little's Law and process cycle efficiency (PMI-ACP), payback/ROI and
weighted option scoring with a weight sensitivity (PMI-PBA). Still to
author for the PM family: PgMP, PfMP, PMI-PMOCP, PMI-CP, PMI-CPMAI and
CSPP.

### Fitness wave (REQ-149)

The other five fitness courses now have authored labs at the NASM pilot's
depth, each in its certifying body's own model and vocabulary, following (d)
unit by unit (`backend/lib/labs-fitness.test.ts` checks it). Files:
`seed/labs/fitness-<course>.ts`.

| Course | Labs | Per unit (d) | Built around |
|---|---|---|---|
| ACE-CPT | 9 (5 build, 4 case) | 2/3/3/1 | ACE IFT Model phases (Functional, Movement, Load/Speed; Base, Fitness, Performance by VT1/VT2 and the talk test), five primary movements, ACE ABC approach |
| ACSM-CPT | 7 (3 build, 4 case) | 1/3/2/1 | ACSM preparticipation screening algorithm, FITT-VP, heart-rate reserve and RPE, RM-based loads, criteria for stopping exercise, S.M.A.R.T.S. goals |
| NSCA-CPT | 10 (7 build, 3 case) | 2/3/3/2 | Periodized macro/meso/microcycles, NSCA training load chart, order, rest and tempo, technique and spotting, emergency response |
| NSCA CSCS | 12 (8 build, 4 case) | 3/1/1/2/2/2/1 | Needs analysis, force-velocity, energy systems, periodization off- to in-season, testing order and monitoring (session RPE, HRV), heat illness |
| NCCPT-CPT | 10 (6 build, 4 case) | 1/2/2/2/2/1 | Food-log review against the AMDRs, label reading, assessment battery, linear vs undulating periodization and GAS, kinetic-chain checkpoints, over-training |

Every value a lab quotes is cited in its file's header comment with the
date checked (2026-11-07): ACSM GETP 12th edition's screening model (Riebe
et al. 2015) and FITT values (Garber et al. 2011), the Physical Activity
Guidelines for Americans (2nd ed.), the 2025 AHA/ACC blood pressure
categories, ACC/AHA criteria for stopping an exercise test, the NSCA training
load chart, NATA's exertional heat illness statement, the 2025 AHA CPR
guidelines, the IOM AMDRs, CDC BMI categories and FDA %DV guidance. Values
that could not be verified against an authoritative page that session (for
example NSCA work-to-rest ratios, rest periods for hypertrophy, test-order
lists from the textbooks) are not stated as numbers; those rubrics grade the
reasoning instead. Like every lab, all 48 are `needs_expert_review` and need
an NCCA-accredited trainer or strength coach (a CSCS for the CSCS set) to read
them in full.

### Microsoft Azure wave A (REQ-155)

| Course | Labs | Per unit (d) | Outline |
|---|---|---|---|
| AZ-900 | 8 (7 build, 1 case) | 3/2/3 | [AZ-900 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900) (skills as of 2026-07-20) |
| AZ-104 | 11 (7 build, 4 case) | 3/2/2/2/2 | [AZ-104 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104) (skills as of 2023-10-26) |
| AZ-305 | 9 (6 build, 3 case) | 3/2/1/3 | [AZ-305 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-305) (skills as of 2026-04-17) |
| AZ-400 | 10 (8 build, 2 case) | 2/2/3/2/1 | [AZ-400 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-400) (skills as of 2026-07-27) |
| AZ-700 | 11 (8 build, 3 case) | 3/2/2/2/2 | [AZ-700 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-700) (skills as of 2026-07-27) |

Files `seed/labs/microsoft-az*.ts`; every figure (storage durability, SKU
limits, retirement dates, rule-set versions) cites the Microsoft Learn page it
came from in the file header and `sources`, all read on 2026-11-07. Retired
options (Basic Load Balancer, Application Gateway v1, Front Door classic) are
never offered as answers. The AZ-104 seed outline carries two objectives the
official guide does not list ("encryption at host", "soft delete for blobs and
containers"); no lab sits on them, pending the lead's decision.

### Google Cloud network, Azure AI Fundamentals and Tech+ (REQ-172)

| Course | Labs | Per unit (d) | Outline |
|---|---|---|---|
| Google Cloud Professional Cloud Network Engineer | 12 (7 build, 5 case) | 2/2/2/2/2/2 | [exam guide 042426](https://services.google.com/fh/files/misc/042426_professional_cloud_network_engineer_exam_guide_english.pdf) (re-read 2026-11-09) |
| Azure AI Fundamentals (AI-901) | 6 (4 build, 2 case) | 3/3 | [AI-901 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-901) (skills as of 2026-04-15) |
| CompTIA Tech+ (FC0-U71) | 8 (6 build, 2 case) | 1/1/1/2/1/2 | [Tech+](https://www.comptia.org/en/certifications/tech/) and the FC0-U71 objectives v1.2 |

Files `seed/labs/gcp-net.ts`, `microsoft-ai901.ts` and `comptia-techplus.ts`;
`lib/labs-it-cloud.test.ts` checks the density unit by unit, one lab per
objective, the general safety note and dated sources. Every figure the
network labs grade against (the 99.99% Interconnect and HA VPN topologies,
Cloud NAT port arithmetic, Private Google Access VIPs) cites the Google Cloud
page it came from, read on 2026-11-09; no price or quota is quoted. The
AI-901 labs apply concepts (deployment types, generation settings, prompts,
agents, Content Understanding field schemas) without SDK method names that
change between releases. All 26 are `needs_expert_review`.

## Expert review before launch

Every pilot lab -- and every generated one -- is stored as
`needs_expert_review`. Since REQ-125 these are served with the "Awaiting
expert review" badge and the disclaimer above (set `LABS_SERVE_UNREVIEWED=off`
to serve approved labs only). Review is still required, and the badge and
the "not reviewed" line stay until a person sets a lab to `approved`. For
**clinical and fitness labs this is a hard requirement**: each needs a
licensed or certified subject expert (a nurse educator for NCLEX and CCRN, an
NCCA-accredited trainer or educator for NASM) to read the brief, every step,
every criterion and every reference answer, and to record who checked it
(`reviewed_by`, `review_note`). Cloud and project-management labs need a
qualified reviewer as well; a 20% sample per course is the floor for
generated content in those families, but the hand-authored pilot should be
read in full once.

What a reviewer checks: the reference answers are correct for the current
exam version; nothing would be unsafe if acted on; the criteria are gradable
and fair (an equally good answer would be met); the case steps never depend
on the learner's earlier answer; the people are fictional and nothing asks
about a real person.

## Scaling with the generator

`npm run labs:generate` (`scripts/generate-labs.ts`) is dry-run by default:

```
npm run labs:generate                         # which objectives the policy picks that have no lab, and the cost
npm run labs:generate -- --compare            # the density table above (no database)
npm run labs:generate -- --tracks AWSSAA --policy hybrid --limit 40
npm run labs:generate -- --submit [filters]   # create a Batch API job (needs ANTHROPIC_API_KEY)
npm run labs:generate -- --collect msgbatch_...
```

It fills each unit up to the policy's count with performance objectives that
have no lab (case labs on clinical courses, build labs elsewhere). Collecting
runs every lab through `lib/lab-generation.ts saveGeneratedLab`: the writer's
own uncertainty, the content rules, then an independent fast-model check of
the whole lab (reference answers correct, nothing unsafe or unsupported,
fixed branching), failing closed. Anything held back is logged in
`item_holdbacks` (kind `lab`). Stored labs are `source 'generated'`,
`needs_expert_review`. Tested with the mock only
(`lib/labs.dbtest.ts`, `scripts/generate-labs-lib.test.ts`); it has never
been run live.
