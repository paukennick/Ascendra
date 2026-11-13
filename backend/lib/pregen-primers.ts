// REQ-253: pre-generate lesson primers ("Key terms") through the Message
// Batches API, the `primers` mode of scripts/pregenerate.ts and the
// "Pre-generate lessons" workflow (content: primers). Same rules as lesson
// pre-generation (lib/pregen.ts):
//
//   submit   one batch request per eligible objective (a shared catalog
//            track, listed, active, with a servable shared lesson and NO
//            primer yet), in --tracks priority order, whole units, never past
//            --max-usd (an UPPER bound that names every call a primer can
//            make: the batch request, one live steered retry, and two live
//            fact-checks -- the first draft's and the retry's; REQ-248).
//   collect  the ended batch -> the app's own checks (checkedPrimer: hard
//            checks, the writer's doubt, the plain-language lint, the
//            fact-check, one steered retry as a LIVE call `pregen_retry`
//            inside --max-usd) -> insert-if-absent. A primer whose lesson
//            changed since the submit is skipped (it would be stale at once);
//            its first learner visit writes it.
//
// Never printed or put in the summary: prompts, lesson text, terms, claims.
// Counts, ids, the estimate, problem KINDS (problemKind: quoted text and
// numbers removed) and batch ids only.

import { query, queryOne } from "@/lib/db";
import { isActive } from "@/lib/progress-sql";
import { buildRequest, getModel } from "@/lib/anthropic";
import { estimateTokens, priceFor } from "@/lib/ai-pricing";
import { effectiveMaxTokens } from "@/lib/anthropic";
import { factCheckCallText, factCheckMaxTokens, type CheckItem } from "@/lib/fact-check";
import { lessonServableSql } from "@/lib/item-quality";
import { getServableSharedLesson } from "@/lib/lesson-store";
import { loadObjective, type ObjectiveRow } from "@/lib/lesson-generation";
import { InvalidContentError } from "@/lib/content-validator";
import { FactCheckUnavailableError, HeldForAccuracyError } from "@/lib/generation-gate";
import { flushAiCallLog } from "@/lib/ai-calls";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  checkedPrimer,
  insertPrimerIfAbsent,
  lessonHash,
  modelPrimerWriter,
  primerFromModel,
  primerHardProblems,
  primerLint,
  primerPrompt,
  primerSchema,
  primerSourceOf,
  technicalTerms,
  PrimerRetryRefused,
  PRIMER_HARD_MAX,
  PRIMER_LIMITS,
  PRIMER_MAX_TOKENS,
  type PrimerContent,
  type PrimerSource,
  type PrimerWriter,
} from "@/lib/primers";
import {
  activeBatches,
  checkTracks,
  countKinds,
  installTally,
  liveRequestUpperUsd,
  pregenFactChecker,
  quietHoldbackLog,
  readLines,
  recordBatch,
  round4,
  tally,
  type BatchesClient,
  type Summary,
} from "@/lib/pregen";
import {
  BudgetError,
  SCHEMA_OVERHEAD_TOKENS,
  batchRequestUpperUsd,
  fillBudget,
  planLines,
  usd,
  type BatchResultLine,
  type BudgetPlan,
  type Candidate,
} from "../scripts/pregenerate-lib";

export interface PrimerCtx {
  batches: BatchesClient;
  log: (message: string) => void;
  // Who writes the one steered retry; the live model by default (purpose pregen_retry).
  retryWriter?: PrimerWriter;
}

// ---------------------------------------------------------------------------
// Request ids
// ---------------------------------------------------------------------------

export function primerRequestId(objectiveId: string): string {
  return `${objectiveId}_primer`;
}

export function parsePrimerRequestId(customId: string): string | null {
  const m = /^([0-9a-f-]{36})_primer$/i.exec(customId);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

export interface PrimerRow {
  objective_id: string;
  track_code: string;
  unit_id: string;
  unit_title: string;
}

// The lesson pre-generation rules (lib/pregen.ts selectCandidates) with the
// lesson condition turned round: a SERVABLE shared lesson exists (a primer is
// written from it; a pulled lesson is about to be replaced) and no primer row
// at all. A stale primer (its lesson changed) is left to its next use.
export async function selectPrimerCandidates(opts: { tracks: string[]; limit?: number | null; ids?: string[] }): Promise<PrimerRow[]> {
  const rows = await query<PrimerRow>(
    `select o.id as objective_id, st.code as track_code, cu.id as unit_id, cu.title as unit_title
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       join lesson_content lc on lc.objective_id = o.id
      where st.user_id is null
        and (st.hidden_at is null or st.hidden_at > now())
        and ${isActive("cu")} and ${isActive("o")}
        and ${lessonServableSql("lc")}
        and not exists (select 1 from lesson_primers lp where lp.objective_id = o.id)
        and ($1::text[] is null or upper(st.code) = any($1::text[]))
        and ($2::uuid[] is null or o.id = any($2::uuid[]))
      order by case when $1::text[] is null then 0 else coalesce(array_position($1::text[], upper(st.code)), 0) end,
               st.code, cu.sort_order, cu.id, o.sort_order, o.id`,
    [opts.tracks.length ? opts.tracks.map((t) => t.toUpperCase()) : null, opts.ids?.length ? opts.ids : null]
  );
  return opts.limit ? rows.slice(0, Math.floor(opts.limit)) : rows;
}

// ---------------------------------------------------------------------------
// Requests and prices
// ---------------------------------------------------------------------------

type Params = Record<string, unknown> & { max_tokens: number; system: unknown; messages: unknown };

export function primerParams(model: string, obj: ObjectiveRow, source: PrimerSource): Params {
  const required = technicalTerms(source, { objectiveTitle: obj.title, trackTitle: obj.track_title }).required;
  const { system, user } = primerPrompt({ obj, source, required });
  return buildRequest(
    { model, purpose: "pregen_primer", system, messages: [{ role: "user", content: user }], maxTokens: PRIMER_MAX_TOKENS, effort: "medium", thinking: "off", userId: null },
    zodOutputFormat(primerSchema)
  ) as Params;
}

// The live fact-check of one primer, worst case: PRIMER_HARD_MAX terms with
// every field at its limit, output at max_tokens with the checker's thinking.
export function primerFactCheckUpperUsd(model: string): number {
  const item = (i: number): CheckItem => ({
    key: `term_${i}`,
    objectiveTitle: "t".repeat(200),
    question: "q".repeat(PRIMER_LIMITS.term + PRIMER_LIMITS.plain + PRIMER_LIMITS.example + PRIMER_LIMITS.examWording + 300),
    format: "single",
    options: ["Yes: all three are accurate", "No: at least one is wrong or misleading"],
    expected: [0],
  });
  const items = Array.from({ length: PRIMER_HARD_MAX }, (_, i) => item(i));
  const inTok = estimateTokens(factCheckCallText(items)) + SCHEMA_OVERHEAD_TOKENS;
  const outTok = effectiveMaxTokens(model, factCheckMaxTokens(items.length), "default");
  const p = priceFor(model);
  return (inTok * p.input + outTok * p.output) / 1e6;
}

// Every call one primer can make, worst case: the batch request, one live
// steered retry, two live fact-checks.
export function primerUpperUsd(model: string, params: Params): number {
  return batchRequestUpperUsd(model, params) + liveRequestUpperUsd(model, params) + 2 * primerFactCheckUpperUsd(model);
}

// What it will typically cost (an estimate for the report, not the cap):
// the batch request at its estimated input and about 900 output tokens, and
// one live fact-check of about 8 items (about 2,000 in, 1,500 out with thinking).
export function primerTypicalUsd(model: string, params: Params): number {
  const p = priceFor(model);
  const batchIn = estimateTokens(JSON.stringify({ system: params.system, messages: params.messages })) + SCHEMA_OVERHEAD_TOKENS;
  const batch = ((batchIn * p.input + 900 * p.output) / 1e6) * 0.5;
  const check = (2000 * p.input + 1500 * p.output) / 1e6;
  return batch + check;
}

interface Priced extends Candidate {
  obj: ObjectiveRow;
  source: PrimerSource;
  params: Params;
}

async function price(rows: PrimerRow[], model: string): Promise<{ priced: Priced[]; dropped: number; typicalUsd: number }> {
  const priced: Priced[] = [];
  let dropped = 0;
  let typicalUsd = 0;
  for (const r of rows) {
    const [obj, lesson] = await Promise.all([loadObjective(r.objective_id), getServableSharedLesson(r.objective_id)]);
    if (!obj || obj.retired || !lesson) {
      dropped++;
      continue;
    }
    const source = primerSourceOf(lesson);
    const params = primerParams(model, obj, source);
    typicalUsd += primerTypicalUsd(model, params);
    priced.push({ objectiveId: r.objective_id, trackCode: r.track_code.toUpperCase(), unitId: r.unit_id, unitTitle: r.unit_title, usd: primerUpperUsd(model, params), obj, source, params });
  }
  return { priced, dropped, typicalUsd };
}

const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// Estimate and submit
// ---------------------------------------------------------------------------

async function planPrimers(opts: { tracks: string[]; limit: number | null; maxUsd: number | null }, log: (m: string) => void) {
  const model = getModel();
  await checkTracks(opts.tracks, log);
  const rows = await selectPrimerCandidates({ tracks: opts.tracks, limit: opts.limit });
  const { priced, dropped, typicalUsd } = await price(rows, model);
  const budget: BudgetPlan = fillBudget(priced, opts.maxUsd);
  const summary: Summary = {
    mode: "estimate",
    kind: "primers",
    dryRun: false,
    model,
    tracks: opts.tracks,
    maxUsd: opts.maxUsd,
    estimateUpperBoundUsd: round4(budget.totalUsd),
    lessons: budget.selected.length,
    requests: budget.selected.length,
    perTrack: budget.perTrack,
    cutoff: budget.cutoff,
  };
  return { model, priced, dropped, budget, summary, typicalUsd };
}

function printPlan(r: Awaited<ReturnType<typeof planPrimers>>, maxUsd: number | null, log: (m: string) => void) {
  log(`Model: ${r.model}. Each primer is 1 batch request plus one live fact-check when it is saved, and at most one live steered retry with its own fact-check.`);
  log(`Upper bound (what --max-usd is checked against: every request at its max output, the retry and both fact-checks at the live price):`);
  for (const l of planLines(r.budget, maxUsd)) log(l.replace(/ lessons/g, " primers"));
  log(`Typical cost for the same primers (estimate): ${usd(r.typicalUsd)} in all, ${usd(r.priced.length ? r.typicalUsd / r.priced.length : 0)} each.`);
  if (r.dropped) log(`  (${r.dropped} objectives left out: retired, or their lesson is gone.)`);
}

export async function estimatePrimersRun(opts: { tracks: string[]; limit: number | null; maxUsd: number | null }, ctx: Pick<PrimerCtx, "log">): Promise<Summary> {
  const r = await planPrimers(opts, ctx.log);
  ctx.log(`Objectives with a lesson and no primer${opts.tracks.length ? ` (tracks ${opts.tracks.join(", ")})` : ""}: ${r.priced.length}`);
  printPlan(r, opts.maxUsd, ctx.log);
  ctx.log(`Nothing was sent. Add --submit (with --tracks and --max-usd) to create the batch.`);
  return r.summary;
}

export async function submitPrimersRun(
  opts: { tracks: string[]; limit: number | null; maxUsd: number; dryRun: boolean; allowConcurrent: boolean },
  ctx: PrimerCtx
): Promise<Summary> {
  const r = await planPrimers(opts, ctx.log);
  ctx.log(`Objectives to consider: ${r.priced.length} in ${opts.tracks.join(" > ")}`);
  printPlan(r, opts.maxUsd, ctx.log);
  const summary: Summary = { ...r.summary, mode: "submit", dryRun: opts.dryRun };
  if (!r.priced.length) {
    ctx.log("Every requested objective already has a primer (or has no lesson yet, or is retired or hidden). Nothing to submit.");
    return summary;
  }
  if (!r.budget.selected.length) {
    throw new BudgetError(`Refusing to submit: the first unit alone (${r.budget.cutoff?.unitObjectives} primers, up to ${usd(r.budget.cutoff?.unitUsd ?? 0)}) is over --max-usd ${usd(opts.maxUsd)}. Nothing was sent.`);
  }
  const chosen = new Set(r.budget.selected.map((c) => c.objectiveId));
  const picked = r.priced.filter((p) => chosen.has(p.objectiveId));
  const requests = picked.map((p) => ({ custom_id: primerRequestId(p.objectiveId), params: plain(p.params) }));
  // Belt and braces: the cap again, from the requests actually built.
  const rebuilt = requests.reduce((a, q) => a + primerUpperUsd(r.model, q.params as Params), 0);
  if (rebuilt > opts.maxUsd * 1.0000001) throw new BudgetError(`Refusing to submit: the built requests could cost up to ${usd(rebuilt)}, over --max-usd ${usd(opts.maxUsd)}. Nothing was sent.`);
  summary.requests = requests.length;
  if (opts.dryRun) {
    ctx.log(`Dry run: built ${requests.length} primer requests, sent nothing, wrote nothing.`);
    return summary;
  }
  if (!opts.allowConcurrent) {
    const running = await activeBatches(ctx.batches);
    if (running.length) throw new Error(`Refusing to submit: ${running.length} batch(es) in this workspace are still running (${running.map((b) => b.id).join(", ")}). Collect them first, or pass --allow-concurrent. Nothing was sent.`);
  }
  const batch = await ctx.batches.create({ requests });
  summary.batchId = batch.id;
  ctx.log(`Submitted primer batch ${batch.id}: ${requests.length} primers. Most batches finish within an hour; then collect it with --primers --collect ${batch.id}.`);
  return summary;
}

// ---------------------------------------------------------------------------
// Collect
// ---------------------------------------------------------------------------

function parseLine(line: BatchResultLine): { objectiveId: string; draft?: PrimerContent; failure?: string } | null {
  const objectiveId = parsePrimerRequestId(line.custom_id);
  if (!objectiveId) return null;
  if (line.result.type !== "succeeded") return { objectiveId, failure: `primer ${line.result.type}` };
  if (line.result.message.stop_reason === "max_tokens") return { objectiveId, failure: "primer hit max_tokens" };
  const text = line.result.message.content.find((b) => b.type === "text")?.text;
  if (!text) return { objectiveId, failure: "primer had no text" };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { objectiveId, failure: "primer was not JSON" };
  }
  const r = primerSchema.safeParse(json);
  if (!r.success) return { objectiveId, failure: "primer failed schema" };
  return { objectiveId, draft: primerFromModel(r.data) };
}

export async function collectPrimersRun(
  opts: { batchId: string; tracks: string[]; maxUsd: number | null; dryRun: boolean },
  ctx: PrimerCtx
): Promise<Summary> {
  const model = getModel();
  const summary: Summary = { mode: "collect", kind: "primers", dryRun: opts.dryRun, model, tracks: opts.tracks, maxUsd: opts.maxUsd, batchId: opts.batchId };
  const batch = await ctx.batches.retrieve(opts.batchId);
  summary.batchStatus = batch.processing_status;
  summary.requestCounts = batch.request_counts;
  ctx.log(`Batch ${opts.batchId}: ${batch.processing_status} ${JSON.stringify(batch.request_counts ?? {})}`);
  if (batch.processing_status !== "ended") {
    ctx.log("Not finished yet. Run collect again later.");
    return summary;
  }
  if (opts.maxUsd === null && !opts.dryRun) throw new Error("collect needs --max-usd (the cap for the live fact-checks and retries).");
  const lines = await readLines(ctx.batches, opts.batchId);
  if (lines.some((l) => !parsePrimerRequestId(l.custom_id))) throw new Error("This is not a primer batch: collect it without --primers.");
  const batchUsd = await recordBatch(batch, lines, model, opts.dryRun, ctx.log, "pregen_primer");
  ctx.log(`Batch cost (actual, Batches discount applied): ${usd(batchUsd)}`);

  const parsed = lines.map(parseLine).filter((x): x is NonNullable<typeof x> => !!x);
  const liveFailed: { objectiveId: string; reason: string }[] = parsed.filter((p) => p.failure).map((p) => ({ objectiveId: p.objectiveId, reason: p.failure! }));
  const drafts = parsed.filter((p) => p.draft);
  // Still eligible (active, listed, a servable lesson, no primer since), in priority order.
  const rows = await selectPrimerCandidates({ tracks: opts.tracks, ids: drafts.map((d) => d.objectiveId) });
  const order = new Map(rows.map((r, i) => [r.objective_id, i]));
  const ordered = [...drafts].sort((a, b) => (order.get(a.objectiveId) ?? 1e9) - (order.get(b.objectiveId) ?? 1e9));

  const c = { saved: 0, kept: 0, held: 0, skipped: 0, lessonChanged: 0, retried: 0, savedAfterRetry: 0, heldAfterRetry: 0, notRetried: 0, servedWithStyle: 0, wouldRetry: 0 };
  let stopped = false;
  const problemKinds: Record<string, number> = {};
  const styleKinds: Record<string, number> = {};
  const factUpper = primerFactCheckUpperUsd(model);
  const writer = ctx.retryWriter ?? modelPrimerWriter({ userId: null, purpose: "pregen_retry" });
  const checker = pregenFactChecker();
  const { t, restore } = opts.dryRun ? { t: { usd: 0, calls: 0 }, restore: () => {} } : installTally();
  try {
    await quietHoldbackLog(async () => {
      for (const d of ordered) {
        const id = d.objectiveId;
        if (!order.has(id)) {
          if (await queryOne(`select 1 from lesson_primers where objective_id = $1`, [id])) c.kept++;
          else c.skipped++;
          continue;
        }
        const [obj, lesson] = await Promise.all([loadObjective(id), getServableSharedLesson(id)]);
        if (!obj || obj.retired || !lesson) {
          c.skipped++;
          continue;
        }
        const source = primerSourceOf(lesson);
        const hash = lessonHash(source);
        const pctx = { objectiveTitle: obj.title, trackTitle: obj.track_title };
        const hard = primerHardProblems(d.draft!, source, pctx);
        const lint = primerLint(d.draft!, source, pctx);
        if (hard.length) countKinds(problemKinds, hard);
        else if (lint.length) countKinds(styleKinds, lint);
        if (opts.dryRun) {
          if (hard.length || lint.length) c.wouldRetry++;
          continue;
        }
        // The first fact-check, at its worst case, must fit.
        if (opts.maxUsd !== null && batchUsd + t.usd + factUpper > opts.maxUsd) {
          stopped = true;
          break;
        }
        const retryUpper = liveRequestUpperUsd(model, primerParams(model, obj, source)) + 2 * factUpper;
        let retriedThis = false;
        try {
          const out = await checkedPrimer(id, obj, source, {
            write: async (input) => {
              retriedThis = true;
              c.retried++;
              return writer(input);
            },
            factCheck: checker,
            model,
            userId: null,
            checkPurpose: "pregen_fact_check",
            log: (m) => ctx.log(m.replace(/"[^"]*"/g, '"…"')),
            allowRetry: () => opts.maxUsd === null || batchUsd + t.usd + retryUpper <= opts.maxUsd,
          }, d.draft);
          if (out.styleFindings.length) c.servedWithStyle++;
          // Insert-if-absent, against the lesson as it is right now.
          const now = await getServableSharedLesson(id);
          if (!now || lessonHash(primerSourceOf(now)) !== hash) {
            c.lessonChanged++;
            continue;
          }
          if (await insertPrimerIfAbsent(id, out.primer, hash, model)) {
            c.saved++;
            if (out.retried) c.savedAfterRetry++;
          } else c.kept++;
        } catch (err) {
          // The retry the cap cannot cover is not made: the primer is written on first use.
          if (err instanceof PrimerRetryRefused) c.notRetried++;
          else if (err instanceof HeldForAccuracyError) {
            c.held++;
            if (retriedThis) c.heldAfterRetry++;
          } else if (err instanceof InvalidContentError) {
            countKinds(problemKinds, err.problems);
            liveFailed.push({ objectiveId: id, reason: "content check" });
          } else if (err instanceof FactCheckUnavailableError) liveFailed.push({ objectiveId: id, reason: "fact-check did not run" });
          else liveFailed.push({ objectiveId: id, reason: retriedThis ? "retry call failed" : "save error" });
        }
      }
    });
  } finally {
    restore();
    await flushAiCallLog();
  }
  Object.assign(summary, {
    lessons: ordered.length,
    saved: c.saved,
    alreadyHadOne: c.kept,
    held: c.held,
    failed: liveFailed.length,
    skipped: c.skipped + c.lessonChanged,
    lessonChanged: c.lessonChanged,
    failedBy: tally(liveFailed),
    problemKinds,
    styleFindingKinds: styleKinds,
    stoppedForBudget: stopped,
    retried: c.retried,
    savedAfterRetry: c.savedAfterRetry,
    heldAfterRetry: c.heldAfterRetry,
    notRetriedForBudget: c.notRetried,
    servedWithStyleFindings: c.servedWithStyle,
    ...(opts.dryRun ? { wouldStyleRetry: c.wouldRetry } : {}),
    actualUsd: { batch: round4(batchUsd), factCheck: round4(t.usd), total: round4(batchUsd + t.usd) },
  } satisfies Partial<Summary>);
  if (opts.dryRun) ctx.log(`Dry run: ${ordered.length} primers returned, ${c.wouldRetry} would get a steered retry. Nothing was checked by the model or saved.`);
  ctx.log(
    `Saved ${c.saved} primers; ${c.kept} already had one; ${c.held} held back for review; ${liveFailed.length} failed; ${c.skipped} skipped (no longer eligible); ${c.lessonChanged} skipped because their lesson changed since the submit.`
  );
  if (c.retried || c.notRetried) ctx.log(`Steered retries (live): ${c.retried} made, ${c.savedAfterRetry} saved after the retry, ${c.heldAfterRetry} held again, ${c.notRetried} not made (budget).`);
  if (stopped) ctx.log(`Stopped early: the next fact-check could pass --max-usd. Run collect again with a larger --max-usd, or leave the rest to first use.`);
  const kinds = Object.entries(problemKinds).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (kinds.length) ctx.log(`Content-check problems (primers with each): ${kinds.map(([k, n]) => `${n} x ${k}`).join(" | ")}`);
  const style = Object.entries(styleKinds).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (style.length) ctx.log(`Plain-language findings on first drafts (primers with each): ${style.map(([k, n]) => `${n} x ${k}`).join(" | ")}`);
  const f = summary.failedBy ?? {};
  if (Object.keys(f).length) ctx.log(`Failed by cause: ${Object.entries(f).map(([k, n]) => `${k} ${n}`).join(", ")}. Failed and held primers are written on first use.`);
  ctx.log(`Actual cost: batch ${usd(summary.actualUsd!.batch)} + live calls ${usd(summary.actualUsd!.factCheck)} = ${usd(summary.actualUsd!.total)}`);
  return summary;
}
