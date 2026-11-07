// REQ-094: the pure parts of scripts/pregenerate.ts, unit tested.
import type { z } from "zod";

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
    | { type: "succeeded"; message: { content: Array<{ type: string; text?: string }>; stop_reason?: string } }
    | { type: "errored" | "canceled" | "expired"; error?: unknown };
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
}

export function parseArgs(argv: string[]): PregenArgs {
  const out: PregenArgs = { mode: "estimate", tracks: [], limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--submit") out.mode = "submit";
    else if (a === "--collect") {
      out.mode = "collect";
      out.batchId = argv[++i];
      if (!out.batchId || !/^msgbatch_[A-Za-z0-9]+$/.test(out.batchId)) throw new Error("--collect needs a batch id (msgbatch_...)");
    } else if (a === "--tracks") {
      out.tracks = (argv[++i] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    } else if (a === "--limit") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n <= 0) throw new Error("--limit needs a positive whole number");
      out.limit = n;
    } else throw new Error(`Unknown option ${a}`);
  }
  return out;
}
