// REQ-259 (Nick, 2026-11-13): the date of birth the 18+ notice asks for the
// first time, as three numeric boxes (day, month, year): they open the number
// pad on a phone, work with a keyboard on the web, and need no date picker.
// Pure functions; the notice (src/components/MatureContentNotice.tsx) shows the
// messages. The server (backend/lib/date-of-birth.ts) applies the same rules in
// UTC date terms and is the check that counts; a mobile test checks the
// earliest year matches.

export const EARLIEST_BIRTH_YEAR = 1900;

export interface DobParts {
  day: string;
  month: string;
  year: string;
}

export type DobProblem = "missing" | "incomplete" | "not_a_date" | "future" | "too_early";

export const DOB_PROBLEM_MESSAGES: Record<DobProblem, string> = {
  missing: "Enter your date of birth.",
  incomplete: "Enter the day, the month and the four-digit year.",
  not_a_date: "That date doesn't exist. Check the day, month and year.",
  future: "Your date of birth must be a day in the past.",
  too_early: `Enter a year ${EARLIEST_BIRTH_YEAR} or later.`,
};

// Keep only digits, at most `max` of them, as the learner types.
export function digitsOnly(text: string, max: number): string {
  return text.replace(/\D/g, "").slice(0, max);
}

// The UTC calendar day of `now`: the server's "today".
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export type DobResult = { ok: true; iso: string } | { ok: false; problem: DobProblem; message: string };

const fail = (problem: DobProblem): DobResult => ({ ok: false, problem, message: DOB_PROBLEM_MESSAGES[problem] });

export function dobFromParts(parts: DobParts, now: Date = new Date()): DobResult {
  const day = parts.day.trim();
  const month = parts.month.trim();
  const year = parts.year.trim();
  if (!day && !month && !year) return fail("missing");
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return fail("incomplete");
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (y < EARLIEST_BIRTH_YEAR) return fail("too_early");
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return fail("not_a_date");
  const iso = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (iso >= utcDay(now)) return fail("future");
  return { ok: true, iso };
}
