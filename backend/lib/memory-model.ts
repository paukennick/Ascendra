// REQ-291 (design) and REQ-301 (shadow mode): per-learner predicted recall for
// the review loop. Pure -- no database, no model calls -- so it can be
// unit-tested and run in the persona simulation (lib/decay-sim.ts,
// scripts/decay-sim.ts). Since REQ-301 it is also imported by
// lib/decay-shadow.ts, which stores its prediction beside every review in
// review_log for calibration; nothing DECIDES from it yet: schedulerFor()
// (lib/review-scheduler.ts) still returns fixed_v1 for every row and no
// learner sees a number. Changing any constant here that moves a prediction
// needs a new MEMORY_MODEL_VERSION (lib/decay-shadow.ts; a test pins them
// together). Design: docs/mastery-decay-design.md.
//
// The memory model is FSRS-6 (open-spaced-repetition), formulas and default
// parameters as published on the awesome-fsrs wiki "The Algorithm" page
// (last edited 2026-07-28, read 2026-11-14):
//   R(t, S)   = (1 + factor * t / S) ^ (-w20),  factor = 0.9^(-1/w20) - 1
//   I(r, S)   = S / factor * (r^(-1/w20) - 1)
//   S0(G)     = w[G-1]
//   D0(G)     = w4 - e^(w5 (G-1)) + 1
//   D'        = D + (-w6 (G-3)) * (10 - D) / 9,  D'' = w7 D0(4) + (1-w7) D'
//   S'recall  = S (e^w8 (11-D) S^-w9 (e^(w10 (1-R)) - 1) * w15[G=2] * w16[G=4] + 1)
//   S'lapse   = w11 D^-w12 ((S+1)^w13 - 1) e^(w14 (1-R))
// The page gives the recall and lapse formulas in its FSRS v4 section and
// says later versions keep the formulas they do not restate. Two choices
// here are ours, not FSRS's: a lapse never raises stability (min with S),
// and same-day reviews are not modeled (REQ-218 keeps reviews 24 h apart).
//
// What is ours on top of FSRS:
//   - grades come from Ascendra verdicts (gradeFor): a miss is Again, a
//     partial or a correct answer with the choices shown is Hard, a correct
//     unaided answer is Good. There is no Easy.
//   - ONE personal parameter, k, the learner's "memory clock": their recall
//     after t days is the default model's recall after t / k days. k > 1
//     forgets more slowly than the FSRS default user, k < 1 faster.
//   - k starts from the course goal and level (priorFor) and is then fitted
//     to the learner's own review history (fitPersonalScale) as a Bayesian
//     posterior on a fixed grid, so the prior fades as reviews come in and
//     the uncertainty is a real interval, not a guess.

import type { CourseGoal, Level } from "./learner-level-rules";

export const MEMORY_MODEL_SOURCE =
  "FSRS-6, awesome-fsrs wiki 'The Algorithm' (last edited 2026-07-28), read 2026-11-14";

// FSRS-6 default parameters w0..w20 (same source).
export const FSRS6_DEFAULT_W: readonly number[] = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483,
  0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

export type Grade = 1 | 2 | 3 | 4;
export type Verdict = "correct" | "partial" | "incorrect";

const STABILITY_MIN = 0.01;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// Ascendra verdict -> FSRS grade. Help is never Good: the choices on screen
// test recognition, not recall (REQ-117 treats it the same way).
export function gradeFor(verdict: Verdict, assisted: boolean): Grade {
  if (verdict === "incorrect") return 1;
  if (verdict === "partial" || assisted) return 2;
  return 3;
}

export function forgettingFactor(w: readonly number[] = FSRS6_DEFAULT_W): number {
  return Math.pow(0.9, -1 / w[20]) - 1;
}

// Probability of recall t days after the last review, at stability S.
export function retrievability(tDays: number, S: number, w: readonly number[] = FSRS6_DEFAULT_W): number {
  if (tDays <= 0) return 1;
  return Math.pow(1 + (forgettingFactor(w) * tDays) / Math.max(S, STABILITY_MIN), -w[20]);
}

// Days until recall falls to r.
export function intervalForRetention(S: number, r: number, w: readonly number[] = FSRS6_DEFAULT_W): number {
  return (S / forgettingFactor(w)) * (Math.pow(r, -1 / w[20]) - 1);
}

export function initialStability(g: Grade, w: readonly number[] = FSRS6_DEFAULT_W): number {
  return Math.max(w[g - 1], STABILITY_MIN);
}

export function initialDifficulty(g: Grade, w: readonly number[] = FSRS6_DEFAULT_W): number {
  return clamp(w[4] - Math.exp(w[5] * (g - 1)) + 1, 1, 10);
}

export function nextDifficulty(D: number, g: Grade, w: readonly number[] = FSRS6_DEFAULT_W): number {
  const damped = D + -w[6] * (g - 3) * ((10 - D) / 9);
  const d0Easy = w[4] - Math.exp(w[5] * 3) + 1; // D0(4), unclamped as the target
  return clamp(w[7] * d0Easy + (1 - w[7]) * damped, 1, 10);
}

export function recallStability(D: number, S: number, R: number, g: Grade, w: readonly number[] = FSRS6_DEFAULT_W): number {
  const hard = g === 2 ? w[15] : 1;
  const easy = g === 4 ? w[16] : 1;
  return S * (Math.exp(w[8]) * (11 - D) * Math.pow(S, -w[9]) * (Math.exp(w[10] * (1 - R)) - 1) * hard * easy + 1);
}

export function lapseStability(D: number, S: number, R: number, w: readonly number[] = FSRS6_DEFAULT_W): number {
  const s = w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp(w[14] * (1 - R));
  return clamp(s, STABILITY_MIN, S);
}

// One objective's memory state in the default model's own time (days / k).
export interface MemoryState {
  s: number; // stability, model days
  d: number; // difficulty 1..10
}

// Enrollment (first reaching Guided) is the first rating: Good, or Hard when
// it was reached with help.
export function enrollState(g: Grade = 3, w: readonly number[] = FSRS6_DEFAULT_W): MemoryState {
  return { s: initialStability(g, w), d: initialDifficulty(g, w) };
}

// One review `elapsedDays` real days after the previous one, for a learner
// whose clock is k.
// Ours, not FSRS: a correct answer given with the choices on screen grows
// stability at most this much (fixed_v1's HELPED_MAX_STEP in spirit). In the
// first simulation run, help counted as a plain Hard grew stability about
// threefold per review and the expert who hints a lot ended at 65% simulated
// recall against fixed_v1's 80% (docs/mastery-decay-design.md).
export const ASSISTED_MAX_GROWTH = 1.2;

export function reviewState(
  st: MemoryState,
  elapsedDays: number,
  g: Grade,
  k: number,
  w: readonly number[] = FSRS6_DEFAULT_W,
  assisted = false
): { next: MemoryState; predicted: number } {
  const R = retrievability(elapsedDays / k, st.s, w);
  let s = g === 1 ? lapseStability(st.d, st.s, R, w) : recallStability(st.d, st.s, R, g, w);
  if (assisted && g > 1) s = Math.min(s, st.s * ASSISTED_MAX_GROWTH);
  return { next: { s: Math.max(s, STABILITY_MIN), d: nextDifficulty(st.d, g, w) }, predicted: R };
}

export function recallAt(st: MemoryState, daysSinceLast: number, k: number, w: readonly number[] = FSRS6_DEFAULT_W): number {
  return retrievability(daysSinceLast / k, st.s, w);
}

// ---------------------------------------------------------------------------
// The starting prior: the per-course goal answer and level (REQ-252), never a
// job title. ASSUMED values for Nick to approve (docs/mastery-decay-design.md
// "Open decisions"); the learner's own history takes over (fitPersonalScale).
// ---------------------------------------------------------------------------

export interface GoalPrior {
  k: number; // median starting memory clock
  targetRetention: number; // recall the schedule aims to keep each objective above
  whatChanged: "high" | "normal"; // emphasis on "what changed" content for this learner
  pacing: "maintain" | "exam" | "build" | "light"; // plan pacing the goal suggests
}

export const GOAL_PRIOR: Record<CourseGoal | "none", GoalPrior> = {
  // Uses it at work: everyday use outside the app refreshes it.
  work: { k: 1.5, targetRetention: 0.85, whatChanged: "high", pacing: "maintain" },
  // Staying current or keeping a credential: knew it once, maintenance load.
  current: { k: 1.3, targetRetention: 0.85, whatChanged: "high", pacing: "maintain" },
  // In a program or studying for the exam now.
  program: { k: 1.0, targetRetention: 0.9, whatChanged: "normal", pacing: "exam" },
  // Getting into the field or changing careers: new material, nothing outside to refresh it.
  career_change: { k: 0.8, targetRetention: 0.9, whatChanged: "normal", pacing: "build" },
  // Learning out of interest: lighter load, a lower target.
  interest: { k: 1.0, targetRetention: 0.8, whatChanged: "normal", pacing: "light" },
  none: { k: 1.0, targetRetention: 0.9, whatChanged: "normal", pacing: "exam" },
};

export const LEVEL_K: Record<Level, number> = { new: 0.85, some: 1.0, experienced: 1.2 };

// Spread of the prior on log k: an 80% band of about x/ 1.9 around the median.
export const PRIOR_LOG_SD = 0.5;
// With an exam date set, every goal aims at least this high, and a clinical
// course never aims lower (open decision: which courses count as clinical).
export const EXAM_TARGET_RETENTION = 0.9;
export const CLINICAL_MIN_RETENTION = 0.9;
export const MAX_INTERVAL_DAYS = 180;
// When an objective's next review would land after the exam and its
// predicted recall on exam day is below target, the review is pulled to this
// many days before the exam.
export const EXAM_FINAL_REVIEW_LEAD_DAYS = 3;
// "Needs a refresh": predicted recall now (posterior mean k) below this.
export const REFRESH_BELOW = 0.7;

export interface PriorInput {
  goal: CourseGoal | null;
  level: Level | null;
  hasExamDate: boolean;
  clinical?: boolean;
}

export interface ResolvedPrior extends GoalPrior {
  logKMean: number;
  logKSd: number;
}

export function priorFor(p: PriorInput): ResolvedPrior {
  const g = GOAL_PRIOR[p.goal ?? "none"];
  let target = g.targetRetention;
  if (p.hasExamDate) target = Math.max(target, EXAM_TARGET_RETENTION);
  if (p.clinical) target = Math.max(target, CLINICAL_MIN_RETENTION);
  const k = g.k * LEVEL_K[p.level ?? "some"];
  return { ...g, targetRetention: target, logKMean: Math.log(k), logKSd: PRIOR_LOG_SD };
}

// ---------------------------------------------------------------------------
// Fitting k to the learner's own reviews.
// ---------------------------------------------------------------------------

export interface LoggedReview {
  objectiveId: string;
  day: number; // days since an epoch (fractional allowed)
  kind: "enroll" | "review";
  verdict?: Verdict;
  assisted?: boolean;
}

// The grid k is fitted on: 61 points log-spaced 0.05 .. 8.
export const K_GRID: readonly number[] = Array.from({ length: 61 }, (_, i) => Math.exp(Math.log(0.05) + (i * Math.log(160)) / 60));

// The review load follows from targetRetention (a lower target means longer
// gaps and fewer reviews), never from a smaller daily cap: a goal-based cap
// of 6 a day starved the two-days-a-week credential holder in the
// simulation (sensitivity run "goal caps").

// Labels for what the fit rests on. Thresholds borrowed from fsrs-rs 6.6.2
// compute_parameters (docs.rs, read 2026-11-14): fewer than 8 training items
// -> default parameters; fewer than 64 -> initial stability only.
export const FIT_STARTING_BELOW = 8;
export const FIT_LEARNING_BELOW = 64;
export type FitStage = "starting" | "learning" | "fitted";

export interface PersonalScale {
  k: number; // posterior median
  kLow: number; // 10th percentile
  kHigh: number; // 90th percentile
  n: number; // unaided reviews the fit used
  stage: FitStage;
}

// Group reviews per objective, in time order.
function byObjective(log: LoggedReview[]): LoggedReview[][] {
  const m = new Map<string, LoggedReview[]>();
  for (const r of log) {
    const list = m.get(r.objectiveId) ?? [];
    list.push(r);
    m.set(r.objectiveId, list);
  }
  return [...m.values()].map((l) => [...l].sort((a, b) => a.day - b.day));
}

function logLikelihood(seqs: LoggedReview[][], k: number, w: readonly number[]): { ll: number; n: number } {
  let ll = 0;
  let n = 0;
  for (const seq of seqs) {
    let st: MemoryState | null = null;
    let last = 0;
    for (const r of seq) {
      if (r.kind === "enroll" || !st) {
        st = enrollState(3, w);
        last = r.day;
        if (r.kind === "enroll") continue;
      }
      const g = gradeFor(r.verdict ?? "correct", !!r.assisted);
      const { next, predicted } = reviewState(st, r.day - last, g, k, w, !!r.assisted);
      if (!r.assisted) {
        const p = clamp(predicted, 0.01, 0.99);
        ll += r.verdict === "incorrect" ? Math.log(1 - p) : Math.log(p);
        n++;
      }
      st = next;
      last = r.day;
    }
  }
  return { ll, n };
}

// Posterior on log k over K_GRID: Normal prior from the goal and level, and
// a Bernoulli likelihood of every unaided review (recalled = not a miss).
// Answers with help update the memory state but are not evidence of recall.
export function fitPersonalScale(log: LoggedReview[], prior: Pick<ResolvedPrior, "logKMean" | "logKSd">, w: readonly number[] = FSRS6_DEFAULT_W): PersonalScale {
  const seqs = byObjective(log);
  const lp: number[] = [];
  let n = 0;
  for (const k of K_GRID) {
    const z = (Math.log(k) - prior.logKMean) / prior.logKSd;
    const r = logLikelihood(seqs, k, w);
    n = r.n;
    lp.push(-0.5 * z * z + r.ll);
  }
  const max = Math.max(...lp);
  const p = lp.map((x) => Math.exp(x - max));
  const total = p.reduce((a, b) => a + b, 0);
  const quantile = (q: number) => {
    let c = 0;
    for (let i = 0; i < p.length; i++) {
      c += p[i] / total;
      if (c >= q) return K_GRID[i];
    }
    return K_GRID[K_GRID.length - 1];
  };
  const stage: FitStage = n < FIT_STARTING_BELOW ? "starting" : n < FIT_LEARNING_BELOW ? "learning" : "fitted";
  return { k: quantile(0.5), kLow: quantile(0.1), kHigh: quantile(0.9), n, stage };
}

// ---------------------------------------------------------------------------
// Scheduling, refresh and exam day.
// ---------------------------------------------------------------------------

// Days from the review just answered to the next one: when predicted recall
// reaches the target, at least one day (REQ-218: 24 h apart), at most
// MAX_INTERVAL_DAYS, and pulled before an exam it would otherwise miss.
export function nextIntervalDays(
  st: MemoryState,
  k: number,
  targetRetention: number,
  todayDay: number,
  examDay: number | null,
  w: readonly number[] = FSRS6_DEFAULT_W
): number {
  let days = Math.round(k * intervalForRetention(st.s, targetRetention, w));
  days = clamp(days, 1, MAX_INTERVAL_DAYS);
  if (examDay != null && todayDay < examDay - EXAM_FINAL_REVIEW_LEAD_DAYS && todayDay + days > examDay) {
    const atExam = recallAt(st, examDay - todayDay, k, w);
    if (atExam < Math.max(targetRetention, EXAM_TARGET_RETENTION)) {
      days = Math.max(1, examDay - EXAM_FINAL_REVIEW_LEAD_DAYS - todayDay);
    }
  }
  return days;
}

export function needsRefresh(st: MemoryState, daysSinceLast: number, k: number, w: readonly number[] = FSRS6_DEFAULT_W): boolean {
  return recallAt(st, daysSinceLast, k, w) < REFRESH_BELOW;
}

export interface ExamDayRecall {
  mean: number; // with the posterior median k
  low: number; // with the 10th-percentile k
  high: number; // with the 90th-percentile k
  objectives: number;
}

// Predicted recall on exam day if nothing more is reviewed, averaged over
// objectives (weights: the blueprint share each objective carries; equal
// when not given). Not reviewing again is the floor the plan can only raise.
export function examDayRecall(
  items: { st: MemoryState; lastDay: number; weight?: number }[],
  examDay: number,
  scale: Pick<PersonalScale, "k" | "kLow" | "kHigh">,
  w: readonly number[] = FSRS6_DEFAULT_W
): ExamDayRecall {
  let ws = 0;
  const acc = { mean: 0, low: 0, high: 0 };
  for (const it of items) {
    const wt = it.weight ?? 1;
    const t = Math.max(0, examDay - it.lastDay);
    ws += wt;
    acc.mean += wt * recallAt(it.st, t, scale.k, w);
    acc.low += wt * recallAt(it.st, t, scale.kLow, w);
    acc.high += wt * recallAt(it.st, t, scale.kHigh, w);
  }
  if (!ws) return { mean: 0, low: 0, high: 0, objectives: 0 };
  return { mean: acc.mean / ws, low: acc.low / ws, high: acc.high / ws, objectives: items.length };
}
