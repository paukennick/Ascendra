# Mock exams (REQ-298)

A mock exam is a course's real exam, as closely as an app can do it, and
honest where it cannot. Owner decisions 2026-11-14: Plus gets one mock a month,
Pro unlimited (built in REQ-122; billing is off, so everyone is treated as Pro).

## What a mock is

| | Source | Where |
|---|---|---|
| Question count, minutes, how the body reports a result, item types the mock cannot show | one typed entry per course, read at the certifying body's site and dated | `backend/lib/mock-exam-facts.ts` (`MOCK_EXAM_FACTS`) |
| Domain weights | the seed's unit weights (`course_units.weight`), which the blueprint tests keep at 100; used as the exam's only when the course has a published blueprint (`weightsAreExamBlueprint`) | `backend/supabase/seed/tracks/*` |
| Courses with no single exam (CNA, DPT, PT prerequisites) | `PRACTICE_ONLY`: a mixed practice test, 50 questions, never called a copy of an exam | `mock-exam-facts.ts` |
| A course with no entry | the seeded `question_format` text, parsed (approximate; the start screen says so) | `lib/exam-formats.ts` `examQuestionCount` |

An entry wins over the parsed text. `mock-exam-facts.test.ts` requires every
entry to name an https source with the day it was read, a review date, sane
numbers, and agreement with the seed or a `seedDiffers` note saying why not.
`npm run mock:bank -- --static --facts` lists entries past their review date.

### Adding or refreshing a course

1. Read the body's own page or exam guide (not a summary) for: questions shown
   (scored and unscored), minutes, item types, how a result is reported.
2. Add or edit the entry; set `readAt` to the day you read it and `reviewDue`
   (about six months out, sooner if the exam is changing). Write `null` or omit
   what the body does not publish; never fill a gap.
3. Run `npx tsx --test lib/mock-exam-facts.test.ts`. If the seed disagrees, the
   test fails: fix the seed (a content change) or add `seedDiffers`.

## Building a form

`createSession` (`lib/exam-sessions.ts`) plans one slot per question by domain
weight (largest remainder, so the counts add up exactly) and fills them from the
shared bank (`lib/mock-form.ts` `fillSlots`), strictest first:

1. never answered and not served in the last 14 days (`RECENT_DAYS`);
2. generation for what is still missing (sprint and mock, within the spend
   gate and the per-session and per-hour caps; see "Decision" below);
3. answered before, but not served in the last 14 days;
4. anything not already in the form (last resort).

An item (or an item with the same words) is never used twice in one form.
A domain the bank cannot fill stays short; the form is not padded from another
domain, because that would change the weighting. The result is a **short form**:
`preparation.short` / `shortReason`, the start screen's "Short form: 38 of 65
questions", and a time cut to the exam's pace (`mockTimer`).

## Honest reporting

* Results say how the body reports a result (`passLine`). A scaled score is
  never computed from the percentage: the bodies do not publish the conversion.
  A passing score is quoted as a fact where it is published (AWS 720 of
  100-1000, CompTIA 750 of 100-900) and the app says so plainly where it is not
  (AACN publishes no CCRN cut score; CompTIA CAS-005 and CNX-001 are pass or fail only).
* The start screen says what the mock cannot show (CompTIA performance-based
  questions) and where each fact was read.
* No pause. A timed mock's deadline is the server's; leaving keeps the clock
  running and the session resumable until it passes. Scheduled breaks on the
  real exam are not simulated (we have not recorded each body's break rules).

## The bank report (owner view, not learner-facing)

`npm run mock:bank -- --static` needs only the seed and assumes an empty bank.
`npm run mock:bank` (no flag) reads `exam_items` through `DATABASE_URL`
(read-only). It prints, per course, the full form's length, what the bank holds
toward it per domain, the items a full form still needs, and what
pre-generating them would cost at `PREGEN_COST_PER_ITEM_USD` (3.5 cents). It
never calls a model and never writes. One form per course; a second mock with
nothing in common needs about double.

## Decision for the owner

`MOCK_TOPS_UP_BANK` (`lib/exam-sessions.ts`) is `true`: a mock start may write
bank items for empty domains, as REQ-109 did, within `MAX_GENERATIONS.mock` (12
calls, 48 items) and the AI spend gate. Set it to `false` to build mocks only
from the existing bank; short forms then stay short until the bank is
pre-generated.

## Keyboard shortcuts

The practice screen builds one `ExamNavActions` (`mobile/src/lib/examPractice.ts`:
previous, next, toggleFlag, openReview, closeReview, submit) in `RunView`
(`exam.tsx`, "the one place the practice screen's moves live"). A key handler
should call those and nothing else.
