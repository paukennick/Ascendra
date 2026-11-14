import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatClock,
  formatInstruction,
  initialOrder,
  isAnswered,
  mockStartSummary,
  moveStep,
  navCounts,
  navLabel,
  remainingSeconds,
  reviewFilterAnnouncement,
  reviewRows,
  submitWarning,
  timeAnnouncement,
  timerState,
  toggleChoice,
  type ExamNavActions,
} from "./examPractice.ts";
import type { ExamMockInfo, ExamMockState, ExamProfile } from "../types/exam.ts";

describe("ordering by buttons", () => {
  test("move up and down swap neighbors, ends are no-ops", () => {
    assert.deepEqual(moveStep([0, 1, 2], 1, -1), [1, 0, 2]);
    assert.deepEqual(moveStep([0, 1, 2], 1, 1), [0, 2, 1]);
    const o = [0, 1, 2];
    assert.equal(moveStep(o, 0, -1), o);
    assert.equal(moveStep(o, 2, 1), o);
  });
  test("starts from the saved order, else the shown one", () => {
    assert.deepEqual(initialOrder({ steps: ["a", "b", "c"], response: null }), [0, 1, 2]);
    assert.deepEqual(initialOrder({ steps: ["a", "b", "c"], response: { order: [2, 0, 1] } }), [2, 0, 1]);
  });
});

test("multiple response never exceeds the count", () => {
  assert.deepEqual(toggleChoice([], 3, 2), [3]);
  assert.deepEqual(toggleChoice([3], 1, 2), [1, 3]);
  assert.deepEqual(toggleChoice([1, 3], 0, 2), [1, 3]);
  assert.deepEqual(toggleChoice([1, 3], 3, 2), [1]);
});

test("answered means complete for each format", () => {
  assert.equal(isAnswered({ format: "multiple_choice" }, { choice: 0 }), true);
  assert.equal(isAnswered({ format: "multiple_response", selectCount: 2 }, { choices: [1] }), false);
  assert.equal(isAnswered({ format: "multiple_response", selectCount: 2 }, { choices: [1, 2] }), true);
  assert.equal(isAnswered({ format: "matching" }, { matches: [0, null] }), false);
  assert.equal(isAnswered({ format: "matching" }, { matches: [0, 1] }), true);
  assert.equal(isAnswered({ format: "ordering" }, null), false);
});

test("instructions", () => {
  assert.equal(formatInstruction({ format: "multiple_response", selectCount: 3 }), "Choose three.");
  assert.match(formatInstruction({ format: "ordering" }), /Move up/);
});

describe("timer", () => {
  test("clock format", () => {
    assert.equal(formatClock(65), "1:05");
    assert.equal(formatClock(5400), "1:30:00");
    assert.equal(formatClock(-3), "0:00");
  });
  test("remaining time follows the server clock, not the device's", () => {
    // Device clock is an hour fast; the deadline is 10 minutes after server now.
    const serverNow = "2026-11-07T12:00:00.000Z";
    const deadline = "2026-11-07T12:10:00.000Z";
    const loaded = Date.parse("2026-11-07T13:00:00.000Z");
    assert.equal(remainingSeconds(deadline, serverNow, loaded, loaded), 600);
    assert.equal(remainingSeconds(deadline, serverNow, loaded, loaded + 60_000), 540);
    assert.equal(remainingSeconds(deadline, serverNow, loaded, loaded + 3_600_000), 0);
    assert.equal(remainingSeconds(null, serverNow, loaded, loaded), null);
  });
  test("screen reader hears a few milestones only", () => {
    assert.equal(timeAnnouncement(300), "Five minutes left.");
    assert.equal(timeAnnouncement(299), null);
    assert.equal(timeAnnouncement(null), null);
  });
});

test("navigator counts, labels and the submit warning", () => {
  const items = [
    { answered: true, flagged: false },
    { answered: false, flagged: true },
    { answered: false, flagged: false },
  ];
  const c = navCounts(items);
  assert.deepEqual(c, { answered: 1, unanswered: 2, flagged: 1 });
  assert.match(submitWarning(c), /2 unanswered and 1 flagged/);
  assert.equal(submitWarning({ answered: 3, unanswered: 0, flagged: 0 }), "Every question has an answer.");
  assert.equal(navLabel(1, items[1]), "Question 2, not answered, flagged for review");
});

describe("REQ-298: timer states", () => {
  test("untimed, running, low in the last minute, expired at zero", () => {
    assert.equal(timerState(null), "untimed");
    assert.equal(timerState(5400), "running");
    assert.equal(timerState(61), "running");
    assert.equal(timerState(60), "low");
    assert.equal(timerState(1), "low");
    assert.equal(timerState(0), "expired");
  });
  test("a loaded deadline moves through the states as the server clock advances, whatever the device clock says", () => {
    const serverNow = "2026-11-14T12:00:00.000Z";
    const deadline = "2026-11-14T12:02:00.000Z"; // two minutes after server now
    const loaded = 5_000_000; // device ms when loaded; the device clock is wrong, only the offset matters
    assert.equal(timerState(remainingSeconds(deadline, serverNow, loaded, loaded)), "running");
    assert.equal(timerState(remainingSeconds(deadline, serverNow, loaded, loaded + 61_000)), "low");
    assert.equal(timerState(remainingSeconds(deadline, serverNow, loaded, loaded + 120_000)), "expired");
    assert.equal(timerState(remainingSeconds(deadline, serverNow, loaded, loaded + 500_000)), "expired", "never negative");
  });
  test("a full-length mock's clock reads h:mm:ss", () => {
    assert.equal(formatClock(130 * 60), "2:10:00");
    assert.equal(formatClock(180 * 60), "3:00:00");
  });
  test("the screen reader hears ten, five and one minute, and nothing between", () => {
    assert.equal(timeAnnouncement(600), "Ten minutes left.");
    assert.equal(timeAnnouncement(599), null);
    assert.equal(timeAnnouncement(null), null);
  });
});

describe("REQ-298: the review screen's lists", () => {
  const items = [
    { answered: true, flagged: false, unitTitle: "Secure" },
    { answered: false, flagged: true, unitTitle: "Resilient" },
    { answered: true, flagged: true, unitTitle: "Secure" },
    { answered: false, flagged: false, unitTitle: "Cost" },
  ];
  test("all lists every question in order, with a spoken label", () => {
    const rows = reviewRows(items, "all");
    assert.deepEqual(rows.map((r) => r.number), [1, 2, 3, 4]);
    assert.match(rows[1].label, /^Question 2, not answered, flagged for review\. Resilient\. Opens the question\.$/);
  });
  test("unanswered and flagged are the two filters, and a question can be in both", () => {
    assert.deepEqual(reviewRows(items, "unanswered").map((r) => r.number), [2, 4]);
    assert.deepEqual(reviewRows(items, "flagged").map((r) => r.number), [2, 3]);
  });
  test("the filter change is announced, including an empty list", () => {
    assert.equal(reviewFilterAnnouncement("flagged", 2), "2 flagged questions shown.");
    assert.equal(reviewFilterAnnouncement("unanswered", 1), "1 unanswered question shown.");
    assert.equal(reviewFilterAnnouncement("all", 90), "90 questions shown.");
    assert.equal(reviewFilterAnnouncement("flagged", 0), "No flagged questions.");
  });
  test("an unanswered question warns before submit, in plain words", () => {
    assert.match(submitWarning(navCounts(items)), /2 unanswered and 2 flagged for review/);
  });
});

describe("REQ-298: the mock card's words", () => {
  const mockInfo = (over: Partial<ExamMockInfo> = {}): ExamMockInfo => ({
    confirmed: true,
    practiceOnly: null,
    note: "AWS's exam has 65 questions (50 count toward the real score; in a mock every question counts) in 130 minutes.",
    passPolicy: "AWS reports a scaled score from 100 to 1000...",
    scored: 50,
    questionsAreMaximum: false,
    minutesNote: null,
    notReproduced: null,
    weights: "exam_blueprint",
    pauseRule: "A timed mock has no pause...",
    sources: [],
    ...over,
  });
  const profile = (m: ExamMockInfo): ExamProfile => ({
    examCode: "SAA-C03",
    credentialName: "SAA",
    formats: ["multiple_choice", "multiple_response"],
    exhibits: false,
    questionCount: 65,
    durationMinutes: 130,
    mockQuestions: 65,
    secondsPerQuestion: 120,
    mock: m,
  });
  const state = (over: Partial<ExamMockState> = {}): ExamMockState => ({
    requested: 65,
    canBuild: 65,
    freshAvailable: 65,
    repeats: 0,
    short: false,
    reason: null,
    thinDomains: [],
    ...over,
  });
  test("a full form says full-length, with the exam's minutes", () => {
    const s = mockStartSummary(profile(mockInfo()), state());
    assert.equal(s.short, false);
    assert.equal(s.title, "Full-length form: 65 questions");
    assert.equal(s.timeLine, "130 minutes, like the real exam.");
  });
  test("a short form says how many and why, and cuts the time to the exam's pace", () => {
    const s = mockStartSummary(
      profile(mockInfo()),
      state({ canBuild: 38, short: true, reason: "Short form: 38 of 65 questions. We only have 38...", thinDomains: [{ title: "Design Secure Architectures", need: 19, have: 4 }] })
    );
    assert.equal(s.short, true);
    assert.equal(s.title, "Short form: 38 of 65 questions");
    assert.equal(s.timeLine, "76 minutes, the exam's pace.");
    assert.ok(s.lines.some((l) => l.startsWith("Short form: 38 of 65")));
    assert.ok(s.lines.some((l) => l === "Thinnest: Design Secure Architectures (4 of 19)."));
  });
  test("a course with no single exam is a practice test, not a copy of an exam", () => {
    const p = profile(mockInfo({ confirmed: false, practiceOnly: "Nurse aide evaluations are set by each state.", note: "Nurse aide evaluations are set by each state. This is a mixed practice test, not a copy of an exam." }));
    p.durationMinutes = null;
    p.secondsPerQuestion = null;
    p.mockQuestions = 50;
    const s = mockStartSummary(p, state({ requested: 50, canBuild: 50 }));
    assert.equal(s.title, "Mixed practice test: 50 questions");
    assert.match(s.timeLine, /isn't published, so a timed mock allows 90 seconds a question/);
  });
  test("weights are the exam's only when a body publishes them", () => {
    assert.ok(mockStartSummary(profile(mockInfo()), null).lines.some((l) => /published domain weights/.test(l)));
    const emph = mockStartSummary(profile(mockInfo({ weights: "study_emphasis" })), null);
    assert.ok(emph.lines.some((l) => /own study emphasis, not the exam's/.test(l)));
    assert.ok(!emph.lines.some((l) => /published domain weights/.test(l)));
  });
  test("what a mock cannot show is named, and questions seen before are counted", () => {
    const s = mockStartSummary(profile(mockInfo({ notReproduced: "performance-based questions (hands-on simulations)" })), state({ repeats: 7 }));
    assert.ok(s.lines.includes("Not in the mock: performance-based questions (hands-on simulations)."));
    assert.ok(s.lines.some((l) => l.startsWith("7 of these are questions you've seen before")));
  });
  test("an older server with no mock block still gets a summary", () => {
    const p = profile(mockInfo());
    delete p.mock;
    const s = mockStartSummary(p, null);
    assert.equal(s.title, "Full-length form: 65 questions");
    assert.deepEqual(s.lines, []);
  });
});

test("the keyboard layer drives exactly these actions", () => {
  const keys: (keyof ExamNavActions)[] = ["previous", "next", "toggleFlag", "openReview", "closeReview", "submit"];
  const actions: ExamNavActions = { previous() {}, next() {}, toggleFlag() {}, openReview() {}, closeReview() {}, submit() {} };
  assert.deepEqual(Object.keys(actions).sort(), [...keys].sort());
});
