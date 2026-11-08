import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  coverageSummary,
  forTodayLabel,
  nextOpen,
  nextReviewLabel,
  progressLabel,
  sessionDoneLabel,
  utcToday,
  verdictHeadline,
} from "./reviewSession.ts";

describe("Today's review helpers (REQ-108)", () => {
  const items = [
    { position: 0, answered: true },
    { position: 2, answered: false },
    { position: 5, answered: false },
  ];

  test("nextOpen and progress follow session order", () => {
    assert.equal(nextOpen(items)?.position, 2);
    assert.equal(progressLabel(items, nextOpen(items)), "Question 2 of 3");
    const done = items.map((i) => ({ ...i, answered: true }));
    assert.equal(nextOpen(done), null);
    assert.equal(progressLabel(done, null), "Question 3 of 3");
    assert.equal(progressLabel([], null), "");
  });

  test("N for today never lists the backlog", () => {
    assert.equal(forTodayLabel(0, 0), "Nothing to review today");
    assert.equal(forTodayLabel(8, 8), "8 for today");
    assert.equal(forTodayLabel(12, 40), "12 for today (the rest will keep)");
  });

  test("misses are framed as information", () => {
    assert.match(verdictHeadline("incorrect", false), /useful/);
    assert.match(verdictHeadline("correct", true), /own words/);
    assert.equal(verdictHeadline("correct", false), "Right, and from memory.");
  });

  test("next review in words", () => {
    assert.equal(nextReviewLabel("2026-11-10", "2026-11-07"), "This one comes back in 3 days.");
    assert.equal(nextReviewLabel("2026-11-08", "2026-11-07"), "This one comes back tomorrow.");
    assert.equal(nextReviewLabel(null, "2026-11-07"), null);
    assert.equal(utcToday(new Date("2026-11-07T23:30:00-08:00")), "2026-11-08");
  });

  test("coverage in plain words", () => {
    const s = coverageSummary([
      { term: "SQS", covered: true },
      { term: "SNS", covered: false },
      { term: "EventBridge", covered: false },
    ]);
    assert.equal(s.line, "1 of 3 terms answered correctly on your own");
    assert.equal(s.notYet, "Not yet: SNS, EventBridge");
    const many = coverageSummary(Array.from({ length: 7 }, (_, i) => ({ term: `t${i}`, covered: false })), 2);
    assert.equal(many.notYet, "Not yet: t0, t1 and 5 more");
    assert.equal(coverageSummary([{ term: "x", covered: true }]).notYet, "");
  });

  test("session summary counts without judgement", () => {
    assert.match(sessionDoneLabel([]), /will keep/);
    assert.match(sessionDoneLabel([{ verdict: "correct", answered: true }, { verdict: "incorrect", answered: true }]), /^2 reviewed, 1 right/);
  });
});
