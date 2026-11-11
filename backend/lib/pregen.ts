// REQ-132 / REQ-208: pre-generate shared catalog lessons through the Message
// Batches API (50% off), so a learner's first visit to an objective is a
// cache hit. The command line is scripts/pregenerate.ts; the pure parts
// (arithmetic, arguments) are in scripts/pregenerate-lib.ts. This file is the
// part that touches the database and the (injectable) Batches client, so it
// is tested against a real Postgres with the model mocked
// (lib/pregen.dbtest.ts).
//
// A lesson is made the way the app makes one on demand (lib/lesson-generation
// runGeneration), in the same order, by the same checks:
//
//   1. submit   intro requests (guess + teaching cards), one batch.
//   2. collect  the ended intro batch -> the intro checks (content lint,
//               the writer's own doubt) -> PRACTICE requests that carry the
//               teaching text (REQ-139 / FAIL-527: the questions test what
//               the learner just read) and, for Python/JavaScript/academic
//               courses, ask for a verification program -> a second batch.
//   3. collect  the ended practice batch -> shuffle the answer positions ->
//               content lint -> checkedIntro / checkedPractice, the very
//               functions the app uses (writer's doubt, the second-model
//               fact-check gate, the exec-check queue) -> insert-if-absent.
//
// What the app does that a batch cannot is the one steered retry of a held
// back half. A lesson that needs it is held back (logged in item_holdbacks
// exactly as the app would) and NOT saved: its first learner visit generates
// it through the full pipeline, retry included.
//
// Never printed or put in the summary: prompts, lesson text, claims.
// Counts, ids, the estimate and batch ids only.

import { query, queryOne } from "@/lib/db";
import { isActive } from "@/lib/progress-sql";
import { buildRequest, getModel } from "@/lib/anthropic";
import {
  lessonIntroPrompt,
  lessonPracticePrompt,
  lessonIntroSchema,
  lessonPracticeSchema,
  introFromModel,
  type LessonIntroContent,
  type LessonPracticeContent,
} from "@/lib/prompts";
import { checkedIntro, checkedPractice, loadObjective, ContentHeldBackError, type LessonGenerator, type ObjectiveRow } from "@/lib/lesson-generation";
import { saveLesson } from "@/lib/lesson-store";
import { makeModelFactChecker, type FactChecker } from "@/lib/fact-check";
import { lowConfidenceOf } from "@/lib/item-quality";
import { CONTENT_LIMITS, lessonIntroProblems, lessonPracticeProblems, shufflePractice } from "@/lib/content-validator";
import { hasAuthoredLesson } from "@/lib/authored-lessons";
import { wantsVerification } from "@/lib/verify-execution";
import { queueExecCheck } from "@/lib/exec-checks";
import { callCostUsd } from "@/lib/ai-pricing";
import { flushAiCallLog, insertAiCallRecord, setAiCallSink, type AiCallRecord } from "@/lib/ai-calls";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  BudgetError,
  batchRequestUpperUsd,
  batchUsageUsd,
  factCheckUpperUsd,
  fillBudget,
  pairBatchResults,
  parseHalf,
  parseRequestId,
  planLines,
  requestIds,
  usd,
  type BatchResultLine,
  type BatchUsage,
  type BudgetPlan,
  type Candidate,
} from "../scripts/pregenerate-lib";

// ---------------------------------------------------------------------------
// The Batches client, as far as this file uses it (so a test can supply one)
// ---------------------------------------------------------------------------

export interface BatchInfo {
  id: string;
  processing_status: string;
  request_counts?: Record<string, number>;
  created_at?: string;
  ended_at?: string | null;
}

export interface BatchesClient {
  create(params: { requests: { custom_id: string; params: Record<string, unknown> }[] }): Promise<{ id: string }>;
  retrieve(id: string): Promise<BatchInfo>;
  results(id: string): Promise<AsyncIterable<unknown>>;
  list(params?: Record<string, unknown>): AsyncIterable<BatchInfo> | PromiseLike<AsyncIterable<BatchInfo>>;
}

export interface Ctx {
  batches: BatchesClient;
  log: (message: string) => void;
}

// A counts-only record of a run, written to the workflow artifact.
export interface Summary {
  mode: "estimate" | "submit" | "collect";
  stage?: "intro" | "practice";
  dryRun: boolean;
  model: string;
  tracks: string[];
  maxUsd: number | null;
  estimateUpperBoundUsd?: number;
  lessons?: number;
  requests?: number;
  perTrack?: BudgetPlan["perTrack"];
  cutoff?: BudgetPlan["cutoff"];
  batchId?: string;
  introBatchId?: string;
  batchStatus?: string;
  requestCounts?: Record<string, number>;
  actualUsd?: { batch: number; factCheck: number; total: number };
  saved?: number;
  alreadyHadOne?: number;
  held?: number;
  failed?: number;
  skipped?: number;
  failedBy?: Record<string, number>;
  stoppedForBudget?: boolean;
}

// ---------------------------------------------------------------------------
// Which objectives are worth pre-generating
// ---------------------------------------------------------------------------

export interface Row {
  objective_id: string;
  track_code: string;
  unit_id: string;
  unit_title: string;
}

// The one place that decides what pre-generation may touch. The same rules
// the app's lesson route applies before it generates:
//   - a shared (catalog) track, listed: not hidden (REQ-194 hidden_at; a
//     hidden_at in the future still lists);
//   - an active unit and objective (REQ-102 retired_at, REQ-195);
//   - no lesson_content row at all. A row means a lesson exists, was pulled
//     or voided by a content fix (scripts/lessons:fix), or was authored; the
//     app replaces a pulled one on a learner's visit, pre-generation does not
//     touch any of them;
//   - no authored lesson for it (lib/authored-lessons.ts; never generated).
// Order = priority: the position of the track in `tracks`, then the unit's
// order, then the objective's (unit id and objective id break ties so a
// unit's objectives are always together).
export async function selectCandidates(opts: { tracks: string[]; limit?: number | null; ids?: string[] }): Promise<Row[]> {
  const rows = await query<Row & { objective_title: string }>(
    `select o.id as objective_id, st.code as track_code, cu.id as unit_id, cu.title as unit_title, o.title as objective_title
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where st.user_id is null
        and (st.hidden_at is null or st.hidden_at > now())
        and ${isActive("cu")} and ${isActive("o")}
        and not exists (select 1 from lesson_content lc where lc.objective_id = o.id)
        and ($1::text[] is null or upper(st.code) = any($1::text[]))
        and ($2::uuid[] is null or o.id = any($2::uuid[]))
      order by case when $1::text[] is null then 0 else coalesce(array_position($1::text[], upper(st.code)), 0) end,
               st.code, cu.sort_order, cu.id, o.sort_order, o.id`,
    [opts.tracks.length ? opts.tracks.map((t) => t.toUpperCase()) : null, opts.ids?.length ? opts.ids : null]
  );
  const kept = rows.filter((r) => !hasAuthoredLesson(r.track_code, r.objective_title));
  return opts.limit ? kept.slice(0, Math.floor(opts.limit)) : kept;
}

// An unknown track code is an error (a typo would otherwise be a silent
// "nothing to do"); a hidden one is reported and yields no lessons.
export async function checkTracks(tracks: string[], log: (m: string) => void): Promise<void> {
  if (!tracks.length) return;
  const rows = await query<{ code: string; hidden: boolean }>(
    `select upper(code) as code, bool_and(hidden_at is not null and hidden_at <= now()) as hidden
       from subject_tracks where user_id is null and upper(code) = any($1::text[]) group by 1`,
    [tracks.map((t) => t.toUpperCase())]
  );
  const known = new Map(rows.map((r) => [r.code, r.hidden]));
  const unknown = tracks.filter((t) => !known.has(t.toUpperCase()));
  if (unknown.length) throw new Error(`Unknown track code(s): ${unknown.join(", ")}. Nothing was estimated or sent.`);
  for (const t of tracks) if (known.get(t.toUpperCase())) log(`${t.toUpperCase()} is hidden from the catalog (hidden_at has passed): no lessons will be made for it.`);
}

// ---------------------------------------------------------------------------
// Building requests (the app's own prompt builders and request shape)
// ---------------------------------------------------------------------------

// userId null: an operator script, charged to no learner (REQ-202 makes the option required).
const COMMON = { effort: "medium" as const, thinking: "off" as const, userId: null };

type Params = Record<string, unknown> & { max_tokens: number; system: unknown; messages: unknown };

function baseOf(obj: ObjectiveRow) {
  return { trackTitle: obj.track_title, unitTitle: obj.unit_title, objectiveTitle: obj.title, ctx: obj.ctx ?? undefined };
}

export function introParams(model: string, obj: ObjectiveRow): Params {
  const intro = lessonIntroPrompt(baseOf(obj));
  return buildRequest(
    { ...COMMON, model, purpose: "lesson_intro", system: intro.system, messages: [{ role: "user", content: intro.user }], maxTokens: 4000 },
    zodOutputFormat(lessonIntroSchema)
  ) as Params;
}

// Same arguments the app's claudeGenerator.practice sends on a first
// attempt: the teaching text the learner reads, and the verification program
// for courses that wantsVerification.
export function practiceParams(model: string, obj: ObjectiveRow, teach: string): Params {
  const practice = lessonPracticePrompt({ ...baseOf(obj), teach, verify: wantsVerification(obj.ctx) });
  return buildRequest(
    { ...COMMON, model, purpose: "lesson_practice", system: practice.system, messages: [{ role: "user", content: practice.user }], maxTokens: 6000 },
    zodOutputFormat(lessonPracticeSchema)
  ) as Params;
}

// Plain JSON for the API (the zod helper's output carries functions).
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

interface Priced extends Candidate {
  obj: ObjectiveRow;
}

// Loads each row's objective the way the lesson route does and prices it.
// An objective that has gone away, is retired, or has an authored lesson is
// dropped here too (loadObjective is the app's own view of it).
async function price(rows: Row[], phase: "intro" | "practice", model: string, teachOf?: (id: string) => string): Promise<{ priced: Priced[]; dropped: number }> {
  const priced: Priced[] = [];
  let dropped = 0;
  const fact = factCheckUpperUsd(model);
  const placeholder = "t".repeat(CONTENT_LIMITS.teach);
  for (const r of rows) {
    const obj = await loadObjective(r.objective_id);
    if (!obj || obj.retired || obj.authored) {
      dropped++;
      continue;
    }
    const practiceUsd = batchRequestUpperUsd(model, practiceParams(model, obj, phase === "intro" ? placeholder : teachOf!(r.objective_id)));
    const introUsd = phase === "intro" ? batchRequestUpperUsd(model, introParams(model, obj)) : 0;
    priced.push({
      objectiveId: r.objective_id,
      trackCode: r.track_code.toUpperCase(),
      unitId: r.unit_id,
      unitTitle: r.unit_title,
      usd: introUsd + practiceUsd + fact,
      obj,
    });
  }
  return { priced, dropped };
}

// ---------------------------------------------------------------------------
// Estimate and submit
// ---------------------------------------------------------------------------

export interface PlanResult {
  plan: BudgetPlan;
  priced: Priced[];
  dropped: number;
  summary: Summary;
}

export async function plan(opts: { tracks: string[]; limit: number | null; maxUsd: number | null }, log: (m: string) => void): Promise<PlanResult> {
  const model = getModel();
  await checkTracks(opts.tracks, log);
  const rows = await selectCandidates({ tracks: opts.tracks, limit: opts.limit });
  const { priced, dropped } = await price(rows, "intro", model);
  const budget = fillBudget(priced, opts.maxUsd);
  const summary: Summary = {
    mode: "estimate",
    dryRun: false,
    model,
    tracks: opts.tracks,
    maxUsd: opts.maxUsd,
    estimateUpperBoundUsd: round4(budget.totalUsd),
    lessons: budget.selected.length,
    requests: budget.selected.length * 2,
    perTrack: budget.perTrack,
    cutoff: budget.cutoff,
  };
  return { plan: budget, priced, dropped, summary };
}

function printPlan(r: PlanResult, maxUsd: number | null, log: (m: string) => void) {
  log(`Model: ${r.summary.model}. Each lesson is 2 batch requests (teaching text, then practice) plus one live fact-check when it is saved.`);
  log(`Upper bound (what --max-usd is checked against: every request at its max output, fact-check included):`);
  for (const l of planLines(r.plan, maxUsd)) log(l);
  if (r.dropped) log(`  (${r.dropped} objectives left out: retired, or authored.)`);
  log(`Actual cost is usually well under the upper bound; collect prints it.`);
}

export async function estimateRun(opts: { tracks: string[]; limit: number | null; maxUsd: number | null }, ctx: Pick<Ctx, "log">): Promise<Summary> {
  const r = await plan(opts, ctx.log);
  ctx.log(`Objectives in the shared catalog without a lesson${opts.tracks.length ? ` (tracks ${opts.tracks.join(", ")})` : ""}: ${r.priced.length}`);
  printPlan(r, opts.maxUsd, ctx.log);
  ctx.log(`Nothing was sent. Add --submit (with --tracks and --max-usd) to create the batch.`);
  return r.summary;
}

// A batch already running in this workspace (the key is dedicated to
// pre-generation) means a second submit would pay for the same lessons twice.
async function activeBatches(batches: BatchesClient, sinceIso?: string): Promise<BatchInfo[]> {
  const found: BatchInfo[] = [];
  let seen = 0;
  for await (const b of await batches.list({ limit: 20 })) {
    if (++seen > 20) break;
    if (sinceIso ? (b.created_at ?? "") > sinceIso : b.processing_status === "in_progress") found.push(b);
  }
  return found;
}

export async function submitRun(
  opts: { tracks: string[]; limit: number | null; maxUsd: number; dryRun: boolean; allowConcurrent: boolean },
  ctx: Ctx
): Promise<Summary> {
  const r = await plan(opts, ctx.log);
  ctx.log(`Objectives to consider: ${r.priced.length} in ${opts.tracks.join(" > ")}`);
  printPlan(r, opts.maxUsd, ctx.log);
  const summary: Summary = { ...r.summary, mode: "submit", stage: "intro", dryRun: opts.dryRun };
  if (!r.priced.length) {
    ctx.log("Every requested objective already has a lesson (or is retired, hidden or authored). Nothing to submit.");
    return summary;
  }
  if (!r.plan.selected.length) {
    throw new BudgetError(
      `Refusing to submit: the first unit alone (${r.plan.cutoff?.unitObjectives} lessons, up to ${usd(r.plan.cutoff?.unitUsd ?? 0)}) is over --max-usd ${usd(opts.maxUsd)}. Nothing was sent.`
    );
  }
  const model = getModel();
  const chosen = new Set(r.plan.selected.map((c) => c.objectiveId));
  const requests = r.priced
    .filter((p) => chosen.has(p.objectiveId))
    .map((p) => ({ custom_id: requestIds(p.objectiveId).intro, params: plain(introParams(model, p.obj)) }));
  // Belt and braces: the cap is checked again, from the requests actually
  // built (not the planning figures).
  const fact = factCheckUpperUsd(model);
  const chosenRows = r.priced.filter((p) => chosen.has(p.objectiveId));
  const rebuilt = chosenRows.reduce(
    (a, p, i) =>
      a + batchRequestUpperUsd(model, requests[i].params as Params) + batchRequestUpperUsd(model, practiceParams(model, p.obj, "t".repeat(CONTENT_LIMITS.teach))) + fact,
    0
  );
  if (rebuilt > opts.maxUsd * 1.0000001) throw new BudgetError(`Refusing to submit: the built requests could cost up to ${usd(rebuilt)}, over --max-usd ${usd(opts.maxUsd)}. Nothing was sent.`);
  summary.requests = requests.length;
  if (opts.dryRun) {
    ctx.log(`Dry run: built ${requests.length} intro requests, sent nothing, wrote nothing.`);
    return summary;
  }
  if (!opts.allowConcurrent) {
    const running = await activeBatches(ctx.batches);
    if (running.length) {
      throw new Error(`Refusing to submit: ${running.length} batch(es) in this workspace are still running (${running.map((b) => b.id).join(", ")}). Collect them first, or pass --allow-concurrent. Nothing was sent.`);
    }
  }
  const batch = await ctx.batches.create({ requests });
  summary.batchId = batch.id;
  ctx.log(`Submitted intro batch ${batch.id}: ${r.plan.selected.length} lessons, ${requests.length} requests.`);
  ctx.log(`Most batches finish within an hour. Then collect it (collect also starts the practice batch; collect that one with its intro batch id).`);
  return summary;
}

// ---------------------------------------------------------------------------
// Collect
// ---------------------------------------------------------------------------

async function readLines(batches: BatchesClient, id: string): Promise<BatchResultLine[]> {
  const lines: BatchResultLine[] = [];
  for await (const r of await batches.results(id)) lines.push(r as BatchResultLine);
  return lines;
}

// Tokens the batch billed, by model, from the usage its results report.
function usageByModel(lines: BatchResultLine[], fallbackModel: string) {
  const byModel = new Map<string, Required<{ [K in keyof BatchUsage]: number }>>();
  for (const l of lines) {
    const m = l.result.type === "succeeded" ? l.result.message : undefined;
    if (!m?.usage) continue;
    const model = typeof m.model === "string" && m.model ? m.model : fallbackModel;
    const t = byModel.get(model) ?? { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    t.input_tokens += m.usage.input_tokens ?? 0;
    t.output_tokens += m.usage.output_tokens ?? 0;
    t.cache_read_input_tokens += m.usage.cache_read_input_tokens ?? 0;
    t.cache_creation_input_tokens += m.usage.cache_creation_input_tokens ?? 0;
    byModel.set(model, t);
  }
  return byModel;
}

// The batch's actual cost, and (unless dryRun) its usage in ai_calls:
// purpose `pregen`, one row per model, dated when the batch ended. The row is
// inserted only if an identical one is not there, so collecting an ended batch
// twice does not count it twice. Tokens are the API's, at list price in
// that table; the batch discount is applied only to the cost printed here.
async function recordBatch(batch: BatchInfo, lines: BatchResultLine[], model: string, dryRun: boolean, log: (m: string) => void): Promise<number> {
  let total = 0;
  for (const [m, t] of usageByModel(lines, model)) {
    total += batchUsageUsd(m, t);
    if (dryRun) continue;
    await query(
      `insert into ai_calls (created_at, user_id, purpose, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, latency_ms, ok, error_code)
       select $1::timestamptz, null, 'pregen', $2::varchar, $3::int, $4::int, $5::int, $6::int, 0, true, null
        where not exists (select 1 from ai_calls where purpose = 'pregen' and created_at = $1::timestamptz and model = $2::varchar
                            and input_tokens = $3::int and output_tokens = $4::int)`,
      [batch.ended_at ?? new Date().toISOString(), m.slice(0, 80), t.input_tokens, t.output_tokens, t.cache_read_input_tokens, t.cache_creation_input_tokens]
    ).catch((err) => log(`Could not record the batch's usage in ai_calls (${(err as Error).message.slice(0, 120)}). The cost above is still correct.`));
  }
  return total;
}

function category(reason: string): string {
  return reason.replace(/:.*$/s, "").replace(/\s+/g, " ").trim().slice(0, 40) || "unknown";
}

function tally(failed: { reason: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of failed) out[category(f.reason)] = (out[category(f.reason)] ?? 0) + 1;
  return out;
}

// A held-back lesson is logged by recordHoldback, which prints the claims.
// Claims are model text; the workflow's log carries counts only.
async function quietHoldbackLog<T>(fn: () => Promise<T>): Promise<T> {
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("[item-quality]")) return;
    warn(...args);
  };
  try {
    return await fn();
  } finally {
    console.warn = warn;
  }
}

class NoRetryInBatch extends Error {}

// The batch's output, shaped as the app's generator would have produced it,
// so checkedIntro / checkedPractice can run on it. A request for a second
// attempt (their one retry) is refused: the lesson is then held back and the
// app makes it on first visit.
function batchGenerator(model: string, intro: LessonIntroContent, factCheck: FactChecker, queueExec: LessonGenerator["queueExec"]): LessonGenerator {
  let introCalls = 0;
  return {
    // checkedIntro asks for the first draft (the batch's) and then, if that
    // was held back, for its one retry (refused).
    async intro() {
      if (introCalls++) throw new NoRetryInBatch();
      return intro;
    },
    // checkedPractice is handed the first draft; any call is its retry.
    async practice() {
      throw new NoRetryInBatch();
    },
    model: () => model,
    factCheck,
    queueExec,
  };
}

function pregenFactChecker(): FactChecker {
  const real = makeModelFactChecker();
  return (items, meta) => real(items, { ...meta, purpose: "pregen_fact_check" });
}

// Routes every model call's record to ai_calls AND a tally, so the run can
// report (and stop at) what the live fact-checks really cost.
function installTally() {
  const t = { usd: 0, calls: 0 };
  setAiCallSink(async (r: AiCallRecord) => {
    t.usd += callCostUsd(r.model, r);
    t.calls++;
    await insertAiCallRecord(r);
  });
  return { t, restore: () => setAiCallSink(null) };
}

export async function collectRun(
  opts: { batchId: string; introBatchId?: string; tracks: string[]; maxUsd: number | null; dryRun: boolean; allowConcurrent: boolean },
  ctx: Ctx
): Promise<Summary> {
  const model = getModel();
  const summary: Summary = { mode: "collect", dryRun: opts.dryRun, model, tracks: opts.tracks, maxUsd: opts.maxUsd, batchId: opts.batchId };
  const batch = await ctx.batches.retrieve(opts.batchId);
  summary.batchStatus = batch.processing_status;
  summary.requestCounts = batch.request_counts;
  ctx.log(`Batch ${opts.batchId}: ${batch.processing_status} ${JSON.stringify(batch.request_counts ?? {})}`);
  if (batch.processing_status !== "ended") {
    ctx.log("Not finished yet. Run collect again later.");
    return summary;
  }
  const lines = await readLines(ctx.batches, opts.batchId);
  const batchUsd = await recordBatch(batch, lines, model, opts.dryRun, ctx.log);
  const isPractice = lines.some((l) => parseRequestId(l.custom_id)?.part === "practice");
  summary.stage = isPractice ? "practice" : "intro";
  if (opts.maxUsd === null && !opts.dryRun) throw new Error("collect needs --max-usd (the cap for the rest of the run: the practice batch and the live fact-checks).");
  summary.actualUsd = { batch: round4(batchUsd), factCheck: 0, total: round4(batchUsd) };
  ctx.log(`Batch cost (actual, Batches discount applied): ${usd(batchUsd)}`);
  return isPractice ? collectPractice(opts, ctx, lines, summary, batchUsd) : collectIntro(opts, ctx, batch, lines, summary, batchUsd);
}

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

// Stage 1: the ended intro batch -> checked teaching text -> the practice batch.
async function collectIntro(
  opts: { batchId: string; tracks: string[]; maxUsd: number | null; dryRun: boolean; allowConcurrent: boolean },
  ctx: Ctx,
  batch: BatchInfo,
  lines: BatchResultLine[],
  summary: Summary,
  introUsd: number
): Promise<Summary> {
  const model = getModel();
  const { parsed: rawIntros, failed } = parseHalf(lines, "intro", lessonIntroSchema);
  const intros = new Map<string, LessonIntroContent>();
  let held = 0;
  const liveFailed = [...failed];
  // Still wanted: no lesson since, active, listed, not authored -- in priority order.
  const rows = await selectCandidates({ tracks: opts.tracks, ids: [...rawIntros.keys()] });
  const skipped = rawIntros.size - rows.length;
  await quietHoldbackLog(async () => {
    for (const r of rows) {
      const id = r.objective_id;
      const intro = introFromModel(rawIntros.get(id) as never);
      if (lessonIntroProblems(intro).length) {
        liveFailed.push({ objectiveId: id, reason: "content check" });
        continue;
      }
      if (opts.dryRun) {
        if (lowConfidenceOf(intro)) held++;
        else intros.set(id, intro);
        continue;
      }
      const obj = await loadObjective(id);
      if (!obj || obj.retired || obj.authored) continue;
      try {
        // The app's own check of the writer's doubt (logs the holdback).
        intros.set(id, await checkedIntro(id, obj, { gen: batchGenerator(model, intro, pregenFactChecker(), undefined), meta: {} }));
      } catch (err) {
        if (err instanceof NoRetryInBatch || err instanceof ContentHeldBackError) held++;
        else liveFailed.push({ objectiveId: id, reason: "intro check error" });
      }
    }
  });
  const usable = rows.filter((r) => intros.has(r.objective_id));
  const { priced, dropped } = await price(usable, "practice", model, (id) => intros.get(id)!.teach);
  // The budget left is what the cap allows after the intro batch's real cost.
  const left = opts.maxUsd === null ? null : opts.maxUsd - introUsd;
  const budget = fillBudget(priced, left);
  ctx.log(`Teaching texts: ${rawIntros.size + failed.length} returned, ${priced.length} passed the checks, ${held} held back, ${liveFailed.length} failed, ${skipped + dropped} skipped (no longer eligible or already have a lesson).`);
  ctx.log(left === null ? `Practice batch, upper bound:` : `Practice batch, upper bound against the ${usd(left)} left of ${usd(opts.maxUsd!)}:`);
  for (const l of planLines(budget, left)) ctx.log(l);
  Object.assign(summary, {
    lessons: budget.selected.length,
    requests: budget.selected.length,
    estimateUpperBoundUsd: round4(budget.totalUsd),
    perTrack: budget.perTrack,
    cutoff: budget.cutoff,
    held,
    failed: liveFailed.length,
    skipped: skipped + dropped,
    failedBy: tally(liveFailed),
  } satisfies Partial<Summary>);
  if (!budget.selected.length) {
    ctx.log(budget.cutoff ? "Nothing fits in the remaining budget. No practice batch was created." : "Nothing to continue with. No practice batch was created.");
    return summary;
  }
  const chosen = new Set(budget.selected.map((c) => c.objectiveId));
  const requests = priced
    .filter((p) => chosen.has(p.objectiveId))
    .map((p) => ({ custom_id: requestIds(p.objectiveId).practice, params: plain(practiceParams(model, p.obj, intros.get(p.objectiveId)!.teach)) }));
  const rebuilt = requests.reduce((a, q) => a + batchRequestUpperUsd(model, q.params as Params) + factCheckUpperUsd(model), 0);
  if (left !== null && rebuilt > left * 1.0000001) throw new BudgetError(`Refusing to submit the practice batch: it could cost up to ${usd(rebuilt)}, over the ${usd(left)} left. Nothing was sent.`);
  if (opts.dryRun) {
    ctx.log(`Dry run: built ${requests.length} practice requests, sent nothing, wrote nothing.`);
    return summary;
  }
  if (!opts.allowConcurrent) {
    // The workspace is dedicated to pre-generation: a batch created after the
    // intro batch ended is this step's own earlier run (or another run).
    const newer = (await activeBatches(ctx.batches, batch.ended_at ?? batch.created_at)).filter((b) => b.id !== opts.batchId);
    if (newer.length) throw new Error(`Refusing to start a practice batch: ${newer.length} batch(es) were created after this intro batch ended (${newer.map((b) => b.id).join(", ")}) -- this step may already have run. Collect those, or pass --allow-concurrent. Nothing was sent.`);
  }
  const created = await ctx.batches.create({ requests });
  summary.batchId = created.id;
  summary.introBatchId = opts.batchId;
  ctx.log(`Submitted practice batch ${created.id}: ${requests.length} lessons. When it has ended, collect it with --intro-batch ${opts.batchId}.`);
  return summary;
}

// Stage 2: the ended practice batch + its intro batch -> checked lessons -> saved.
async function collectPractice(
  opts: { batchId: string; introBatchId?: string; tracks: string[]; maxUsd: number | null; dryRun: boolean },
  ctx: Ctx,
  practiceLines: BatchResultLine[],
  summary: Summary,
  practiceUsd: number
): Promise<Summary> {
  const model = getModel();
  if (!opts.introBatchId) throw new Error("This is the practice batch: collect it with --intro-batch <the intro batch id> (the teaching texts live there).");
  summary.introBatchId = opts.introBatchId;
  const introBatch = await ctx.batches.retrieve(opts.introBatchId);
  if (introBatch.processing_status !== "ended") throw new Error(`The intro batch ${opts.introBatchId} is ${introBatch.processing_status}, not ended.`);
  const introLines = await readLines(ctx.batches, opts.introBatchId);
  const introUsd = await recordBatch(introBatch, introLines, model, opts.dryRun, () => {});
  const { lessons, failed } = pairBatchResults(
    [...introLines.filter((l) => parseRequestId(l.custom_id)?.part === "intro"), ...practiceLines.filter((l) => parseRequestId(l.custom_id)?.part === "practice")],
    lessonIntroSchema,
    lessonPracticeSchema
  );
  // Only the objectives whose practice came from this batch (the intro batch
  // has more: those that were held back or cut off are not here).
  const inBatch = new Set(practiceLines.map((l) => parseRequestId(l.custom_id)?.objectiveId).filter(Boolean) as string[]);
  const mine = lessons.filter((l) => inBatch.has(l.objectiveId));
  const myFailed = failed.filter((f) => inBatch.has(f.objectiveId));
  const rows = await selectCandidates({ tracks: opts.tracks, ids: mine.map((l) => l.objectiveId) });
  const order = new Map(rows.map((r, i) => [r.objective_id, i]));
  const ordered = [...mine].sort((a, b) => (order.get(a.objectiveId) ?? 1e9) - (order.get(b.objectiveId) ?? 1e9));

  let saved = 0;
  let kept = 0;
  let held = 0;
  let skipped = 0;
  let stopped = false;
  const liveFailed = [...myFailed];
  const factUpper = factCheckUpperUsd(model);
  const cap = opts.maxUsd;
  const { t, restore } = opts.dryRun ? { t: { usd: 0, calls: 0 }, restore: () => {} } : installTally();
  const checker = pregenFactChecker();
  try {
    await quietHoldbackLog(async () => {
      for (const l of ordered) {
        // Not one in the batch is saved over a lesson that appeared since
        // (a content fix, a learner's visit): a row of any kind wins.
        if (!order.has(l.objectiveId)) {
          // selectCandidates no longer lists it: it has a lesson now, or was
          // retired / hidden since.
          if (await queryOne(`select 1 from lesson_content where objective_id = $1`, [l.objectiveId])) kept++;
          else skipped++;
          continue;
        }
        const obj = await loadObjective(l.objectiveId);
        if (!obj || obj.retired || obj.authored) {
          skipped++;
          continue;
        }
        const intro = introFromModel(l.intro);
        const problems = [...lessonIntroProblems(intro), ...lessonPracticeProblems(l.practice)];
        if (problems.length) {
          liveFailed.push({ objectiveId: l.objectiveId, reason: "content check" });
          continue;
        }
        if (opts.dryRun) continue;
        if (cap !== null && practiceUsd + introUsd + t.usd + factUpper > cap) {
          stopped = true;
          break;
        }
        // The stored answer position is shuffled before the fact-check sees it
        // (REQ-187), as in the app's generator.
        const practice = shufflePractice(l.practice as LessonPracticeContent);
        const gen = batchGenerator(model, intro, checker, queueExecCheck);
        try {
          await checkedIntro(l.objectiveId, obj, { gen, meta: {} });
          const checked = await checkedPractice(l.objectiveId, obj, practice, { shared: true, gen, meta: { teach: intro.teach } });
          // Insert-if-absent, re-checked right before the write (the checks
          // take seconds; saveLesson alone would replace a PULLED lesson).
          if (await queryOne(`select 1 from lesson_content where objective_id = $1`, [l.objectiveId])) {
            kept++;
            continue;
          }
          await saveLesson({ kind: "shared" }, l.objectiveId, { ...intro, ...checked }, model);
          saved++;
        } catch (err) {
          if (err instanceof NoRetryInBatch || err instanceof ContentHeldBackError) held++;
          else liveFailed.push({ objectiveId: l.objectiveId, reason: "save error" });
        }
      }
    });
  } finally {
    restore();
    await flushAiCallLog();
  }
  summary.saved = saved;
  summary.alreadyHadOne = kept;
  summary.held = held;
  summary.failed = liveFailed.length;
  summary.skipped = skipped;
  summary.failedBy = tally(liveFailed);
  summary.stoppedForBudget = stopped;
  summary.actualUsd = { batch: round4(practiceUsd + introUsd), factCheck: round4(t.usd), total: round4(practiceUsd + introUsd + t.usd) };
  if (opts.dryRun) ctx.log(`Dry run: ${ordered.length} lessons returned, ${liveFailed.length} would fail the content check. Nothing was checked by the model or saved.`);
  ctx.log(`Saved ${saved} new lessons; ${kept} already had one and were left alone; ${held} held back for review (npm run items -- list); ${liveFailed.length} failed; ${skipped} skipped (no longer eligible).`);
  if (stopped) ctx.log(`Stopped early: the next fact-check could pass --max-usd. Run collect again with a larger --max-usd to finish, or leave the rest to first visits.`);
  const f = summary.failedBy;
  if (Object.keys(f).length) ctx.log(`Failed by cause: ${Object.entries(f).map(([k, n]) => `${k} ${n}`).join(", ")}. Failed and held lessons are simply still missing; the app generates them on first visit, or run submit again.`);
  ctx.log(`Actual cost: batches ${usd(summary.actualUsd.batch)} + live fact-checks ${usd(summary.actualUsd.factCheck)} = ${usd(summary.actualUsd.total)}`);
  return summary;
}
