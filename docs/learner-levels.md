# Learner levels (REQ-252, phase 1A; REQ-255, REQ-256)

Built 2026-11-12 from the design "Teaching learners at every level" and
Nick's decisions of that day (which override the design body). Phase 1A is
the level machinery for every course plus the level-aware lesson flow on a
per-course switch, on for Python and JavaScript (phase 1) and, from REQ-257
(2026-11-12), DPT, PTPREREQ, CCRNADULT and AWSSAA once their Key terms were
written, and AWSMLA, SECPLUS and CNA (REQ-258) once theirs were.

## What a learner sees

- **The goal question, asked when the course is picked (REQ-255, Nick
  2026-11-12).** The per-course goal question (approved 2026-11-10) is
  asked once per course, wherever it comes first:
  - **Welcome steps, first course:** "Why are you taking <course>?" right
    after the account's experience question (`IntakeFormFields`
    `courseGoal`). Saved with `PUT /api/courses/:id/level { goal, via:
    "intake" }` after the first run records the course, and only when the
    answers were submitted with Continue; a failed save is quiet (the next
    two ask again). Its level is the suggestion, with the experience answer
    saved beside it winning.
  - **"Start course"** (the course page's primary button when nothing is
    started; Explore opens the course page) on a course never asked opens
    a sheet (`GoalStartSheet`): one tap on a reason saves and opens the
    first lesson; the starting level is pre-selected from the suggestion
    and folded into one line with "Change" (the concrete self-rating); a
    level the learner picked there is sent with the goal, otherwise the
    server sets the goal's suggestion. "Skip for now" keeps the suggestion
    and starts the lesson, and counts as asked. A failed skip still starts
    the lesson. "Continue" never opens it.
  - **Fallback: the first lesson** opened in a course never asked shows a
    one-tap card above the lesson (`LessonGoalCard`), at any step, never
    blocking it. A reason or "Not now" (`dismiss: true`) is saved; both
    count as asked, so no later lesson shows it. The open lesson keeps the
    level it started with (a change mid-way would swap the guess step under
    the learner); the answer applies from the next lesson. A card the
    learner neither answers nor dismisses shows again in the next lesson,
    **at most in two lessons (REQ-256):** before showing it the lesson asks
    `POST /api/courses/:id/level/goal-card { objectiveId }`, which counts
    the lessons it was shown in on the server (`goal_card_shown`, once per
    lesson, so reopening the same lesson, a restart or cleared app storage
    does not add or reset a showing). In the third lesson it is recorded
    dismissed exactly as "Not now" is (`answered_at` set; `course_goal_set`
    outcome dismissed, via lesson) with `reason: "auto"`, and not shown.
    Nothing shows until the server answers; a failed ask shows the card as
    before. REQ-255 builds still installed don't ask, so they keep showing
    it until it is answered or dismissed.
  - **"Asked"** is `learner_course_profiles.answered_at` (`answered` in the
    level state): set by an answer, a skip or a dismiss anywhere.
- **Course page:** a change point, never the main ask: "Why you're taking
  it" with the answer (or "Not answered") and "Change", the chip "Level:
  New · change", and any unacknowledged automatic level change. Both open
  the level settings. REQ-252 builds still installed ask on the course page
  as before; the server accepts both.
- **Course level settings** (`/course/:trackId/level`, from either chip or
  "Change"): the goal, the course level and an optional level per unit.
- **Lesson, pilot courses only** (`subject_tracks.level_flow`):
  - the level chip under the step header, below REQ-253's "Key terms"
    button (one button; nothing added beside it);
  - **New:** the Key terms sheet opens once at the start of the lesson
    (`initiallyOpen`, only when the lesson starts at its first step, so a
    resumed lesson does not pop it open again; `openKeyTermsAtStart`);
  - **New:** a one-tap hunch instead of the typed guess (3-4 options plus
    "No idea yet", with "Just teach me" always visible; no score and no
    model call, one line back), the full worked example before Guided by
    default, and the mastery ladder filling as the small checks are done;
  - **Experienced:** "Skip guided" offered by default (still a choice);
  - **Some background:** today's lesson;
  - **everyone:** the same Solo check and mastery rules.
  - On the done screen: "You can now...", the first guess beside the answer
    now, credit for a comeback after a miss, and the ladder.
- **Automatic level changes, every course:** after a solo answer, if 4 of
  the learner's last 5 first-try solo answers in that unit were correct
  without a hint, the unit moves up one level and a notice with OK and Undo
  appears on the done screen, and on the course page and level settings
  until acknowledged. Nothing moves down on its own.
- **Suggested move down, pilot courses only (REQ-256, Nick 2026-11-12):**
  at the same moment (the done screen's level check, when nothing moved
  up), if the unit's recent answers show it is tougher than expected, the
  done screen asks: "“<unit>” seems tougher than expected. Want more
  step-by-step help there?", says what the lower level changes, that the
  solo check and mastery bar stay the same and that it can be switched
  back, and offers **Yes, more help** and **Not now**.
  - **Yes** moves that unit down one level (never below New): the unit's
    own level, source `self`, recorded in `learner_level_changes` with
    reason `suggested` and the unit's prior level, so the **Undo** shown
    right after puts it back exactly (the same Undo route as automatic
    changes). It is already seen, so it is never a course-page notice.
  - **Not now** snoozes it for that unit for a week.
  - At most one suggestion per unit per week (counted from the latest
    suggestion or Not now), so a suggestion left unanswered also waits a
    week. Only on courses with `level_flow`: elsewhere lessons are the same
    at every level and "more step-by-step help" would not be true. Only for
    builds that send `suggest: true`; older builds get no suggestion and
    nothing is recorded for them.

Other courses: the goal and level are asked (in the same places) and
saved, and the level can move up; lessons are unchanged until `level_flow`
is switched on. The goal sets the starting level on every course.

## Rules (named constants)

`backend/lib/learner-level-rules.ts`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `GOAL_LEVEL` | work, current: experienced; program: some; career_change, interest: new | starting suggestion from the goal |
| `EXPERIENCE_LEVEL` | new, some, experienced; retake: experienced | the account intake answer, which wins on a conflict |
| `DEFAULT_LEVEL` | some | with neither answer |
| `LEVEL_UP_WINDOW` | 5 | first-try solo answers looked at, newest first, one per objective |
| `LEVEL_UP_MIN_FIRST_TRY_CORRECT` | 4 | correct and not assisted (no hint) |
| `LEVEL_DOWN_WINDOW` | 5 | first-try solo answers, and typed guesses, looked at for the move-down suggestion (newest first, one per objective) |
| `LEVEL_DOWN_MIN_MISSED` | 3 | weighted misses in the window that suggest moving down: incorrect or partial counts 1, a right answer that used a hint counts `LEVEL_DOWN_HINTED_WEIGHT` |
| `LEVEL_DOWN_HINTED_WEIGHT` | 0.5 | Nick, 2026-11-12: "using a hint is partial credit". A hinted right answer is half a miss toward the suggestion (2 misses + 2 hinted = 3) and never counts toward moving up |
| `LEVEL_DOWN_MIN_GUESSES` | 3 | "every guess off" needs at least this many typed guesses in the window, all off |
| `LEVEL_DOWN_SNOOZE_DAYS` | 7 | at most one suggestion per unit in this many days; Not now snoozes for the same |
| `GOAL_CARD_MAX_SHOWINGS` | 2 | lessons the lesson goal card is shown in before it is recorded dismissed (auto) |

The app mirrors the `LEVEL_DOWN_*` and `GOAL_CARD_MAX_SHOWINGS` numbers in
`mobile/src/lib/learnerLevel.ts`; `mobile/src/lib/levelDown.test.ts` pins
them to the server's.

The guesses are the model's `guessMatch` (close / partial / off) on a typed
guess, recorded by the guess-feedback route as `guess_matched` (the label
only, never the guess). The one-tap hunch for New has no match, and New
can't move down anyway.

Only answers given after the last change to that unit's (or the course's)
level count, for moving up and for the suggestion down alike, so an Undo or
the learner's own change is never overridden by the evidence it already
saw. Undo is refused (409) once a newer change to
the same unit exists.

## Mastery ladder

`mobile/src/lib/learnerLevel.ts` `ladderFor`. Seen: reached Teach (or any
status above Not started). Understood: the Teach self-explanation done, or
a Guided or Solo answer at least partly right. Practiced: a right Guided or
Solo answer, or status Guided. **Mastered: status Independent or above.
Kept: status Transfer-ready.** Those two are today's rules unchanged
(migration 074). Needs review shows a "Due for review" line.

## Measurement

`learner_events` (first party, no answer text), with a `detail` jsonb built
by the server from fixed keys (`lessonEventDetail`):

| Event | Detail | Answers |
| --- | --- | --- |
| `guess_shown` | level, flow, kind (option / typed) | drop-off at Guess |
| `guess_answered` | kind (option / no_idea / typed), seconds | time in Guess |
| `guess_skipped` | seconds | "Just teach me" taps |
| `teach_card_viewed` | card | drop-off at each Teach card |
| `lesson_step_reached` | step | drop-off between steps, completion |
| `guided_skipped` | | Experienced skipping Guided |
| `key_terms_opened`, `key_terms_closed` | seconds (on close) | whether the primer is opened and how long it stays open |
| `course_goal_set` | outcome (answered / skipped / dismissed), goal (when answered), via (intake / start / lesson / settings; none from a REQ-252 build), reason auto (the lesson card dismissed after two lessons, REQ-256) | where the goal gets answered, how often it is put aside; a skip or dismiss is recorded only the first time |
| `level_changed` | from, to, reason (learner / mastery / suggested / undo), scope | how often levels change; `suggested` is a Yes to the move-down suggestion |
| `guess_matched` (080) | match (close / partial / off) | the "every guess off" signal; written by the guess-feedback route |
| `level_down_suggested` (080) | unit, from, to, why (missed / guesses) | how often the suggestion is shown |
| `level_down_declined` (080) | unit | Not now; accepted ones are `level_changed` with reason `suggested` |
| `goal_card_shown` (080) | (objective_id) | lessons the goal card was shown in |

Every lesson event carries the learner's level and whether the flow was on.
First-try accuracy on Guided and Solo comes from `attempts`, as today.

## Watching the goal question (REQ-256)

Read-only, from the `course_goal_set` events above (no extra tracking).
`npm run metrics [-- --days 30]` prints it under "Goal question"
(`backend/lib/metrics.ts` `GOAL_QUESTION_SQL`); to run it by hand, the same
query (a test keeps the two identical), with `$1` the number of days:

<!-- goal-question-sql -->
```sql
with g as (
  select e.user_id, e.track_id, e.created_at,
         coalesce(e.detail->>'via', 'none') as via,
         coalesce(e.detail->>'outcome', 'answered') as outcome,
         e.detail->>'reason' as reason
    from learner_events e
   where e.event = 'course_goal_set'
     and e.created_at >= now() - make_interval(days => $1)
)
select g.via,
       count(*)::int as total,
       count(*) filter (where g.outcome = 'answered')::int as answered,
       count(*) filter (where g.outcome = 'skipped')::int as skipped,
       count(*) filter (where g.outcome = 'dismissed')::int as dismissed,
       count(*) filter (where g.outcome = 'dismissed' and g.reason = 'auto')::int as dismissed_auto,
       count(*) filter (where g.via = 'start' and g.created_at < now() - interval '1 hour')::int as start_settled,
       count(*) filter (where g.via = 'start' and g.created_at < now() - interval '1 hour' and not exists (
         select 1 from learner_events l
          where l.user_id = g.user_id and l.track_id = g.track_id
            and l.event = 'lesson_started' and l.created_at >= g.created_at))::int as start_no_lesson
  from g
 group by g.via
 order by g.via
```

- **Start-course drop-off** = `start_no_lesson / start_settled` on the
  `start` row: sheets answered or skipped more than an hour ago that were
  not followed by a lesson start (`lesson_started`: a first answer or a
  saved position) in that course. A sheet closed without a tap writes
  nothing, so it is not in either number; the real drop-off is at least
  this.
- **Skip rate** = `skipped / total`, **dismiss rate** = `dismissed / total`,
  per `via`; `dismissed_auto` is the part of the dismissals the server
  recorded after two ignored lesson cards. `none` is a REQ-252 build or an
  event from before REQ-255 (those have no outcome and were answers).
- Usage is still test traffic; read every rate with its counts.

## Hunch options

The hunch uses the lesson's existing **Guided item** (its question and its
choices, already in this learner's shuffled order, no key on the device): a
prediction on the very item practised after the teaching. When the practice
half is still generating (first visit to an objective with no cached
lesson), the typed guess is shown instead. A lesson-specific hunch would
need new generated content: the smallest addition is one optional field on
the lesson intro schema, `guessChoices` (3 short plausible predictions for
the existing `guessPrompt`, no key, no grading), which the app already
prefers when present (`hunchQuestion`). Not generated in phase 1A.

## Explain first / Example first (REQ-262, phase 2)

A per-learner comfort setting and an A/B test, on from day one (Nick,
2026-11-13). Settings, under Study, "Lesson order". Example first moves the
worked-example card to the front of Teach; everything else, the solo check and
the mastery rules included, is the same. A learner who has not chosen is given
an order at random once (`learner_teach_order`, migration 082) and keeps it in
every course; choosing is recorded (`chosen_at`). It runs in every course and
does not touch the level flow: what New and Experienced get around Guided is
unchanged. Lesson events carry `order` and `order_source` in `detail`. How to
read the results, and the query: docs/teach-order-test.md.

## Switching the flow on for more courses

```sql
update subject_tracks set level_flow = true where user_id is null and code = 'SECPLUS';
```

or `levelFlow: true` on the track in `backend/supabase/seed/data.ts` (the
seed sets it and never clears it).
