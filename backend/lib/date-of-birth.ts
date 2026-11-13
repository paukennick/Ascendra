// REQ-259 (Nick, 2026-11-13): the date of birth asked once, the first time a
// learner meets an 18+ prompt (mental health courses), and the age the server
// computes from it. Pure functions, no database: routes and tests share them.
//
// Everything is in UTC DATE terms, never the learner's clock: "today" is the
// UTC calendar day of `now`, and a birthday has passed once today's
// (month, day) is at or after the birth (month, day). So the answer does not
// depend on the server's time zone or on where the learner is, and a request
// at 23:30 in Seattle (already tomorrow in UTC) counts as tomorrow.
//
// A 29 February birthday counts as passed on 1 March in a year with no
// 29 February (the cautious reading: someone born 2008-02-29 is 17 on
// 2026-02-28 and 18 from 2026-03-01).
//
// The mobile app validates the same way for the form
// (mobile/src/lib/dateOfBirth.ts); the server is the check that counts.

export const EARLIEST_BIRTH_YEAR = 1900;

export type DateOfBirthProblem = "missing" | "format" | "not_a_date" | "future" | "too_early";

export const DATE_OF_BIRTH_PROBLEM_MESSAGES: Record<DateOfBirthProblem, string> = {
  missing: "Enter your date of birth.",
  format: "Enter your date of birth as year, month and day.",
  not_a_date: "That date doesn't exist. Check the day, month and year.",
  future: "Your date of birth must be a day in the past.",
  too_early: `Enter a year ${EARLIEST_BIRTH_YEAR} or later.`,
};

// The UTC calendar day of `now`, as YYYY-MM-DD.
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export type ParsedDateOfBirth = { ok: true; iso: string } | { ok: false; problem: DateOfBirthProblem };

// `input` is request input: only a string of exactly YYYY-MM-DD that names a
// real calendar day, strictly before today (UTC), from 1900 on, is accepted.
export function parseDateOfBirth(input: unknown, now: Date = new Date()): ParsedDateOfBirth {
  if (input === undefined || input === null || input === "") return { ok: false, problem: "missing" };
  if (typeof input !== "string") return { ok: false, problem: "format" };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) return { ok: false, problem: "format" };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // Before the calendar check: Date.UTC reads years 0-99 as 1900-1999.
  if (y < EARLIEST_BIRTH_YEAR) return { ok: false, problem: "too_early" };
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { ok: false, problem: "not_a_date" };
  if (input >= utcDay(now)) return { ok: false, problem: "future" };
  return { ok: true, iso: input };
}

// Whole years between a stored date of birth (YYYY-MM-DD) and `now`, in UTC
// date terms. A malformed value throws: it came from our own column.
export function ageOn(dateOfBirth: string, now: Date = new Date()): number {
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!b) throw new Error("date of birth is not YYYY-MM-DD");
  const [by, bm, bd] = [Number(b[1]), Number(b[2]), Number(b[3])];
  const t = utcDay(now).split("-").map(Number);
  let age = t[0] - by;
  if (t[1] < bm || (t[1] === bm && t[2] < bd)) age -= 1;
  return age;
}
