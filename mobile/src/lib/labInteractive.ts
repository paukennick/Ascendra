// REQ-189: the pure half of interactive lab parts (order, match, select,
// command, numeric). The server sends each part's control (`inputs` beside
// `parts` on a lab step) with no answer key, grades the part by rule with
// no model call, and only after grading sends the key (`reference[i].key`).
// See backend/lib/lab-interactive.ts for the grading rules.
//
// Every answer stays ONE STRING per part, so the draft (useLabDraft), the
// client attempt id signature and the server's replay check are unchanged:
//   order   JSON array of item ids in the learner's order
//   match   JSON object { leftId: rightId }
//   select  JSON array of chosen line ids
//   command / numeric   the text as typed
// src/lib/labInteractive.test.ts covers this file.

export interface Choice {
  id: string;
  text: string;
}

export type SelectDisplay = "log" | "config" | "table" | "list";

export type InteractiveInput =
  | { type: "order"; items: Choice[] }
  | { type: "match"; left: Choice[]; right: Choice[]; leftHeading: string | null; rightHeading: string | null }
  | { type: "select"; lines: Choice[]; display: SelectDisplay; header: string | null }
  | { type: "command"; prompt: string }
  | { type: "numeric"; unit: string | null };

export type InteractiveKey =
  | { type: "order"; order: string[] }
  | { type: "match"; pairs: Record<string, string> }
  | { type: "select"; correct: string[] }
  | { type: "command"; accepted: string[] }
  | { type: "numeric"; answer: number; tolerance: number; unit: string | null };

export const COMMAND_MAX = 300;
export const NUMERIC_MAX = 40;

const KNOWN = new Set(["order", "match", "select", "command", "numeric"]);

// An input from the server the app knows how to draw; anything else (a newer
// type, a malformed payload) is null and the part falls back to a text box.
export function knownInput(v: unknown): InteractiveInput | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!KNOWN.has(o.type as string)) return null;
  const choices = (x: unknown) => Array.isArray(x) && x.every((c) => c && typeof c === "object" && typeof (c as Choice).id === "string" && typeof (c as Choice).text === "string");
  if (o.type === "order" && !choices(o.items)) return null;
  if (o.type === "match" && !(choices(o.left) && choices(o.right))) return null;
  if (o.type === "select" && !choices(o.lines)) return null;
  return v as InteractiveInput;
}

// ---------------------------------------------------------------------------
// Reading and writing a part's answer string
// ---------------------------------------------------------------------------

function parse(raw: string): unknown {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
}

// The order on screen: the learner's saved order if it still lists exactly
// the served items, else the served (shuffled) order.
export function orderFrom(raw: string, input: Extract<InteractiveInput, { type: "order" }>): string[] {
  const served = input.items.map((c) => c.id);
  const v = parse(raw);
  if (Array.isArray(v) && v.length === served.length && v.every((x) => typeof x === "string") && new Set(v).size === v.length && v.every((x) => served.includes(x as string))) {
    return v as string[];
  }
  return served;
}

export function encodeOrder(ids: string[]): string {
  return JSON.stringify(ids);
}

// Moves one item up (-1) or down (+1); at either end nothing changes.
export function moveItem(ids: string[], index: number, delta: -1 | 1): string[] {
  const to = index + delta;
  if (index < 0 || index >= ids.length || to < 0 || to >= ids.length) return ids;
  const out = [...ids];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}

// Moves one item to a new position (a drag that ends `steps` rows away).
export function moveTo(ids: string[], from: number, to: number): string[] {
  if (from < 0 || from >= ids.length) return ids;
  const t = Math.max(0, Math.min(ids.length - 1, to));
  if (t === from) return ids;
  const out = [...ids];
  const [x] = out.splice(from, 1);
  out.splice(t, 0, x);
  return out;
}

// How many rows a drag of `dy` pixels moves, rounding half a row.
export function dragSteps(dy: number, rowHeight: number): number {
  if (!(rowHeight > 0)) return 0;
  return Math.round(dy / rowHeight);
}

export function matchFrom(raw: string, input: Extract<InteractiveInput, { type: "match" }>): Record<string, string> {
  const v = parse(raw);
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const left = new Set(input.left.map((c) => c.id));
  const right = new Set(input.right.map((c) => c.id));
  const out: Record<string, string> = {};
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) if (left.has(k) && typeof r === "string" && right.has(r)) out[k] = r;
  return out;
}

// Pairs a left item with a right item. One-to-one: a right item already used
// by another left item moves here. Choosing the same pair again clears it.
export function setPair(pairs: Record<string, string>, leftId: string, rightId: string): Record<string, string> {
  if (pairs[leftId] === rightId) {
    const { [leftId]: _gone, ...rest } = pairs;
    return rest;
  }
  const out: Record<string, string> = {};
  for (const [l, r] of Object.entries(pairs)) if (r !== rightId) out[l] = r;
  out[leftId] = rightId;
  return out;
}

export function encodeMatch(pairs: Record<string, string>): string {
  return Object.keys(pairs).length ? JSON.stringify(pairs) : "";
}

export function selectFrom(raw: string, input: Extract<InteractiveInput, { type: "select" }>): string[] {
  const v = parse(raw);
  const ids = new Set(input.lines.map((c) => c.id));
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === "string" && ids.has(x)))];
}

export function toggleLine(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

export function encodeSelect(ids: string[], input: Extract<InteractiveInput, { type: "select" }>): string {
  // In display order, so the same picks are always the same answer string.
  const order = input.lines.map((c) => c.id);
  return ids.length ? JSON.stringify([...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b))) : "";
}

// The answer to send for a part. An order the learner never moved is still
// an answer (the order on screen), so it is filled in here.
export function answerToSend(raw: string, input: InteractiveInput | null): string {
  if (input?.type === "order") return encodeOrder(orderFrom(raw, input));
  return raw;
}

// Whether a part counts as answered for the "Check" button.
export function partAnswered(raw: string, input: InteractiveInput | null): boolean {
  if (input?.type === "order") return true;
  return raw.trim().length > 0;
}

// ---------------------------------------------------------------------------
// After grading: marking the learner's own control against the key
// ---------------------------------------------------------------------------

export type Mark = "right" | "wrong" | "missed" | "neutral";

export function orderMarks(response: string, input: Extract<InteractiveInput, { type: "order" }>, key: Extract<InteractiveKey, { type: "order" }>): { id: string; text: string; mark: Mark; should: number }[] {
  const ids = orderFrom(response, input);
  const text = new Map(input.items.map((c) => [c.id, c.text]));
  return ids.map((id, i) => ({ id, text: text.get(id) ?? "", mark: key.order[i] === id ? "right" : "wrong", should: key.order.indexOf(id) + 1 }));
}

export function matchMarks(
  response: string,
  input: Extract<InteractiveInput, { type: "match" }>,
  key: Extract<InteractiveKey, { type: "match" }>
): { left: string; got: string | null; want: string; mark: Mark }[] {
  const got = matchFrom(response, input);
  const right = new Map(input.right.map((c) => [c.id, c.text]));
  return input.left.map((l) => ({
    left: l.text,
    got: got[l.id] ? right.get(got[l.id]) ?? null : null,
    want: right.get(key.pairs[l.id]) ?? "",
    mark: got[l.id] === key.pairs[l.id] ? "right" : got[l.id] ? "wrong" : "missed",
  }));
}

export function selectMarks(
  response: string,
  input: Extract<InteractiveInput, { type: "select" }>,
  key: Extract<InteractiveKey, { type: "select" }>
): { id: string; text: string; mark: Mark }[] {
  const picked = new Set(selectFrom(response, input));
  const want = new Set(key.correct);
  return input.lines.map((c) => ({
    id: c.id,
    text: c.text,
    mark: picked.has(c.id) ? (want.has(c.id) ? "right" : "wrong") : want.has(c.id) ? "missed" : "neutral",
  }));
}

export const MARK_LABEL: Record<Mark, string> = {
  right: "Right",
  wrong: "Not this one",
  missed: "Missed",
  neutral: "",
};

export function keyText(key: InteractiveKey, input: InteractiveInput | null): string {
  switch (key.type) {
    case "order": {
      const text = new Map(input?.type === "order" ? input.items.map((c) => [c.id, c.text]) : []);
      return key.order.map((id, i) => `${i + 1}. ${text.get(id) ?? id}`).join("\n");
    }
    case "match": {
      if (input?.type !== "match") return "";
      const r = new Map(input.right.map((c) => [c.id, c.text]));
      return input.left.map((l) => `${l.text} -> ${r.get(key.pairs[l.id]) ?? ""}`).join("\n");
    }
    case "select": {
      if (input?.type !== "select") return "";
      return input.lines
        .map((c, i) => (key.correct.includes(c.id) ? `Line ${i + 1}: ${c.text}` : null))
        .filter(Boolean)
        .join("\n");
    }
    case "command":
      return key.accepted.length > 1 ? `${key.accepted[0]}\nAlso accepted: ${key.accepted.slice(1).join("; ")}` : key.accepted[0] ?? "";
    case "numeric":
      return `${key.answer}${key.unit ? ` ${key.unit}` : ""}${key.tolerance ? ` (within ${key.tolerance})` : ""}`;
  }
}

// What a screen reader hears for one control, with its position.
export function orderItemA11y(text: string, index: number, count: number): string {
  return `${text}. Position ${index + 1} of ${count}.`;
}

export function selectLineA11y(text: string, index: number, selected: boolean): string {
  return `Line ${index + 1}: ${text}. ${selected ? "Selected as a problem" : "Not selected"}.`;
}

export const INTERACTIVE_HINT: Record<InteractiveInput["type"], string> = {
  order: "Put these in order: drag an item, or use its up and down buttons.",
  match: "Pick the match for each item. Each option is used once.",
  select: "Tap every line that is a problem. Tap again to clear it.",
  command: "Type the command. It is checked, never run.",
  numeric: "Enter just the number.",
};
