import { createHash } from "node:crypto";
import { hasUnstorableText } from "./text-input";

// REQ-189: rule-graded interactive rubric parts. A lab's rubric part can
// carry an `interactive` spec beside its label, criteria and model answer.
// Such a part is answered with a control instead of a text box and graded
// here, instantly, by rule -- no model call, no AI cost. The spec lives in
// the lab's existing rubric JSON (labs.rubric), so there is no schema change.
//
// Five types:
//   order    put the items in sequence
//   match    pair each left item with one right item
//   select   tap the line(s) of a log, config, table or list that are the problem
//   command  type a command; checked against accepted forms, never run
//   numeric  a calculated value with a tolerance and a unit
//
// What leaves the server, and when:
//   - before the step is graded: `interactiveInput` -- the items with opaque
//     ids (order shuffled, match's right side shuffled), never the key;
//   - after the step is graded: `interactiveKey` and the authored criteria
//     and model answer, the same as a text part.
//
// The answer to every part stays ONE STRING (labs.ts labAnswers, the
// lab_run_steps.answers column and the replay check are unchanged):
//   order   JSON array of item ids, in the learner's order
//   match   JSON object { leftId: rightId }
//   select  JSON array of the chosen line ids
//   command the command as typed
//   numeric the value as typed ("1,250", "$1250", "12.5 mL")
//
// An order / match / select answer that is not that JSON (an app build from
// before this, which shows a text box) is graded as a written part by the
// model against the part's criteria (lib/lab-grading.ts), never dropped.
// Pure: no database or model imports, so the seed, its tests and the app's
// mirror (mobile/src/lib/labInteractive.ts) share the rules.

export type SelectDisplay = "log" | "config" | "table" | "list";

export interface OrderSpec {
  type: "order";
  // In the CORRECT order. Served shuffled.
  items: string[];
}

export interface MatchSpec {
  type: "match";
  left: string[];
  // May hold up to three distractors that match nothing.
  right: string[];
  // pairs[i] is the index in `right` of left[i]'s match.
  pairs: number[];
  leftHeading?: string;
  rightHeading?: string;
}

export interface SelectSpec {
  type: "select";
  lines: string[];
  // Indexes of the lines that are the problem.
  correct: number[];
  display: SelectDisplay;
  // A table's column header, shown and never selectable.
  header?: string;
}

export interface CommandSpec {
  type: "command";
  // Accepted forms; the first is the one the model answer quotes.
  accepted: string[];
  // Options that take a value as the next word ("-n prod"); a long option
  // written "--name=value" in an accepted form is one automatically.
  valueFlags?: string[];
  // Options that mean the same, written as the short form each long one
  // becomes, e.g. { "--namespace": "-n" }. Applied before comparing.
  optionAliases?: Record<string, string>;
  // The terminal prompt shown before the field, e.g. "$" or "Router#".
  prompt?: string;
  // Case-insensitive shells and device CLIs (Cisco IOS, PowerShell).
  ignoreCase?: boolean;
}

export interface NumericSpec {
  type: "numeric";
  answer: number;
  // Met within +/- tolerance (absolute, in the unit).
  tolerance: number;
  // Partly there within +/- partialTolerance (a rounding slip).
  partialTolerance?: number;
  unit?: string;
}

export type InteractiveSpec = OrderSpec | MatchSpec | SelectSpec | CommandSpec | NumericSpec;
export type InteractiveType = InteractiveSpec["type"];
export const INTERACTIVE_TYPES: readonly InteractiveType[] = ["order", "match", "select", "command", "numeric"];

export interface Choice {
  id: string;
  text: string;
}

// What the app gets before grading. No key.
export type InteractiveInput =
  | { type: "order"; items: Choice[] }
  | { type: "match"; left: Choice[]; right: Choice[]; leftHeading: string | null; rightHeading: string | null }
  | { type: "select"; lines: Choice[]; display: SelectDisplay; header: string | null }
  | { type: "command"; prompt: string }
  | { type: "numeric"; unit: string | null };

// What the app gets after grading.
export type InteractiveKey =
  | { type: "order"; order: string[] }
  | { type: "match"; pairs: Record<string, string> }
  | { type: "select"; correct: string[] }
  | { type: "command"; accepted: string[] }
  | { type: "numeric"; answer: number; tolerance: number; unit: string | null };

export type PartScore = "met" | "partial" | "missed";

export interface InteractiveGrade {
  score: PartScore;
  comment: string;
}

export class InteractiveAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InteractiveAnswerError";
  }
}

export const INTERACTIVE_LIMITS = {
  orderItems: { min: 4, max: 10 },
  matchLeft: { min: 3, max: 8 },
  matchDistractors: 3,
  selectLines: { min: 3, max: 40 },
  itemText: 240,
  lineText: 300,
  heading: 80,
  commandAccepted: { min: 1, max: 12 },
  commandText: 300,
  prompt: 24,
  unit: 24,
  // Met within at most 10% of the answer; partly there within at most 25%.
  toleranceShare: 0.1,
  partialShare: 0.25,
} as const;

// ---------------------------------------------------------------------------
// Ids and the served shuffle
// ---------------------------------------------------------------------------

// An order or match item's id is a hash of its own text (unique within the
// list, which the content rules require), so it says nothing about its
// position in the key. A select line's id is its display index: the lines
// are shown in the authored order anyway and the key is a separate set.
function textId(kind: string, text: string): string {
  return createHash("sha256").update(`${kind}:${text.trim()}`, "utf8").digest("hex").slice(0, 10);
}
const orderIds = (s: OrderSpec) => s.items.map((t) => textId("order", t));
const leftIds = (s: MatchSpec) => s.left.map((t) => textId("left", t));
const rightIds = (s: MatchSpec) => s.right.map((t) => textId("right", t));
const lineIds = (s: SelectSpec) => s.lines.map((_, i) => `L${i}`);

// Deterministic per lab, step and part (the same arrangement on every load,
// so a draft lines up), and never already in the key's order.
function seededShuffle<T>(list: T[], seed: string, isKeyOrder: (l: T[]) => boolean): T[] {
  const h = createHash("sha256").update(seed, "utf8").digest();
  let s = h.readUInt32LE(0);
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.length > 1 && isKeyOrder(out)) out.push(out.shift()!);
  return out;
}

export function interactiveInput(spec: InteractiveSpec, seed: string): InteractiveInput {
  switch (spec.type) {
    case "order": {
      const ids = orderIds(spec);
      const items = spec.items.map((text, i) => ({ id: ids[i], text }));
      return { type: "order", items: seededShuffle(items, seed, (l) => l.every((c, i) => c.id === ids[i])) };
    }
    case "match": {
      const l = leftIds(spec);
      const r = rightIds(spec);
      const right = spec.right.map((text, i) => ({ id: r[i], text }));
      const aligned = (list: Choice[]) => spec.pairs.every((p, i) => list[i]?.id === r[p]);
      return {
        type: "match",
        left: spec.left.map((text, i) => ({ id: l[i], text })),
        right: seededShuffle(right, seed, aligned),
        leftHeading: spec.leftHeading ?? null,
        rightHeading: spec.rightHeading ?? null,
      };
    }
    case "select": {
      const ids = lineIds(spec);
      return { type: "select", lines: spec.lines.map((text, i) => ({ id: ids[i], text })), display: spec.display, header: spec.header ?? null };
    }
    case "command":
      return { type: "command", prompt: spec.prompt ?? "$" };
    case "numeric":
      return { type: "numeric", unit: spec.unit ?? null };
  }
}

export function interactiveKey(spec: InteractiveSpec): InteractiveKey {
  switch (spec.type) {
    case "order":
      return { type: "order", order: orderIds(spec) };
    case "match": {
      const l = leftIds(spec);
      const r = rightIds(spec);
      return { type: "match", pairs: Object.fromEntries(spec.pairs.map((p, i) => [l[i], r[p]])) };
    }
    case "select": {
      const ids = lineIds(spec);
      return { type: "select", correct: [...spec.correct].sort((a, b) => a - b).map((i) => ids[i]) };
    }
    case "command":
      return { type: "command", accepted: [...spec.accepted] };
    case "numeric":
      return { type: "numeric", answer: spec.answer, tolerance: spec.tolerance, unit: spec.unit ?? null };
  }
}

// For an app build that shows only a text box (no X-Ascendra-Client >= 2):
// the options, written out under the step, so the part can still be
// answered in words (and is then graded by the model).
export function interactiveLegacyText(label: string, input: InteractiveInput): string {
  switch (input.type) {
    case "order":
      return `${label} -- put these in order: ${input.items.map((c) => c.text).join("; ")}.`;
    case "match":
      return `${label} -- match each of: ${input.left.map((c) => c.text).join("; ")}. With one of: ${input.right.map((c) => c.text).join("; ")}.`;
    case "select":
      return `${label} -- which of these lines are the problem?\n${input.lines.map((c, i) => `${i + 1}. ${c.text}`).join("\n")}`;
    case "command":
      return `${label} -- type the command.`;
    case "numeric":
      return `${label} -- give the number${input.unit ? ` in ${input.unit}` : ""}.`;
  }
}

// ---------------------------------------------------------------------------
// Reading an answer
// ---------------------------------------------------------------------------

type Parsed<T> = { kind: "blank" } | { kind: "text" } | { kind: "ok"; value: T };

function parseJson(answer: string): unknown | undefined {
  const t = answer.trim();
  if (!(t.startsWith("[") || t.startsWith("{"))) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
}

function parseIdList(answer: string, known: string[], what: string, needAll: boolean): Parsed<string[]> {
  if (!answer.trim()) return { kind: "blank" };
  const v = parseJson(answer);
  if (v === undefined) return { kind: "text" };
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) throw new InteractiveAnswerError(`${what}: send a list of ids`);
  const ids = v as string[];
  const set = new Set(known);
  if (ids.some((id) => !set.has(id))) throw new InteractiveAnswerError(`${what}: an id is not one of this part's options`);
  if (new Set(ids).size !== ids.length) throw new InteractiveAnswerError(`${what}: an id is listed twice`);
  if (needAll && ids.length !== known.length) throw new InteractiveAnswerError(`${what}: list every item once`);
  return { kind: "ok", value: ids };
}

function parseMatch(answer: string, spec: MatchSpec, what: string): Parsed<Record<string, string>> {
  if (!answer.trim()) return { kind: "blank" };
  const v = parseJson(answer);
  if (v === undefined) return { kind: "text" };
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new InteractiveAnswerError(`${what}: send an object of left id to right id`);
  const l = new Set(leftIds(spec));
  const r = new Set(rightIds(spec));
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (!l.has(k) || typeof val !== "string" || !r.has(val)) throw new InteractiveAnswerError(`${what}: a pair is not one of this part's options`);
    out[k] = val;
  }
  return { kind: "ok", value: out };
}

// Whether an answer to this part is the structured form (graded here), a
// written answer from an older app (graded by the model), or blank.
// Throws InteractiveAnswerError (a 400) for structured answers that name
// options the part doesn't have.
export function answerForm(spec: InteractiveSpec, answer: string, what = "answer"): "blank" | "text" | "structured" {
  switch (spec.type) {
    case "order":
      return form(parseIdList(answer, orderIds(spec), what, true));
    case "select":
      return form(parseIdList(answer, lineIds(spec), what, false));
    case "match":
      return form(parseMatch(answer, spec, what));
    case "command":
    case "numeric":
      return answer.trim() ? "structured" : "blank";
  }
}
const form = (p: Parsed<unknown>) => (p.kind === "ok" ? "structured" : p.kind);

// ---------------------------------------------------------------------------
// Grading (partial credit per type)
// ---------------------------------------------------------------------------

// Longest increasing subsequence length: the items already in the right
// relative order. n - LIS is the fewest single moves to fix the order.
function lisLength(seq: number[]): number {
  const tails: number[] = [];
  for (const x of seq) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = x;
  }
  return tails.length;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ORDER: met when exact. Partly there when the fewest single moves that
// fix it is at most a third of the items (at least one): one item out of
// place in a list of 4-5, two in 6-8, three in 9-10. Missed otherwise.
export function orderMovesAllowed(n: number): number {
  return Math.max(1, Math.floor(n / 3));
}
function gradeOrder(spec: OrderSpec, ids: string[]): InteractiveGrade {
  const key = orderIds(spec);
  const pos = ids.map((id) => key.indexOf(id));
  const moves = key.length - lisLength(pos);
  const inPlace = pos.filter((p, i) => p === i).length;
  if (moves === 0) return { score: "met", comment: "Every step is in the right order." };
  const where = `${inPlace} of ${key.length} in the right place; ${plural(moves, "move")} from the right order.`;
  return moves <= orderMovesAllowed(key.length) ? { score: "partial", comment: `Close: ${where}` } : { score: "missed", comment: `Not yet: ${where}` };
}

// MATCH: met when every left item has its match. Partly there when at
// least half do. Missed otherwise.
function gradeMatch(spec: MatchSpec, got: Record<string, string>): InteractiveGrade {
  const key = (interactiveKey(spec) as Extract<InteractiveKey, { type: "match" }>).pairs;
  const total = Object.keys(key).length;
  const right = Object.entries(key).filter(([l, r]) => got[l] === r).length;
  const line = `${right} of ${total} pairs right.`;
  if (right === total) return { score: "met", comment: "Every pair is right." };
  return right * 2 >= total ? { score: "partial", comment: `Close: ${line}` } : { score: "missed", comment: `Not yet: ${line}` };
}

// SELECT: each wrong pick cancels a right one. Met only when the chosen
// set is exactly the problem lines. Partly there when (right - wrong) is
// at least half the problem lines. Missed otherwise -- so ticking every
// line never scores.
function gradeSelect(spec: SelectSpec, ids: string[]): InteractiveGrade {
  const key = new Set((interactiveKey(spec) as Extract<InteractiveKey, { type: "select" }>).correct);
  const hit = ids.filter((id) => key.has(id)).length;
  const wrong = ids.length - hit;
  const line = `found ${hit} of ${key.size} problem ${key.size === 1 ? "line" : "lines"}${wrong ? `, and picked ${plural(wrong, "line")} that ${wrong === 1 ? "is" : "are"} fine` : ""}.`;
  if (hit === key.size && wrong === 0) return { score: "met", comment: `Right: ${line}` };
  if (!ids.length) return { score: "missed", comment: "No line picked." };
  return (hit - wrong) * 2 >= key.size ? { score: "partial", comment: `Close: ${line}` } : { score: "missed", comment: `Not yet: ${line}` };
}

// COMMAND ------------------------------------------------------------------

export interface CommandShape {
  program: string;
  positionals: string[];
  options: string[]; // sorted, "-a" or "--name=value"
}

// Shell-like words: whitespace splits, quotes group (and are removed), a
// backslash escapes the next character. Never evaluated.
export function commandWords(raw: string): string[] | null {
  const words: string[] = [];
  let cur = "";
  let has = false;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === "\\" && quote === '"' && i + 1 < raw.length) cur += raw[++i];
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (ch === "\\" && i + 1 < raw.length) {
      cur += raw[++i];
      has = true;
    } else if (/\s/.test(ch)) {
      if (has) words.push(cur);
      cur = "";
      has = false;
    } else {
      cur += ch;
      has = true;
    }
  }
  if (quote) return null;
  if (has) words.push(cur);
  return words;
}

function valueFlagSet(spec: CommandSpec): Set<string> {
  const set = new Set((spec.valueFlags ?? []).map((f) => (spec.ignoreCase ? f.toLowerCase() : f)));
  // An alias of a value option takes a value too.
  for (const [from, to] of Object.entries(spec.optionAliases ?? {})) {
    const [f, t] = spec.ignoreCase ? [from.toLowerCase(), to.toLowerCase()] : [from, to];
    if (set.has(t)) set.add(f);
  }
  for (const a of spec.accepted) {
    for (const w of commandWords(a) ?? []) {
      const m = /^(--[^=\s]+)=/.exec(w);
      if (m) set.add(spec.ignoreCase ? m[1].toLowerCase() : m[1]);
    }
  }
  return set;
}

// The canonical shape of a command: the program, its other words in order,
// and its options as a sorted set -- so "-la" = "-l -a" = "-al", flag order
// doesn't matter, "--name value" = "--name=value" for a value option, and a
// leading prompt ("$ ", "# ", "> ") and extra spaces are ignored.
export function commandShape(raw: string, spec: CommandSpec): CommandShape | null {
  let text = raw.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim();
  text = text.replace(/^(?:\$|#|>|PS>)\s+/, "");
  if (spec.ignoreCase) text = text.toLowerCase();
  const words = commandWords(text);
  if (!words || !words.length) return null;
  const vf = valueFlagSet(spec);
  const [program, ...rest] = words;
  const positionals: string[] = [];
  const options: string[] = [];
  let endOfOptions = false;
  for (let i = 0; i < rest.length; i++) {
    const w = rest[i];
    if (endOfOptions || w === "-" || !w.startsWith("-") || /^-\d/.test(w)) {
      positionals.push(w);
      continue;
    }
    if (w === "--") {
      endOfOptions = true;
      continue;
    }
    if (w.startsWith("--")) {
      const eq = w.indexOf("=");
      if (eq > 0) options.push(`${w.slice(0, eq)}=${w.slice(eq + 1)}`);
      else if (vf.has(w) && i + 1 < rest.length) options.push(`${w}=${rest[++i]}`);
      else options.push(w);
      continue;
    }
    // A short option: a value option alone or with its value attached
    // ("-n prod", "-nprod"), else a cluster of single-letter flags.
    if (vf.has(w)) {
      options.push(i + 1 < rest.length ? `${w}=${rest[++i]}` : w);
      continue;
    }
    const head = w.slice(0, 2);
    if (vf.has(head)) {
      options.push(`${head}=${w.slice(2)}`);
      continue;
    }
    const letters = w.slice(1);
    if (letters.length > 1 && /^[A-Za-z]+$/.test(letters)) {
      for (let k = 0; k < letters.length; k++) {
        const f = `-${letters[k]}`;
        if (vf.has(f)) {
          const v = letters.slice(k + 1) || (i + 1 < rest.length ? rest[++i] : "");
          options.push(`${f}=${v}`);
          break;
        }
        options.push(f);
      }
    } else options.push(w);
  }
  const alias = new Map(Object.entries(spec.optionAliases ?? {}).map(([f, t]) => (spec.ignoreCase ? [f.toLowerCase(), t.toLowerCase()] : [f, t])));
  const canon = options.map((o) => {
    const eq = o.indexOf("=");
    const name = eq > 0 ? o.slice(0, eq) : o;
    const to = alias.get(name);
    return to ? `${to}${eq > 0 ? o.slice(eq) : ""}` : o;
  });
  return { program, positionals, options: [...new Set(canon)].sort() };
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// Met when the command has the same shape as an accepted form. Partly
// there when it is the right program and either its other words or its
// options match an accepted form (one of the two off). Missed otherwise.
function gradeCommand(spec: CommandSpec, answer: string): InteractiveGrade {
  const got = commandShape(answer, spec);
  if (!got) return { score: "missed", comment: "That isn't a complete command (check the quotes)." };
  const forms = spec.accepted.map((a) => commandShape(a, spec)).filter((s): s is CommandShape => !!s);
  if (forms.some((f) => f.program === got.program && sameList(f.positionals, got.positionals) && sameList(f.options, got.options))) {
    return { score: "met", comment: "That command does the job." };
  }
  const same = forms.filter((f) => f.program === got.program);
  if (same.some((f) => sameList(f.positionals, got.positionals))) return { score: "partial", comment: "Right command and target; check the options." };
  if (same.some((f) => sameList(f.options, got.options))) return { score: "partial", comment: "Right command and options; check what it acts on." };
  if (same.length) return { score: "missed", comment: `Right tool (${got.program}), but not the arguments this needs.` };
  return { score: "missed", comment: "Not the command this needs." };
}

// NUMERIC ------------------------------------------------------------------

// The number in an answer: an optional sign and currency symbol, thousands
// commas, decimals, then optionally the part's unit (any case) or nothing.
// Anything else ("about 12", "12 mg" when the unit is mL) is not read.
export function readNumber(raw: string, unit?: string | null): number | null {
  let t = raw.trim().replace(/−/g, "-");
  if (unit) {
    const u = unit.trim().toLowerCase();
    if (t.toLowerCase().endsWith(u)) t = t.slice(0, t.length - u.length).trim();
  }
  if (unit === "%" || !unit) t = t.replace(/%$/, "").trim();
  const m = /^([-+])?\s*[$€£]?\s*([-+])?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)$/.exec(t);
  if (!m) return null;
  const sign = m[1] === "-" || m[2] === "-" ? -1 : 1;
  const n = Number(m[3].replace(/,/g, ""));
  return Number.isFinite(n) ? sign * n : null;
}

// A floating-point margin so 0.1 + 0.2 sits inside a tolerance of 0.3.
const EPS = 1e-9;
function gradeNumeric(spec: NumericSpec, answer: string): InteractiveGrade {
  const n = readNumber(answer, spec.unit);
  const unit = spec.unit ? ` ${spec.unit}` : "";
  if (n === null) return { score: "missed", comment: `Enter just the number${spec.unit ? ` (in ${spec.unit})` : ""}.` };
  const off = Math.abs(n - spec.answer);
  if (off <= spec.tolerance + EPS) return { score: "met", comment: "Right value." };
  if (spec.partialTolerance !== undefined && off <= spec.partialTolerance + EPS) {
    return { score: "partial", comment: `Close: ${n}${unit} is near the answer; check your rounding or the last step.` };
  }
  return { score: "missed", comment: `Not yet: ${n}${unit} is not the value; work it again from the figures given.` };
}

// One part. Returns null when the answer is written text from an older app
// (the model grades it); a blank answer is missed.
export function gradeInteractive(spec: InteractiveSpec, answer: string): InteractiveGrade | null {
  const f = answerForm(spec, answer);
  if (f === "blank") return { score: "missed", comment: "Not answered." };
  if (f === "text") return null;
  switch (spec.type) {
    case "order":
      return gradeOrder(spec, JSON.parse(answer.trim()));
    case "match":
      return gradeMatch(spec, (parseMatch(answer, spec, "answer") as { value: Record<string, string> }).value);
    case "select":
      return gradeSelect(spec, JSON.parse(answer.trim()));
    case "command":
      return gradeCommand(spec, answer);
    case "numeric":
      return gradeNumeric(spec, answer);
  }
}

// The learner's answer in words, for the results row, the attempt's
// transcript and history. Written answers are returned as they are.
export function interactiveAnswerText(spec: InteractiveSpec, answer: string): string {
  let f: ReturnType<typeof answerForm>;
  try {
    f = answerForm(spec, answer);
  } catch {
    return answer;
  }
  if (f !== "structured") return answer;
  switch (spec.type) {
    case "order": {
      const ids = orderIds(spec);
      return (JSON.parse(answer.trim()) as string[]).map((id, i) => `${i + 1}. ${spec.items[ids.indexOf(id)]}`).join("; ");
    }
    case "match": {
      const l = leftIds(spec);
      const r = rightIds(spec);
      const got = (parseMatch(answer, spec, "answer") as { value: Record<string, string> }).value;
      return spec.left.map((t, i) => `${t} -> ${got[l[i]] ? spec.right[r.indexOf(got[l[i]])] : "(not matched)"}`).join("; ");
    }
    case "select": {
      const ids = lineIds(spec);
      const picked = (JSON.parse(answer.trim()) as string[]).map((id) => ids.indexOf(id)).sort((a, b) => a - b);
      return picked.length ? picked.map((i) => `line ${i + 1}: ${spec.lines[i]}`).join("; ") : "(no line picked)";
    }
    case "command":
    case "numeric":
      return answer.trim();
  }
}

// ---------------------------------------------------------------------------
// Content rules (the seed and its tests fail on any of these)
// ---------------------------------------------------------------------------

function textProblems(list: unknown, name: string, max: number, p: string[], unique: boolean): list is string[] {
  if (!Array.isArray(list) || !list.every((x) => typeof x === "string")) {
    p.push(`${name} must be a list of text`);
    return false;
  }
  const seen = new Set<string>();
  for (const [i, t] of (list as string[]).entries()) {
    if (!t.trim()) p.push(`${name} ${i + 1} is empty`);
    else if (t.length > max) p.push(`${name} ${i + 1} is longer than ${max}`);
    else if (hasUnstorableText(t)) p.push(`${name} ${i + 1} has characters that can't be stored`);
    const k = t.trim().toLowerCase();
    if (unique && seen.has(k)) p.push(`${name} has "${t.trim()}" twice`);
    seen.add(k);
  }
  return true;
}

const isIndexList = (v: unknown, n: number) => Array.isArray(v) && v.every((x) => Number.isInteger(x) && x >= 0 && x < n);

// Numbers written in a text ("$12,500", "-0.25", "1.08"), for checking a
// numeric part's model answer states its own answer.
export function numbersIn(text: string): number[] {
  return [...text.replace(/−/g, "-").matchAll(/-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?|-?\.\d+/g)].map((m) => Number(m[0].replace(/,/g, "")));
}

export function interactiveProblems(spec: unknown, modelAnswer: string, where: string): string[] {
  const p: string[] = [];
  const L = INTERACTIVE_LIMITS;
  if (!spec || typeof spec !== "object") return [`${where}: interactive must be an object`];
  const s = spec as Record<string, unknown>;
  const optText = (v: unknown, name: string, max: number) => {
    if (v === undefined) return;
    if (typeof v !== "string" || !v.trim() || v.length > max || hasUnstorableText(v)) p.push(`${where}: ${name} must be 1-${max} characters`);
  };
  switch (s.type) {
    case "order": {
      if (textProblems(s.items, `${where}: order item`, L.itemText, p, true)) {
        const n = (s.items as string[]).length;
        if (n < L.orderItems.min || n > L.orderItems.max) p.push(`${where}: an order needs ${L.orderItems.min}-${L.orderItems.max} items`);
      }
      break;
    }
    case "match": {
      const okL = textProblems(s.left, `${where}: match left item`, L.itemText, p, true);
      const okR = textProblems(s.right, `${where}: match right item`, L.itemText, p, true);
      optText(s.leftHeading, "leftHeading", L.heading);
      optText(s.rightHeading, "rightHeading", L.heading);
      if (!okL || !okR) break;
      const left = s.left as string[];
      const right = s.right as string[];
      if (left.length < L.matchLeft.min || left.length > L.matchLeft.max) p.push(`${where}: a match needs ${L.matchLeft.min}-${L.matchLeft.max} left items`);
      if (right.length < left.length || right.length > left.length + L.matchDistractors) {
        p.push(`${where}: a match needs as many right items as left, plus at most ${L.matchDistractors} that match nothing`);
      }
      if (!isIndexList(s.pairs, right.length) || (s.pairs as number[]).length !== left.length) {
        p.push(`${where}: pairs needs one right-item index per left item`);
      } else if (new Set(s.pairs as number[]).size !== left.length) {
        p.push(`${where}: two left items share one right item, so the match has no unique solution`);
      }
      break;
    }
    case "select": {
      if (!textProblems(s.lines, `${where}: select line`, L.lineText, p, false)) break;
      const n = (s.lines as string[]).length;
      if (n < L.selectLines.min || n > L.selectLines.max) p.push(`${where}: a select needs ${L.selectLines.min}-${L.selectLines.max} lines`);
      if (!["log", "config", "table", "list"].includes(s.display as string)) p.push(`${where}: display must be log, config, table or list`);
      optText(s.header, "header", L.lineText);
      if (!isIndexList(s.correct, n) || !(s.correct as number[]).length) p.push(`${where}: correct needs at least one valid line index`);
      else {
        const c = s.correct as number[];
        if (new Set(c).size !== c.length) p.push(`${where}: a correct line is listed twice`);
        if (new Set(c).size >= n) p.push(`${where}: every line is correct, so there is nothing to tell apart`);
        // A correct line and a fine line with the same text can't be told apart.
        const lines = s.lines as string[];
        const fine = new Set(lines.filter((_, i) => !c.includes(i)).map((t) => t.trim()));
        if (c.some((i) => fine.has(lines[i].trim()))) p.push(`${where}: a correct line has the same text as a line that is fine`);
      }
      break;
    }
    case "command": {
      if (!textProblems(s.accepted, `${where}: accepted command`, L.commandText, p, true)) break;
      const acc = s.accepted as string[];
      if (acc.length < L.commandAccepted.min || acc.length > L.commandAccepted.max) p.push(`${where}: a command needs 1-${L.commandAccepted.max} accepted forms`);
      if (s.valueFlags !== undefined && (!Array.isArray(s.valueFlags) || !s.valueFlags.every((f) => typeof f === "string" && /^--?[A-Za-z0-9]/.test(f)))) {
        p.push(`${where}: valueFlags must be options like -n or --namespace`);
      }
      if (
        s.optionAliases !== undefined &&
        (!s.optionAliases ||
          typeof s.optionAliases !== "object" ||
          !Object.entries(s.optionAliases as Record<string, unknown>).every(([k, v]) => /^--?[A-Za-z0-9]/.test(k) && typeof v === "string" && /^--?[A-Za-z0-9]/.test(v)))
      ) {
        p.push(`${where}: optionAliases must map options to options, like { "--namespace": "-n" }`);
      }
      if (s.ignoreCase !== undefined && typeof s.ignoreCase !== "boolean") p.push(`${where}: ignoreCase must be true or false`);
      optText(s.prompt, "prompt", L.prompt);
      const shapes = acc.map((a) => commandShape(a, s as unknown as CommandSpec));
      if (shapes.some((x) => !x)) p.push(`${where}: an accepted command can't be read (unclosed quote?)`);
      else {
        const keys = shapes.map((x) => JSON.stringify(x));
        if (new Set(keys).size !== keys.length) p.push(`${where}: two accepted commands are the same after normalising`);
      }
      if (acc[0] && !modelAnswer.includes(acc[0])) p.push(`${where}: the model answer must quote the first accepted command`);
      break;
    }
    case "numeric": {
      const a = s.answer;
      const t = s.tolerance;
      const pt = s.partialTolerance;
      if (typeof a !== "number" || !Number.isFinite(a)) {
        p.push(`${where}: answer must be a number`);
        break;
      }
      if (typeof t !== "number" || !Number.isFinite(t) || t < 0) p.push(`${where}: tolerance must be a number of at least 0`);
      else if (a !== 0 && t > Math.abs(a) * L.toleranceShare) p.push(`${where}: tolerance is more than ${L.toleranceShare * 100}% of the answer`);
      if (pt !== undefined) {
        if (typeof pt !== "number" || !Number.isFinite(pt) || typeof t !== "number" || pt <= t) p.push(`${where}: partialTolerance must be larger than tolerance`);
        else if (a !== 0 && pt > Math.abs(a) * L.partialShare) p.push(`${where}: partialTolerance is more than ${L.partialShare * 100}% of the answer`);
      }
      optText(s.unit, "unit", L.unit);
      if (typeof t === "number" && !numbersIn(modelAnswer).some((n) => Math.abs(n - a) <= t + EPS)) {
        p.push(`${where}: the model answer must state the answer (${a})`);
      }
      break;
    }
    default:
      p.push(`${where}: interactive type must be one of ${INTERACTIVE_TYPES.join(", ")}`);
  }
  return p;
}
