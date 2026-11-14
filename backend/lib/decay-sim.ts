// REQ-291: persona simulation comparing today's fixed_v1 review ladder with
// the proposed per-learner predicted-recall scheduler (lib/memory-model.ts).
// Pure and deterministic: no database, no clock, no randomness beyond a hash
// of (persona, objective, day, purpose), so the same inputs always give the
// same table. Run it with `npm run sim:decay` (scripts/decay-sim.ts).
//
// THIS IS A SIMULATION WITH ASSUMED FORGETTING CURVES, NOT LEARNER DATA.
// The simulated learners forget on an EXPONENTIAL curve (recall =
// e^(-t / tau)) whose tau grows on each successful recall, more when the
// recall was hard -- a different family from the power curve the proposed
// model predicts with, so the model is not graded on its own assumptions.
// Every constant below (TAU0_DAYS, the growth rule, each persona's true
// memory speed, hint and absence patterns) is an assumption chosen to be
// plausible, not measured.

import { fixedScheduler, intervalFor, type ScheduleState } from "./review-scheduler";
import { SESSION_CAP } from "./review-plan";
import {
  enrollState,
  examDayRecall,
  fitPersonalScale,
  gradeFor,
  needsRefresh,
  nextIntervalDays,
  priorFor,
  recallAt,
  reviewState,
  REFRESH_BELOW,
  type LoggedReview,
  type MemoryState,
  type PersonalScale,
} from "./memory-model";
import type { CourseGoal, Level } from "./learner-level-rules";

// ---------------------------------------------------------------------------
// Deterministic draws
// ---------------------------------------------------------------------------

// FNV-1a then a murmur-style finalizer: a uniform number in [0, 1).
export function draw(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// The assumed "true" memory of a simulated learner
// ---------------------------------------------------------------------------

// tau (days) of a just-learned objective for a learner of speed 1 and an
// objective of average difficulty: recall about 88% after one day, 69%
// after three, 42% after a week.
export const TAU0_DAYS = 8;

export interface TrueMemory {
  tau: number;
  base: number; // tau right after first learning, the floor a lapse returns toward
}

export function trueRecall(m: TrueMemory, tDays: number): number {
  return Math.exp(-Math.max(0, tDays) / m.tau);
}

// Assumed growth: an unaided recall multiplies tau by 1.2 + 2.5 (1 - p) --
// more when it was hard (desirable difficulty); with the choices shown much
// less; a partial a little; a miss is re-taught on the spot and keeps
// the larger of 45% of tau and 70% of the first-learning tau.
//
// The "fast" truth (sensitivity run) grows tau by 1.5 + 6 (1 - p) instead:
// about 2x per easy recall and 4x per hard one, closer to the growth FSRS's
// defaults expect from flashcard data.
export type Truth = "slow" | "fast";
const GROWTH: Record<Truth, { base: number; slope: number }> = { slow: { base: 1.2, slope: 2.5 }, fast: { base: 1.5, slope: 6 } };

export function trueUpdate(
  m: TrueMemory,
  p: number,
  verdict: "correct" | "partial" | "incorrect",
  assisted: boolean,
  truth: Truth = "slow"
): TrueMemory {
  if (verdict === "incorrect") return { ...m, tau: Math.max(m.base * 0.7, m.tau * 0.45) };
  if (verdict === "partial") return { ...m, tau: m.tau * 1.1 };
  if (assisted) return { ...m, tau: m.tau * (1.05 + 0.8 * (1 - p)) };
  const g = GROWTH[truth];
  return { ...m, tau: m.tau * (g.base + g.slope * (1 - p)) };
}

// One review's outcome: recall with probability p (with the choices on
// screen, recognition adds half the gap); a narrow band above p is partial.
export function outcome(p: number, assisted: boolean, u: number): "correct" | "partial" | "incorrect" {
  const pc = assisted ? p + (1 - p) * 0.5 : p;
  if (u < pc) return "correct";
  if (u < pc + 0.1 * (1 - pc)) return "partial";
  return "incorrect";
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export interface Persona {
  id: string;
  label: string;
  goal: CourseGoal | null;
  level: Level | null;
  trueSpeed: number; // multiplies TAU0_DAYS (assumed)
  objectives: number;
  learnPerSession: number;
  // days of the week (0-6) they study; absent ranges [from, to] inclusive;
  // skipRate drops a further share of study days at random.
  studyWeekdays: number[];
  absent?: [number, number][];
  skipRate?: number;
  hintRate?: number; // share of reviews answered with the choices shown
  examDay: number | null; // null: no exam; the check day is horizonDays
  horizonDays: number;
}

const WEEKDAYS = [0, 1, 2, 3, 4];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const PERSONAS: Persona[] = [
  { id: "pro_strong", label: "Working pro, strong recall (work, experienced)", goal: "work", level: "experienced", trueSpeed: 2.0, objectives: 40, learnPerSession: 3, studyWeekdays: [0, 2, 5], examDay: null, horizonDays: 90 },
  { id: "career_changer", label: "Career changer (career change, new)", goal: "career_change", level: "new", trueSpeed: 0.7, objectives: 40, learnPerSession: 1, studyWeekdays: WEEKDAYS, examDay: 77, horizonDays: 77 },
  { id: "crammer", label: "Crammer, 3 weeks to the exam (program, some)", goal: "program", level: "some", trueSpeed: 1.0, objectives: 40, learnPerSession: 3, studyWeekdays: EVERY_DAY, examDay: 21, horizonDays: 21 },
  { id: "steady", label: "Steady student, 10 weeks (program, some)", goal: "program", level: "some", trueSpeed: 1.0, objectives: 40, learnPerSession: 1, studyWeekdays: WEEKDAYS, examDay: 70, horizonDays: 70 },
  { id: "inconsistent", label: "Inconsistent, gone 2 weeks (program, some)", goal: "program", level: "some", trueSpeed: 0.9, objectives: 40, learnPerSession: 2, studyWeekdays: WEEKDAYS, absent: [[28, 41]], skipRate: 0.3, examDay: 63, horizonDays: 63 },
  { id: "expert_hinter", label: "Expert who uses hints a lot (work, experienced)", goal: "work", level: "experienced", trueSpeed: 1.6, objectives: 40, learnPerSession: 2, studyWeekdays: [0, 1, 3, 4], hintRate: 0.6, examDay: 56, horizonDays: 56 },
  { id: "credential", label: "Keeping a credential, 2 days a week (current, experienced)", goal: "current", level: "experienced", trueSpeed: 1.3, objectives: 40, learnPerSession: 2, studyWeekdays: [1, 4], examDay: null, horizonDays: 90 },
  { id: "prior_wrong", label: "Says 'work, experienced' but forgets fast", goal: "work", level: "experienced", trueSpeed: 0.6, objectives: 40, learnPerSession: 2, studyWeekdays: WEEKDAYS, examDay: 60, horizonDays: 60 },
];

export function studies(p: Persona, day: number): boolean {
  if (!p.studyWeekdays.includes(day % 7)) return false;
  if (p.absent?.some(([a, b]) => day >= a && day <= b)) return false;
  if (p.skipRate && draw(`${p.id}|skip|${day}`) < p.skipRate) return false;
  return true;
}

// The objective's own difficulty: a multiplier on tau between about 0.6 and 1.6.
export function itemFactor(p: Persona, obj: number): number {
  return Math.exp((draw(`${p.id}|item|${obj}`) - 0.5) * 1.0);
}

// ---------------------------------------------------------------------------
// One run
// ---------------------------------------------------------------------------

// hybrid: the proposed scheduler, but never a longer gap than fixed_v1 would
// give the same answers (both run on the objective; the earlier due wins).
// The fit, the refresh flag and exam-day recall are the proposed model's.
export type Engine = "fixed_v1" | "proposed" | "hybrid";

interface Obj {
  i: number;
  truth: TrueMemory;
  learnedDay: number;
  lastDay: number;
  dueDay: number;
  // fixed_v1
  fixed?: ScheduleState;
  // proposed
  mem?: MemoryState;
}

export interface RunResult {
  persona: string;
  engine: Engine;
  checkDay: number;
  learned: number;
  reviews: number;
  reviewsPerWeek: number; // mean over the weeks from the first lesson to the check day
  peakWeek: number;
  trueRecallAtCheck: number; // the simulated learner, mean over learned objectives
  predictedAtCheck: number; // what the engine would show
  predictedLow: number;
  predictedHigh: number;
  brier: number | null; // predicted vs outcome over unaided reviews
  flaggedAtCheck: number; // proposed: needs a refresh; fixed_v1: due to re-check (045 recheck_due)
  peakFlagged: number;
  trulyBelowAtCheck: number; // objectives whose simulated recall is under REFRESH_BELOW
  flagHits: number; // flagged and truly under REFRESH_BELOW
  fit: PersonalScale | null;
}

const BASE_DATE = Date.parse("2027-01-04T12:00:00Z"); // a Monday, noon UTC
const dateOf = (day: number) => new Date(BASE_DATE + day * 86_400_000);
const dayOfIso = (iso: string) => Math.round((Date.parse(`${iso}T12:00:00Z`) - BASE_DATE) / 86_400_000);

// Today's 045 retention factor (review_state()): 1 up to the due date, then
// 10S / (9S + t) for S the current rung's interval and t days since the
// last review. Readiness multiplies by it; it is fixed_v1's "prediction".
export function fixedRetention(step: number, daysSinceLast: number): number {
  const S = intervalFor(step);
  return Math.min(1, (10 * S) / (9 * S + Math.max(0, daysSinceLast)));
}

export interface SimOptions {
  truth?: Truth;
  // Sensitivity: the first design capped proposed reviews by goal (work 8,
  // current 6, interest 6 a day; others 12). Off in the main run.
  goalCaps?: boolean;
}

export const GOAL_DAILY_CAP_TRIED: Record<string, number> = { work: 8, current: 6, interest: 6 };

export function runPersona(p: Persona, engine: Engine, opts: SimOptions = {}): RunResult {
  const truth = opts.truth ?? "slow";
  const checkDay = p.examDay ?? p.horizonDays;
  const prior = priorFor({ goal: p.goal, level: p.level, hasExamDate: p.examDay != null });
  const cap = engine !== "fixed_v1" && opts.goalCaps ? GOAL_DAILY_CAP_TRIED[p.goal ?? ""] ?? SESSION_CAP : SESSION_CAP;
  const objs: Obj[] = [];
  const log: LoggedReview[] = [];
  let scale: PersonalScale = fitPersonalScale([], prior);
  let nextToLearn = 0;
  let firstLessonDay: number | null = null;
  const reviewsByWeek = new Map<number, number>();
  let reviews = 0;
  let brierSum = 0;
  let brierN = 0;
  let peakFlagged = 0;

  const flaggedOn = (day: number) =>
    objs.filter((o) =>
      engine !== "fixed_v1"
        ? needsRefresh(o.mem!, day - o.lastDay, scale.k)
        : day > o.dueDay + intervalFor(o.fixed!.step)
    ).length;

  for (let day = 0; day < checkDay; day++) {
    if (!studies(p, day)) {
      peakFlagged = Math.max(peakFlagged, flaggedOn(day));
      continue;
    }
    if (engine !== "fixed_v1" && log.length) scale = fitPersonalScale(log, prior);

    // Reviews first, as Today's review does.
    let due = objs.filter((o) => o.dueDay <= day && day - o.lastDay >= 1);
    if (engine === "fixed_v1") due.sort((a, b) => a.dueDay - b.dueDay || a.i - b.i);
    else due.sort((a, b) => recallAt(a.mem!, day - a.lastDay, scale.k) - recallAt(b.mem!, day - b.lastDay, scale.k) || a.i - b.i);
    due = due.slice(0, cap);
    for (const o of due) {
      const t = day - o.lastDay;
      const p0 = trueRecall(o.truth, t);
      const assisted = !!p.hintRate && draw(`${p.id}|hint|${o.i}|${day}`) < p.hintRate;
      const v = outcome(p0, assisted, draw(`${p.id}|ans|${o.i}|${day}`));
      if (!assisted) {
        const pred = engine === "fixed_v1" ? fixedRetention(o.fixed!.step, t) : recallAt(o.mem!, t, scale.k);
        const y = v === "incorrect" ? 0 : 1;
        brierSum += (pred - y) ** 2;
        brierN++;
      }
      o.truth = trueUpdate(o.truth, p0, v, assisted, truth);
      if (engine !== "proposed") {
        const r = fixedScheduler.next(o.fixed!, { verdict: v, assisted, reviewedAt: dateOf(day) });
        o.fixed = r.next;
        o.dueDay = dayOfIso(r.next.dueOn);
      }
      if (engine !== "fixed_v1") {
        const r = reviewState(o.mem!, t, gradeFor(v, assisted), scale.k, undefined, assisted);
        o.mem = r.next;
        const own = day + nextIntervalDays(o.mem, scale.k, prior.targetRetention, day, p.examDay);
        o.dueDay = engine === "hybrid" ? Math.min(own, o.dueDay) : own;
        log.push({ objectiveId: String(o.i), day, kind: "review", verdict: v, assisted });
      }
      o.lastDay = day;
      reviews++;
      const wk = Math.floor(day / 7);
      reviewsByWeek.set(wk, (reviewsByWeek.get(wk) ?? 0) + 1);
    }

    // Then new lessons (enrolled on reaching Guided, due the next day or later).
    for (let n = 0; n < p.learnPerSession && nextToLearn < p.objectives; n++) {
      const i = nextToLearn++;
      firstLessonDay ??= day;
      const base = TAU0_DAYS * p.trueSpeed * itemFactor(p, i);
      const o: Obj = { i, truth: { tau: base, base }, learnedDay: day, lastDay: day, dueDay: day + 1 };
      if (engine !== "proposed") {
        o.fixed = fixedScheduler.enrol(dateOf(day));
        o.dueDay = dayOfIso(o.fixed.dueOn);
      }
      if (engine !== "fixed_v1") {
        o.mem = enrollState();
        const own = day + nextIntervalDays(o.mem, scale.k, prior.targetRetention, day, p.examDay);
        o.dueDay = engine === "hybrid" ? Math.min(own, o.dueDay) : own;
        log.push({ objectiveId: String(i), day, kind: "enroll" });
      }
      objs.push(o);
    }
    peakFlagged = Math.max(peakFlagged, flaggedOn(day));
  }

  if (engine !== "fixed_v1" && log.length) scale = fitPersonalScale(log, prior);
  const trueAt = objs.map((o) => trueRecall(o.truth, checkDay - o.lastDay));
  const trueMean = trueAt.length ? trueAt.reduce((a, b) => a + b, 0) / trueAt.length : 0;
  let predictedAtCheck: number;
  let predictedLow: number;
  let predictedHigh: number;
  if (engine !== "fixed_v1") {
    const r = examDayRecall(objs.map((o) => ({ st: o.mem!, lastDay: o.lastDay })), checkDay, scale);
    predictedAtCheck = r.mean;
    predictedLow = r.low;
    predictedHigh = r.high;
  } else {
    predictedAtCheck = objs.length ? objs.reduce((s, o) => s + fixedRetention(o.fixed!.step, checkDay - o.lastDay), 0) / objs.length : 0;
    predictedLow = predictedHigh = predictedAtCheck;
  }
  const flaggedSet = objs.map((o) =>
    engine !== "fixed_v1" ? needsRefresh(o.mem!, checkDay - o.lastDay, scale.k) : checkDay > o.dueDay + intervalFor(o.fixed!.step)
  );
  const weeks = firstLessonDay == null ? 1 : Math.max(1, (checkDay - firstLessonDay) / 7);
  return {
    persona: p.id,
    engine,
    checkDay,
    learned: objs.length,
    reviews,
    reviewsPerWeek: reviews / weeks,
    peakWeek: Math.max(0, ...reviewsByWeek.values()),
    trueRecallAtCheck: trueMean,
    predictedAtCheck,
    predictedLow,
    predictedHigh,
    brier: brierN ? brierSum / brierN : null,
    flaggedAtCheck: flaggedSet.filter(Boolean).length,
    peakFlagged: Math.max(peakFlagged, flaggedSet.filter(Boolean).length),
    trulyBelowAtCheck: trueAt.filter((r) => r < REFRESH_BELOW).length,
    flagHits: flaggedSet.filter((f, i) => f && trueAt[i] < REFRESH_BELOW).length,
    fit: engine === "fixed_v1" ? null : scale,
  };
}

export function runAll(personas: Persona[] = PERSONAS, opts: SimOptions = {}): RunResult[] {
  return personas.flatMap((p) => [runPersona(p, "fixed_v1", opts), runPersona(p, "proposed", opts), runPersona(p, "hybrid", opts)]);
}

const pc = (x: number) => `${Math.round(x * 100)}%`;
const n1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

// The report the script prints, also pasted into docs/mastery-decay-design.md.
export function formatReport(results: RunResult[], personas: Persona[] = PERSONAS, title = "Main run (slow-growth truth)"): string {
  const lines: string[] = [];
  lines.push(`### ${title}`);
  lines.push("");
  lines.push("| Persona | Engine | Reviews/wk (peak wk) | Simulated recall at exam | Shown/predicted at exam | Brier | Flagged at exam (peak) | Truly <70% (flag hits) | Fit k (80% band, n, stage) |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const p of personas) {
    for (const r of results.filter((x) => x.persona === p.id)) {
      const pred = r.engine !== "fixed_v1" ? `${pc(r.predictedAtCheck)} (${pc(r.predictedLow)}-${pc(r.predictedHigh)})` : `${pc(r.predictedAtCheck)} (045 retention)`;
      const fit = r.fit ? `${r.fit.k.toFixed(2)} (${r.fit.kLow.toFixed(2)}-${r.fit.kHigh.toFixed(2)}, ${r.fit.n}, ${r.fit.stage})` : "-";
      lines.push(
        `| ${p.id}${p.examDay == null ? ` (check day ${r.checkDay})` : ` (exam day ${r.checkDay})`} | ${r.engine} | ${n1(r.reviewsPerWeek)} (${r.peakWeek}) | ${pc(r.trueRecallAtCheck)} | ${pred} | ${r.brier == null ? "-" : r.brier.toFixed(3)} | ${r.flaggedAtCheck} (${r.peakFlagged}) | ${r.trulyBelowAtCheck} (${r.flagHits}) | ${fit} |`
      );
    }
  }
  return lines.join("\n");
}

