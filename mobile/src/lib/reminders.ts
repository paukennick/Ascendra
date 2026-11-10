// REQ-119 (Audit 3 product M7): kind, opt-in study reminders.
// REQ-197: reminders that say what and why.
//
// Local notifications only (expo-notifications, scheduled on the phone; no
// server push and no push token). Off by default. The learner picks the
// days and a time; the time can't fall inside their quiet hours.
//
// What a reminder says comes from the server (GET /api/reminders/plan): for
// each of the next few days, the ONE objective most due for review, the
// course's question count and an honest time estimate from the learner's own
// recent answer times, and the days to their exam when they set one. A day
// with nothing due gets no reminder. At most one a day. Nick, 2026-11-09:
// short ("<course>: <topic>" / "Due for review · 6 questions, ~5 min ·
// exam in 11 days"), and honest about the model -- the schedule is a fixed
// 1/3/7/21/60-day ladder, so never "fading" and never a recall percentage.
// "Show topic on lock screen" off swaps in a generic line, because a
// clinical topic on a lock screen can be sensitive.
//
// The wording invites, never guilts: no streaks, no "you missed", no
// "don't forget" -- a test checks every message.
//
// This file is the pure half (preferences, validation, the words, what to
// schedule); src/lib/reminderScheduler.ts fetches the plan and hands the
// result to expo-notifications.
//
// Stored per user on the device under ascendra.reminders.<userId>, so
// "Log out" sweeps it (src/lib/localData.ts) and another account on the same
// phone never inherits someone else's reminders.

export interface ReminderPrefs {
  enabled: boolean;
  // 0 = Sunday ... 6 = Saturday (Date.getDay()).
  days: number[];
  // Minutes after local midnight.
  time: number;
  quietStart: number;
  quietEnd: number;
  // REQ-197: "Show topic on lock screen". Off = a generic line.
  showTopic: boolean;
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
  enabled: false,
  days: [1, 2, 3, 4, 5],
  time: 19 * 60,
  quietStart: 21 * 60 + 30,
  quietEnd: 8 * 60,
  showTopic: true,
};

export const REMINDER_KEY_PREFIX = "ascendra.reminders.";
export const reminderKey = (userId: string) => `${REMINDER_KEY_PREFIX}${userId}`;

const DAY = 24 * 60;

// Inside [start, end), wrapping past midnight when start > end. Equal
// start and end means no quiet hours.
export function inQuietHours(time: number, quietStart: number, quietEnd: number): boolean {
  if (quietStart === quietEnd) return false;
  if (quietStart < quietEnd) return time >= quietStart && time < quietEnd;
  return time >= quietStart || time < quietEnd;
}

export function formatTime(minutes: number, locale?: string): string {
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  try {
    return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  } catch {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
}

const validMinute = (m: unknown): m is number => typeof m === "number" && Number.isInteger(m) && m >= 0 && m < DAY;

// Learner-facing message for a setting that can't be saved, or null.
export function reminderError(p: ReminderPrefs): string | null {
  if (!validMinute(p.time) || !validMinute(p.quietStart) || !validMinute(p.quietEnd)) return "Pick a time of day.";
  if (!p.enabled) return null;
  if (!p.days.length) return "Pick at least one day, or turn reminders off.";
  if (inQuietHours(p.time, p.quietStart, p.quietEnd)) {
    return `That time is inside your quiet hours (${formatTime(p.quietStart)} to ${formatTime(p.quietEnd)}). Pick another time or change quiet hours.`;
  }
  return null;
}

// Anything stored that doesn't parse cleanly falls back to the defaults
// (reminders off), never to something the learner didn't choose.
export function parseReminderPrefs(raw: string | null | undefined): ReminderPrefs {
  if (!raw) return { ...DEFAULT_REMINDERS };
  try {
    const v = JSON.parse(raw) as Partial<ReminderPrefs>;
    const days = Array.isArray(v.days)
      ? [...new Set(v.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
      : DEFAULT_REMINDERS.days;
    const p: ReminderPrefs = {
      enabled: v.enabled === true,
      days,
      time: validMinute(v.time) ? v.time : DEFAULT_REMINDERS.time,
      quietStart: validMinute(v.quietStart) ? v.quietStart : DEFAULT_REMINDERS.quietStart,
      quietEnd: validMinute(v.quietEnd) ? v.quietEnd : DEFAULT_REMINDERS.quietEnd,
      showTopic: v.showTopic !== false,
    };
    return reminderError(p) ? { ...p, enabled: false } : p;
  } catch {
    return { ...DEFAULT_REMINDERS };
  }
}

// REQ-197: shown instead of the course and topic when "Show topic on lock
// screen" is off.
export const GENERIC_REMINDER = { title: "Study reminder", body: "A short review is ready when it suits you." } as const;

// Words that pressure or shame; none may appear in a reminder. "fading" and
// percentages: the schedule is a fixed ladder, not a recall model (REQ-197).
export const GUILT_PATTERNS: readonly RegExp[] = [
  /streak/i,
  /miss(ed|ing)?\b/i,
  /don'?t forget/i,
  /\blos(e|ing|t)\b/i,
  /behind/i,
  /fail/i,
  /\bmust\b/i,
  /last chance/i,
  /hurry/i,
  /disappoint/i,
  /lazy/i,
  /you haven'?t/i,
  /come back/i,
  /only \d+ days?/i,
  /\bfad(e|es|ed|ing)\b/i,
  /\d\s*%/,
  /!{1}/,
];

// Nick's limits: title about 40 characters, body about 60.
export const TITLE_MAX = 40;
export const BODY_MAX = 60;

// One day of GET /api/reminders/plan.
export interface PlanReminder {
  date: string; // YYYY-MM-DD, the learner's local date
  trackId: string;
  course: string;
  topic: string;
  questionCount: number;
  minutes: number | null;
  examInDays: number | null;
}

function cut(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).replace(/[\s,;:·-]+$/, "")}…`;
}

export function reminderText(r: PlanReminder, showTopic: boolean): { title: string; body: string } {
  if (!showTopic) return { ...GENERIC_REMINDER };
  const q = `${r.questionCount} question${r.questionCount === 1 ? "" : "s"}`;
  const size = r.minutes != null ? `${q}, ~${r.minutes} min` : q;
  const exam =
    r.examInDays == null ? "" : r.examInDays === 0 ? " · exam today" : ` · exam in ${r.examInDays} day${r.examInDays === 1 ? "" : "s"}`;
  const head = `${r.course}: `;
  const title = head.length >= TITLE_MAX - 4 ? cut(`${r.course}: ${r.topic}`, TITLE_MAX) : head + cut(r.topic, TITLE_MAX - head.length);
  return { title, body: cut(`Due for review · ${size}${exam}`, BODY_MAX) };
}

export function parsePlan(raw: unknown): PlanReminder[] {
  const list = (raw as { reminders?: unknown } | null)?.reminders;
  if (!Array.isArray(list)) return [];
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  return list.filter(
    (r): r is PlanReminder =>
      !!r &&
      typeof r.date === "string" &&
      DATE.test(r.date) &&
      typeof r.trackId === "string" &&
      typeof r.course === "string" &&
      typeof r.topic === "string" &&
      Number.isInteger(r.questionCount) &&
      r.questionCount > 0 &&
      (r.minutes === null || (typeof r.minutes === "number" && r.minutes > 0)) &&
      (r.examInDays === null || (Number.isInteger(r.examInDays) && r.examInDays >= 0))
  );
}

export interface ReminderSlot {
  // Local date and time to fire.
  at: Date;
  title: string;
  body: string;
  trackId: string;
}

// What to schedule: for each plan day the learner chose (prefs.days) whose
// time is still ahead, one notification. Nothing when off or invalid, and
// nothing on a day the plan leaves out (nothing due).
export function reminderSchedule(p: ReminderPrefs, plan: PlanReminder[], now: Date): ReminderSlot[] {
  if (!p.enabled || reminderError(p)) return [];
  const seen = new Set<string>();
  const out: ReminderSlot[] = [];
  for (const r of plan) {
    if (seen.has(r.date)) continue; // at most one a day
    seen.add(r.date);
    const [y, m, d] = r.date.split("-").map(Number);
    const at = new Date(y, m - 1, d, Math.floor(p.time / 60), p.time % 60, 0, 0);
    if (!p.days.includes(at.getDay()) || at.getTime() <= now.getTime()) continue;
    out.push({ at, trackId: r.trackId, ...reminderText(r, p.showTopic) });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// The learner's local date, for ?today= on the plan request.
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function shiftTime(minutes: number, delta: number): number {
  return (((minutes + delta) % DAY) + DAY) % DAY;
}
