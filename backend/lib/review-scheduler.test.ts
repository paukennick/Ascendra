import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { addDays, fixedScheduler, FIXED_INTERVALS_DAYS, schedulerFor, utcDay, type ScheduleState } from "./review-scheduler";

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

  test("an early correct answer, or a helped one, does not move the schedule", () => {
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
  });

  test("a miss steps back one rung and counts a lapse, due or not; never below 0", () => {
    const s = state({ step: 3, dueOn: "2026-12-30" });
    const r = fixedScheduler.next(s, { verdict: "incorrect", assisted: false, reviewedAt: at("2026-12-01T09:00:00Z") });
    assert.equal(r.next.step, 2);
    assert.equal(r.next.lapses, 1);
    assert.equal(r.next.dueOn, addDays("2026-12-01", 7));
    const floor = fixedScheduler.next(state(), { verdict: "incorrect", assisted: false, reviewedAt: at("2026-11-08T09:00:00Z") });
    assert.equal(floor.next.step, 0);
    assert.equal(floor.next.dueOn, "2026-11-09");
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
