// REQ-108: wording and small decisions for Today's review, kept free of React
// so they are tested with node --test (reviewSession.test.ts).
//
// Wellbeing rules the screens follow: show "N for today", never the list of
// everything due; one question at a time; a way to stop after every answer;
// misses framed as information, not failure.

export interface ItemLike {
  position: number;
  answered: boolean;
}

// The first unanswered question, in session order; null when all are done.
export function nextOpen<T extends ItemLike>(items: T[]): T | null {
  return items.find((i) => !i.answered) ?? null;
}

// "Question 3 of 10", counting answered ones before this.
export function progressLabel(items: ItemLike[], current: ItemLike | null): string {
  if (!items.length) return "";
  const done = items.filter((i) => i.answered).length;
  const n = current ? Math.min(done + 1, items.length) : items.length;
  return `Question ${n} of ${items.length}`;
}

export function forTodayLabel(forToday: number, dueCount: number): string {
  if (forToday <= 0) return "Nothing to review today";
  const more = dueCount > forToday ? " (the rest will keep)" : "";
  return `${forToday} for today${more}`;
}

// A plain, kind sentence for the verdict. Feedback from the grader follows.
export function verdictHeadline(verdict: "correct" | "partial" | "incorrect", assisted: boolean): string {
  if (verdict === "correct") {
    return assisted ? "Right, with the choices to help. Next time try it in your own words." : "Right, and from memory.";
  }
  if (verdict === "partial") return "Part of it. Here is the piece to add.";
  return "Not this time. This is useful: it shows what to revisit.";
}

// When it comes back, in words. Dates are YYYY-MM-DD (UTC days).
export function nextReviewLabel(nextDueOn: string | null | undefined, today: string): string | null {
  if (!nextDueOn) return null;
  const days = Math.round((Date.parse(`${nextDueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (Number.isNaN(days)) return null;
  if (days <= 0) return "This one comes back today.";
  if (days === 1) return "This one comes back tomorrow.";
  return `This one comes back in ${days} days.`;
}

export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// "3 of 5 terms shown", plus the ones not yet shown (at most `max` named).
export function coverageSummary(terms: { term: string; covered: boolean }[], max = 4): { line: string; notYet: string } {
  const covered = terms.filter((t) => t.covered).length;
  const missing = terms.filter((t) => !t.covered).map((t) => t.term);
  const line = `${covered} of ${terms.length} term${terms.length === 1 ? "" : "s"} answered correctly on your own`;
  if (!missing.length) return { line, notYet: "" };
  const named = missing.slice(0, max).join(", ");
  const rest = missing.length > max ? ` and ${missing.length - max} more` : "";
  return { line, notYet: `Not yet: ${named}${rest}` };
}

// End-of-session line: counts only, no score shaming.
export function sessionDoneLabel(items: { verdict: string | null; answered: boolean }[]): string {
  const answered = items.filter((i) => i.answered).length;
  const right = items.filter((i) => i.verdict === "correct").length;
  if (!answered) return "No answers today. That's fine; they will keep.";
  return `${answered} reviewed, ${right} right from memory or with help. Each one is now scheduled for its next look.`;
}
