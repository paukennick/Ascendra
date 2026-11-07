// REQ-119 (Audit 3 product M7): kind, opt-in study reminders.
//
// Local notifications only (expo-notifications, scheduled on the phone; no
// server push, nothing leaves the device). Off by default. The learner picks
// the days and a time; the time can't fall inside their quiet hours. The
// wording invites, never guilts: no streaks, no "you missed", no "don't
// forget", no countdowns -- a test checks every message.
//
// This file is the pure half (preferences, validation, what to schedule);
// src/lib/reminderScheduler.ts hands the result to expo-notifications.
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
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
  enabled: false,
  days: [1, 2, 3, 4, 5],
  time: 19 * 60,
  quietStart: 21 * 60 + 30,
  quietEnd: 8 * 60,
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
    };
    return reminderError(p) ? { ...p, enabled: false } : p;
  } catch {
    return { ...DEFAULT_REMINDERS };
  }
}

// Invitations, not demands. Rotated by weekday so the same words don't
// arrive every day.
export const REMINDER_MESSAGES: readonly { title: string; body: string }[] = [
  { title: "A few minutes for you", body: "A short review is ready whenever it suits you." },
  { title: "Study time, if you like", body: "Pick up where you left off, even for five minutes." },
  { title: "Ready when you are", body: "One lesson or a quick review both count. Skip today if you need to." },
  { title: "Your course is here", body: "A little practice now makes the next session easier." },
  { title: "Small steps add up", body: "Open a review or a lesson, at whatever pace works today." },
  { title: "Time to learn something", body: "Your next step is waiting. No rush." },
  { title: "Hello again", body: "If you have a few minutes, a quick review will keep things fresh." },
];

// Words that pressure or shame; none may appear in a reminder.
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
  /!{1}/,
];

export interface ReminderSlot {
  // expo-notifications weekly trigger: 1 = Sunday ... 7 = Saturday.
  weekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

// What to schedule: one weekly notification per chosen day, nothing when
// off or invalid.
export function reminderSchedule(p: ReminderPrefs): ReminderSlot[] {
  if (!p.enabled || reminderError(p)) return [];
  return p.days.map((d) => {
    const m = REMINDER_MESSAGES[d % REMINDER_MESSAGES.length];
    return { weekday: d + 1, hour: Math.floor(p.time / 60), minute: p.time % 60, title: m.title, body: m.body };
  });
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function shiftTime(minutes: number, delta: number): number {
  return (((minutes + delta) % DAY) + DAY) % DAY;
}
