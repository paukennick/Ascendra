// REQ-252 (levels phase 1A): the pure level rules -- the starting suggestion
// from the goal and the account experience answer, the fallback from unit to
// course, the evidence threshold for moving up, and the lesson event detail.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  COURSE_GOALS,
  DEFAULT_LEVEL,
  effectiveLevel,
  GOAL_LEVEL,
  GOAL_OUTCOMES,
  GOAL_VIA,
  isGoalVia,
  isLessonEvent,
  LESSON_EVENTS,
  lessonEventDetail,
  levelAbove,
  LEVEL_UP_MIN_FIRST_TRY_CORRECT,
  LEVEL_UP_WINDOW,
  meetsLevelUp,
  suggestedLevel,
} from "./learner-level-rules";
import { LEARNER_EVENTS } from "./events";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("starting level", () => {
  test("the goal sets it as the design says", () => {
    assert.deepEqual(GOAL_LEVEL, {
      work: "experienced",
      current: "experienced",
      program: "some",
      career_change: "new",
      interest: "new",
    });
    for (const g of COURSE_GOALS) assert.equal(suggestedLevel(g, null).reason, "goal");
  });
  test("the experience answer wins on a conflict", () => {
    // "A career changer who says Some experience is Some background."
    assert.deepEqual(suggestedLevel("career_change", "some"), { level: "some", reason: "experience" });
    assert.deepEqual(suggestedLevel("work", "new"), { level: "new", reason: "experience" });
  });
  test("retake is Experienced, not a fourth level", () => {
    assert.equal(suggestedLevel(null, "retake").level, "experienced");
  });
  test("with neither answer, today's lesson (Some background)", () => {
    assert.deepEqual(suggestedLevel(null, null), { level: DEFAULT_LEVEL, reason: "none" });
    assert.equal(DEFAULT_LEVEL, "some");
  });
  test("a unit's own level wins, then the course's, then the suggestion", () => {
    assert.equal(effectiveLevel("experienced", "new", "some"), "experienced");
    assert.equal(effectiveLevel(null, "new", "some"), "new");
    assert.equal(effectiveLevel(null, null, "some"), "some");
  });
});

describe("moving up from mastery evidence", () => {
  const strong = { verdict: "correct", assisted: false };
  const hinted = { verdict: "correct", assisted: true };
  const miss = { verdict: "incorrect", assisted: false };
  test("the thresholds are the design's: 4 of the last 5 first tries, right without a hint", () => {
    assert.equal(LEVEL_UP_WINDOW, 5);
    assert.equal(LEVEL_UP_MIN_FIRST_TRY_CORRECT, 4);
  });
  test("4 of 5 strong moves up; 3 of 5 does not", () => {
    assert.equal(meetsLevelUp([strong, strong, miss, strong, strong]), true);
    assert.equal(meetsLevelUp([strong, miss, miss, strong, strong]), false);
  });
  test("a hinted answer is not strong", () => {
    assert.equal(meetsLevelUp([strong, strong, hinted, hinted, strong]), false);
  });
  test("partial is not correct", () => {
    assert.equal(meetsLevelUp([strong, strong, { verdict: "partial", assisted: false }, miss, strong]), false);
  });
  test("a window that is not full never moves anyone", () => {
    assert.equal(meetsLevelUp([strong, strong, strong, strong]), false);
  });
  test("only the newest five count", () => {
    assert.equal(meetsLevelUp([miss, miss, strong, strong, strong, strong, strong]), false);
  });
  test("one level at a time, and nothing above Experienced", () => {
    assert.equal(levelAbove("new"), "some");
    assert.equal(levelAbove("some"), "experienced");
    assert.equal(levelAbove("experienced"), null);
  });
});

describe("lesson events", () => {
  test("every lesson event is a learner event and in 078's check", () => {
    const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "078_learner_levels.sql"), "utf8");
    for (const e of LESSON_EVENTS) {
      assert.ok((LEARNER_EVENTS as readonly string[]).includes(e), e);
      assert.ok(sql.includes(`'${e}'`), `078 allows ${e}`);
    }
    for (const e of ["course_goal_set", "level_changed"]) assert.ok(sql.includes(`'${e}'`), e);
  });
  test("milestones are not postable from the app", () => {
    assert.equal(isLessonEvent("lesson_finished"), false);
    assert.equal(isLessonEvent("level_changed"), false);
    assert.equal(isLessonEvent("guess_skipped"), true);
  });
  test("the detail keeps only known keys and values -- never text", () => {
    const d = lessonEventDetail({
      level: "new",
      flow: true,
      kind: "option",
      seconds: 12.6,
      card: 2,
      step: "teach",
      answer: "my secret answer",
      guess: "x".repeat(500),
    });
    assert.deepEqual(d, { level: "new", flow: true, kind: "option", seconds: 13, card: 2, step: "teach" });
  });
  test("out-of-range and junk values are clamped or dropped", () => {
    assert.deepEqual(lessonEventDetail({ level: "expert", seconds: 99999, card: -4, step: "nope", kind: "essay" }), {
      seconds: 3600,
      card: 0,
    });
    assert.deepEqual(lessonEventDetail(null), {});
    assert.deepEqual(lessonEventDetail("text"), {});
  });
  test("the largest detail fits 078's 400-byte cap", () => {
    const d = lessonEventDetail({ level: "experienced", flow: false, kind: "no_idea", seconds: 3600, card: 9, step: "solo" });
    assert.ok(Buffer.byteLength(JSON.stringify(d)) < 200);
  });
});

// REQ-255: where the goal question is asked, and what became of it.
describe("goal entry points", () => {
  test("the places it is asked are a fixed list, and junk is refused", () => {
    assert.deepEqual([...GOAL_VIA], ["intake", "start", "lesson", "settings"]);
    for (const v of GOAL_VIA) assert.equal(isGoalVia(v), true);
    for (const v of ["Intake", "explore", "course", "", null, undefined, 3, { via: "start" }]) assert.equal(isGoalVia(v), false);
  });
  test("outcomes are answered, skipped and dismissed", () => {
    assert.deepEqual([...GOAL_OUTCOMES], ["answered", "skipped", "dismissed"]);
  });
  test("the largest course_goal_set detail fits 078's 400-byte cap", () => {
    const longestGoal = [...COURSE_GOALS].sort((a, b) => b.length - a.length)[0];
    const longestVia = [...GOAL_VIA].sort((a, b) => b.length - a.length)[0];
    const d = { outcome: "dismissed", goal: longestGoal, via: longestVia };
    assert.ok(Buffer.byteLength(JSON.stringify(d)) < 120);
  });
  test("the app sends only places the server accepts", () => {
    const app = readFileSync(join(__dirname, "..", "..", "mobile", "src", "lib", "learnerLevel.ts"), "utf8");
    const m = /export const GOAL_VIA = \[([^\]]*)\]/.exec(app);
    assert.ok(m, "mobile/src/lib/learnerLevel.ts declares GOAL_VIA");
    const appVia = [...m![1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
    assert.deepEqual(appVia, [...GOAL_VIA]);
  });
});
