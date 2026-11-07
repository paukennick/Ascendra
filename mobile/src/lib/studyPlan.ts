// REQ-110: plain-language wording for the study plan, session choice, kept
// view, placement check and "Quiz me". The numbers come from the server
// (backend/lib/study-plan.ts); this only words them. Encouraging throughout:
// no streaks, no "you missed", and a hard date is "ambitious", not "failing".
import type { KeptSummary, PlanOption, PlanStep, QuizTurn, SessionChoice, StudyPlan } from "../types/plan.ts";

export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// "2027-01-30" -> "Jan 30, 2027", without the device's time zone moving it a day.
export function formatDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (!y || !m || !day) return d;
  return `${months[m - 1]} ${day}, ${y}`;
}

// The learner's local date, sent so the plan's "today" is theirs.
export function localToday(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function planHeadline(plan: StudyPlan): string {
  switch (plan.phase) {
    case "building":
      return `${plan.daysToExam} days to your exam`;
    case "final_week":
      return "Final week: mock exam, then sharpen";
    case "last_day":
      return "Light day: the exam is tomorrow";
    case "exam_day":
      return "Exam day. You've got this.";
    case "past":
      return "Your exam date has passed";
    default:
      return "Your study plan";
  }
}

export function optionLine(o: PlanOption): string {
  switch (o.kind) {
    case "more_hours":
      return `Study about ${o.weeklyHours} hours a week`;
    case "later_date":
      return `Move the exam to around ${formatDate(o.examDate)}`;
    case "focus":
      return `Focus on the heaviest domains first: ${o.unitTitles.join(", ")} (${o.coveredWeightPercent}% of the exam with what you've finished)`;
  }
}

export function feasibilityLines(plan: StudyPlan): string[] {
  const f = plan.feasibility;
  const left = `About ${formatMinutes(f.neededMinutes)} of lessons and practice left.`;
  switch (f.status) {
    case "done":
      return ["Every objective is learned. Keep them fresh with review, and try a mock exam."];
    case "on_track":
      return [left, "You're on track for your date, with room for review."];
    case "tight":
      return [left, "It's tight but doable at your current hours. Steady sessions will get you there."];
    case "unrealistic":
      return [left, "That date is ambitious for what's left, and that's fixable. Any one of these would do it:"];
    case "no_date":
      return f.paceFinishDate
        ? [left, `At ${plan.weeklyHours} hours a week you'd finish around ${formatDate(f.paceFinishDate)}. Add an exam date for a countdown plan.`]
        : [left];
  }
}

const STEP_VERB: Record<PlanStep["kind"], string> = {
  warmup: "Warm-up",
  learn: "Learn",
  practice: "Practice",
  confirm: "Confirm",
  review: "Review",
  mock: "Mock exam",
  light: "Light day",
  stretch: "Stretch",
};

export function stepLabel(s: PlanStep): string {
  return s.kind === "mock" || s.kind === "light" ? s.title : `${STEP_VERB[s.kind]}: ${s.title}`;
}

export function stepMeta(s: PlanStep): string {
  return s.minutes > 0 ? `${s.reason} · about ${formatMinutes(s.minutes)}` : s.reason;
}

export function reviewLine(plan: StudyPlan): string {
  const n = plan.thisWeek.reviewItems;
  const mins = formatMinutes(plan.thisWeek.reviewMinutes);
  return n > 0 ? `Review: ${n} item${n === 1 ? "" : "s"} due, about ${mins} this week` : `Review: about ${mins} this week for spaced checks`;
}

// "Kept" vs "completed" (research #15).
export function keptLines(k: KeptSummary): string[] {
  if (k.completed === 0) return ["Once you've got a few objectives right, this shows how many you keep over time."];
  const lines = [`You've kept ${k.kept} of the ${k.completed} objectives you've completed.`];
  if (k.unchecked) lines.push(`${k.unchecked} haven't had a review come due yet. Answering it then, in your own words, shows whether they stuck.`);
  if (k.slipped) lines.push(`${k.slipped} slipped on recent checks. That's normal forgetting, and they're back in your plan.`);
  // REQ-117: a level stands, but after a long gap it is due to re-check.
  if (k.recheck) lines.push(`${k.recheck} ${k.recheck === 1 ? "is" : "are"} due to re-check after a break. A short review brings ${k.recheck === 1 ? "it" : "them"} back.`);
  return lines;
}

export function sessionA11yLabel(c: SessionChoice, isDefault: boolean): string {
  return `${c.label}${isDefault ? ", suggested" : ""}. ${c.detail}${c.available ? "" : ". Not available right now"}`;
}

export function placementProgress(asked: number, max: number): string {
  return `Question ${asked + 1} of up to ${max}`;
}

export function quizTriesLine(t: QuizTurn): string {
  if (t.status !== "open") return "";
  const left = t.maxTries - t.tries;
  return t.tries === 0 ? "Take your best shot. A miss just earns you a hint." : `${left} ${left === 1 ? "try" : "tries"} left, with a hint each time`;
}

// Validates the settings form before sending. Returns an error message or null.
export function examDateError(input: string, today: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Use the format YYYY-MM-DD, for example 2027-03-15.";
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "That isn't a real date.";
  if (v < today) return "That date has passed. Pick a date from today on.";
  return null;
}

export function hoursError(input: string): string | null {
  const n = Number(input.trim());
  if (!input.trim() || !Number.isFinite(n)) return "Enter a number of hours, for example 5.";
  if (n < 0.5 || n > 60) return "Between 0.5 and 60 hours a week.";
  return null;
}

// REQ-112 (h): where tapping a plan step goes. A lesson-type step opens its
// objective's lesson; the mock-exam step opens the exam practice screen
// (REQ-109), where the mock is started. Anything else (a warm-up or light-day
// note with no objective) is not a link: null.
export type StepRoute = { pathname: string; params: Record<string, string> };

export function stepRoute(s: PlanStep, trackId: string, trackTitle?: string): StepRoute | null {
  if (s.kind === "mock") {
    return { pathname: `/course/${trackId}/exam`, params: trackTitle ? { trackTitle } : {} };
  }
  if (!s.objectiveId) return null;
  // REQ-117: a stretch step goes straight to explain-it-back.
  if (s.kind === "stretch") return { pathname: `/course/${trackId}/explain/${s.objectiveId}`, params: { objectiveTitle: s.title } };
  return {
    pathname: `/course/${trackId}/lesson/${s.objectiveId}`,
    params: { ...(s.unitId ? { unitId: s.unitId } : {}), objectiveTitle: s.title },
  };
}
