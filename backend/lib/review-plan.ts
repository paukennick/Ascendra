import { createHash } from "node:crypto";

// REQ-108: the pure parts of Today's review -- which due objectives go into a
// session and in what order, and the named terms of an objective. No
// database, no model; tested in review-plan.test.ts.

// ---------------------------------------------------------------------------
// Session size and order
// ---------------------------------------------------------------------------

// 8-12 per session (research item #3). After a rough session the next one is
// shorter and opens with something the learner is likely to get right.
export const SESSION_CAP = 12;
export const GENTLE_SESSION_CAP = 8;
// A session "went badly" when at least this many were answered and under half
// were right.
export const ROUGH_MIN_ANSWERED = 3;
export const ROUGH_ACCURACY = 0.5;

export interface DueCandidate {
  objectiveId: string;
  unitId: string;
  dueOn: string; // YYYY-MM-DD; the earliest of its schedule and missed-question dates
  step: number; // schedule step (higher = remembered over longer gaps); -1 if not scheduled
  lapses: number;
  mastery: number; // 0-4 score
}

export interface LastSession {
  answered: number;
  correct: number;
}

export function wasRough(last: LastSession | null): boolean {
  return !!last && last.answered >= ROUGH_MIN_ANSWERED && last.correct / last.answered < ROUGH_ACCURACY;
}

// How likely the learner is to get this one right, for choosing an opener:
// a high, lapse-free step and a high level first.
function easeOf(c: DueCandidate): number {
  return c.step * 10 + c.mastery * 3 - c.lapses * 5;
}

// The most overdue first; within that, units take turns so two questions on
// the same unit are not back to back when another unit is available
// (interleaving, research item #3). Deterministic for the same input.
export function planSession(candidates: DueCandidate[], last: LastSession | null): {
  items: DueCandidate[];
  gentleStart: boolean;
  cap: number;
} {
  const gentleStart = wasRough(last);
  const cap = gentleStart ? GENTLE_SESSION_CAP : SESSION_CAP;
  const byDue = [...candidates].sort(
    (a, b) => a.dueOn.localeCompare(b.dueOn) || a.unitId.localeCompare(b.unitId) || a.objectiveId.localeCompare(b.objectiveId)
  );
  const chosen = byDue.slice(0, cap);

  // Round-robin across units, units ordered by their most overdue item.
  const groups = new Map<string, DueCandidate[]>();
  for (const c of chosen) {
    const g = groups.get(c.unitId) ?? [];
    g.push(c);
    groups.set(c.unitId, g);
  }
  const queues = [...groups.values()];
  const ordered: DueCandidate[] = [];
  let lastUnit: string | null = null;
  while (ordered.length < chosen.length) {
    // Longest remaining queue first keeps the tail from bunching one unit.
    const live = queues.filter((q) => q.length).sort((a, b) => b.length - a.length || a[0].dueOn.localeCompare(b[0].dueOn));
    const pick = live.find((q) => q[0].unitId !== lastUnit) ?? live[0];
    const next = pick.shift()!;
    ordered.push(next);
    lastUnit = next.unitId;
  }

  if (gentleStart && ordered.length > 1) {
    let best = 0;
    for (let i = 1; i < ordered.length; i++) if (easeOf(ordered[i]) > easeOf(ordered[best])) best = i;
    const [opener] = ordered.splice(best, 1);
    ordered.unshift(opener);
  }
  return { items: ordered, gentleStart, cap };
}

// ---------------------------------------------------------------------------
// Named terms
// ---------------------------------------------------------------------------

export const MAX_TERMS = 10;
const MAX_TERM_WORDS = 6;

export function md5(text: string): string {
  return createHash("md5").update(text, "utf8").digest("hex");
}

export function termKey(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}

// Split on commas and semicolons that are not inside parentheses.
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === ";") && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

// The terms an objective names, read from its title when the title is a list:
// "Malware types: ransomware, trojans, worms, and spyware" ->
// [ransomware, trojans, worms, spyware]. Returns null when the title is not a
// clean list of short terms (a clause, a single idea); those are extracted
// once by the cheap model instead and cached.
export function termsFromTitle(title: string): string[] | null {
  const colon = title.indexOf(":");
  if (colon < 0) return null;
  const list = title.slice(colon + 1).trim();
  if (!list) return null;
  const raw = splitTopLevel(list).map((p) => p.trim());
  const parts = raw
    .flatMap((t, i) => {
      // ", and Y" -> Y. A last item without the Oxford comma ("X, Y and Z",
      // or just "Y and Z") holds two items.
      if (/^(and|or)\s/i.test(t)) return [t.replace(/^(and|or)\s+/i, "")];
      if (i === raw.length - 1) return t.split(/\s+(?:and|or)\s+(?![^(]*\))/i);
      return [t];
    })
    .map((p) => p.replace(/^(the|a|an)\s+/i, "").replace(/[.\s]+$/, "").trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.some((p) => p.split(/\s+/).length > MAX_TERM_WORDS)) return null;
  // A list of actions ("identifying stakeholders, tailoring communication")
  // names skills, not terms.
  const actions = parts.filter((p) => /^[a-z]+ing\s/.test(p)).length;
  if (actions * 2 >= parts.length) return null;
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const p of parts) {
    const k = termKey(p);
    if (!seen.has(k)) {
      seen.add(k);
      terms.push(p);
    }
  }
  return terms.slice(0, MAX_TERMS);
}

// Keep only names that are one of the objective's terms (case-insensitive),
// returned in the objective's own spelling. Model output is untrusted.
export function matchTerms(candidates: unknown, terms: string[]): string[] {
  if (!Array.isArray(candidates)) return [];
  const byKey = new Map(terms.map((t) => [termKey(t), t]));
  const out: string[] = [];
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const t = byKey.get(termKey(c));
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

// Clean a model-extracted term list: strings, short, unique, capped.
export function cleanTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    if (typeof r !== "string") continue;
    const t = r.trim().replace(/[.\s]+$/, "");
    if (!t || t.length > 80 || t.split(/\s+/).length > MAX_TERM_WORDS) continue;
    const k = termKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.slice(0, MAX_TERMS);
}

// Which terms the next question should test: those this learner has not yet
// answered correctly on their own, first. At most two per question.
export function targetTerms(terms: string[], coveredKeys: Set<string>, max = 2): string[] {
  const untested = terms.filter((t) => !coveredKeys.has(termKey(t)));
  return untested.slice(0, max);
}

// Among cached questions this learner has not answered, the one testing the
// most of their untested terms; ties go to the oldest (stable across
// learners, so a shared item is used before another is written). Returns null
// when none is worth serving because there are untested terms and no unseen
// item tests any of them -- then a new question is written for them.
export interface CachedItem {
  id: string;
  terms: string[];
  generatedAt: string;
}
export function chooseCachedItem(items: CachedItem[], untested: Set<string>): CachedItem | null {
  if (!items.length) return null;
  const score = (i: CachedItem) => i.terms.filter((t) => untested.has(termKey(t))).length;
  const sorted = [...items].sort((a, b) => score(b) - score(a) || a.generatedAt.localeCompare(b.generatedAt));
  if (untested.size && score(sorted[0]) === 0) return null;
  return sorted[0];
}
