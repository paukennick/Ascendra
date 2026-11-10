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
`verify-execution.ts`, `current-facts.ts`, `degree-advising.ts`,
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
- **Verify by execution (sandboxed, REQ-196).** On academic and developer
  courses the writer may add a short Python/SymPy or JavaScript program that
  recomputes the Solo key. Nothing runs in the request path: the item is
  served once the model fact-check passes and its program is queued in
  `exec_checks` (`exec_unverified`). The hourly sandbox job runs it (see
  "Sandboxed fact-checking" below). If the program cannot be queued, the
  practice half is held back (fail closed).
- **Current facts per course.** Every prompt's course framing carries a short
  dated block built from the seed: the exam, its revision, status and dates,
  or the degree plan and its version, with the date it was last checked.
- **Degree advising is authored.** The CMPCBS advising blocks (gen-ed
  electives, the Christianity core, free electives, graduation requirements,
  20 objectives) never generate a lesson. Their lesson is built from the
  plan line, its block and the plan's advising note, citing the plan
  (model `authored:degree-plan`); a regenerate returns the same lesson.
- **Chat disputes flag the key.** When a learner disputes a grade in chat,
  has a lesson check marked wrong in that course in the last 24 hours, and
  the coach's reply agrees, that item gets a `key_suspect` flag (the same
  flag the free-response grader raises), which runs the automated re-check
  and counts toward quarantine.

### Running the audit's content actions in production

Two manual workflows (Actions tab), logging ids and outcomes only. Lesson
fixes runs against `PROD_DATABASE_URL` in the `production-database`
environment; the re-check, since REQ-196, runs as the staging-only
`RECHECK_DATABASE_URL` user:

1. **Lesson fixes** (`.github/workflows/lesson-fixes.yml`, no model calls).
   Run `lookup` first: every fix should say "audited lesson present" (or "no
   stored lesson"). Then `dry-run`, read the plan, then `apply`. It voids
   the lessons with wrong keys (answers voided, mastery recomputed, lesson
   pulled), corrects the others in place with dated sources (the old content
   goes to `item_holdbacks`), and replaces generated degree-advising lessons
   with the authored ones. Re-running is safe: done fixes are skipped.
   Run it after the CompTIA objective fix is seeded or before; the SECPLUS
   fix accepts either objective title.
2. **Re-check pre-gate content** (`.github/workflows/content-recheck.yml`,
   needs `RECHECK_DATABASE_URL` and `RECHECK_ANTHROPIC_API_KEY`; see
   "Sandboxed fact-checking" below). Re-checks every still-served lesson
   check and keyed item stored before 2026-11-07 with the current checker
   and only STAGES what it disputes. Run mode `estimate` first (no calls,
   prints the cost), then `check` with `limit` 20, then `apply`. Work the
   staged items with `npm run items -- staged | confirm | clear`.

## Sandboxed fact-checking (REQ-196)

Nick, 2026-11-09: "Sandbox the fact checking and rechecking content" and
"Run simulations in the sandbox to determine the fact checker needs."

### What runs where

- **Model fact-check of new content**: request path (Vercel). A failed
  check is held back, as before. This is the only automatic step that can
  change what learners see.
- **Verify by execution**: GitHub Actions, hourly, in Docker. A
  disagreement is staged, never pulled.
- **Re-check of pre-gate content**: GitHub Actions, manual. Staged only.
- **Fact-checker eval**: GitHub Actions, manual, on a throwaway Postgres.
  Never touches production.
- **`npm run items -- confirm`**: a person, with the owner URL, on their own
  machine. The only step that pulls an item and voids answers.

Details:

- **Request path.** An item is served once the model fact-check passes. If
  it carries a verification program, a row in `exec_checks` marks it
  `exec_unverified`. If that row cannot be written, the item is held back.
- **Sandbox** (`backend/lib/sandbox-runner.ts`). Each program runs in a
  fresh container: `--network none`; no environment from the job
  (`--env-file /dev/null`, and the Docker CLI itself gets only `PATH`); a
  read-only image; 16 MB RAM-disk `/scratch` and `/tmp` that vanish with the
  container; user nobody; all capabilities dropped; no-new-privileges; 256
  MB memory with no swap; 1 CPU; 64 processes; 64 open files; 5 s wall
  clock; 4 KB of output. The program goes in on stdin. Images are built
  before any program runs and `--pull never` is set at run time. Every job
  first runs the escape tests (`npm run test:sandbox`) and a self-test with
  a canary secret; if any probe gets out, or Docker is missing, nothing runs
  and every item stays `exec_unverified`. No `@vercel/sandbox`.
- **Staging.** A finding is an `item_holdbacks` row whose `content` has
  `staged` (`recheck` or `exec`). No serving query reads it and it does not
  start the held-back cooldown. `npm run items -- staged` lists open
  findings; `confirm` pulls the item and voids answers; `clear` marks it
  fine so the jobs skip it from then on.
- **Least privilege.** The jobs connect as a LOGIN member of
  `content_recheck` (migration 064): SELECT on the content tables, INSERT on
  `item_holdbacks` and `exec_check_runs`, nothing else (no `item_status`,
  attempts, users or billing; learner ownership columns are not granted).
  Each job checks its own role first and refuses a superuser, a role that
  bypasses RLS, or one that can write `item_status` or content
  (`backend/lib/recheck-guard.ts`).
- **Model spend.** The re-check and the eval send every call's usage to an
  in-job budget (`backend/lib/run-budget.ts`), not to `ai_calls`, so they
  never count toward a learner's or the owner's AI cap. Each call starts
  only if the run can still afford the most it could cost (prompt plus all
  of `max_tokens`), and the estimate prints before any call. Defaults:
  re-check $2, eval $5, both at most $25.

### Re-check database user (Nick, once)

Never paste the password into a chat, an issue or a commit.

1. Deploy migration `064_recheck_role.sql`. It creates the NOLOGIN role
   `content_recheck`; re-running it is safe. `--status` reports it among
   the schema probes.
2. Supabase -> SQL Editor, production project. Generate a long random
   password in your password manager, then run this with that password in
   place of the placeholder:

   ```sql
   create role recheck_bot login inherit password '<from your password manager>'
     in role content_recheck;
   ```

3. Supabase -> Connect -> Session pooler. Copy the URI, change the user
   part from `postgres.<project-ref>` to `recheck_bot.<project-ref>`, and
   put the new password in place of `[YOUR-PASSWORD]`.
4. GitHub -> Settings -> Secrets and variables -> Actions -> New repository
   secret: name `RECHECK_DATABASE_URL`, value that URI.
5. For the re-check: a Claude Console workspace of its own with a monthly
   spend limit; create a key there and store it as the repository secret
   `RECHECK_ANTHROPIC_API_KEY`. For the eval: the repository secret
   `ANTHROPIC_API_KEY` (as `live-evals.yml`); a workspace with its own
   spend limit is recommended there too.
6. Run "Sandbox: verify by execution" once by hand. The log should say
   `Connected as recheck_bot (staging only).` and every probe `held`.

Until step 4 is done, the hourly sandbox workflow and the re-check workflow
fail at their first step on purpose, and nothing runs. To rotate, run
`alter role recheck_bot password '...'` in the SQL Editor and update the
secret. To remove, `drop role recheck_bot;`, then follow the rollback notes
at the top of migration 064.

### Workflows

- **Sandbox: verify by execution** (`.github/workflows/content-sandbox.yml`):
  hourly at :17, also manual. Per run at most `limit` programs (200) and
  `max_minutes` (20, at most 25) inside a 30-minute job. No model call. A
  backlog that keeps growing (`npm run items -- list` prints it) means the
  job is not running.
- **Re-check pre-gate content** (`.github/workflows/content-recheck.yml`):
  manual; modes `estimate` (default), `check`, `apply`; `budget` in USD.
- **Fact-checker eval** (`.github/workflows/factcheck-eval.yml`): manual.
  Runs the 44-item labelled set (22 known-bad from the 2026-11-09 audit, 22
  known-good; `backend/lib/fixtures/factcheck-eval-set.json`) through Haiku
  and the writer's model, each with and without thinking, plus a `+exec`
  row with sandboxed execution where an item has a program. It reports, per
  variant, overall and per subject family: recall on known-bad (with a 95%
  interval), false-hold rate on known-good, cost per check and per 1,000,
  latency p50/p95, and which items were missed or wrongly held. The
  recommendation per family is the cheapest variant with recall >= 95% and
  false holds <= 5%; if none qualifies it says so and names the best recall.
  Results go to the job summary page and the `factcheck-eval-results`
  artifact (`results.json`, `summary.md`). Tick `mock` to test the harness
  with no key and no cost. Locally: `npm run eval:factcheck` (estimate
  only) or `npm run eval:factcheck -- --run --mock`.
