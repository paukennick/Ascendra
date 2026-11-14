// REQ-262 (migration 082): the pure rules of the Explain first / Example first
// lesson order (see lib/teach-order.ts for the store and the full behavior).
// No database here, so lessonEventDetail can use it.

export const TEACH_ORDERS = ["explain_first", "example_first"] as const;
export type TeachOrder = (typeof TEACH_ORDERS)[number];
export const DEFAULT_TEACH_ORDER: TeachOrder = "explain_first";

// Where the order in effect came from: the random assignment, the learner's
// own choice, or the fixed default (test off, or no row stored yet).
export const TEACH_ORDER_SOURCES = ["assigned", "chosen", "default"] as const;
export type TeachOrderSource = (typeof TEACH_ORDER_SOURCES)[number];

export function isTeachOrder(v: unknown): v is TeachOrder {
  return typeof v === "string" && (TEACH_ORDERS as readonly string[]).includes(v);
}

export function isTeachOrderSource(v: unknown): v is TeachOrderSource {
  return typeof v === "string" && (TEACH_ORDER_SOURCES as readonly string[]).includes(v);
}

// On unless the setting says "off" (any case, "0" or "false" too). An unset or
// unreadable value leaves it on.
export function teachOrderTestOn(env: string | undefined = process.env.TEACH_ORDER_TEST): boolean {
  const v = (env ?? "").trim().toLowerCase();
  return !(v === "off" || v === "0" || v === "false");
}

// The arm for a coin flip: `flip` is 0 or 1 (an even draw from a fair source).
export function armFor(flip: number): TeachOrder {
  return flip === 0 ? "explain_first" : "example_first";
}
