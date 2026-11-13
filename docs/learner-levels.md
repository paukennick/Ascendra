# Learner levels (REQ-252, phase 1A)

Built 2026-11-12 from the design "Teaching learners at every level" and
Nick's decisions of that day (which override the design body). Phase 1A is
the level machinery for every course plus the level-aware lesson flow on a
per-course switch, on for Python and JavaScript only.

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
    learner neither answers nor dismisses shows again in the next lesson.
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

Only answers given after the last change to that unit's (or the course's)
level count, so an Undo or the learner's own change is never overridden by
the evidence it already saw. Undo is refused (409) once a newer change to
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
| `course_goal_set` | outcome (answered / skipped / dismissed), goal (when answered), via (intake / start / lesson / settings; none from a REQ-252 build) | where the goal gets answered, how often it is put aside; a skip or dismiss is recorded only the first time |
| `level_changed` | from, to, reason (learner / mastery / undo), scope | how often levels change |

Every lesson event carries the learner's level and whether the flow was on.
First-try accuracy on Guided and Solo comes from `attempts`, as today.

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

## Switching the flow on for more courses

```sql
update subject_tracks set level_flow = true where user_id is null and code = 'SECPLUS';
```

or `levelFlow: true` on the track in `backend/supabase/seed/data.ts` (the
seed sets it and never clears it).
