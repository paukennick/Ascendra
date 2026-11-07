// REQ-110: a study plan built back from the exam date, the three session
// choices shown on opening a course, and the "kept" summary.
//
// Pure and deterministic: no AI call, no clock (the caller passes today's
// date), no database. lib/study-plan-store.ts gathers the inputs; the plan is
// recomputed every time it is opened, so it follows mastery as it changes.
//
// Time estimates are deliberately round, documented guesses (PLAN_MINUTES)
// rather than measurements: the app does not record time on task yet. They
// are tuned in one place, and the plan only ever presents them as estimates.

export type ObjectiveStatus =
  | "Not started"
  | "Introduced"
  | "Guided"
  | "Independent"
  | "Transfer-ready"
  | "Needs review";

export type KeptState = "kept" | "slipped" | "unchecked" | null;

export interface PlanObjective {
  id: string;
  unitId: string;
  title: string;
  sortOrder: number;
  status: ObjectiveStatus | string;
  testedOut: boolean;
  kept: KeptState;
  lastAnsweredAt: string | null; // ISO timestamp of the latest graded answer
}

export interface PlanUnit {
  id: string;
  title: string;
  weight: number | null;
  sortOrder: number;
}

export interface PlanInput {
  today: string; // YYYY-MM-DD, the learner's local date
  examDate: string | null;
  weeklyHours: number;
  units: PlanUnit[];
  objectives: PlanObjective[];
  dueReviews: number;
  // The learner's most recent study day in this course (lesson and PBQ answers).
  lastSession: { day: string; answers: number; correct: number } | null;
  examMinutes: number | null;
}

export const PLAN_MINUTES = {
  learn: 25, // guess, teach, guided step, solo check
  practice: 12, // revisit an objective that is not yet Independent
  confirm: 6, // tested out in placement: one quick check to confirm
  reviewItem: 4, // one spaced-review entry
  mockReview: 45, // going through a mock exam's misses afterwards
  defaultExam: 90,
};
// Share of each week kept for spaced review, so new material never crowds it out.
export const REVIEW_SHARE = 0.25;
// A plan needing more than this per week is not offered as "more hours".
export const MAX_SUGGESTED_HOURS = 30;
// A session this many answers or more with accuracy under ROUGH_ACCURACY was rough.
export const ROUGH_MIN_ANSWERS = 3;
export const ROUGH_ACCURACY = 0.5;
const MAX_WEEK_STEPS = 12;

const DONE: ReadonlySet<string> = new Set(["Independent", "Transfer-ready"]);

export type StepKind = "warmup" | "learn" | "practice" | "confirm" | "review" | "mock" | "light";

export interface PlanStep {
  kind: StepKind;
  objectiveId?: string;
  unitId?: string;
  title: string;
  minutes: number;
  reason: string;
}

export type PlanOption =
  | { kind: "more_hours"; weeklyHours: number }
  | { kind: "later_date"; examDate: string }
  | { kind: "focus"; unitIds: string[]; unitTitles: string[]; coveredWeightPercent: number };

export type Phase = "no_date" | "building" | "final_week" | "last_day" | "exam_day" | "past";
export type Feasibility = "done" | "on_track" | "tight" | "unrealistic" | "no_date";

export interface StudyPlan {
  today: string;
  examDate: string | null;
  weeklyHours: number;
  phase: Phase;
  daysToExam: number | null;
  mockExamDate: string | null;
  lightDay: string | null;
  roughLastSession: boolean;
  remaining: { learn: number; practice: number; confirm: number; done: number; total: number; minutes: number };
  thisWeek: { steps: PlanStep[]; reviewItems: number; reviewMinutes: number; minutes: number };
  feasibility: {
    status: Feasibility;
    neededMinutes: number;
    availableMinutes: number | null;
    // At the current weekly hours, when the remaining work would be done.
    paceFinishDate: string | null;
    options: PlanOption[];
  };
}

// ---- dates (date-only strings, computed in UTC so no time zone shifts them)

const DAY_MS = 86_400_000;
const parse = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export function addDays(d: string, n: number): string {
  return new Date(parse(d) + n * DAY_MS).toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to) - parse(from)) / DAY_MS);
}
export function isDateOnly(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = parse(v);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v;
}

// ---- the work queue

interface WorkItem extends PlanStep {
  objectiveId: string;
  unitId: string;
  needsReview: boolean;
}

function kindFor(o: PlanObjective): "learn" | "practice" | "confirm" | "done" {
  if (DONE.has(o.status)) return "done";
  if (o.testedOut) return "confirm";
  if (o.status === "Not started") return "learn";
  return "practice";
}

const REASON = {
  learn: "New to you",
  practice: "Started, not solid yet",
  needsReview: "Worth another look",
  confirm: "You tested out of this; one quick check confirms it",
};

// Needs-review objectives first, then the course in teaching order, then the
// tested-out objectives to confirm before the mock exam.
function workQueue(input: PlanInput): WorkItem[] {
  const unitOrder = new Map(input.units.map((u) => [u.id, u.sortOrder]));
  const ordered = [...input.objectives].sort(
    (a, b) => (unitOrder.get(a.unitId) ?? 0) - (unitOrder.get(b.unitId) ?? 0) || a.sortOrder - b.sortOrder
  );
  const item = (o: PlanObjective, kind: "learn" | "practice" | "confirm"): WorkItem => ({
    kind,
    objectiveId: o.id,
    unitId: o.unitId,
    title: o.title,
    minutes: PLAN_MINUTES[kind],
    reason: kind === "practice" && o.status === "Needs review" ? REASON.needsReview : REASON[kind],
    needsReview: o.status === "Needs review" && !o.testedOut,
  });
  const needs: WorkItem[] = [];
  const main: WorkItem[] = [];
  const confirm: WorkItem[] = [];
  for (const o of ordered) {
    const k = kindFor(o);
    if (k === "done") continue;
    const w = item(o, k);
    if (k === "confirm") confirm.push(w);
    else if (w.needsReview) needs.push(w);
    else main.push(w);
  }
  return [...needs, ...main, ...confirm];
}

export function isRoughSession(s: PlanInput["lastSession"]): boolean {
  return !!s && s.answers >= ROUGH_MIN_ANSWERS && s.correct / s.answers < ROUGH_ACCURACY;
}

// After a rough session the next step is something the learner can win: an
// objective they have kept (most recently answered first), else one they
// have at Independent or above, else the first new objective of the course
// (a fresh start, not the thing that just went badly).
export function winnableStep(input: PlanInput, queue: WorkItem[]): PlanStep | null {
  const byRecent = (a: PlanObjective, b: PlanObjective) => (b.lastAnsweredAt ?? "").localeCompare(a.lastAnsweredAt ?? "");
  const kept = input.objectives.filter((o) => o.kept === "kept").sort(byRecent)[0];
  const strong = kept ?? input.objectives.filter((o) => DONE.has(o.status)).sort(byRecent)[0];
  if (strong) {
    return {
      kind: "warmup",
      objectiveId: strong.id,
      unitId: strong.unitId,
      title: strong.title,
      minutes: 5,
      reason: "A quick win to start: you've got this one",
    };
  }
  const fresh = queue.find((w) => w.kind === "learn");
  return fresh ? { ...stepOf(fresh), kind: "warmup", reason: "A fresh start on something new" } : null;
}

function stepOf(w: WorkItem): PlanStep {
  return { kind: w.kind, objectiveId: w.objectiveId, unitId: w.unitId, title: w.title, minutes: w.minutes, reason: w.reason };
}

// The units that fit the time available, highest exam weight first, plus the
// ones already finished. Only meaningful for a course with a blueprint.
function focusOption(input: PlanInput, queue: WorkItem[], available: number): PlanOption | null {
  const weighted = input.units.filter((u) => u.weight != null && u.weight > 0);
  if (weighted.length < 2) return null;
  const left = new Map<string, number>();
  for (const w of queue) left.set(w.unitId, (left.get(w.unitId) ?? 0) + w.minutes);
  const total = weighted.reduce((s, u) => s + (u.weight ?? 0), 0);
  let used = 0;
  let covered = 0;
  const picked: PlanUnit[] = [];
  for (const u of [...weighted].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || a.sortOrder - b.sortOrder)) {
    const need = left.get(u.id) ?? 0;
    if (need === 0) {
      covered += u.weight ?? 0;
      continue;
    }
    if (used + need <= available) {
      used += need;
      covered += u.weight ?? 0;
      picked.push(u);
    }
  }
  if (!picked.length) return null;
  return {
    kind: "focus",
    unitIds: picked.map((u) => u.id),
    unitTitles: picked.map((u) => u.title),
    coveredWeightPercent: Math.round((covered / total) * 100),
  };
}

export function buildStudyPlan(input: PlanInput): StudyPlan {
  const { today } = input;
  const weeklyMin = Math.max(30, input.weeklyHours * 60);
  const workPerWeek = weeklyMin * (1 - REVIEW_SHARE);
  const queue = workQueue(input);
  const needed = queue.reduce((s, w) => s + w.minutes, 0);
  const counts = { learn: 0, practice: 0, confirm: 0, done: 0 };
  for (const o of input.objectives) counts[kindFor(o)]++;
  const rough = isRoughSession(input.lastSession);
  const paceWeeks = Math.ceil(needed / workPerWeek);
  const paceFinishDate = needed > 0 ? addDays(today, paceWeeks * 7) : null;

  let phase: Phase = "no_date";
  let daysToExam: number | null = null;
  let mockExamDate: string | null = null;
  let lightDay: string | null = null;
  if (input.examDate) {
    daysToExam = daysBetween(today, input.examDate);
    lightDay = addDays(input.examDate, -1);
    // The mock goes a week out; with less than a week left, as soon as possible.
    mockExamDate = daysToExam > 8 ? addDays(input.examDate, -7) : daysToExam > 2 ? addDays(today, 1) : null;
    if (daysToExam < 0) phase = "past";
    else if (daysToExam === 0) phase = "exam_day";
    else if (daysToExam === 1) phase = "last_day";
    else if (mockExamDate && today >= mockExamDate) phase = "final_week";
    else if (daysToExam <= 8) phase = "final_week";
    else phase = "building";
  }

  // Feasibility: new material has to fit before the mock exam.
  let status: Feasibility;
  let available: number | null = null;
  const options: PlanOption[] = [];
  if (needed === 0) status = "done";
  else if (!input.examDate || phase === "past") status = "no_date";
  else {
    const windowDays = Math.max(1, daysBetween(today, mockExamDate ?? input.examDate));
    available = Math.round(workPerWeek * (windowDays / 7));
    const ratio = needed / Math.max(available, 1);
    status = ratio <= 0.85 ? "on_track" : ratio <= 1 ? "tight" : "unrealistic";
    if (status === "unrealistic") {
      const hours = Math.ceil((needed / (windowDays / 7) / (1 - REVIEW_SHARE) / 60) * 2) / 2;
      if (hours <= MAX_SUGGESTED_HOURS) options.push({ kind: "more_hours", weeklyHours: hours });
      options.push({ kind: "later_date", examDate: addDays(today, paceWeeks * 7 + 7) });
      const focus = focusOption(input, queue, available);
      if (focus) options.push(focus);
    }
  }

  // This week.
  let steps: PlanStep[] = [];
  const reviewMinutes = Math.max(input.dueReviews * PLAN_MINUTES.reviewItem, Math.round(weeklyMin * REVIEW_SHARE));
  if (phase === "last_day" || phase === "exam_day") {
    steps = [
      {
        kind: "light",
        title: phase === "last_day" ? "Light day before the exam" : "Exam day",
        minutes: phase === "last_day" ? 20 : 0,
        reason:
          phase === "last_day"
            ? "Skim what you've kept, sleep well. No new material today."
            : "You've done the work. Skim your notes if it helps, then go show it.",
      },
    ];
  } else {
    let order = queue;
    if (rough) {
      // Lead with something winnable; the Needs-review items wait one step.
      const firstEasy = queue.findIndex((w) => !w.needsReview);
      if (firstEasy > 0) order = [queue[firstEasy], ...queue.slice(0, firstEasy), ...queue.slice(firstEasy + 1)];
    }
    let budget = phase === "final_week" ? Math.round(workPerWeek / 2) : workPerWeek;
    if (rough) {
      const win = winnableStep(input, queue);
      if (win) {
        steps.push(win);
        budget -= win.minutes;
        if (win.objectiveId) order = order.filter((w) => w.objectiveId !== win.objectiveId);
      }
    }
    if (phase === "final_week") {
      // Final week: the mock exam, then confirm and weak spots only.
      order = order.filter((w) => w.kind !== "learn");
      if (mockExamDate && today <= mockExamDate) {
        steps.push({
          kind: "mock",
          title: `Mock exam (${mockExamDate})`,
          minutes: (input.examMinutes ?? PLAN_MINUTES.defaultExam) + PLAN_MINUTES.mockReview,
          reason: "Full length, timed, then go through every miss: they point at the last things to fix.",
        });
      }
    }
    for (const w of order) {
      if (steps.length >= MAX_WEEK_STEPS) break;
      if (budget <= 0 && steps.some((s) => s.kind !== "warmup" && s.kind !== "mock")) break;
      steps.push(stepOf(w));
      budget -= w.minutes;
    }
    if (phase === "building" && mockExamDate && daysBetween(today, mockExamDate) <= 7) {
      steps.push({
        kind: "mock",
        title: `Mock exam (${mockExamDate})`,
        minutes: (input.examMinutes ?? PLAN_MINUTES.defaultExam) + PLAN_MINUTES.mockReview,
        reason: "Full length, timed, a week before the real one.",
      });
    }
  }

  return {
    today,
    examDate: input.examDate,
    weeklyHours: input.weeklyHours,
    phase,
    daysToExam,
    mockExamDate,
    lightDay,
    roughLastSession: rough,
    remaining: { ...counts, total: input.objectives.length, minutes: needed },
    thisWeek: {
      steps,
      reviewItems: input.dueReviews,
      reviewMinutes,
      minutes: steps.reduce((s, x) => s + x.minutes, 0) + reviewMinutes,
    },
    feasibility: { status, neededMinutes: needed, availableMinutes: available, paceFinishDate, options },
  };
}

// ---- session choice (research #15)

export type SessionKind = "review" | "lesson" | "scenario";
export type SessionTarget =
  | { type: "lesson"; objectiveId: string; unitId: string; title: string }
  | { type: "review" }
  | { type: "pbq"; unitId: string; unitTitle: string };

export interface SessionChoice {
  kind: SessionKind;
  label: string;
  detail: string;
  available: boolean;
  target: SessionTarget | null;
}

export function sessionChoices(plan: StudyPlan, input: PlanInput): { defaultKind: SessionKind; choices: SessionChoice[] } {
  const unitTitle = new Map(input.units.map((u) => [u.id, u.title]));
  const lessonTarget = (s: PlanStep): SessionTarget => ({
    type: "lesson",
    objectiveId: s.objectiveId!,
    unitId: s.unitId!,
    title: s.title,
  });

  // 10-minute review.
  let review: SessionChoice;
  const warm = plan.thisWeek.steps.find((s) => s.kind === "warmup" && s.objectiveId);
  const unchecked = input.objectives
    .filter((o) => o.kept === "unchecked" && o.lastAnsweredAt && daysBetween(o.lastAnsweredAt.slice(0, 10), input.today) >= 1)
    .sort((a, b) => (a.lastAnsweredAt ?? "").localeCompare(b.lastAnsweredAt ?? ""))[0];
  if (plan.roughLastSession && warm) {
    review = { kind: "review", label: "10-minute review", detail: `Start with a quick win: ${warm.title}`, available: true, target: lessonTarget(warm) };
  } else if (input.dueReviews > 0) {
    const n = input.dueReviews;
    review = { kind: "review", label: "10-minute review", detail: `${n} item${n === 1 ? "" : "s"} due for review`, available: true, target: { type: "review" } };
  } else if (unchecked) {
    review = {
      kind: "review",
      label: "10-minute review",
      detail: `Check you've kept: ${unchecked.title}`,
      available: true,
      target: { type: "lesson", objectiveId: unchecked.id, unitId: unchecked.unitId, title: unchecked.title },
    };
  } else {
    review = { kind: "review", label: "10-minute review", detail: "Nothing due yet. Nice.", available: false, target: null };
  }

  // New lesson: the plan's next learn/practice/confirm step.
  const next = plan.thisWeek.steps.find((s) => (s.kind === "learn" || s.kind === "practice" || s.kind === "confirm") && s.objectiveId);
  const lesson: SessionChoice = next
    ? { kind: "lesson", label: "New lesson", detail: next.title, available: true, target: lessonTarget(next) }
    : { kind: "lesson", label: "New lesson", detail: "You've worked through every objective", available: false, target: null };

  // Practice scenario: a PBQ on the unit of the next practice step, else the
  // unit with the most practiced objectives, else the first unit.
  const practiced = new Map<string, number>();
  for (const o of input.objectives) if (o.status !== "Not started") practiced.set(o.unitId, (practiced.get(o.unitId) ?? 0) + 1);
  const practiceStep = plan.thisWeek.steps.find((s) => s.kind === "practice" && s.unitId);
  const busiest = [...practiced.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const unitId = practiceStep?.unitId ?? busiest ?? input.units[0]?.id;
  const scenario: SessionChoice = unitId
    ? {
        kind: "scenario",
        label: "Practice scenario",
        detail: practiced.size ? `Multi-part scenario: ${unitTitle.get(unitId) ?? ""}` : "Best after a lesson or two",
        available: true,
        target: { type: "pbq", unitId, unitTitle: unitTitle.get(unitId) ?? "" },
      }
    : { kind: "scenario", label: "Practice scenario", detail: "No units yet", available: false, target: null };

  const choices = [review, lesson, scenario];
  let defaultKind: SessionKind;
  if (plan.roughLastSession && review.available) defaultKind = "review";
  else if (plan.phase === "final_week" && scenario.available && practiced.size) defaultKind = "scenario";
  else if (input.dueReviews >= 3) defaultKind = "review";
  else if (lesson.available) defaultKind = "lesson";
  else defaultKind = choices.find((c) => c.available)?.kind ?? "lesson";
  return { defaultKind, choices };
}

// ---- kept vs completed

export interface KeptSummary {
  completed: number; // objectives with at least one correct graded answer
  kept: number; // ...whose latest spaced answer (a day or more after the one before) was correct
  slipped: number; // ...whose latest spaced answer was not correct
  unchecked: number; // ...not yet answered again after a gap
}

export function keptSummary(objectives: Pick<PlanObjective, "kept">[]): KeptSummary {
  const s: KeptSummary = { completed: 0, kept: 0, slipped: 0, unchecked: 0 };
  for (const o of objectives) {
    if (!o.kept) continue;
    s.completed++;
    s[o.kept]++;
  }
  return s;
}
