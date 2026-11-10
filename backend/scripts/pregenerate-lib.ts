// REQ-132: the pure parts of scripts/pregenerate.ts, unit tested.
// REQ-208: the budget arithmetic (an upper bound, a priority cutoff) and the
// command line.
import type { z } from "zod";
import { estimateTokens, priceFor } from "../lib/ai-pricing";
import { effectiveMaxTokens } from "../lib/anthropic";
import { CONTENT_LIMITS } from "../lib/content-validator";
import { factCheckCallText, factCheckMaxTokens, type CheckItem } from "../lib/fact-check";

// Pricing note (estimate only). From platform.claude.com/docs/en/about-claude/pricing
// as read on 2026-11-07: claude-sonnet-5-5 is $2 input / $10 output per million
// tokens, and the Batch API halves both. Token counts per lesson are estimates
// from the prompts (about 3.0k in and 3.3k out across both requests, new
// tokenizer). Re-check prices before a large run.
export const BATCH_INPUT_USD_PER_MTOK = 1;
export const BATCH_OUTPUT_USD_PER_MTOK = 5;
export const EST_INPUT_TOKENS_PER_LESSON = 3000;
export const EST_OUTPUT_TOKENS_PER_LESSON = 3300;

export function estimateCost(lessons: number) {
  const perLessonUsd =
    (EST_INPUT_TOKENS_PER_LESSON * BATCH_INPUT_USD_PER_MTOK + EST_OUTPUT_TOKENS_PER_LESSON * BATCH_OUTPUT_USD_PER_MTOK) / 1e6;
  return { perLessonUsd, totalUsd: perLessonUsd * lessons };
}

// ---------------------------------------------------------------------------
// REQ-208: the cap. estimateCost above is a typical figure; the budget guard
// uses an UPPER BOUND, so a run can not cost more than --max-usd:
//   - every batch request is priced at its max_tokens (it can not write more)
//     with the Batches discount, and its input at the prompt's estimated size;
//   - the fact-check that runs when a lesson is saved is NOT discounted (it is
//     a live call) and is priced at its max_tokens too, thinking headroom
//     included (the checker thinks);
//   - prices come from lib/ai-pricing.ts for the model in use (an unknown or
//     4.5 id is priced as Sonnet 5.5, the dearest).
// ---------------------------------------------------------------------------

export const BATCH_DISCOUNT = 0.5;
// The structured-output schema is added to the prompt by the API; this is
// well above its real size.
export const SCHEMA_OVERHEAD_TOKENS = 1500;

export function batchPerMtok(model: string) {
  const p = priceFor(model);
  return { input: p.input * BATCH_DISCOUNT, output: p.output * BATCH_DISCOUNT };
}

export interface RequestShape {
  max_tokens: number;
  system: unknown;
  messages: unknown;
}

export function requestInputTokens(r: Pick<RequestShape, "system" | "messages">): number {
  return estimateTokens(JSON.stringify({ system: r.system, messages: r.messages })) + SCHEMA_OVERHEAD_TOKENS;
}

// One batch request, worst case.
export function batchRequestUpperUsd(model: string, r: RequestShape): number {
  const p = batchPerMtok(model);
  return (requestInputTokens(r) * p.input + r.max_tokens * p.output) / 1e6;
}

// The live fact-check of a lesson's two checks, worst case: both items at
// the content limits, output at max_tokens.
export function factCheckUpperUsd(model: string): number {
  const q = "q".repeat(CONTENT_LIMITS.question);
  const opts = Array.from({ length: 4 }, () => "o".repeat(CONTENT_LIMITS.option));
  const item = (key: string): CheckItem => ({ key, objectiveTitle: "t".repeat(200), question: q, format: "single", options: opts, expected: [0] });
  const inTok = estimateTokens(factCheckCallText([item("fade"), item("solo")])) + SCHEMA_OVERHEAD_TOKENS;
  const outTok = effectiveMaxTokens(model, factCheckMaxTokens(2), "default");
  const p = priceFor(model);
  return (inTok * p.input + outTok * p.output) / 1e6;
}

// What the Batches API bills for the usage its results report.
export interface BatchUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function batchUsageUsd(model: string, u: BatchUsage): number {
  const p = priceFor(model);
  const usd =
    ((u.input_tokens ?? 0) * p.input +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead +
      (u.output_tokens ?? 0) * p.output) /
    1e6;
  return usd * BATCH_DISCOUNT;
}

// An objective that could be pre-generated, in PRIORITY order (the order of
// --tracks, then the unit order, then the objective order within the unit),
// with the most it could cost.
export interface Candidate {
  objectiveId: string;
  trackCode: string;
  unitId: string;
  unitTitle: string;
  usd: number;
}

export interface TrackLine {
  track: string;
  available: number;
  availableUsd: number;
  objectives: number;
  usd: number;
}

export interface Cutoff {
  track: string;
  unitTitle: string;
  // the unit that did not fit
  unitObjectives: number;
  unitUsd: number;
  // everything from that unit on, across the remaining tracks
  skippedObjectives: number;
  skippedUsd: number;
}

export interface BudgetPlan {
  selected: Candidate[];
  perTrack: TrackLine[];
  totalUsd: number;
  cutoff: Cutoff | null;
}

// Fills the budget in priority order, one whole unit at a time. The first
// unit that would take the total past maxUsd ends the selection: nothing
// later is added, not even a smaller unit of a lower-priority track, so what
// is dropped is always the lowest-priority tail (later units of the last
// track first). maxUsd null = no cap.
export function fillBudget(ordered: Candidate[], maxUsd: number | null): BudgetPlan {
  const lines = new Map<string, TrackLine>();
  const line = (t: string) => {
    let l = lines.get(t);
    if (!l) lines.set(t, (l = { track: t, available: 0, availableUsd: 0, objectives: 0, usd: 0 }));
    return l;
  };
  for (const c of ordered) {
    const l = line(c.trackCode);
    l.available++;
    l.availableUsd += c.usd;
  }
  const selected: Candidate[] = [];
  let total = 0;
  let cutoff: Cutoff | null = null;
  let i = 0;
  while (i < ordered.length) {
    let j = i;
    let unitUsd = 0;
    while (j < ordered.length && ordered[j].unitId === ordered[i].unitId && ordered[j].trackCode === ordered[i].trackCode) unitUsd += ordered[j++].usd;
    if (maxUsd !== null && total + unitUsd > maxUsd) {
      const rest = ordered.slice(i);
      cutoff = {
        track: ordered[i].trackCode,
        unitTitle: ordered[i].unitTitle,
        unitObjectives: j - i,
        unitUsd,
        skippedObjectives: rest.length,
        skippedUsd: rest.reduce((a, c) => a + c.usd, 0),
      };
      break;
    }
    for (const c of ordered.slice(i, j)) {
      selected.push(c);
      const l = line(c.trackCode);
      l.objectives++;
      l.usd += c.usd;
    }
    total += unitUsd;
    i = j;
  }
  return { selected, perTrack: [...lines.values()], totalUsd: total, cutoff };
}

export class BudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetError";
  }
}

// custom_id must match ^[a-zA-Z0-9_-]{1,64}$; a UUID plus a suffix fits.
export function requestIds(objectiveId: string) {
  return { intro: `${objectiveId}_intro`, practice: `${objectiveId}_practice` };
}

export function parseRequestId(customId: string): { objectiveId: string; part: "intro" | "practice" } | null {
  const m = /^([0-9a-f-]{36})_(intro|practice)$/i.exec(customId);
  return m ? { objectiveId: m[1], part: m[2] as "intro" | "practice" } : null;
}

export interface BatchResultLine {
  custom_id: string;
  result:
    | { type: "succeeded"; message: { content: Array<{ type: string; text?: string }>; stop_reason?: string; model?: string; usage?: BatchUsage } }
    | { type: "errored" | "canceled" | "expired"; error?: unknown };
}

// One half of every lesson, parsed against the schema the app uses (the
// two-batch flow reads the intro batch and the practice batch separately).
// A half that did not succeed, hit max_tokens, is not JSON or fails the
// schema is a failure with a category as its reason, never half-used.
export function parseHalf<S extends z.ZodType>(
  lines: BatchResultLine[],
  part: "intro" | "practice",
  schema: S
): { parsed: Map<string, z.infer<S>>; failed: { objectiveId: string; reason: string }[] } {
  const parsed = new Map<string, z.infer<S>>();
  const failed: { objectiveId: string; reason: string }[] = [];
  for (const line of lines) {
    const id = parseRequestId(line.custom_id);
    if (!id || id.part !== part) continue;
    const fail = (why: string) => failed.push({ objectiveId: id.objectiveId, reason: `${part} ${why}` });
    if (line.result.type !== "succeeded") {
      fail(line.result.type);
      continue;
    }
    if (line.result.message.stop_reason === "max_tokens") {
      fail("hit max_tokens");
      continue;
    }
    const text = line.result.message.content.find((b) => b.type === "text")?.text;
    if (!text) {
      fail("had no text");
      continue;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      fail("was not JSON");
      continue;
    }
    const r = schema.safeParse(json);
    if (!r.success) {
      fail("failed schema");
      continue;
    }
    parsed.set(id.objectiveId, r.data);
  }
  return { parsed, failed };
}

// Pairs each objective's intro and practice results, validating both against
// the same schemas the app uses. A lesson is saved only when BOTH halves
// succeeded and parse; anything else is reported, never half-saved.
export function pairBatchResults<I extends z.ZodType, P extends z.ZodType>(
  lines: BatchResultLine[],
  introSchema: I,
  practiceSchema: P
): {
  lessons: { objectiveId: string; intro: z.infer<I>; practice: z.infer<P> }[];
  failed: { objectiveId: string; reason: string }[];
} {
  const parts = new Map<string, { intro?: unknown; practice?: unknown; error?: string }>();
  for (const line of lines) {
    const id = parseRequestId(line.custom_id);
    if (!id) continue;
    const slot = parts.get(id.objectiveId) ?? {};
    parts.set(id.objectiveId, slot);
    if (line.result.type !== "succeeded") {
      slot.error ??= `${id.part} ${line.result.type}`;
      continue;
    }
    if (line.result.message.stop_reason === "max_tokens") {
      slot.error ??= `${id.part} hit max_tokens`;
      continue;
    }
    const text = line.result.message.content.find((b) => b.type === "text")?.text;
    if (!text) {
      slot.error ??= `${id.part} had no text`;
      continue;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      slot.error ??= `${id.part} was not JSON`;
      continue;
    }
    const parsed = (id.part === "intro" ? introSchema : practiceSchema).safeParse(json);
    if (!parsed.success) {
      slot.error ??= `${id.part} failed schema`;
      continue;
    }
    slot[id.part] = parsed.data;
  }
  const lessons: { objectiveId: string; intro: z.infer<I>; practice: z.infer<P> }[] = [];
  const failed: { objectiveId: string; reason: string }[] = [];
  for (const [objectiveId, s] of parts) {
    if (s.intro !== undefined && s.practice !== undefined && !s.error) {
      lessons.push({ objectiveId, intro: s.intro as z.infer<I>, practice: s.practice as z.infer<P> });
    } else {
      failed.push({ objectiveId, reason: s.error ?? (s.intro === undefined ? "intro missing" : "practice missing") });
    }
  }
  return { lessons, failed };
}

export interface PregenArgs {
  mode: "estimate" | "submit" | "collect";
  tracks: string[];
  limit: number | null;
  batchId?: string;
  // REQ-208
  maxUsd: number | null;
  dryRun: boolean;
  // the batch of teaching text a practice batch was built from
  introBatchId?: string;
  allowConcurrent: boolean;
  // write a counts-only JSON summary here
  summaryPath?: string;
}

const BATCH_ID = /^msgbatch_[A-Za-z0-9]+$/;
// A Console / Anthropic track code in the catalog: letters, digits, dash, underscore.
const TRACK_CODE = /^[A-Za-z0-9_-]{1,40}$/;

export function parseArgs(argv: string[]): PregenArgs {
  const out: PregenArgs = { mode: "estimate", tracks: [], limit: null, maxUsd: null, dryRun: false, allowConcurrent: false };
  const value = (i: number, flag: string) => {
    const v = argv[i];
    if (v === undefined || v.startsWith("--")) throw new Error(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--submit") out.mode = "submit";
    else if (a === "--collect") {
      out.mode = "collect";
      out.batchId = argv[++i];
      if (!out.batchId || !BATCH_ID.test(out.batchId)) throw new Error("--collect needs a batch id (msgbatch_...)");
    } else if (a === "--intro-batch") {
      out.introBatchId = value(++i, a);
      if (!BATCH_ID.test(out.introBatchId)) throw new Error("--intro-batch needs a batch id (msgbatch_...)");
    } else if (a === "--tracks") {
      const codes = value(++i, a).split(",").map((t) => t.trim()).filter(Boolean);
      for (const c of codes) if (!TRACK_CODE.test(c)) throw new Error(`"${c.slice(0, 40)}" is not a track code`);
      // Order matters (priority); a repeated code keeps its first place.
      out.tracks = [...new Set(codes.map((c) => c.toUpperCase()))];
    } else if (a === "--limit") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n <= 0) throw new Error("--limit needs a positive whole number");
      out.limit = n;
    } else if (a === "--max-usd") {
      const raw = value(++i, a);
      const n = Number(raw);
      if (!/^\d+(\.\d+)?$/.test(raw) || !Number.isFinite(n) || n <= 0) throw new Error("--max-usd needs a positive dollar amount, e.g. 50");
      out.maxUsd = n;
    } else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--allow-concurrent") out.allowConcurrent = true;
    else if (a === "--summary") out.summaryPath = value(++i, a);
    else throw new Error(`Unknown option ${a}`);
  }
  if (out.mode === "submit") {
    if (!out.tracks.length) throw new Error("--submit needs --tracks (in priority order); it never submits the whole catalog");
    if (out.maxUsd === null) throw new Error("--submit needs --max-usd");
  }
  if (out.mode !== "collect" && out.introBatchId) throw new Error("--intro-batch is only for --collect");
  return out;
}

export function usd(n: number): string {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

// The per-track table and the cutoff, as text for the estimate and submit.
export function planLines(plan: BudgetPlan, maxUsd: number | null): string[] {
  const out: string[] = [];
  for (const t of plan.perTrack) {
    const part = t.objectives === t.available ? "all" : `${t.objectives} of ${t.available}`;
    out.push(`  ${t.track}: ${t.objectives} lessons, up to ${usd(t.usd)} (${part}; whole track up to ${usd(t.availableUsd)})`);
  }
  out.push(`  Total: ${plan.selected.length} lessons, up to ${usd(plan.totalUsd)}${maxUsd !== null ? ` of ${usd(maxUsd)}` : ""}`);
  if (plan.cutoff) {
    const c = plan.cutoff;
    out.push(
      `  Cut off at ${c.track}, unit "${c.unitTitle}" (${c.unitObjectives} lessons, up to ${usd(c.unitUsd)}) -- it would pass ${usd(maxUsd ?? 0)}. ` +
        `Left out: ${c.skippedObjectives} lessons from there on (up to ${usd(c.skippedUsd)}).`
    );
  } else if (maxUsd !== null) {
    out.push(`  Everything requested fits under ${usd(maxUsd)}.`);
  }
  return out;
}
