import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatClock,
  formatInstruction,
  initialOrder,
  isAnswered,
  moveStep,
  navCounts,
  navLabel,
  remainingSeconds,
  submitWarning,
  timeAnnouncement,
  toggleChoice,
} from "./examPractice.ts";

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
