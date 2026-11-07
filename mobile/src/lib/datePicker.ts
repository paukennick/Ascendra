// REQ-113 (Audit 3 mobile L2): the study plan's exam date was typed as
// YYYY-MM-DD free text, which is hard on a phone keyboard, error-prone, and
// meaningless in many locales. This is the pure half of a month-grid picker
// (src/components/DatePicker.tsx): dates stay ISO strings (YYYY-MM-DD, as
// the API takes them); names of months and days come from Intl in the
// device's locale, not from English in code.

export interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  disabled: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoOf = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;

export function parseIso(iso: string | null | undefined): { y: number; m0: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return null;
  const y = Number(m[1]);
  const m0 = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, m0, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m0 || dt.getUTCDate() !== d) return null;
  return { y, m0, d };
}

export function addMonths(y: number, m0: number, delta: number): { y: number; m0: number } {
  const total = y * 12 + m0 + delta;
  return { y: Math.floor(total / 12), m0: ((total % 12) + 12) % 12 };
}

// Weeks of 7 cells for the month, padded with the neighbouring months' days.
// `min` (ISO) disables earlier days, e.g. today for an exam date.
export function monthGrid(y: number, m0: number, opts: { min?: string | null; weekStartsOn?: number } = {}): DayCell[][] {
  const start = opts.weekStartsOn ?? 0;
  const first = new Date(Date.UTC(y, m0, 1));
  const lead = (first.getUTCDay() - start + 7) % 7;
  const daysInMonth = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
  const cells: DayCell[] = [];
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  for (let i = 0; i < total; i++) {
    const dt = new Date(Date.UTC(y, m0, 1 - lead + i));
    const iso = isoOf(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
    cells.push({
      iso,
      day: dt.getUTCDate(),
      inMonth: dt.getUTCMonth() === m0,
      disabled: !!opts.min && iso < opts.min,
    });
  }
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function fmt(locale: string | undefined, o: Intl.DateTimeFormatOptions, y: number, m0: number, d = 1): string | null {
  try {
    return new Intl.DateTimeFormat(locale, { ...o, timeZone: "UTC" }).format(new Date(Date.UTC(y, m0, d)));
  } catch {
    return null;
  }
}

export function monthTitle(y: number, m0: number, locale?: string): string {
  return fmt(locale, { month: "long", year: "numeric" }, y, m0) ?? `${y}-${pad(m0 + 1)}`;
}

export function longDate(iso: string, locale?: string): string {
  const p = parseIso(iso);
  if (!p) return iso;
  return fmt(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, p.y, p.m0, p.d) ?? iso;
}

// Short weekday names in grid order (2024-01-07 was a Sunday).
export function weekdayNames(weekStartsOn = 0, locale?: string): string[] {
  return Array.from({ length: 7 }, (_, i) => fmt(locale, { weekday: "short" }, 2024, 0, 7 + ((weekStartsOn + i) % 7)) ?? String(i));
}
