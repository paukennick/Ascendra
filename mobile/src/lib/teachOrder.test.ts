// REQ-262: the Explain first / Example first order (src/lib/teachOrder.ts),
// the lesson screen's use of it, and the pins against the server's values.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_TEACH_ORDER,
  effectiveOrder,
  orderCards,
  orderEventDetail,
  parseTeachOrder,
  TEACH_ORDER_LABELS,
  TEACH_ORDERS,
  teachOrderRowValue,
  teachOrderSheetMessage,
} from "./teachOrder.ts";
import type { TeachCards } from "./lessonExperience.ts";

const lesson: TeachCards = {
  cards: [
    { kind: "definition", title: "What it is", body: "d" },
    { kind: "why", title: "Why it matters", body: "w" },
    { kind: "example", title: "Worked example", body: "e", steps: ["one", "two"] },
    { kind: "mistake", title: "Common mistake", body: "m" },
  ],
  selfExplain: { step: 2, question: "why?", modelExplanation: "because" },
};

describe("ordering the cards", () => {
  test("Explain first is the lesson as written", () => {
    assert.equal(orderCards(lesson, "explain_first"), lesson);
  });
  test("Example first moves the worked example to the front and keeps the rest in order", () => {
    const out = orderCards(lesson, "example_first");
    assert.deepEqual(out.cards.map((c) => c.kind), ["example", "definition", "why", "mistake"]);
  });
  test("nothing is added, dropped or edited, and the self-explanation still points at the example's step", () => {
    const out = orderCards(lesson, "example_first");
    assert.equal(out.cards.length, lesson.cards.length);
    for (const c of lesson.cards) assert.ok(out.cards.includes(c), c.kind);
    assert.deepEqual(out.selfExplain, lesson.selfExplain);
    assert.equal(out.cards[0].steps?.length, 2);
  });
  test("the input is never changed", () => {
    const before = JSON.stringify(lesson);
    orderCards(lesson, "example_first");
    assert.equal(JSON.stringify(lesson), before);
  });
  test("a lesson with no example card, an example already first, or no known order is unchanged", () => {
    const noExample: TeachCards = { cards: lesson.cards.filter((c) => c.kind !== "example"), selfExplain: null };
    assert.equal(orderCards(noExample, "example_first"), noExample);
    const first: TeachCards = { cards: [lesson.cards[2], lesson.cards[0]], selfExplain: null };
    assert.equal(orderCards(first, "example_first"), first);
    assert.equal(orderCards(lesson, null), lesson);
  });
});

describe("what the server says", () => {
  test("parses an order, a source and whether the test is on", () => {
    assert.deepEqual(parseTeachOrder({ order: "example_first", source: "chosen", testOn: true }), {
      order: "example_first", source: "chosen", testOn: true,
    });
    assert.deepEqual(parseTeachOrder({ order: "explain_first", source: "assigned", testOn: false }), {
      order: "explain_first", source: "assigned", testOn: false,
    });
  });
  test("anything unusable is null, and an unknown source reads as default", () => {
    for (const v of [null, undefined, "x", 3, {}, { order: "sideways" }, { source: "chosen" }]) assert.equal(parseTeachOrder(v), null);
    assert.equal(parseTeachOrder({ order: "explain_first", source: "weird" })?.source, "default");
    assert.equal(parseTeachOrder({ order: "explain_first", source: "chosen" })?.testOn, false);
  });
  test("no known order means the standard lesson", () => {
    assert.equal(effectiveOrder(null), "explain_first");
    assert.equal(DEFAULT_TEACH_ORDER, "explain_first");
    assert.equal(effectiveOrder({ order: "example_first", source: "assigned", testOn: true }), "example_first");
  });
});

describe("events", () => {
  const st = (source: "assigned" | "chosen" | "default") => ({ order: "example_first" as const, source, testOn: true });
  test("carry the order and its source when the lesson has cards", () => {
    assert.deepEqual(orderEventDetail(st("assigned"), true), { order: "example_first", order_source: "assigned" });
    assert.deepEqual(orderEventDetail(st("chosen"), true), { order: "example_first", order_source: "chosen" });
  });
  test("carry nothing without cards, without the order, or when the order is only the default", () => {
    assert.deepEqual(orderEventDetail(st("assigned"), false), {});
    assert.deepEqual(orderEventDetail(null, true), {});
    assert.deepEqual(orderEventDetail(st("default"), true), {});
  });
});

describe("wording", () => {
  test("labels name the two orders in plain words", () => {
    assert.deepEqual(TEACH_ORDERS, ["explain_first", "example_first"]);
    assert.equal(TEACH_ORDER_LABELS.explain_first, "Explain first");
    assert.equal(TEACH_ORDER_LABELS.example_first, "Example first");
    assert.equal(teachOrderRowValue(null), "Explain first or example first");
    assert.equal(teachOrderRowValue({ order: "example_first", source: "chosen", testOn: true }), "Example first");
  });
  test("the sheet says plainly that both orders are being tried while the test is on, and not when it is off", () => {
    assert.match(teachOrderSheetMessage(true), /trying both orders/);
    assert.match(teachOrderSheetMessage(true), /same content/);
    assert.match(teachOrderSheetMessage(true), /change it any time/);
    assert.doesNotMatch(teachOrderSheetMessage(false), /trying both/);
  });
  test("no learning-style claim and no clinician or expert review claim", () => {
    const all = [teachOrderSheetMessage(true), ...Object.values(TEACH_ORDER_LABELS)].join(" ");
    assert.doesNotMatch(all, /visual learner|auditory|learning style fits/i);
    assert.doesNotMatch(all, /clinician|expert review/i);
  });
});

describe("the screens use it", () => {
  const lessonSrc = readFileSync(new URL("../../app/(app)/course/[trackId]/lesson/[objectiveId].tsx", import.meta.url), "utf8");
  const settingsSrc = readFileSync(new URL("../../app/(app)/settings.tsx", import.meta.url), "utf8");
  test("the lesson reorders its cards by the learner's order and sends it with every lesson event", () => {
    assert.match(lessonSrc, /orderCards\(standardCards, effectiveOrder\(teachOrder\)\)/);
    assert.match(lessonSrc, /\.\.\.orderDetail/);
    assert.match(lessonSrc, /\/api\/account\/teach-order/);
  });
  test("the lesson waits for the order before the guess or Teach step and before logging", () => {
    assert.match(lessonSrc, /!orderLoaded && \(step === "guess" \|\| step === "teach"\)/);
    assert.match(lessonSrc, /!levelLoaded \|\| !orderLoaded\) return;/);
  });
  test("Settings has the row, saves a choice to the account, and says when it could not", () => {
    assert.match(settingsSrc, /api\.put<unknown>\("\/api\/account\/teach-order", \{ order \}\)/);
    assert.match(settingsSrc, /TEACH_ORDER_ROW_LABEL/);
    assert.match(settingsSrc, /Couldn't save that/);
  });
});
