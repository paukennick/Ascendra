import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { addDays, fixedScheduler, FIXED_INTERVALS_DAYS, HELPED_MAX_STEP, isDueAt, MIN_REVIEW_GAP_HOURS, schedulerFor, utcDay, type ScheduleState } from "./review-scheduler";

const at = (iso: string) => new Date(iso);
const state = (over: Partial<ScheduleState> = {}): ScheduleState => ({
  step: 0,
  dueOn: "2026-11-08",
  reps: 0,
  lapses: 0,
  lastReviewedAt: null,
  enrolledAt: at("2026-11-07T10:00:00Z"),
  ...over,
});

describe("fixed_v1 review scheduler (REQ-108)", () => {
  test("enrolment is due the next UTC day at step 0", () => {
    const s = fixedScheduler.enrol(at("2026-11-07T23:30:00Z"));
    assert.equal(s.step, 0);
    assert.equal(s.dueOn, "2026-11-08");
  });

  test("correct unassisted answers when due climb 1, 3, 7, 21, 60 days and stay at 60", () => {
    let s = state();
    let day = "2026-11-08";
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = fixedScheduler.next(s, { verdict: "correct", assisted: false, reviewedAt: at(`${day}T12:00:00Z`) });
      assert.equal(r.wasDue, true);
      assert.equal(r.advanced, true);
      gaps.push((Date.parse(r.next.dueOn) - Date.parse(day)) / 86_400_000);
      s = r.next;
      day = r.next.dueOn;
    }
    assert.deepEqual(gaps, [3, 7, 21, 60, 60, 60]);
    assert.deepEqual([...FIXED_INTERVALS_DAYS], [1, 3, 7, 21, 60]);
  });

  test("an early correct answer does not move the schedule; a helped one when due is capped at the 7-day rung (REQ-117, FAIL-343)", () => {
    const s = state({ step: 2, dueOn: "2026-11-20" });
    const early = fixedScheduler.next(s, { verdict: "correct", assisted: false, reviewedAt: at("2026-11-10T09:00:00Z") });
    assert.equal(early.wasDue, false);
    assert.equal(early.advanced, false);
    assert.equal(early.next.step, 2);
    assert.equal(early.next.dueOn, "2026-11-20");
    assert.equal(early.next.reps, 1, "still logged as a review");

    const helped = fixedScheduler.next(s, { verdict: "correct", assisted: true, reviewedAt: at("2026-11-21T09:00:00Z") });
    assert.equal(helped.wasDue, true);
    assert.equal(helped.advanced, false);
    assert.equal(helped.next.step, 2);
    // FAIL-343: it used to keep the past due date, so it was served again the next day.
    assert.equal(helped.next.dueOn, "2026-11-28");

    const fromTop = fixedScheduler.next(state({ step: 4, dueOn: "2026-11-21" }), { verdict: "correct", assisted: true, reviewedAt: at("2026-11-21T09:00:00Z") });
    assert.equal(fromTop.next.step, HELPED_MAX_STEP, "help at the 60-day rung comes back down to a week");
  });

  test("FAIL-343: always answering with the choices shown is never a daily loop", () => {
    let s = state();
    let served = 0;
    for (let d = 0; d < 40; d++) {
      const day = addDays("2026-11-08", d);
      if (s.dueOn > day) continue;
      served++;
      s = fixedScheduler.next(s, { verdict: "correct", assisted: true, reviewedAt: at(`${day}T12:00:00Z`) }).next;
    }
    assert.equal(s.step, HELPED_MAX_STEP);
    assert.ok(served <= 8, `served ${served} times in 40 days`);
  });

  test("a miss steps back one rung and counts a lapse, due or not; never below 0", () => {
    const s = state({ step: 2, dueOn: "2026-12-30" });
    const r = fixedScheduler.next(s, { verdict: "incorrect", assisted: false, reviewedAt: at("2026-12-01T09:00:00Z") });
    assert.equal(r.next.step, 1);
    assert.equal(r.next.lapses, 1);
    assert.equal(r.next.dueOn, addDays("2026-12-01", 3));
    const floor = fixedScheduler.next(state(), { verdict: "incorrect", assisted: false, reviewedAt: at("2026-11-08T09:00:00Z") });
    assert.equal(floor.next.step, 0);
    assert.equal(floor.next.dueOn, "2026-11-09");
  });

  test("FAIL-353: a miss at the 21- or 60-day rung drops to step 1, not one rung", () => {
    for (const step of [3, 4]) {
      const r = fixedScheduler.next(state({ step, dueOn: "2026-12-01" }), { verdict: "incorrect", assisted: false, reviewedAt: at("2026-12-01T09:00:00Z") });
      assert.equal(r.next.step, 1);
      assert.equal(r.next.dueOn, addDays("2026-12-01", 3));
    }
  });

  test("a partial answer holds the step and comes back after the previous rung's interval", () => {
    const s = state({ step: 3, dueOn: "2026-11-08" });
    const r = fixedScheduler.next(s, { verdict: "partial", assisted: false, reviewedAt: at("2026-11-08T09:00:00Z") });
    assert.equal(r.next.step, 3);
    assert.equal(r.next.lapses, 0);
    assert.equal(r.next.dueOn, "2026-11-15");
  });

  test("records elapsed and scheduled days for an FSRS-style replacement", () => {
    const s = state({ step: 1, dueOn: "2026-11-11", lastReviewedAt: at("2026-11-08T12:00:00Z") });
    const r = fixedScheduler.next(s, { verdict: "correct", assisted: false, reviewedAt: at("2026-11-12T12:00:00Z") });
    assert.equal(r.elapsedDays, 4);
    assert.equal(r.scheduledDays, 3);
  });

  test("an unknown scheduler name falls back to the fixed ladder; utcDay is UTC", () => {
    assert.equal(schedulerFor("fsrs_v9").name, "fixed_v1");
    assert.equal(schedulerFor(null).name, "fixed_v1");
    assert.equal(utcDay(at("2026-11-07T23:59:59-08:00")), "2026-11-08");
  });
});

// REQ-218 (FAIL-1071, H8): a UTC calendar day is not a day. Enrolled at 23:50,
// the review was "due" at 00:00 and a correct answer then climbed a rung.
describe("a review needs a minimum gap, not just a date (REQ-218)", () => {
  test("enrolled at 23:50 UTC, due the next date: not due at 00:10, due once the floor has passed", () => {
    const s = fixedScheduler.enrol(at("2026-11-07T23:50:00Z"));
    assert.equal(s.dueOn, "2026-11-08");
    assert.equal(isDueAt(s.dueOn, s.enrolledAt, at("2026-11-08T00:10:00Z")), false);
    assert.equal(isDueAt(s.dueOn, s.enrolledAt, at("2026-11-08T23:49:00Z")), false);
    assert.equal(MIN_REVIEW_GAP_HOURS, 24);
    assert.equal(isDueAt(s.dueOn, s.enrolledAt, at("2026-11-08T23:50:00Z")), true, "exactly a day after");
  });

  test("a correct answer minutes into the next date is early: no rung, no due flag; a miss still steps back", () => {
    const s = fixedScheduler.enrol(at("2026-11-07T23:50:00Z"));
    const early = fixedScheduler.next(s, { verdict: "correct", assisted: false, reviewedAt: at("2026-11-08T00:10:00Z") });
    assert.equal(early.wasDue, false);
    assert.equal(early.advanced, false);
    assert.equal(early.next.step, 0);
    assert.equal(early.next.dueOn, s.dueOn);
    const missed = fixedScheduler.next({ ...s, step: 2, dueOn: "2026-11-08" }, { verdict: "incorrect", assisted: false, reviewedAt: at("2026-11-08T00:10:00Z") });
    assert.equal(missed.next.step, 1);
    assert.equal(missed.next.lapses, 1);
  });

  test("the date must also have come: 24 hours after an answer is not due before the date", () => {
    assert.equal(isDueAt("2026-11-09", at("2026-11-07T01:00:00Z"), at("2026-11-08T23:00:00Z")), false);
    assert.equal(isDueAt("2026-11-08", at("2026-11-07T01:00:00Z"), at("2026-11-08T23:00:00Z")), true);
  });

  test("the ladder is unchanged and each rung climbs when answered a day or more after the last", () => {
    assert.deepEqual([...FIXED_INTERVALS_DAYS], [1, 3, 7, 21, 60]);
    let s = fixedScheduler.enrol(at("2026-11-07T23:50:00Z"));
    let at_ = at("2026-11-09T09:00:00Z");
    for (let i = 0; i < 5; i++) {
      const r = fixedScheduler.next(s, { verdict: "correct", assisted: false, reviewedAt: at_ });
      assert.equal(r.advanced, true);
      s = r.next;
      at_ = new Date(Date.parse(`${s.dueOn}T09:00:00Z`));
    }
    assert.equal(s.step, 4);
  });
});
