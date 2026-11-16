# Shadow-mode calibration (REQ-301)

What this is for: before any learner sees a predicted-recall number, find out
whether it is honest on Ascendra's own data (design: `docs/mastery-decay-design.md`).
Shadow mode stores what the memory model predicted for each review beside what
the learner actually did. Nothing here changes scheduling, readiness or any
screen.

## Order of operations

1. Apply migration 085 (`npm run migrate`). Safe before or after the backend.
2. Deploy the backend. New reviews store their prediction (`model_source =
   live`). `DECAY_SHADOW=off` turns it off.
3. Backfill the history already on file, dry run first:
   `npm run decay:backfill` prints how many reviews it would predict and the
   mean predicted against observed. Then `npm run decay:backfill -- --apply`
   (use `--limit N` to go in batches; re-running resumes, nothing stored is
   overwritten). Run it with the owner connection, off-peak: it is read-heavy
   and replays each learner-course once per review.
4. Read the report: `npm run decay:calibration` (`-- --days 30`, `-- --source
   live`, `-- --version <label>`, `-- --json`).

## Reading the report

- Only unaided reviews count. A correct answer with the choices on screen
  tests recognition, and the model does not treat it as recall either.
- Observed means the answer was not a miss (correct or partial), which is what
  the model is fitted to. The share of fully correct answers is in the JSON.
- Gap is predicted minus observed, in points. Positive means the model is too
  optimistic, the dishonest direction REQ-117 removed from readiness.
- The bar is within about 5 points. A slice under 200 reviews is "too few to
  judge". Brier is the squared error; "flat" is the Brier of always predicting
  the slice's own observed rate. A model has to beat flat to be worth showing.
- Watch the buckets (is a 90% prediction really 90%?), the fit stage (starting
  predictions rest mostly on the goal prior), and the clinical category, where
  an optimistic number matters most.
- Backfilled rows use the course's current goal and level, not the ones then,
  so read them apart from live rows (the last section of the report).
- Each prediction was made before its outcome from earlier reviews only, so it
  is prospective for that learner. A population refit in step 2 must still hold
  out whole learners, or it will flatter itself.

## Cost and limits

Each live prediction is two reads and one update in the review's own
transaction, a few milliseconds (a 5,000-review course history is predicted
well under a second; a longer one is skipped and logged). Output of the report
carries counts and sums only: no learner id, no text.

## Changing the model

A change to the FSRS weights, the goal and level priors, the help cap or the
fit grid moves every prediction, so it needs a new `MEMORY_MODEL_VERSION` in
`backend/lib/decay-shadow.ts`; `decay-shadow.test.ts` pins the version to a
fingerprint of those constants and fails otherwise. The report filters on one
version (`--version`), so two parameter sets are never averaged.
