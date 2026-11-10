# Content review queue (REQ-143)

Learners notice bad content before anyone else does. Once a day the backend
looks at what they did and said, and puts anything suspicious in a queue for
a person, with the evidence. It never pulls, hides or edits content: serving
stays governed by the quarantine and voiding rules of REQ-114
(`backend/lib/item-quality.ts`, `npm run items`).

## What opens an entry

Per item: lesson checks, review items, exam items, Quiz me questions,
comparison cards and verifiable labs; per lesson step for "Report a problem
with this lesson".

**Learner reports** (`learner_reports`). Reports are "Report a problem"
flags and the grader's key-suspect verdicts (`item_flags`, one per learner
per item), plus lesson-step reports (`support_requests` kind
`content_report`). An entry opens when, within the last 30 days,

- 3 or more different learners reported the item, or
- at least 2 learners reported it and they are at least 10% of the 10 or
  more learners who answered it in that window.

**Correct-rate drop** (`correct_rate_drop`). The item's correct rate over
the last 14 days against its own baseline (the 180 days before), counting
each learner's first answer in each window only, and leaving out voided
answers and answers given after help was shown. An entry opens only when

- the baseline has at least 30 learners and the recent window at least 20,
- the rate fell by at least 20 percentage points, and
- a one-sided two-proportion z-test gives z >= 3.09 (p < 0.001).

The minimum samples keep it silent at today's volume; the strict p-value
keeps chance flags rare when hundreds of items are checked every day (about
1 in 500-1,000 healthy eligible items per pass in simulation,
`lib/content-signals.test.ts`), and the 20-point floor ignores small drifts
from a new cohort. The thresholds are rows in `item_quality_params`
(`signal_*`), so they can be tuned without a deploy; values that would flood
the queue (a single reporter, tiny samples) are ignored.

Items a person already confirmed wrong are skipped. For an item a person
cleared, only reports after the clearing count.

## Idempotency and resolution

There is at most one open entry per item and signal. Each daily run
refreshes an open entry's evidence and "last seen" date instead of adding
another. Two runs at once: the second finds the lock taken and skips.

A resolved entry is kept as history. The same signal can open a new entry
for the item later, but only from evidence after the resolution: reports
filed after it, answers given after it.

## Working the queue

From `backend/`, with `DATABASE_URL` pointing at the database (as for
`npm run items`):

```
npm run review-queue -- list                 # open entries, with course, objective, evidence
npm run review-queue -- list all --json
npm run review-queue -- resolve <id> fixed "Rewrote option C; key unchanged."
npm run review-queue -- resolve <id> dismissed "Checked against the outline; correct."
npm run review-queue -- run                  # one pass now
```

To pull or void the item itself, use `npm run items -- confirm|clear`; that
also resolves the item's open queue entries with the same decision. There is
no admin screen or admin API (the app has no admin role); the queue is read
with the command above.

## Running it

`GET /api/cron/content-signals`, daily at 10:40 UTC (`backend/vercel.json`),
with `Authorization: Bearer $CRON_SECRET` like the retention purge; 503
without `CRON_SECRET`, 401 with a wrong one. Migration 055 must be applied
before the backend that calls it.
The job reads 194 days of answers through 055's partial date index on
`attempts` (`attempts_answered_created`); on production build that index
CONCURRENTLY before applying 055 (operations-runbook.md, "055 attempts
index").

## Adding a content kind

Add one SELECT to `ATTEMPT_SOURCES` in `backend/lib/content-review-queue.ts`
returning the item's answers (kind, item id, objective, label, learner,
correct, time). Its reports are picked up from `item_flags` automatically.
For sims (REQ-141): `attempts a ... where a.sim_id is not null`, item kind
`sim`. `content_review_queue.item_kind` takes any short lowercase name, so
no migration is needed.

## Generated content: what the pipeline now refuses (REQ-187)

From the 2026-11-09 content audit (prompts and pipeline findings). Code:
`backend/lib/lesson-generation.ts`, `content-validator.ts`, `fact-check.ts`,
`verify-execution.ts`, `current-facts.ts`, `authored-lessons.ts` (was
`degree-advising.ts` until REQ-195),
`chat-dispute.ts`, `lesson-fixes.ts`, `recheck-stored.ts`.

- **A disputed key is never served.** A lesson's practice half that the
  checker disputes (or the writer doubts) is regenerated once, steered away
  from the claims. If the retry fails too, nothing is stored: the learner is
  told the lesson is held for review and pointed to the lab and review, the
  content is logged in `item_holdbacks` with the first claim
  `[not served: failed again after one retry]`, and the objective is not
  tried again for 6 hours. Before REQ-187 the retry was served
  (`served_after_retry`).
- **Teaching text is held back the same way** when the writer lists
  uncertain claims or low confidence: one steered retry, then not shown.
- **The checker is at least as strong as the writer**: the writer's own model
  (`ANTHROPIC_MODEL`) at effort medium with thinking on, instead of the fast
  model with thinking off. A learner's own regenerate is checked too.
- **Distractor lint** (deterministic, before anything is stored): the key at
  most about 1.25x the mean distractor's length, no absolute cue words the
  stem does not use, no "all/none of the above", "Which TWO ..." means two
  in every option, no option that labels itself, and no explanation that
  names an option by position. A failure is regenerated once with the
  problems as a steer, then a clean 503. The stored answer position of
  lesson checks and Quiz-me questions is shuffled.
- **Verify by execution (interface only).** On academic and developer
  courses the writer may add a short Python/SymPy or JavaScript program that
  recomputes the Solo key; a mismatch holds the item back. No sandbox is
  wired up yet (`unavailableVerifier`), so in production nothing runs and
  nothing is held back for it. Remaining work: an isolated runner with no
  network, no secrets, CPU/memory caps and a hard timeout.
- **Current facts per course.** Every prompt's course framing carries a short
  dated block built from the seed: the exam, its revision, status and dates,
  or the degree plan and its version, with the date it was last checked.
- **Authored lessons for reframed courses (REQ-195, replaced R1's degree
  advising).** The CMPCBS track no longer mirrors one school's degree plan
  (Nick, 2026-11-09: "liberty degree lesson should be removed unless they can
  be reframed as general course titles. Content should be accurate to the
  course type."). Its degree-plan logistics (elective-choice lines, the
  orientation course, the worldview course, free electives, the graduation
  checklist; 17 objectives) are retired, never deleted, and a retired
  objective is not served: the lesson route answers 404 and nothing is
  generated for it. The three lines that are a real general course type --
  college composition and two neutral religion surveys -- are reframed in
  place and served authored lessons with dated sources
  (`lib/authored-lessons-cmpcbs.ts`, model `authored:course-lesson`); a
  regenerate returns the same lesson. Every active unit names the open
  textbook it is taught from (`sources` in the seed), which the generation
  prompt's current-facts block lists for that unit.
- **Chat disputes flag the key.** When a learner disputes a grade in chat,
  has a lesson check marked wrong in that course in the last 24 hours, and
  the coach's reply agrees, that item gets a `key_suspect` flag (the same
  flag the free-response grader raises), which runs the automated re-check
  and counts toward quarantine.

### Running the audit's content actions in production

Two manual workflows (Actions tab), both against `PROD_DATABASE_URL` in the
`production-database` environment, logging ids and outcomes only:

1. **Lesson fixes** (`.github/workflows/lesson-fixes.yml`, no model calls).
   Run `lookup` first: every fix should say "audited lesson present" (or "no
   stored lesson"). Then `dry-run`, read the plan, then `apply`. It voids
   the lessons with wrong keys (answers voided, mastery recomputed, lesson
   pulled), corrects the others in place with dated sources (the old content
   goes to `item_holdbacks`), and replaces any other stored lesson on an
   objective that has an authored lesson (REQ-195: the reframed CMPCBS
   composition and religion surveys) with the authored one. Re-running is safe: done fixes are skipped.
   Run it after the CompTIA objective fix is seeded or before; the SECPLUS
   fix accepts either objective title.
2. **Re-check pre-gate content** (`.github/workflows/content-recheck.yml`,
   needs the `ANTHROPIC_API_KEY` repository secret). Re-checks every
   still-served lesson check and keyed item stored before 2026-11-07 with
   the current checker. Start with a dry run and `limit` 20, then the whole
   set, then tick `apply` to pull the failures (quarantine plus a holdback
   log; nothing is voided). Work the pulled items with `npm run items --
   list | confirm | clear`.
