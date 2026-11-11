import { addDays } from "@/lib/review-scheduler";
import { GENTLE_SESSION_CAP, SESSION_CAP } from "@/lib/review-plan";

// REQ-197: what each study reminder says, worked out on the server from the
// learner's real review schedule. The phone asks for the next few days
// (GET /api/reminders/plan) at sign-in and whenever the app comes to the
// front, and schedules at most one local notification a day from it
// (mobile/src/lib/reminders.ts). Pure: no database; reminder-plan-store.ts
// loads the rows.
//
// Nick, 2026-11-09: honest about the model. The schedule today is the
// fixed_v1 ladder (lib/review-scheduler.ts, 1/3/7/21/60 days), not a recall
// probability, so a reminder says an objective is "due for review" (its
// due_on has come) and never "fading" or a percentage. Ranking goes through
// DuePriority so an FSRS scheduler can rank by retrievability later without
// changing the endpoint or the app.

export const PLAN_MAX_DAYS = 14;
export const PLAN_DEFAULT_DAYS = 7;

export interface DueObjective {
  objectiveId: string;
  title: string;
  trackId: string;
  dueOn: string; // YYYY-MM-DD, schedule date (or the missed-question date)
  step: number; // -1 when not on the schedule (an error_log re-check)
  lapses: number;
  status: string | null; // mastery status, e.g. "Needs review"
  // The objective's share of the exam: its unit's blueprint weight divided by
  // the unit's active objectives; 1 when the course has no blueprint.
  examWeight: number;
}

// Higher sorts first, compared element by element.
export interface DuePriority {
  readonly name: string;
  key(o: DueObjective, day: string): number[];
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// Nick's order: "Needs review" first, then days overdue x exam weight, then
// lapses. (days overdue + 1) so something due today still ranks by weight.
export const fixedV1Priority: DuePriority = {
  name: "fixed_v1",
  key(o, day) {
    const overdue = Math.max(0, daysBetween(o.dueOn, day));
    return [o.status === "Needs review" ? 1 : 0, (overdue + 1) * o.examWeight, o.lapses];
  },
};

export function rankDue(due: DueObjective[], day: string, priority: DuePriority = fixedV1Priority): DueObjective[] {
  const keyed = due.map((o) => ({ o, k: priority.key(o, day) }));
  keyed.sort((a, b) => {
    for (let i = 0; i < Math.max(a.k.length, b.k.length); i++) {
      const d = (b.k[i] ?? 0) - (a.k[i] ?? 0);
      if (d) return d;
    }
    return a.o.objectiveId.localeCompare(b.o.objectiveId);
  });
  return keyed.map((x) => x.o);
}

export interface CourseInfo {
  trackId: string;
  shortName: string;
  examDate: string | null; // the learner's exam date for this course
}

export interface ReminderPayload {
  date: string; // the learner's local date the reminder is for
  trackId: string;
  course: string; // short course name
  topic: string; // ONE objective, shortened
  questionCount: number;
  minutes: number | null; // null when there is too little timing data to say
  examInDays: number | null; // null without an exam date, or once it has passed
}

// The next `days` days starting at `today`: for each, the single top-ranked
// due objective, its course's due count (capped at a session) and the honest
// time estimate. A day with nothing due is left out: no reminder that day.
export function planReminders(input: {
  today: string;
  days: number;
  due: DueObjective[];
  courses: Map<string, CourseInfo>;
  secondsPerQuestion: number | null;
  roughLastSession: boolean;
  priority?: DuePriority;
}): ReminderPayload[] {
  const cap = input.roughLastSession ? GENTLE_SESSION_CAP : SESSION_CAP;
  const out: ReminderPayload[] = [];
  for (let i = 0; i < input.days; i++) {
    const day = addDays(input.today, i);
    const dueThatDay = input.due.filter((o) => o.dueOn <= day && input.courses.has(o.trackId));
    if (!dueThatDay.length) continue;
    const top = rankDue(dueThatDay, day, input.priority)[0];
    const course = input.courses.get(top.trackId)!;
    const count = Math.min(cap, dueThatDay.filter((o) => o.trackId === top.trackId).length);
    const examIn = course.examDate ? daysBetween(day, course.examDate) : null;
    out.push({
      date: day,
      trackId: top.trackId,
      course: course.shortName,
      topic: shortTopic(top.title),
      questionCount: count,
      minutes: input.secondsPerQuestion == null ? null : Math.max(1, Math.round((count * input.secondsPerQuestion) / 60)),
      examInDays: examIn != null && examIn >= 0 ? examIn : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Time estimate
// ---------------------------------------------------------------------------

// Gaps between two answers in the same review session. Shorter than 5 s is a
// double tap, longer than 10 min is a break, neither is answering time.
export const MIN_GAP_S = 5;
export const MAX_GAP_S = 600;
// Fewer samples than this and the app says the question count only.
export const MIN_TIMING_SAMPLES = 5;

// Median seconds per question from recent answer gaps, or null.
export function secondsPerQuestion(gapsSeconds: number[]): number | null {
  const ok = gapsSeconds.filter((g) => Number.isFinite(g) && g >= MIN_GAP_S && g <= MAX_GAP_S).sort((a, b) => a - b);
  if (ok.length < MIN_TIMING_SAMPLES) return null;
  const mid = Math.floor(ok.length / 2);
  return ok.length % 2 ? ok[mid] : (ok[mid - 1] + ok[mid]) / 2;
}

// ---------------------------------------------------------------------------
// Short names
// ---------------------------------------------------------------------------

export const COURSE_NAME_MAX = 18;
export const TOPIC_MAX = 40;

const VENDOR_PREFIX =
  /^(AWS Certified|Microsoft Certified:|Google Cloud Certified -|Google Cloud|Google|Certified|Prep for|CompTIA|Cisco|PMI|ISC2|\(ISC\)²)\s+/i;

function ellipsize(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:-]+$/, "")}…`;
}

// "CompTIA Security+" -> "Security+"; a long credential name falls back to
// its exam code ("SAP-C03"), then to a shortened name.
export function shortCourseName(p: {
  credentialName: string | null;
  providerName: string | null;
  examCode: string | null;
  trackTitle: string;
}): string {
  let name = (p.credentialName ?? p.trackTitle).trim();
  if (p.providerName && name.toLowerCase().startsWith(`${p.providerName.toLowerCase()} `)) {
    name = name.slice(p.providerName.length + 1);
  }
  for (let i = 0; i < 3 && VENDOR_PREFIX.test(name); i++) name = name.replace(VENDOR_PREFIX, "");
  name = name.replace(/\s+Coach$/i, "").trim();
  if (name.length <= COURSE_NAME_MAX) return name;
  if (p.examCode && p.examCode.length <= COURSE_NAME_MAX) return p.examCode;
  return ellipsize(name, COURSE_NAME_MAX);
}

// Objective titles are long and list their terms ("Incident response:
// preparation, detection, ..."); the part before the first list marker names
// the topic.
export function shortTopic(title: string): string {
  const head = title.split(/:|\s\(|\s--\s|\s—\s|;/)[0].trim();
  const base = head.length >= 3 ? head : title.trim();
  return ellipsize(base, TOPIC_MAX);
}

export function clampPlanDays(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isInteger(n)) return PLAN_DEFAULT_DAYS;
  return Math.min(PLAN_MAX_DAYS, Math.max(1, n));
}
