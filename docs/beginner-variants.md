# Beginner lesson versions (REQ-262, migration 083)

**Status: built, switched OFF.** No course has the switch on, nothing has been
generated, and nothing in the repository runs the generation script. A learner
today gets exactly the lessons they got before migration 083.

This is part 3 of "teaching learners at every level" phase 2 (design section 5).
It sits beside the per-course level flow (`docs/learner-levels.md`): the level
flow decides what a New learner is shown around Guided; a beginner version
changes what Teach itself looks like for a New learner.

## What a beginner version is

For one objective, a second version of the lesson for learners whose level in
that unit is **New**:

- **Teach in 3 to 5 small steps.** Each step has a plain explanation, one
  everyday example, the precise exam term, and one quick multiple-choice check
  with a reason for every option. Each step is about 80 words or less.
- **A Guided item written in smaller steps** (the same worked situation, last
  step left to the learner).
- **The Solo check is the standard Solo check, byte for byte.** The bar, the
  key and the mastery rules are the same at every level. A test pins this.
- The standard `teach` text and teach cards are copied; the worked example card
  still follows the steps.

There is no Experienced version: that is a display choice made from the
standard cards (`docs/learner-levels.md`).

Stored in `lesson_content_variants` (one row per objective and level 'new';
`source_lesson_hash` = the standard lesson it was written from; `consistency` =
what the consistency check said; `teach_steps`).

## When a learner is served it

All of these, decided in one place (`lib/lesson-variant.ts`, `resolveLesson`):

1. the course's switch is on (`subject_tracks.beginner_variants`, default false);
2. the course is a catalog course and **not clinical**;
3. a variant exists, is not pulled, and its `source_lesson_hash` still matches
   the standard lesson (a corrected standard lesson silently retires it, so a
   stale beginner version never contradicts a corrected one);
4. the app declares it can show Teach steps (client protocol 3);
5. the learner's effective level for the unit is New;
6. the learner has not regenerated this lesson (their own version wins).

Otherwise: the standard lesson, as before.

### Which key an answer is graded against

The app says which version it showed (`lessonVariant: "new"` on grade, hint and
report requests; absent means standard). The server grades against **that**
version and does not decide again from the level, which may have changed since
the lesson opened. The attempt records it (`attempts.lesson_variant`). If that
version is gone (switch off, variant pulled or stale) the server answers 409
`lesson_changed` and the app reloads the lesson, instead of grading against a
different question's key. Solo is identical in both versions.

The in-Teach checks are formative: checked in the app, not graded, not
attempts, and they do not change mastery. Their key travels with them, which is
fine because they are a self-check; the Guided and Solo answers are graded on
the server as always.

Review and the exam-bank copy of answered lesson checks use the standard lesson
only.

## In the app (client protocol 3)

`mobile/src/lib/teachSteps.ts` (pure, tested) and
`mobile/src/components/teachSteps.tsx`, used by the lesson screen only when the
payload says `version: "beginner"` and carries 3 to 5 well-formed steps:

- Teach is one small step at a time: plain explanation, everyday example, the
  exam's words, then a quick check with instant feedback that says why the
  picked option is right or wrong. "Skip check" is a visible link until the
  check is answered; Next is allowed either way, so a check never blocks the
  lesson.
- After the last step comes the worked example card (with its self-explanation
  prompt), then the usual way on to Guided. The definition, why and mistake
  cards are replaced by the steps.
- The grade, hint and report requests send `lessonVariant: "new"`; a standard
  lesson sends nothing, so an older server sees no new field.
- A 409 `lesson_changed` shows the server's message with a "Reload lesson"
  button: the lesson is re-read, answers given to the old version are dropped
  and the learner starts again at Teach.
- Malformed steps are never shown: the standard cards display instead.
- The app now sends `X-Ascendra-Client: 3` (was 2). The server serves a
  beginner version only to protocol 3 and up, so older installed builds keep
  the standard lesson.

**The Explain first / Example first setting does not apply to a beginner
version** (its Teach is the steps, with the example card after), and its
lesson events carry no `order`, so they are not counted in that comparison
(`docs/teach-order-test.md`). Where both are on, New learners in a switched-on
course leave the order test and the other levels stay in it.

## Clinical courses never get beginner versions

Enforced in code, not by convention, at three places:

- `resolveLesson` never serves one for a clinical course, whatever the switch
  says;
- `generateBeginnerVariant` and the script refuse a clinical course before any
  model call (`BeginnerVariantRefused`);
- "clinical" is the billing plan's own category (`courseCategoryOf` in
  `lib/billing-config.ts`), so a clinical category added there is covered
  without a second list.

A learner's own course never gets one either.

## How a version is written and checked (`lib/beginner-variants.ts`)

Built, never run. The writer sees the finished standard lesson and the
objective. The level paragraph is in the per-call turn, not the cached system
block. Checks, cheapest first, with one steered retry (as primers and lessons):

1. Hard checks (no model): 3 to 5 steps, every field present, about 80 words a
   step, each quick check a well-formed 4-option question with a reason per
   option, no option named by its position, English, the Guided item
   well-formed, no check repeating the Solo question.
2. The writer's own doubt (low confidence holds it back).
3. The distractor lint on **every** check, the in-Teach ones included, and on
   the Guided item.
4. The second-model fact-check (`lib/fact-check.ts`): each step's check, each
   step's text, and the Guided item.
5. A consistency check: a second model reads the beginner steps against the
   standard Teach and lists contradictions. Any contradiction holds it back.

Held back twice: nothing is stored and `item_holdbacks` gets rows with kind
`lesson_variant` (reviewed like any other held item). A fact-check or
consistency call that fails is retryable and never a holdback. Stored choices
are shuffled with their reasons and key moved to match.

### Cost

Worst case per objective, from `variantUpperBoundUsd()`: 2 writer calls, 2
fact-check calls (with thinking allowance) and 2 consistency calls, about
**$0.30** at Sonnet 5.5 prices (`lib/ai-pricing.ts`). A typical objective makes
one of each. The AI purposes are `lesson_variant` and `lesson_variant_check`
(coach pool). Both are live calls, not batch, so there is no batch discount.

## The 12-course launch set (LISTED, NOT SWITCHED ON)

From the design's "Which courses first": about 625 objectives.
`BEGINNER_LAUNCH_SET` in `lib/lesson-variant.ts`; a test checks that each is in
the seeded catalog and is not clinical. None has the switch on.

| Code | Course |
|---|---|
| PYTHON | Python |
| JAVASCRIPT | JavaScript |
| CMPCBS | Computer Science Degree Foundations |
| TECHPLUS | CompTIA Tech+ |
| APLUS_CORE1 | CompTIA A+ Core 1 |
| APLUS_CORE2 | CompTIA A+ Core 2 |
| NETWORKPLUS | CompTIA Network+ |
| SECPLUS | CompTIA Security+ |
| AWSCLF | AWS Certified Cloud Practitioner |
| AZ900 | Microsoft Azure Fundamentals (AZ-900) |
| GCPCDL | Google Cloud Digital Leader |
| CAPM | CAPM |

## Turning one on (a decision for Nick; nothing here does it)

1. Apply migration 083 and deploy a backend and an app at client protocol 3
   (older apps keep getting the standard lesson).
2. See the cost first. A dry run calls no model and writes nothing, and works
   while the switch is still off:
   `cd backend && npm run variants:generate -- --course PYTHON`
3. Switch the course on (a deliberate, separate step; the script never does):
   `update subject_tracks set beginner_variants = true where code = 'PYTHON' and user_id is null;`
4. Write the versions with a stated ceiling (a live run; needs the model key
   in `backend/.env.local`; stops at the ceiling in worst-case terms):
   `npm run variants:generate -- --course PYTHON --confirm --max-usd 5`
5. Read the `lesson_variant` rows in `item_holdbacks` and the outcome tally the
   script prints. Objectives held back keep serving the standard lesson.

Until step 4 finishes, a course that is on but has no variant for an objective
serves the standard lesson for that objective.

## Switching one off, or pulling a version

- Course off: `update subject_tracks set beginner_variants = false where code = ...;`
  Learners are served the standard lesson from their next lesson open. A lesson
  already open answers with the 409 above once and reloads.
- One objective: delete its row in `lesson_content_variants`, or pull its Guided or Solo
  item as any lesson item is pulled (`item_status`, kind `lesson`, keyed by the
  question text; the same mechanism the standard lesson uses).
- Everything: migration 083's header has the rollback.

## Reading results (not built)

The attempts and lesson events carry which version was shown
(`attempts.lesson_variant`), so a later comparison of New learners with and
without a beginner version is possible. No test or readout is defined here;
whether to randomize the switch per learner instead of per course is a design
decision for Nick (a per-course switch is not a randomized comparison).
