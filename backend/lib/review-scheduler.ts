// REQ-108: when an objective comes back for review. Pure -- no database --
// so the rule is unit-tested on its own (review-scheduler.test.ts) and can be
// replaced by an FSRS-style scheduler behind the same interface: the store
// (lib/review-store.ts) only calls schedulerFor(row.scheduler).next(...), and
// review_log keeps what FSRS fits on (each review's verdict, whether it was
// assisted, elapsed days since the previous review, the scheduled interval).
//
// fixed_v1: an expanding ladder of 1, 3, 7, 21, 60 days.
//   - Enrolment (first reaching Guided): step 0, due the next day.
//   - A correct, unassisted answer given when the review was due moves one
//     step up the ladder; the next review is that step's interval away.
//     The top step repeats every 60 days.
//   - A correct answer before it is due changes nothing: early reviews never
//     jump the ladder.
//   - REQ-117 (Audit 3 T4): a correct answer with help (choices shown) when
//     the review was due moves at most to HELPED_MAX_STEP (7 days): help is
//     not proof of recall, so it never reaches the 21- and 60-day rungs, but
//     it is not a daily loop either. It used to leave the schedule unchanged,
//     past-due date included, so a learner who always peeked was served every
//     day forever. From above that rung it comes back down to it.
//   - A partial answer holds the step and brings the review back after the
//     previous rung's interval (sooner than planned, not a full reset).
//   - A miss, due or not, steps back one rung (never below 0) and counts a
//     lapse; it is back after that rung's interval. REQ-117 (T14, FAIL-353): a miss at
//     the 21- or 60-day rung drops to step 1 (3 days), so a forgotten item is
//     rebuilt instead of being back on the 60-day gap three weeks later.
//   Dates are UTC calendar days, as the database's due_on.

export const FIXED_INTERVALS_DAYS = [1, 3, 7, 21, 60] as const;

// REQ-117: the highest step a correct answer given with help can reach.
export const HELPED_MAX_STEP = 2;
// REQ-117: a miss at this step or above drops to LAPSE_RESET_STEP.
export const LAPSE_RESET_FROM = 3;
export const LAPSE_RESET_STEP = 1;

export type Verdict = "correct" | "partial" | "incorrect";

export interface ScheduleState {
  step: number;
  dueOn: string; // YYYY-MM-DD (UTC)
  reps: number;
  lapses: number;
  lastReviewedAt: Date | null;
  enrolledAt: Date;
}

export interface ReviewOutcome {
  verdict: Verdict;
  assisted: boolean;
  reviewedAt: Date;
}

export interface ScheduleResult {
  next: ScheduleState;
  wasDue: boolean;
  advanced: boolean;
  elapsedDays: number; // since the previous review, or enrolment
  scheduledDays: number; // the interval that had been scheduled for this review
}

export interface Scheduler {
  name: string;
  enrol(at: Date): ScheduleState;
  next(state: ScheduleState, outcome: ReviewOutcome): ScheduleResult;
}

const DAY_MS = 86_400_000;

export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const t = Date.parse(`${day}T00:00:00Z`) + n * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(((b.getTime() - a.getTime()) / DAY_MS) * 100) / 100;
}

export function intervalFor(step: number): number {
  return FIXED_INTERVALS_DAYS[Math.min(Math.max(step, 0), FIXED_INTERVALS_DAYS.length - 1)];
}

export const fixedScheduler: Scheduler = {
  name: "fixed_v1",
  enrol(at: Date): ScheduleState {
    return { step: 0, dueOn: addDays(utcDay(at), 1), reps: 0, lapses: 0, lastReviewedAt: null, enrolledAt: at };
  },
  next(state, outcome): ScheduleResult {
    const today = utcDay(outcome.reviewedAt);
    const wasDue = state.dueOn <= today;
    const since = state.lastReviewedAt ?? state.enrolledAt;
    // The interval this review was planned at: the gap from the previous
    // review (or enrolment) to the due day.
    const scheduledDays = Math.max(
      0,
      Math.round((Date.parse(`${state.dueOn}T00:00:00Z`) - Date.parse(`${utcDay(since)}T00:00:00Z`)) / DAY_MS)
    );
    const base = { reps: state.reps + 1, lastReviewedAt: outcome.reviewedAt, enrolledAt: state.enrolledAt };
    let next: ScheduleState;
    let advanced = false;
    if (outcome.verdict === "incorrect") {
      const step = state.step >= LAPSE_RESET_FROM ? LAPSE_RESET_STEP : Math.max(0, state.step - 1);
      next = { ...base, step, lapses: state.lapses + 1, dueOn: addDays(today, intervalFor(step)) };
    } else if (outcome.verdict === "partial") {
      next = { ...base, step: state.step, lapses: state.lapses, dueOn: addDays(today, intervalFor(state.step - 1)) };
    } else if (!outcome.assisted && wasDue) {
      const step = Math.min(state.step + 1, FIXED_INTERVALS_DAYS.length - 1);
      advanced = true;
      next = { ...base, step, lapses: state.lapses, dueOn: addDays(today, intervalFor(step)) };
    } else if (outcome.assisted && wasDue) {
      // Helped, when due: up one rung but never past HELPED_MAX_STEP.
      const step = state.step < HELPED_MAX_STEP ? state.step + 1 : HELPED_MAX_STEP;
      next = { ...base, step, lapses: state.lapses, dueOn: addDays(today, intervalFor(step)) };
    } else {
      // Early (helped or not): logged, schedule unchanged.
      next = { ...base, step: state.step, lapses: state.lapses, dueOn: state.dueOn };
    }
    return { next, wasDue, advanced, elapsedDays: daysBetween(since, outcome.reviewedAt), scheduledDays };
  },
};

const SCHEDULERS: Record<string, Scheduler> = { [fixedScheduler.name]: fixedScheduler };

// An unknown name (a row written by a newer scheduler this code predates)
// falls back to the fixed ladder rather than failing the answer.
export function schedulerFor(name: string | null | undefined): Scheduler {
  return (name && SCHEDULERS[name]) || fixedScheduler;
}
