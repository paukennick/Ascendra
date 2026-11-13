# Lesson primers ("Key terms")

REQ-253, phase 1B of "teaching learners at every level" (design of
2026-11-12, sections 4 and 5, with Nick's decisions of the same day). Built
2026-11-12.

## What the learner sees

A **Key terms** button sits beside the step header of every lesson, at every
step (Guess, Teach, Guided, Solo, Try it, Done). It opens a sheet listing the
words the lesson uses. Each term has:

- one plain sentence a newcomer understands,
- an everyday example,
- the precise wording the exam (or the official material) uses.

About 8 terms at most, most basic first, and no term explained with another
term the list does not explain. The sheet shows a loading state the first
time ("Preparing the key terms (first time only)..."), an error with **Try
again**, and, once loaded, opens from the copy kept on the device when the
phone is offline ("Showing the copy saved on this device"). The copy is per
learner (`ascendra.keyTerms.<userId>.<objectiveId>`) and is removed at
"Log out" with the learner's other local data.

The button is `KeyTermsButton` in `mobile/src/components/KeyTerms.tsx`
(exported with `KeyTermsSheet` and `useKeyTerms`). It has a 48 dp target,
`accessibilityRole="button"`, a label and a hint; each term is read as one
element ("variable. A name for a value. Example: ... On the exam: ..."). The
sheet is a `SheetModal`, so it hides under the app lock. `initiallyOpen` opens
it once when it mounts: the levels work (another branch) uses that to show it
to New learners at the start of a lesson.

## Storage

`lesson_primers` (migration 079): one row per objective, shared by every
learner, no level and no learner column.

| column | |
| --- | --- |
| `objective_id` | primary key, deleted with the objective |
| `terms` | jsonb array of 1 to 12 `{term, plain, example, exam_wording}` |
| `source_lesson_hash` | sha256 (hex) of the lesson text it was written from |
| `model` | the writer model |
| `generated_at` | when it was written |

RLS on with no API-role access (as every table since 026); `app_runtime` has
DML through `app_runtime_sync()` (REQ-207). A primer held back is logged in
`item_holdbacks` with `item_kind = 'primer'` (079 restates `item_holdbacks_item_kind_067` under the same name, so 067's probe and a replay of 067 keep working; FAIL-1720).
079 does not depend on 078.

## How a primer is written

`lib/primers.ts`. The prompt is written from the **finished shared lesson**:
the guess prompt, the teaching text (every teach card), and both practice
questions with their options and explanations, sent as data in an escaped
`<lesson_text>` tag. The prompt also names the technical terms the
deterministic check found, so the writer covers them.

Checks before anything is stored, cheapest first:

1. **Hard (deterministic)**: 1 to 10 terms; no empty or over-long field; no
   duplicate term; every primer term appears in the lesson (whole words,
   case and punctuation ignored, simple plurals, the parts of "X (Y)" and
   "X/Y"); every technical term of the lesson is covered; English.
2. **The writer's doubt**: confidence "low" holds it back (REQ-216).
3. **Plain-language lint** (style): the plain explanation is one sentence of
   at most 30 words; the example and the exam wording at most 40 words; a
   plain explanation that uses a technical term or acronym no key term
   explains is flagged.
4. **Fact-check** (`lib/fact-check.ts`, unchanged): one item per term, "Is
   the explanation accurate and current for this exam, the example a
   correct instance of the term, and the exam wording right?", answered
   without the key. A "No" is a disagreement and holds the primer back.

Any finding on the first draft steers **one retry**. On the retry a hard
problem fails cleanly (409, "try again"), a held one is a 409 whose words name
the reason, and style findings alone are logged and the primer is used, as
`generateValid` does. A fact-check call that fails is retryable and never a
holdback.

### What counts as a technical term

For the coverage check, a technical term of a lesson is:

- **an item the objective's title lists in parentheses**, when the lesson
  uses it: "(int, float, str, bool, None)" gives int, float, str, bool and
  None. The title is the exam's own scope.
- **an acronym or initialism** the lesson uses: 2 to 6 capital letters or
  digits with at least two capitals, plural folded ("APIs" is API). Roman
  numerals, a short list of everyday capitals (OK, US, TV, AM, PM, ID ...) and
  acronyms in the course title (a learner who chose "AWS Cloud Practitioner"
  knows AWS) are not counted.

Ordinary words that are technical in context ("variable", "patching") are
left to the writer, who is told to list every term a newcomer would not know;
a deterministic rule for them would need a dictionary. If a lesson has more
than 10 technical terms, the first 10 (title items, then acronyms by first
use) are required and the count of the rest is logged.

## Staleness

The primer stores the sha256 of exactly the text the prompt sent. When the
shared lesson changes (a content fix, a pulled check replaced) the hash
differs, and the next request writes a new primer and replaces the row. A
primer written while its lesson changed underneath is returned but not
stored. Two requests at once in one server instance share one write; across
instances the first row stored for a given lesson wins.

A learner's own regenerated lesson keeps the shared primer. The number of
primer terms that lesson does not use is logged; it never blocks.

## The route

`GET /api/objectives/:id/primer` returns `{ primer: { objectiveId, terms:
[{term, plain, example, examWording}], generatedAt, lessonHash }, cached }`.

Access is the lesson route's: signed in (401); the objective visible to the
caller and still taught (404 otherwise, `taughtObjective`); the study notice
and the 18+ confirmation where the course needs them (403 with a `code`); the
Free one-course rule. Before the shared lesson exists it waits for a
generation already running in the same instance, otherwise answers 409
`lesson_not_ready`.

**Cost and allowance (decided here).** A primer is shared content, like the
shared lesson, so writing one does **not** use the learner's plan allowance.
Its model calls are charged to the learner who opened it (REQ-202: the spend
gate's daily budget, purposes `primer` and `fact_check`), it waits at the
global daily AI ceiling (429 "being prepared"), and starting one is limited to
30 an hour per learner. Reading a stored primer costs nothing and is not
limited.

## Cost

Sonnet 5.5 at $2 / $10 per million tokens, half through batches
(lib/ai-pricing.ts; the runbook's prices of 2026-11-09). Estimates, computed
from the real prompt sizes with the repo's pricing table:

| | per primer |
| --- | --- |
| live, typical (first use: writer + fact-check) | about $0.04 |
| live, upper bound (both attempts, both fact-checks) | about $0.23 |
| batch, typical (batch writer + live fact-check) | about $0.03 |
| batch, upper bound (what `max_usd` is checked against) | about $0.21 |

The fact-check dominates: it runs on the writer's model with thinking, and
its upper bound reserves 6,400 output tokens. For the 95 Python and
JavaScript objectives: about **$2.70 typical** and about **$20 at the upper
bound** by batch. A $10 cap therefore covers about 47 of them per run; see
the runbook, "Pre-generating lesson primers".

## Pre-generation

`lib/pregen-primers.ts`, the `primers` mode of `scripts/pregenerate.ts` and of
the "Pre-generate lessons" workflow (`content: primers`). Operations:
docs/operations-runbook.md, "Pre-generating lesson primers".

## Not done here

- The levels work (078, another branch) decides who sees the sheet opened at
  the start; this branch only offers `initiallyOpen`.
- Tapping a term inside the lesson text for its definition is phase 3.
- No "Report a problem" inside the sheet: the lesson-wide "Report a problem
  with this lesson" below every step names the objective.
