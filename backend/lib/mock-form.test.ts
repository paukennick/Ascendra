// REQ-298: building a full-length mock from the shared bank -- domain weights,
// no repeats, avoiding what the learner just saw, and the honest short form.
// Pure: no database, no model.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { allocateByWeight } from "./exam-plan";
import {
  fillSlots,
  formReadiness,
  newFillState,
  preGenCostUsd,
  shortFormReason,
  shortFormText,
  stemKey,
  PREGEN_COST_PER_ITEM_USD,
  type PoolItem,
  type SlotRef,
  type UnitBank,
} from "./mock-form";
import type { ExamFormat } from "./exam-formats";

const SHARE: Record<ExamFormat, number> = { multiple_choice: 2, multiple_response: 1, ordering: 1, matching: 1 };
const noShuffle = <U,>(xs: U[]) => [...xs];
const item = (id: string, objective: string, stem = `Question ${id}`, fmt: ExamFormat = "multiple_choice"): PoolItem => ({
  id,
  objective_id: objective,
  item_format: fmt,
  stem,
});
const slot = (objective: string, unit: string): SlotRef => ({ id: objective, unit_id: unit });
const base = (over: Partial<Parameters<typeof fillSlots<PoolItem>>[3]> = {}) => ({
  policy: "unseen" as const,
  answered: () => false,
  recent: new Set<string>(),
  shuffle: noShuffle,
  formatShare: SHARE,
  ...over,
});

describe("weights: a full-length form follows the exam's domain weights exactly", () => {
  test("SAA 30/26/24/20 over the exam's 65 questions adds up to 65", () => {
    const d = [30, 26, 24, 20].map((w, i) => ({ unitId: `d${i}`, weight: w, objectives: 6 }));
    const a = allocateByWeight(d, 65);
    assert.deepEqual([...a.values()], [19, 17, 16, 13]);
    assert.equal([...a.values()].reduce((s, x) => s + x, 0), 65);
  });
  test("CCRN 13/12/21/18/16/20 over 150 and Security+ 12/22/18/28/20 over 90 add up", () => {
    const sum = (ws: number[], n: number) =>
      [...allocateByWeight(ws.map((w, i) => ({ unitId: `u${i}`, weight: w, objectives: 9 })), n).values()].reduce((s, x) => s + x, 0);
    assert.equal(sum([13, 12, 21, 18, 16, 20], 150), 150);
    assert.equal(sum([12, 22, 18, 28, 20], 90), 90);
  });
});

describe("no repeats within a mock", () => {
  test("the same item is never placed twice, even when several slots want one objective", () => {
    const slots = [slot("o1", "u1"), slot("o1", "u1"), slot("o1", "u1")];
    const st = newFillState<PoolItem>(3);
    fillSlots(slots, st, [item("a", "o1"), item("b", "o1")], base());
    assert.equal(st.chosen.filter(Boolean).length, 2, "two items for three slots: the third stays empty rather than repeating");
    assert.equal(new Set(st.chosen.filter(Boolean).map((x) => x!.id)).size, 2);
  });
  test("two bank rows with the same words are one question (a lesson copy beside a generated twin)", () => {
    const slots = [slot("o1", "u1"), slot("o2", "u1")];
    const st = newFillState<PoolItem>(2);
    fillSlots(slots, st, [item("a", "o1", "Which service stores objects?"), item("b", "o2", "which service  stores objects")], base({ policy: "any" }));
    assert.equal(st.chosen.filter(Boolean).length, 1);
  });
  test("the same-domain second pass respects the ones already used", () => {
    const slots = [slot("o1", "u1"), slot("o2", "u1")];
    const st = newFillState<PoolItem>(2);
    const pool = [item("a", "o1"), item("b", "o1")];
    fillSlots(slots, st, pool, base());
    fillSlots(slots, st, pool, base({ sameUnit: true }));
    assert.deepEqual(st.chosen.map((x) => x?.id).sort(), ["a", "b"]);
  });
  test("stemKey ignores case, spacing and punctuation", () => {
    assert.equal(stemKey("  Which, of THESE   is right? "), stemKey("which of these is right"));
  });
});

describe("avoiding what the learner just saw", () => {
  const pool = [item("seen", "o1"), item("fresh", "o1"), item("recent", "o1")];
  const answered = (r: PoolItem) => r.id === "seen";
  const recent = new Set(["recent"]);
  test("unseen: an answered item and a recently served item are skipped", () => {
    const st = newFillState<PoolItem>(3);
    fillSlots([slot("o1", "u1"), slot("o1", "u1"), slot("o1", "u1")], st, pool, base({ answered, recent }));
    assert.deepEqual(st.chosen.filter(Boolean).map((x) => x!.id), ["fresh"]);
  });
  test("older: an answered item comes back before a recently served one", () => {
    const st = newFillState<PoolItem>(3);
    const slots = [slot("o1", "u1"), slot("o1", "u1"), slot("o1", "u1")];
    fillSlots(slots, st, pool, base({ answered, recent }));
    fillSlots(slots, st, pool, base({ answered, recent, policy: "older" }));
    assert.deepEqual(st.chosen.map((x) => x?.id), ["fresh", "seen", undefined]);
  });
  test("any: only as the last resort, and then the form is full", () => {
    const st = newFillState<PoolItem>(3);
    const slots = [slot("o1", "u1"), slot("o1", "u1"), slot("o1", "u1")];
    for (const policy of ["unseen", "older", "any"] as const) fillSlots(slots, st, pool, base({ answered, recent, policy }));
    assert.deepEqual(st.chosen.map((x) => x?.id), ["fresh", "seen", "recent"]);
  });
});

describe("formats spread across the form", () => {
  test("the format furthest below its share goes next (multiple choice 2 : response 1)", () => {
    const slots = Array.from({ length: 6 }, () => slot("o1", "u1"));
    const pool = [
      ...["a", "b", "c", "d"].map((id) => item(id, "o1", `mc ${id}`, "multiple_choice")),
      ...["e", "f"].map((id) => item(id, "o1", `mr ${id}`, "multiple_response")),
    ];
    const st = newFillState<PoolItem>(6);
    // one slot per call to see the order
    for (let i = 0; i < 6; i++) fillSlots(slots.slice(0, i + 1), st, pool, base());
    const n = (f: ExamFormat) => st.chosen.filter((x) => x?.item_format === f).length;
    assert.equal(n("multiple_choice"), 4);
    assert.equal(n("multiple_response"), 2);
  });
});

describe("short form: what the bank can fill, and what a full form needs", () => {
  const unit = (id: string, weight: number, total: number, fresh = total): UnitBank => ({ unitId: id, title: `Domain ${id}`, weight, objectives: 5, total, fresh });
  test("a bank that covers every domain's share is a full form", () => {
    const r = formReadiness([unit("a", 50, 40), unit("b", 50, 40)], 60);
    assert.equal(r.short, false);
    assert.equal(r.canBuild, 60);
    assert.equal(r.missing, 0);
    assert.equal(shortFormReason(r), null);
  });
  test("a thin domain leaves its slots empty; other domains do not pad the form", () => {
    const r = formReadiness([unit("a", 50, 40), unit("b", 50, 10)], 60);
    assert.equal(r.short, true);
    assert.equal(r.canBuild, 40, "30 from a, 10 from b");
    assert.equal(r.missing, 20, "b needs 30, holds 10");
    assert.deepEqual(r.units.find((u) => u.unitId === "b"), { unitId: "b", title: "Domain b", need: 30, have: 10, missing: 20 });
    assert.match(shortFormReason(r)!, /^Short form: 40 of 60 questions\./);
  });
  test("an empty bank needs the whole form", () => {
    const r = formReadiness([unit("a", 30, 0), unit("b", 70, 0)], 65);
    assert.equal(r.canBuild, 0);
    assert.equal(r.missing, 65);
  });
  test("answered items still fill the form, but are counted as repeats", () => {
    const r = formReadiness([unit("a", 100, 30, 12)], 30);
    assert.equal(r.canBuild, 30);
    assert.equal(r.freshAvailable, 12);
    assert.equal(r.repeats, 18);
    assert.equal(r.short, false);
  });
  test("cost: 3.5 cents an item, rounded to the cent, never negative", () => {
    assert.equal(PREGEN_COST_PER_ITEM_USD, 0.035);
    assert.equal(preGenCostUsd(65), 2.28);
    assert.equal(preGenCostUsd(100), 3.5);
    assert.equal(preGenCostUsd(0), 0);
    assert.equal(preGenCostUsd(-5), 0);
  });
  test("the reason says how many and why, without claiming the official scale", () => {
    const t = shortFormText(38, 65);
    assert.match(t, /38 of 65/);
    assert.match(t, /accuracy checks/);
    assert.doesNotMatch(t, /scaled|passing score/i);
  });
});
