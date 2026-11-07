import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  stepRoute,
  examDateError,
  feasibilityLines,
  formatDate,
  formatMinutes,
  hoursError,
  keptLines,
  localToday,
  optionLine,
  placementProgress,
  planHeadline,
  quizTriesLine,
  reviewLine,
  sessionA11yLabel,
  stepLabel,
  stepMeta,
} from "./studyPlan.ts";
import type { QuizTurn, StudyPlan } from "../types/plan.ts";

const plan: StudyPlan = {
  today: "2026-11-07",
  examDate: "2027-01-30",
  weeklyHours: 5,
  phase: "building",
  daysToExam: 84,
  mockExamDate: "2027-01-23",
  lightDay: "2027-01-29",
  roughLastSession: false,
  remaining: { learn: 10, practice: 2, confirm: 0, done: 3, total: 15, minutes: 274 },
  thisWeek: { steps: [], reviewItems: 2, reviewMinutes: 75, minutes: 300 },
  feasibility: { status: "on_track", neededMinutes: 274, availableMinutes: 2500, paceFinishDate: "2026-11-21", options: [] },
};

describe("study plan wording (REQ-110)", () => {
  test("minutes and dates", () => {
    assert.equal(formatMinutes(45), "45 min");
    assert.equal(formatMinutes(90), "1 h 30 min");
    assert.equal(formatMinutes(120), "2 h");
    assert.equal(formatDate("2027-01-30"), "Jan 30, 2027");
    assert.equal(localToday(new Date(2026, 10, 7, 23, 59)), "2026-11-07");
  });

  test("headline by phase", () => {
    assert.equal(planHeadline(plan), "84 days to your exam");
    assert.equal(planHeadline({ ...plan, phase: "last_day" }), "Light day: the exam is tomorrow");
    assert.equal(planHeadline({ ...plan, phase: "no_date" }), "Your study plan");
  });

  test("an unrealistic date is worded kindly, with options", () => {
    const lines = feasibilityLines({ ...plan, feasibility: { ...plan.feasibility, status: "unrealistic" } });
    assert.match(lines[1], /ambitious for what's left, and that's fixable/);
    assert.ok(!lines.join(" ").match(/fail|behind|missed/i));
    assert.equal(optionLine({ kind: "more_hours", weeklyHours: 8.5 }), "Study about 8.5 hours a week");
    assert.equal(optionLine({ kind: "later_date", examDate: "2027-03-01" }), "Move the exam to around Mar 1, 2027");
    assert.match(optionLine({ kind: "focus", unitIds: ["a"], unitTitles: ["Ops", "Threats"], coveredWeightPercent: 62 }), /Ops, Threats \(62%/);
  });

  test("no date shows the pace; on track says so", () => {
    assert.match(feasibilityLines({ ...plan, feasibility: { ...plan.feasibility, status: "no_date" } })[1], /finish around Nov 21, 2026/);
    assert.match(feasibilityLines(plan)[1], /on track/);
  });

  test("steps and review", () => {
    assert.equal(stepLabel({ kind: "warmup", title: "Hashing", minutes: 5, reason: "A quick win" }), "Warm-up: Hashing");
    assert.equal(stepLabel({ kind: "mock", title: "Mock exam (2027-01-23)", minutes: 135, reason: "r" }), "Mock exam (2027-01-23)");
    assert.equal(stepMeta({ kind: "learn", title: "x", minutes: 25, reason: "New to you" }), "New to you · about 25 min");
    assert.equal(reviewLine(plan), "Review: 2 items due, about 1 h 15 min this week");
  });

  test("kept vs completed, with no shaming", () => {
    assert.deepEqual(keptLines({ completed: 0, kept: 0, slipped: 0, unchecked: 0 }).length, 1);
    const lines = keptLines({ completed: 20, kept: 14, slipped: 2, unchecked: 4 });
    assert.equal(lines[0], "You've kept 14 of the 20 objectives you've completed.");
    assert.match(lines[2], /normal forgetting/);
  });

  test("a11y label, placement progress, quiz tries", () => {
    assert.equal(
      sessionA11yLabel({ kind: "review", label: "10-minute review", detail: "Nothing due yet. Nice.", available: false, target: null }, false),
      "10-minute review. Nothing due yet. Nice.. Not available right now"
    );
    assert.match(sessionA11yLabel({ kind: "lesson", label: "New lesson", detail: "Hashing", available: true, target: null }, true), /suggested/);
    assert.equal(placementProgress(0, 12), "Question 1 of up to 12");
    const t: QuizTurn = { id: "t", objectiveId: "o", objectiveTitle: "O", unitId: "u", question: "q", choices: [], tries: 0, maxTries: 3, status: "open", hints: [], correctIndex: null, explanation: null };
    assert.match(quizTriesLine(t), /best shot/);
    assert.equal(quizTriesLine({ ...t, tries: 2 }), "1 try left, with a hint each time");
    assert.equal(quizTriesLine({ ...t, status: "correct" }), "");
  });

  test("form validation", () => {
    assert.equal(examDateError("", "2026-11-07"), null);
    assert.equal(examDateError("2027-01-30", "2026-11-07"), null);
    assert.match(examDateError("30/01/2027", "2026-11-07")!, /YYYY-MM-DD/);
    assert.match(examDateError("2027-02-30", "2026-11-07")!, /real date/);
    assert.match(examDateError("2026-11-06", "2026-11-07")!, /passed/);
    assert.equal(hoursError("5"), null);
    assert.match(hoursError("")!, /number/);
    assert.match(hoursError("0.2")!, /Between/);
  });
});

describe("plan step links (REQ-112 h)", () => {
  const base = { title: "T", minutes: 30, reason: "r" };
  test("the mock-exam step opens the exam practice screen", () => {
    assert.deepEqual(stepRoute({ ...base, kind: "mock", title: "Mock exam (2027-01-23)" }, "trk", "Security+"), {
      pathname: "/course/trk/exam",
      params: { trackTitle: "Security+" },
    });
  });
  test("a lesson step opens its lesson; a step with no objective is not a link", () => {
    assert.deepEqual(stepRoute({ ...base, kind: "learn", objectiveId: "o1", unitId: "u1" }, "trk"), {
      pathname: "/course/trk/lesson/o1",
      params: { unitId: "u1", objectiveTitle: "T" },
    });
    assert.equal(stepRoute({ ...base, kind: "light" }, "trk"), null);
    assert.equal(stepRoute({ ...base, kind: "warmup" }, "trk"), null);
  });
});

describe("REQ-117 kept wording", () => {
  test("due-to-re-check objectives get their own line", () => {
    const lines = keptLines({ completed: 3, kept: 2, slipped: 0, unchecked: 1, recheck: 2 });
    assert.ok(lines.some((l) => /2 are due to re-check after a break/.test(l)));
    assert.ok(!keptLines({ completed: 3, kept: 3, slipped: 0, unchecked: 0 }).some((l) => /re-check/.test(l)));
  });
});

describe("REQ-117 stretch step", () => {
  test("opens explain-it-back for the objective", () => {
    const r = stepRoute({ kind: "stretch", objectiveId: "o1", unitId: "u1", title: "RBAC", minutes: 8, reason: "x" }, "t1");
    assert.equal(r?.pathname, "/course/t1/explain/o1");
    assert.equal(stepLabel({ kind: "stretch", objectiveId: "o1", title: "RBAC", minutes: 8, reason: "x" }), "Stretch: RBAC");
  });
});
