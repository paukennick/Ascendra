// REQ-262 (levels phase 2, backend migration 082): "Explain first / Example
// first". The same Teach cards in one of two orders, as a comfort setting
// and an A/B test that is on from day one (Nick, 2026-11-13). The server
// assigns an order at random the first time a lesson asks and keeps it; the
// learner can change it in Settings, which is recorded as a choice. The app
// only reorders cards it already has: same content, same solo check, same
// mastery rules. Results: docs/teach-order-test.md.
import type { TeachCards } from "./lessonExperience";

export type TeachOrder = "explain_first" | "example_first";
export type TeachOrderSource = "assigned" | "chosen" | "default";

export const TEACH_ORDERS: TeachOrder[] = ["explain_first", "example_first"];

export interface TeachOrderState {
  order: TeachOrder;
  source: TeachOrderSource;
  // Whether new learners are being randomly assigned (the test is on).
  testOn: boolean;
}

export const DEFAULT_TEACH_ORDER: TeachOrder = "explain_first";

export const TEACH_ORDER_LABELS: Record<TeachOrder, string> = {
  explain_first: "Explain first",
  example_first: "Example first",
};

export const TEACH_ORDER_MEANING: Record<TeachOrder, string> = {
  explain_first: "Read what it is and why it matters, then see the worked example.",
  example_first: "See the worked example first, then read the explanation.",
};

export const TEACH_ORDER_ROW_LABEL = "Lesson order";
export const TEACH_ORDER_SHEET_TITLE = "How should lessons start?";
// Honest about the test (Nick, 2026-11-13): say that both orders are being
// tried, that the content is the same, and that the learner has the last word.
const SAME_CONTENT = "Both cover the same content and the same questions. It's about what feels comfortable, not a learning style.";
const TRYING_BOTH =
  " Ascendra is also trying both orders to learn which one helps people more, so if you haven't picked, we chose one for you.";
export function teachOrderSheetMessage(testOn: boolean): string {
  return `${SAME_CONTENT}${testOn ? TRYING_BOTH : ""} You can change it any time.`;
}

export function parseTeachOrder(v: unknown): TeachOrderState | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.order !== "explain_first" && o.order !== "example_first") return null;
  const source = o.source === "assigned" || o.source === "chosen" || o.source === "default" ? o.source : "default";
  return { order: o.order, source, testOn: o.testOn === true };
}

// The Settings row's value.
export function teachOrderRowValue(state: TeachOrderState | null): string {
  return state ? TEACH_ORDER_LABELS[state.order] : "Explain first or example first";
}

// The cards in the learner's order. Explain first is the lesson as written.
// Example first moves the worked-example card to the front and leaves the
// others in their order (so the common mistake still comes last). Nothing is
// added, dropped or edited; a lesson with no example card is unchanged, and so
// is a null order (the standard lesson, when the order could not be had).
export function orderCards(data: TeachCards, order: TeachOrder | null): TeachCards {
  if (order !== "example_first") return data;
  const at = data.cards.findIndex((c) => c.kind === "example");
  if (at <= 0) return data;
  const cards = [data.cards[at], ...data.cards.slice(0, at), ...data.cards.slice(at + 1)];
  return { ...data, cards };
}

// What the lesson's events say about the order: the order and where it came
// from, only when the lesson has cards (otherwise both orders are the same
// lesson) and only for an assignment or a choice (a "default" is the test
// being off). Empty otherwise.
export function orderEventDetail(state: TeachOrderState | null, hasCards: boolean): { order?: TeachOrder; order_source?: "assigned" | "chosen" } {
  if (!state || !hasCards || state.source === "default") return {};
  return { order: state.order, order_source: state.source };
}

// The order the lessons use: nothing known means the standard lesson.
export function effectiveOrder(state: TeachOrderState | null): TeachOrder {
  return state?.order ?? DEFAULT_TEACH_ORDER;
}
