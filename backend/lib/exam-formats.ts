import { presentationOrder, presentationSeed } from "@/lib/choice-order";

// REQ-109: exam-style question formats -- multiple choice, multiple response
// ("choose two/three"), ordering and matching, each optionally with an
// exhibit (log excerpt, IAM policy JSON, firewall rule table, network
// diagram described in text).
//
// Everything here is pure: what formats an exam uses, validating a
// generated item, the per-learner shuffle, turning what the app sends back
// into stored indexes, exact-match grading and partial credit. Nothing here
// touches the database or the model, so it is unit-tested directly
// (exam-formats.test.ts).
//
// STORED vs SHOWN. Items are stored in the order they were written:
// choices with the key as indexes into them, ordering steps in the RIGHT
// order, matching prompts and responses with key[i] = the response index
// for prompt i. Each learner sees a shuffle of every list, fixed for that
// learner and item (the HMAC seed in lib/choice-order.ts, so it can't be
// recomputed from ids the app knows). The app only ever sends SHOWN
// positions; they are mapped back here before grading, and the key is never
// sent until the item is graded.

export const EXAM_FORMATS = ["multiple_choice", "multiple_response", "ordering", "matching"] as const;
export type ExamFormat = (typeof EXAM_FORMATS)[number];

export const EXHIBIT_KINDS = ["log", "policy", "table", "diagram"] as const;
export type ExhibitKind = (typeof EXHIBIT_KINDS)[number];

export interface Exhibit {
  kind: ExhibitKind;
  title: string;
  // log / policy / diagram: the text (a policy is pretty-printed JSON)
  text?: string;
  // table: header and rows, every row as long as the header
  columns?: string[];
  rows?: string[][];
}

export interface McBody {
  choices: string[];
}
export interface MrBody {
  choices: string[];
  selectCount: number;
}
export interface OrderingBody {
  steps: string[];
}
export interface MatchingBody {
  prompts: string[];
  responses: string[];
}

export interface StoredExamItem {
  id: string;
  objectiveId: string;
  format: ExamFormat;
  stem: string;
  body: McBody | MrBody | OrderingBody | MatchingBody;
  // multiple_choice / multiple_response: {correct}; ordering: {order};
  // matching: {matches}
  answerKey: { correct?: number[]; order?: number[]; matches?: number[] };
  explanation: string;
  exhibit: Exhibit | null;
}

// ---------------------------------------------------------------------------
// Which formats an exam uses
// ---------------------------------------------------------------------------

// Read from the vendor's own words in credential_exams.question_format
// (lib/exam-blueprint.ts). Only formats the exam actually uses are offered,
// e.g. AWS DVA "multiple choice and multiple response" never gets ordering.
//   "drag-and-drop" (CompTIA, PMI) is how those exams deliver ordering and
//   matching, so it enables both (inferred from the vendors' descriptions of
//   drag-and-drop items; the seed text does not say which).
//   Exhibits are enabled only for exams that describe performance-based,
//   exhibit, graphic, simulation, hot-spot or case-study items.
// No exam, or text naming no format -> plain multiple choice.
export function examFormatsFromText(questionFormat: string | null | undefined): {
  formats: ExamFormat[];
  exhibits: boolean;
} {
  const t = (questionFormat ?? "").toLowerCase();
  const mr = /multiple[- ]response|multiple[- ]select|multiple-answer-select|multiple answer|single\/multiple response/.test(t);
  const dnd = /drag[- ]and[- ]drop/.test(t);
  const ordering = dnd || /\bordering\b/.test(t);
  const matching = dnd || /\bmatching\b/.test(t);
  const mc = /multiple[- ]choice|four-option|single response/.test(t);
  const exhibits = /performance-based|exhibit|graphic|simulation|hot spot|case stud/.test(t);
  const formats: ExamFormat[] = [];
  // Multiple choice unless the text lists formats without it (AWS text such
  // as "multiple response and matching").
  if (mc || !(mr || ordering || matching)) formats.push("multiple_choice");
  if (mr) formats.push("multiple_response");
  if (ordering) formats.push("ordering");
  if (matching) formats.push("matching");
  return { formats, exhibits };
}

// The number of questions on the real exam, when the vendor text states it
// ("65 questions (50 scored, 15 unscored)", "Maximum 90 questions",
// "50-60 questions" -> the upper bound, "180 items (...)"). A number that is
// only a scored/unscored/pretest part is not the exam length, so text built
// that way returns null and the caller uses a stated default.
export function examQuestionCount(questionFormat: string | null | undefined): number | null {
  const t = questionFormat ?? "";
  const re = /(\d+)(?:\s*-\s*(\d+))?\s+((?:[\w-]+\s+){0,3}?)(?:questions|items)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (/scored|unscored|pretest|clinical|stand-alone/i.test(m[3] ?? "")) continue;
    const n = Number(m[2] ?? m[1]);
    if (n >= 5 && n <= 400) return n;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validating a generated (or hand-written) item
// ---------------------------------------------------------------------------

const nonEmpty = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
const MAX_TEXT = 4000;
const MAX_EXHIBIT = 6000;

function distinct(list: string[]): boolean {
  return new Set(list.map((s) => s.trim().toLowerCase())).size === list.length;
}

export function validateExhibit(raw: unknown): Exhibit | string | null {
  if (raw == null) return null;
  const e = raw as Record<string, unknown>;
  if (!EXHIBIT_KINDS.includes(e.kind as ExhibitKind)) return "exhibit kind must be log, policy, table or diagram";
  if (!nonEmpty(e.title)) return "exhibit needs a title";
  const kind = e.kind as ExhibitKind;
  if (kind === "table") {
    const cols = e.columns;
    const rows = e.rows;
    if (!Array.isArray(cols) || cols.length < 2 || !cols.every(nonEmpty)) return "table exhibit needs 2+ columns";
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 20) return "table exhibit needs 1-20 rows";
    for (const r of rows) {
      if (!Array.isArray(r) || r.length !== cols.length || !r.every((c) => typeof c === "string")) {
        return "every table row must have one cell per column";
      }
    }
    const size = JSON.stringify(rows).length;
    if (size > MAX_EXHIBIT) return "table exhibit too long";
    return { kind, title: (e.title as string).trim(), columns: cols as string[], rows: rows as string[][] };
  }
  if (!nonEmpty(e.text)) return `${kind} exhibit needs text`;
  let text = (e.text as string).trim();
  if (text.length > MAX_EXHIBIT) return "exhibit text too long";
  if (kind === "policy") {
    // A policy exhibit that isn't valid JSON would teach a wrong syntax.
    try {
      text = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return "policy exhibit must be valid JSON";
    }
  }
  return { kind, title: (e.title as string).trim(), text };
}

// Model output (or seed data) -> a storable item, or the reason it was
// rejected. `allowed` is the exam's formats; `exhibits` whether the exam
// uses them. Rejection is by design strict: a wrong key teaches the wrong
// thing to every learner who is served the item.
export interface ItemDraft {
  format: ExamFormat;
  stem: string;
  body: StoredExamItem["body"];
  answerKey: StoredExamItem["answerKey"];
  explanation: string;
  exhibit: Exhibit | null;
}

export function validateItemDraft(raw: unknown, allowed: ExamFormat[], exhibits: boolean): ItemDraft | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  const format = r.format as ExamFormat;
  if (!EXAM_FORMATS.includes(format)) return "unknown format";
  if (!allowed.includes(format)) return `format ${format} is not used by this exam`;
  if (!nonEmpty(r.stem) || (r.stem as string).length > MAX_TEXT) return "stem missing or too long";
  const explanation = nonEmpty(r.explanation) ? (r.explanation as string).trim() : "";
  if (!explanation) return "explanation missing";
  let exhibit: Exhibit | null = null;
  if (r.exhibit != null) {
    if (!exhibits) return "this exam does not use exhibits";
    const ex = validateExhibit(r.exhibit);
    if (typeof ex === "string") return ex;
    exhibit = ex;
  }
  const strings = (v: unknown, min: number, max: number) =>
    Array.isArray(v) && v.length >= min && v.length <= max && v.every(nonEmpty) ? (v as string[]).map((s) => s.trim()) : null;
  const ints = (v: unknown) => (Array.isArray(v) && v.every((i) => Number.isInteger(i)) ? (v as number[]) : null);
  const stem = (r.stem as string).trim();

  if (format === "multiple_choice" || format === "multiple_response") {
    const choices = strings(r.choices, format === "multiple_choice" ? 4 : 5, 6);
    if (!choices) return format === "multiple_choice" ? "need 4-6 choices" : "need 5-6 choices";
    if (!distinct(choices)) return "choices must be distinct";
    const correct = ints(r.correct);
    if (!correct || !correct.every((i) => i >= 0 && i < choices.length)) return "correct must index choices";
    const uniq = [...new Set(correct)].sort((a, b) => a - b);
    if (uniq.length !== correct.length) return "correct repeats an index";
    if (format === "multiple_choice") {
      if (uniq.length !== 1) return "multiple choice has exactly one correct choice";
      return { format, stem, body: { choices }, answerKey: { correct: uniq }, explanation, exhibit };
    }
    if (uniq.length < 2 || uniq.length > 3) return "multiple response has 2 or 3 correct choices";
    return { format, stem, body: { choices, selectCount: uniq.length }, answerKey: { correct: uniq }, explanation, exhibit };
  }
  if (format === "ordering") {
    const steps = strings(r.steps, 3, 6);
    if (!steps) return "need 3-6 steps";
    if (!distinct(steps)) return "steps must be distinct";
    // Steps are written in the right order; the key is that order.
    return { format, stem, body: { steps }, answerKey: { order: steps.map((_, i) => i) }, explanation, exhibit };
  }
  const prompts = strings(r.prompts, 3, 6);
  const responses = strings(r.responses, 3, 6);
  if (!prompts || !responses) return "need 3-6 prompts and 3-6 responses";
  if (!distinct(prompts) || !distinct(responses)) return "prompts and responses must be distinct";
  const matches = ints(r.matches);
  if (!matches || matches.length !== prompts.length || !matches.every((i) => i >= 0 && i < responses.length)) {
    return "matches must give one response index per prompt";
  }
  return { format, stem, body: { prompts, responses }, answerKey: { matches }, explanation, exhibit };
}

// ---------------------------------------------------------------------------
// Per-learner shuffle
// ---------------------------------------------------------------------------

// order[shownPosition] = storedIndex, per list.
export interface ItemOrders {
  choices?: number[];
  steps?: number[];
  prompts?: number[];
  responses?: number[];
}

function orderFor(userId: string, item: Pick<StoredExamItem, "id" | "objectiveId">, part: string, n: number): number[] {
  return presentationOrder(presentationSeed(userId, item.objectiveId, `exam-${part}`, item.id), n);
}

export function itemOrders(userId: string, item: StoredExamItem): ItemOrders {
  const b = item.body as Partial<McBody & OrderingBody & MatchingBody>;
  if (item.format === "ordering") {
    let steps = orderFor(userId, item, "steps", b.steps!.length);
    // Never show an ordering item already solved: rotate one place.
    if (steps.every((s, i) => s === i)) steps = [...steps.slice(1), steps[0]];
    return { steps };
  }
  if (item.format === "matching") {
    return {
      prompts: orderFor(userId, item, "prompts", b.prompts!.length),
      responses: orderFor(userId, item, "responses", b.responses!.length),
    };
  }
  return { choices: orderFor(userId, item, "choices", b.choices!.length) };
}

const pick = <T>(list: T[], order: number[]) => order.map((i) => list[i]);
const shownOf = (order: number[], stored: number) => order.indexOf(stored);

// What the app may see before grading: everything except the key and the
// explanation, in this learner's order.
export interface PublicExamItem {
  format: ExamFormat;
  stem: string;
  exhibit: Exhibit | null;
  choices?: string[];
  selectCount?: number;
  steps?: string[];
  prompts?: string[];
  responses?: string[];
}

export function publicItem(item: StoredExamItem, orders: ItemOrders): PublicExamItem {
  const base = { format: item.format, stem: item.stem, exhibit: item.exhibit };
  const b = item.body as Partial<MrBody & OrderingBody & MatchingBody>;
  if (item.format === "ordering") return { ...base, steps: pick(b.steps!, orders.steps!) };
  if (item.format === "matching") {
    return { ...base, prompts: pick(b.prompts!, orders.prompts!), responses: pick(b.responses!, orders.responses!) };
  }
  if (item.format === "multiple_response") {
    return { ...base, choices: pick(b.choices!, orders.choices!), selectCount: b.selectCount };
  }
  return { ...base, choices: pick(b.choices!, orders.choices!) };
}

// ---------------------------------------------------------------------------
// Responses: shown positions from the app <-> stored indexes
// ---------------------------------------------------------------------------

// Stored (canonical) response shapes:
//   multiple_choice    {choice: i}
//   multiple_response  {choices: [i, j]}
//   ordering           {order: [stored step indexes in the learner's order]}
//   matching           {matches: [response index or null, per STORED prompt]}
export interface StoredResponse {
  choice?: number;
  choices?: number[];
  order?: number[];
  matches?: (number | null)[];
}

const isIdx = (v: unknown, n: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;

// The app's answer, in shown positions, -> stored indexes, or a reason it is
// malformed. A partly answered matching item is allowed (nulls), so the
// learner can save progress; an empty multiple response is "no answer".
export function responseFromShown(item: StoredExamItem, orders: ItemOrders, shown: unknown): StoredResponse | string {
  const s = (shown ?? {}) as Record<string, unknown>;
  const b = item.body as Partial<MrBody & OrderingBody & MatchingBody>;
  switch (item.format) {
    case "multiple_choice": {
      const n = b.choices!.length;
      if (!isIdx(s.choice, n)) return `choice must be 0-${n - 1}`;
      return { choice: orders.choices![s.choice] };
    }
    case "multiple_response": {
      const n = b.choices!.length;
      const list = s.choices;
      if (!Array.isArray(list) || !list.every((i) => isIdx(i, n))) return `choices must be positions 0-${n - 1}`;
      if (new Set(list).size !== list.length) return "a choice is listed twice";
      if (list.length > b.selectCount!) return `choose at most ${b.selectCount}`;
      return { choices: (list as number[]).map((i) => orders.choices![i]).sort((x, y) => x - y) };
    }
    case "ordering": {
      const n = b.steps!.length;
      const list = s.order;
      if (!Array.isArray(list) || list.length !== n || !list.every((i) => isIdx(i, n)) || new Set(list).size !== n) {
        return `order must list each of the ${n} shown positions once`;
      }
      return { order: (list as number[]).map((i) => orders.steps![i]) };
    }
    case "matching": {
      const np = b.prompts!.length;
      const nr = b.responses!.length;
      const list = s.matches;
      if (!Array.isArray(list) || list.length !== np || !list.every((i) => i === null || isIdx(i, nr))) {
        return `matches must give a response position (or null) for each of the ${np} prompts`;
      }
      const out: (number | null)[] = new Array(np).fill(null);
      (list as (number | null)[]).forEach((r, shownPrompt) => {
        out[orders.prompts![shownPrompt]] = r === null ? null : orders.responses![r];
      });
      return { matches: out };
    }
  }
}

// Stored response -> shown positions, so a resumed session shows what was
// picked.
export function responseToShown(item: StoredExamItem, orders: ItemOrders, stored: StoredResponse | null): unknown {
  if (!stored) return null;
  switch (item.format) {
    case "multiple_choice":
      return stored.choice == null ? null : { choice: shownOf(orders.choices!, stored.choice) };
    case "multiple_response":
      return { choices: (stored.choices ?? []).map((i) => shownOf(orders.choices!, i)).sort((a, b) => a - b) };
    case "ordering":
      return { order: (stored.order ?? []).map((i) => shownOf(orders.steps!, i)) };
    case "matching":
      return {
        matches: orders.prompts!.map((storedPrompt) => {
          const r = stored.matches?.[storedPrompt];
          return r == null ? null : shownOf(orders.responses!, r);
        }),
      };
  }
}

// Has the learner given a complete answer (for "unanswered" counts)?
export function isComplete(item: StoredExamItem, stored: StoredResponse | null): boolean {
  if (!stored) return false;
  const b = item.body as Partial<MrBody>;
  switch (item.format) {
    case "multiple_choice":
      return stored.choice != null;
    case "multiple_response":
      return (stored.choices?.length ?? 0) === b.selectCount;
    case "ordering":
      return (stored.order?.length ?? 0) > 0;
    case "matching":
      return !!stored.matches && stored.matches.every((m) => m != null);
  }
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export interface ItemGrade {
  verdict: "correct" | "partial" | "incorrect";
  // Exam-style credit: the vendors score every format all-or-nothing
  // (AWS: "You must select all the correct responses and place the
  // responses in the correct order to receive credit"), so the mock score
  // counts only fully right items.
  credited: boolean;
  // Share of the item right, 0-1, shown as information and stored apart
  // from the verdict:
  //   multiple response  share of options classified right (picked or not)
  //   ordering           share of positions right
  //   matching           share of pairs right
  partial: number;
}

// Partial verdicts (mastery's partial_credit) only for ordering and
// matching, at half or more right; multiple response stays all-or-nothing
// as its verdict, with its option-level share stored separately.
export const PARTIAL_VERDICT_AT = 0.5;

export function gradeItem(item: StoredExamItem, stored: StoredResponse | null): ItemGrade {
  const none: ItemGrade = { verdict: "incorrect", credited: false, partial: 0 };
  if (!stored) return none;
  const k = item.answerKey;
  const b = item.body as Partial<MrBody & OrderingBody & MatchingBody>;
  const round = (x: number) => Math.round(x * 10000) / 10000;
  switch (item.format) {
    case "multiple_choice": {
      const right = stored.choice != null && stored.choice === k.correct![0];
      return { verdict: right ? "correct" : "incorrect", credited: right, partial: right ? 1 : 0 };
    }
    case "multiple_response": {
      const picked = new Set(stored.choices ?? []);
      const key = new Set(k.correct!);
      const n = b.choices!.length;
      let agree = 0;
      for (let i = 0; i < n; i++) if (picked.has(i) === key.has(i)) agree++;
      const right = agree === n;
      return { verdict: right ? "correct" : "incorrect", credited: right, partial: round(agree / n) };
    }
    case "ordering": {
      const order = stored.order ?? [];
      const n = k.order!.length;
      if (order.length !== n) return none;
      const hits = order.filter((s, pos) => s === k.order![pos]).length;
      return partialGrade(hits / n);
    }
    case "matching": {
      const m = stored.matches ?? [];
      const n = k.matches!.length;
      const hits = k.matches!.filter((r, i) => m[i] === r).length;
      return partialGrade(hits / n);
    }
  }
  function partialGrade(share: number): ItemGrade {
    if (share === 1) return { verdict: "correct", credited: true, partial: 1 };
    return { verdict: share >= PARTIAL_VERDICT_AT ? "partial" : "incorrect", credited: false, partial: round(share) };
  }
}

// The key in this learner's shown positions, plus readable text, for the
// results screen (only after submit).
export function revealFor(item: StoredExamItem, orders: ItemOrders) {
  const k = item.answerKey;
  const b = item.body as Partial<MrBody & OrderingBody & MatchingBody>;
  switch (item.format) {
    case "multiple_choice":
    case "multiple_response":
      return {
        correct: { choices: k.correct!.map((i) => shownOf(orders.choices!, i)).sort((x, y) => x - y) },
        correctText: k.correct!.map((i) => b.choices![i]),
        explanation: item.explanation,
      };
    case "ordering":
      return {
        correct: { order: k.order!.map((i) => shownOf(orders.steps!, i)) },
        correctText: k.order!.map((i) => b.steps![i]),
        explanation: item.explanation,
      };
    case "matching":
      return {
        correct: { matches: orders.prompts!.map((p) => shownOf(orders.responses!, k.matches![p])) },
        correctText: b.prompts!.map((p, i) => `${p} -> ${b.responses![k.matches![i]]}`),
        explanation: item.explanation,
      };
  }
}

// ---------------------------------------------------------------------------
// Text recorded on the attempt
// ---------------------------------------------------------------------------

// attempts.question for an exam item. It is also what the repeat rule
// matches on ("this learner already answered this question"), so it holds
// the stem plus the item's own lists: two different matching items can
// share a stem like "Match each control type to an example".
export function attemptQuestionText(item: StoredExamItem): string {
  const b = item.body as Partial<MrBody & OrderingBody & MatchingBody>;
  if (item.format === "multiple_choice") return item.stem;
  if (item.format === "multiple_response") return `${item.stem}\nOptions: ${b.choices!.join(" | ")}`;
  if (item.format === "ordering") return `${item.stem}\nSteps: ${[...b.steps!].sort().join(" | ")}`;
  return `${item.stem}\nMatch: ${b.prompts!.join(" | ")} with ${b.responses!.join(" | ")}`;
}

export function answerText(item: StoredExamItem, stored: StoredResponse | null): string {
  if (!stored) return "(no answer)";
  const b = item.body as Partial<MrBody & OrderingBody & MatchingBody>;
  switch (item.format) {
    case "multiple_choice":
      return stored.choice == null ? "(no answer)" : b.choices![stored.choice];
    case "multiple_response":
      return (stored.choices ?? []).map((i) => b.choices![i]).join("; ") || "(no answer)";
    case "ordering":
      return (stored.order ?? []).map((i) => b.steps![i]).join(" -> ") || "(no answer)";
    case "matching":
      return b.prompts!.map((p, i) => `${p} -> ${stored.matches?.[i] == null ? "?" : b.responses![stored.matches[i]!]}`).join("; ");
  }
}
