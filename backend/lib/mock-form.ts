import { allocateByWeight, type DomainSlot } from "@/lib/exam-plan";
import type { ExamFormat } from "@/lib/exam-formats";

// REQ-298: the pure parts of building a full-length mock -- choosing the
// items for each question slot from the shared bank, and saying honestly when
// the bank cannot fill every slot. No database, no model (mock-form.test.ts).

// What pre-generating one more bank item costs, as the owner priced it
// (2026-11-14: "about 3.5 cents per item"). Used only to REPORT what a full
// form would cost (scripts/mock-bank-report.ts and the start screen's
// shortfall); nothing here generates anything.
export const PREGEN_COST_PER_ITEM_USD = 0.035;

// An item served to this learner in a session within this many days counts as
// "just seen" even when it was left blank, so back-to-back mocks do not hand
// the same questions over.
export const RECENT_DAYS = 14;

export function preGenCostUsd(items: number): number {
  return Math.round(Math.max(0, items) * PREGEN_COST_PER_ITEM_USD * 100) / 100;
}

// Two items with the same words are the same question to a learner even when
// the bank holds two rows (a lesson check copied into the bank beside a
// generated twin). Compared with case, spacing and punctuation ignored.
export function stemKey(stem: string): string {
  return stem
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Filling slots
// ---------------------------------------------------------------------------

export interface PoolItem {
  id: string;
  objective_id: string;
  item_format: ExamFormat;
  stem: string;
}
export interface SlotRef {
  id: string; // the objective this question is for
  unit_id: string; // its domain
}

export interface FillState<T extends PoolItem> {
  chosen: (T | null)[];
  used: Set<string>; // item ids already in this form
  usedStems: Set<string>; // stemKey of items already in this form
  formatCount: Map<ExamFormat, number>;
}

export function newFillState<T extends PoolItem>(slots: number): FillState<T> {
  return { chosen: new Array<T | null>(slots).fill(null), used: new Set(), usedStems: new Set(), formatCount: new Map() };
}

// How much of the learner's history an item may carry to be used:
//   unseen  not answered before and not served lately (the first choice)
//   older   answered before, but not served in the last RECENT_DAYS
//   any     anything not already in this form (the last resort)
export type SeenPolicy = "unseen" | "older" | "any";

export interface FillOptions<T extends PoolItem> {
  policy: SeenPolicy;
  answered: (item: T) => boolean; // the learner has answered this question before
  recent: ReadonlySet<string>; // item ids served to the learner lately
  // Second pass: any objective of the slot's domain, so the domain still gets
  // its share when one objective has run out of items.
  sameUnit?: boolean;
  shuffle: <U>(xs: U[]) => U[];
  // Multiple choice is most of every exam; the other formats share the rest.
  formatShare: Record<ExamFormat, number>;
}

// Puts one item in each still-empty slot it can. Never an item (or a stem)
// already in the form, whatever the policy: a mock has no repeats.
export function fillSlots<T extends PoolItem>(slots: SlotRef[], state: FillState<T>, pool: T[], opts: FillOptions<T>): number {
  let placed = 0;
  const unitOf = new Map(slots.map((s) => [s.id, s.unit_id]));
  const byKey = new Map<string, T[]>();
  for (const r of opts.shuffle(pool)) {
    const key = opts.sameUnit ? (unitOf.get(r.objective_id) ?? "") : r.objective_id;
    byKey.set(key, [...(byKey.get(key) ?? []), r]);
  }
  const allowed = (r: T): boolean => {
    if (state.used.has(r.id) || state.usedStems.has(stemKey(r.stem))) return false;
    if (opts.policy === "any") return true;
    if (opts.recent.has(r.id)) return false;
    return opts.policy === "older" || !opts.answered(r);
  };
  slots.forEach((slot, i) => {
    if (state.chosen[i]) return;
    const candidates = (byKey.get(opts.sameUnit ? slot.unit_id : slot.id) ?? []).filter(allowed);
    if (!candidates.length) return;
    // Spread formats: the one furthest below its share goes next.
    const score = (f: ExamFormat) => (state.formatCount.get(f) ?? 0) / opts.formatShare[f];
    const best = candidates.reduce((a, b) => (score(b.item_format) < score(a.item_format) ? b : a));
    state.chosen[i] = best;
    state.used.add(best.id);
    state.usedStems.add(stemKey(best.stem));
    state.formatCount.set(best.item_format, (state.formatCount.get(best.item_format) ?? 0) + 1);
    placed++;
  });
  return placed;
}

// ---------------------------------------------------------------------------
// Short form: what the bank can and cannot fill
// ---------------------------------------------------------------------------

export interface UnitBank {
  unitId: string;
  title: string;
  weight: number | null;
  objectives: number;
  // Distinct (by stem) servable items in the exam's formats, for the learner's
  // reading (`fresh`: not answered before) and for anyone (`total`).
  fresh: number;
  total: number;
}

export interface UnitShortfall {
  unitId: string;
  title: string;
  need: number; // questions this domain gets in a full form
  have: number; // distinct items the bank holds for it
  missing: number;
}

export interface FormReadiness {
  requested: number; // the full form's length
  canBuild: number; // questions that can be filled from the bank right now
  freshAvailable: number; // of those, questions the learner has not answered
  repeats: number; // questions that would be ones they've answered before
  missing: number; // items a full form still needs
  short: boolean;
  units: UnitShortfall[];
}

// How much of the full form the bank can fill, domain by domain. Each domain
// gets its blueprint share of `requested` (allocateByWeight, the rule the real
// build uses); a domain whose bank is smaller than its share leaves the
// difference empty -- the form is not padded from other domains, because that
// would change the exam's weighting.
export function formReadiness(units: UnitBank[], requested: number): FormReadiness {
  const slots: DomainSlot[] = units.map((u) => ({ unitId: u.unitId, weight: u.weight, objectives: u.objectives }));
  const alloc = allocateByWeight(slots, requested);
  const rows: UnitShortfall[] = [];
  let canBuild = 0;
  let fresh = 0;
  for (const u of units) {
    const need = alloc.get(u.unitId) ?? 0;
    if (!need) continue;
    const used = Math.min(need, u.total);
    canBuild += used;
    fresh += Math.min(need, u.fresh);
    rows.push({ unitId: u.unitId, title: u.title, need, have: u.total, missing: Math.max(0, need - u.total) });
  }
  const missing = rows.reduce((s, r) => s + r.missing, 0);
  return { requested, canBuild, freshAvailable: fresh, repeats: canBuild - fresh, missing, short: missing > 0, units: rows };
}

// The words shown when the form is short. Says how many, and why.
export function shortFormText(canBuild: number, requested: number): string {
  return (
    `Short form: ${canBuild} of ${requested} questions. We only have ${canBuild} practice questions ready for this exam's domains so far, ` +
    `and we don't fill a mock with questions that skew the exam's weighting or haven't passed our accuracy checks. ` +
    `The time is cut to match, so the pace is the real exam's. More questions are added over time.`
  );
}

export function shortFormReason(r: FormReadiness): string | null {
  return r.short ? shortFormText(r.canBuild, r.requested) : null;
}
