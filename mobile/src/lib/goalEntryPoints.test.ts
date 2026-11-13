// REQ-255 (Nick, 2026-11-12): the per-course goal question is asked when the
// learner picks a course, not later -- the welcome intake for the first
// course, a sheet on "Start course" for later ones, a one-tap card in the
// first lesson as the fallback -- and asked once. The course page's panel is
// a change point that never prompts. Pure rules first, then source checks
// that each screen is wired to them (there is no renderer in these tests).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GOAL_CHOICES,
  GOAL_QUESTION,
  GOAL_VIA,
  NOT_NOW,
  SKIP_FOR_NOW,
  asksAtStart,
  goalAnswerBody,
  goalLabel,
  goalSummary,
  intakeGoalBody,
  intakeGoalQuestion,
  lessonGoalDone,
  showsLessonGoalCard,
  startingLevelLine,
} from "./learnerLevel.ts";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("where the goal is asked", () => {
  test("the places the app reports are the server's list", () => {
    const rules = src("../../../backend/lib/learner-level-rules.ts");
    const m = /export const GOAL_VIA = \[([^\]]*)\]/.exec(rules);
    assert.ok(m);
    assert.deepEqual([...m![1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]), [...GOAL_VIA]);
  });

  test("Start course asks only on a course never asked about, and only for the first lesson", () => {
    assert.equal(asksAtStart({ answered: false }, "start"), true);
    assert.equal(asksAtStart({ answered: true }, "start"), false, "answered, skipped or dismissed anywhere");
    assert.equal(asksAtStart({ answered: false }, "continue"), false);
    assert.equal(asksAtStart({ answered: false }, "review"), false);
    assert.equal(asksAtStart(null, "start"), false, "level state unknown: start the lesson, the card covers it");
  });

  test("the lesson card shows only while never asked, and keeps its confirmation once acted on", () => {
    assert.equal(showsLessonGoalCard({ answered: false }, "ask"), true);
    assert.equal(showsLessonGoalCard({ answered: true }, "ask"), false);
    assert.equal(showsLessonGoalCard(null, "ask"), false, "a failed level load shows no card");
    assert.equal(showsLessonGoalCard({ answered: true }, "saved"), true);
    assert.equal(showsLessonGoalCard({ answered: true }, "dismissed"), true);
  });

  test("one tap sends the goal; the level goes along only when the learner picked one", () => {
    assert.deepEqual(goalAnswerBody("career_change", "start", null), { goal: "career_change", via: "start" });
    assert.deepEqual(goalAnswerBody("work", "start", "some"), { goal: "work", level: "some", via: "start" });
    assert.deepEqual(goalAnswerBody("interest", "lesson", null), { goal: "interest", via: "lesson" });
  });

  test("the intake saves only an answered goal, and names the course in its question", () => {
    assert.equal(intakeGoalBody(null), null);
    assert.deepEqual(intakeGoalBody("program"), { goal: "program", via: "intake" });
    assert.equal(intakeGoalQuestion("Python Programming"), "Why are you taking Python Programming?");
    assert.equal(intakeGoalQuestion("  "), GOAL_QUESTION);
  });
});

describe("wording", () => {
  test("the summary shows the answer, or that there isn't one, and never asks", () => {
    assert.equal(goalSummary({ goal: "work", answered: true }), "I use this at work regularly");
    assert.equal(goalSummary({ goal: null, answered: true }), "Not answered");
    assert.equal(goalSummary({ goal: null, answered: false }), "Not answered yet");
    for (const g of GOAL_CHOICES) assert.equal(goalLabel(g.id), g.label);
    assert.equal(goalLabel(null), null);
  });

  test("the starting level says whether it is suggested or chosen", () => {
    assert.match(startingLevelLine("new", false), /^New \(suggested/);
    assert.equal(startingLevelLine("experienced", true), "Experienced (your choice)");
  });

  test("after the lesson card: what was saved, that this lesson carries on, and where to change it", () => {
    assert.match(lessonGoalDone("saved", "new", true), /Your level for this course is New\. It applies from your next lesson\./);
    assert.ok(!/next lesson/.test(lessonGoalDone("saved", "some", false)), "no lesson change to promise without the flow");
    assert.match(lessonGoalDone("dismissed", null, true), /any time with Change on the course page/);
    assert.equal(SKIP_FOR_NOW, "Skip for now");
    assert.equal(NOT_NOW, "Not now");
  });
});

describe("screens are wired (source checks)", () => {
  const lesson = src("../../app/(app)/course/[trackId]/lesson/[objectiveId].tsx");
  const course = src("../../app/(app)/course/[trackId]/index.tsx");
  const panel = src("../components/CourseLevelPanel.tsx");
  const welcome = src("../../app/(app)/welcome.tsx");
  const intakeForm = src("../components/IntakeForm.tsx");
  const settings = src("../../app/(app)/course/[trackId]/level.tsx");
  const comps = src("../components/LearnerLevel.tsx");

  test("the course panel is a change point: no goal form, no skip, a Change to the level settings", () => {
    assert.ok(!/GoalAndLevelForm/.test(panel), "the panel no longer holds the question");
    assert.ok(!/skip: true/.test(panel));
    assert.match(panel, /GoalSummaryRow/);
    assert.match(panel, /\/course\/\$\{trackId\}\/level/);
  });

  test("Start course goes through the sheet when the course was never asked", () => {
    assert.match(course, /onPress=\{pressStep\}/);
    assert.match(course, /asksAtStart\(level\.state, step\?\.kind\)/);
    assert.match(course, /<GoalStartSheet/);
    assert.match(course, /goalAnswerBody\(goal, "start", picked\)/);
    assert.match(course, /\{ skip: true, via: "start" \}, true\)/, "a failed skip still starts the lesson");
  });

  test("the lesson card answers or dismisses through the level API, and never blocks the lesson", () => {
    // REQ-256: still showsLessonGoalCard's rule, now behind the server's count
    // of lessons it was shown in (showsCountedGoalCard wraps it).
    assert.match(lesson, /showsCountedGoalCard\(levelState, goalCard, goalCardServer\)/);
    assert.match(lesson, /\/level\/goal-card`, \{ objectiveId: asked \}/);
    assert.match(lesson, /\{ goal, via: "lesson" \}/);
    assert.match(lesson, /\{ dismiss: true, via: "lesson" \}/);
    // The card is drawn beside the step content, not instead of it: the guess
    // step still renders whatever the card shows.
    const card = lesson.indexOf("<LessonGoalCard");
    const guess = lesson.indexOf('step === "guess" && hunch');
    assert.ok(card > 0 && guess > card, "the card sits above the lesson's first step");
    assert.ok(!/goalCard[^\n]*return \(/.test(lesson), "no early return on the card");
  });

  test("the welcome intake asks beside experience and saves after the first run records the course", () => {
    const exp = intakeForm.indexOf("How much do you already know?");
    const goal = intakeForm.indexOf("intakeGoalQuestion(courseGoal.courseTitle)");
    const hours = intakeForm.indexOf("Hours a week for study");
    assert.ok(exp > 0 && goal > exp && hours > goal, "right after the experience question");
    assert.match(welcome, /courseGoal=\{\{ courseTitle: goal\.title/);
    const firstRun = welcome.indexOf("await completeFirstRun(");
    const save = welcome.indexOf("intakeGoalBody(pendingCourseGoal.current)");
    assert.ok(firstRun > 0 && save > firstRun, "saved once the course is the learner's");
    assert.match(welcome, /pendingCourseGoal\.current = answered \? courseGoal : null/, "Skip these questions saves no goal");
  });

  test("the level settings report where a change came from", () => {
    assert.match(settings, /via: "settings"/);
  });

  test("targets are 48 dp and every control is labeled", () => {
    assert.match(comps, /option: \{[^}]*minHeight: 48/);
    for (const name of ["GoalButtons", "GoalStartSheet", "LessonGoalCard", "GoalSummaryRow"]) {
      const start = comps.indexOf(`function ${name}`);
      assert.ok(start > 0, name);
      const body = comps.slice(start, comps.indexOf("\nexport function", start + 10) > 0 ? comps.indexOf("\nexport function", start + 10) : undefined);
      // Each control's props run to the next control (arrows in handlers
      // rule out a simple [^>]* match).
      const starts = [...body.matchAll(/<(Pressable|Button)\b/g)].map((m) => m.index!);
      assert.ok(starts.length > 0, name);
      starts.forEach((at, k) => {
        const props = body.slice(at, starts[k + 1] ?? body.length);
        assert.match(props, /accessibilityLabel=|label=/, `${name}: ${props.slice(0, 60)}`);
      });
    }
    assert.match(comps, /accessibilityViewIsModal/);
    assert.match(comps, /SheetModal/, "the sheet hides under the lock (REQ-192)");
  });
});
