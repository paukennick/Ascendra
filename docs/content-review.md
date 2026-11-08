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

## Adding a content kind

Add one SELECT to `ATTEMPT_SOURCES` in `backend/lib/content-review-queue.ts`
returning the item's answers (kind, item id, objective, label, learner,
correct, time). Its reports are picked up from `item_flags` automatically.
For sims (REQ-141): `attempts a ... where a.sim_id is not null`, item kind
`sim`. `content_review_queue.item_kind` takes any short lowercase name, so
no migration is needed.
