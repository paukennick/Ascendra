import { AsyncLocalStorage } from "node:async_hooks";
import { setAiCallSink, type AiCallRecord } from "@/lib/ai-calls";
import { getFastModel, getModel, type ThinkingMode } from "@/lib/anthropic";
import type { CoachContext } from "@/lib/coach-context";
import { factCheckCallText, factCheckMaxTokens, makeModelFactChecker, type CheckItem, type CheckVerdict, type FactChecker } from "@/lib/fact-check";
import { BudgetStop, estimateCall, type RunBudget } from "@/lib/run-budget";
import { callCostUsd } from "@/lib/ai-pricing";
import { verifyByExecution, DEFAULT_RUN_LIMITS, type CodeRunner, type VerifySnippet } from "@/lib/verify-execution";

// REQ-196 (Nick, 2026-11-09: "Run simulations in the sandbox to determine
// the fact checker needs"): which fact-checker does Ascendra need, per
// subject family?
//
// A labelled set from the 2026-11-09 content audit
// (lib/fixtures/factcheck-eval-set.json): known-bad items (keys and claims
// the audit confirmed wrong) and an equal number of known-good ones. Each
// checker VARIANT answers every item without its key, exactly as the
// production gate does (lib/fact-check.ts, one item per call), and an item
// counts as caught when the gate would hold it back. The "+exec" variants
// add sandboxed verify-by-execution (lib/sandbox-runner.ts) for the items
// that carry a program: held if the model holds it OR the program's output
// disagrees with the key. Execution costs no model call.
//
// Per variant, overall and per family: recall on known-bad (catch rate),
// false-hold rate on known-good, cost per check and per 1,000 checks, and
// latency. The recommendation rule picks, per family, the cheapest variant
// with recall >= 95% and false holds <= 5%.
//
// Runs only in GitHub Actions ("Fact-checker eval" workflow, manual) or
// with --mock locally; never in the request path. Every call is reserved
// against the run's budget before it starts (lib/run-budget.ts).

export type Family = "it" | "cloud" | "clinical" | "academic" | "pm";

export interface EvalItem {
  id: string;
  label: "bad" | "good";
  family: Family;
  track: string;
  provenance: string;
  finding: string;
  why: string;
  objectiveTitle: string;
  question: string;
  options: string[];
  expected: number[];
  snippet?: VerifySnippet;
}

export interface ModelVariant {
  id: string;
  label: string;
  model: string;
  thinking: ThinkingMode;
}

// Only model ids the app already uses (lib/anthropic.ts getModel /
// getFastModel), so the eval measures what production could switch to.
export function modelVariants(): ModelVariant[] {
  const fast = getFastModel();
  const writer = getModel();
  return [
    { id: "haiku", label: `${fast}, no thinking`, model: fast, thinking: "off" },
    { id: "haiku+think", label: `${fast}, thinking`, model: fast, thinking: "default" },
    { id: "sonnet", label: `${writer}, no thinking`, model: writer, thinking: "off" },
    { id: "sonnet+think", label: `${writer}, thinking (production gate)`, model: writer, thinking: "default" },
  ];
}

export function parseEvalSet(raw: unknown): EvalItem[] {
  const items = (raw as { items?: unknown })?.items;
  if (!Array.isArray(items) || !items.length) throw new Error("eval set has no items");
  for (const it of items as EvalItem[]) {
    if (!it.id || (it.label !== "bad" && it.label !== "good")) throw new Error(`item ${it.id}: bad label`);
    if (!Array.isArray(it.options) || it.options.length < 2) throw new Error(`item ${it.id}: options`);
    if (!Array.isArray(it.expected) || !it.expected.every((n) => Number.isInteger(n) && n >= 0 && n < it.options.length)) throw new Error(`item ${it.id}: expected`);
  }
  return items as EvalItem[];
}

export function toCheckItem(it: EvalItem): CheckItem {
  return { key: "i1", objectiveTitle: it.objectiveTitle, question: it.question, format: "single", options: it.options, expected: it.expected };
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

export interface CallResult {
  itemId: string;
  variant: string;
  held: boolean; // what the production gate would do (a failed call holds: fail closed)
  outcome: CheckVerdict["outcome"] | "error";
  answer: number[] | null;
  claims: string[];
  latencyMs: number;
  usd: number;
  error?: string;
}

export interface ExecResult {
  itemId: string;
  ran: boolean;
  agreed: boolean | null;
  detail: string;
}

export interface EvalPlan {
  calls: number;
  perVariant: Record<string, { calls: number; typicalUsd: number; upperUsd: number }>;
  typicalUsd: number;
  upperUsd: number;
}

export interface RunDeps {
  items: EvalItem[];
  variants: ModelVariant[];
  budget: RunBudget;
  checkerFor?: (v: ModelVariant) => FactChecker;
  ctxFor?: (track: string) => Promise<CoachContext | undefined>;
  runner?: CodeRunner | null; // null: no execution variants
  concurrency?: number;
  log?: (m: string) => void;
}

export async function planEval(deps: Pick<RunDeps, "items" | "variants" | "ctxFor">): Promise<EvalPlan> {
  const plan: EvalPlan = { calls: 0, perVariant: {}, typicalUsd: 0, upperUsd: 0 };
  for (const v of deps.variants) plan.perVariant[v.id] = { calls: 0, typicalUsd: 0, upperUsd: 0 };
  for (const it of deps.items) {
    const ctx = await deps.ctxFor?.(it.track);
    const text = factCheckCallText([toCheckItem(it)], ctx);
    for (const v of deps.variants) {
      const e = estimateCall({ model: v.model, promptText: text, maxTokens: factCheckMaxTokens(1), thinking: v.thinking, items: 1 });
      const p = plan.perVariant[v.id];
      p.calls++;
      p.typicalUsd += e.typicalUsd;
      p.upperUsd += e.upperUsd;
      plan.calls++;
      plan.typicalUsd += e.typicalUsd;
      plan.upperUsd += e.upperUsd;
    }
  }
  return plan;
}

const lane = new AsyncLocalStorage<AiCallRecord[]>();

// Every model call's usage goes to the budget and to the call that made it.
export function installEvalSink(budget: RunBudget): void {
  delete process.env.AI_CALL_LOG;
  setAiCallSink(async (r) => {
    budget.add(r);
    lane.getStore()?.push(r);
  });
}

async function mapLimit<T>(items: T[], n: number, fn: (t: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
      while (next < items.length) await fn(items[next++]);
    })
  );
}

export interface EvalRun {
  calls: CallResult[];
  exec: ExecResult[];
  execAvailable: boolean | null; // null: execution not requested
  stoppedAtBudget: string | null;
}

export async function runEval(deps: RunDeps): Promise<EvalRun> {
  const log = deps.log ?? (() => {});
  const checkerFor = deps.checkerFor ?? ((v: ModelVariant) => makeModelFactChecker({ model: v.model, thinking: v.thinking }));
  const out: EvalRun = { calls: [], exec: [], execAvailable: deps.runner ? true : null, stoppedAtBudget: null };

  // Execution first: free, and it decides whether the +exec rows exist.
  if (deps.runner) {
    for (const it of deps.items.filter((i) => i.snippet)) {
      const r = await verifyByExecution(it.snippet, deps.runner, DEFAULT_RUN_LIMITS);
      if (!r.ran && r.detail === "no sandbox") {
        out.execAvailable = false;
        out.exec = [];
        log("sandbox unavailable: the +exec variants are not reported");
        break;
      }
      out.exec.push({ itemId: it.id, ran: r.ran, agreed: r.agreed, detail: r.detail });
    }
  }

  // Round-robin by item, so a run that stops at the budget still has every
  // variant on the same items.
  const ctxCache = new Map<string, CoachContext | undefined>();
  const tasks: { it: EvalItem; v: ModelVariant }[] = [];
  for (const it of deps.items) for (const v of deps.variants) tasks.push({ it, v });
  let stopped = false;
  await mapLimit(tasks, deps.concurrency ?? 4, async ({ it, v }) => {
    if (stopped) return;
    if (!ctxCache.has(it.track)) ctxCache.set(it.track, await deps.ctxFor?.(it.track));
    const ctx = ctxCache.get(it.track);
    const ci = toCheckItem(it);
    const est = estimateCall({ model: v.model, promptText: factCheckCallText([ci], ctx), maxTokens: factCheckMaxTokens(1), thinking: v.thinking, items: 1 });
    try {
      deps.budget.reserve(est.upperUsd);
    } catch (err) {
      if (!(err instanceof BudgetStop)) throw err;
      if (!stopped) {
        stopped = true;
        out.stoppedAtBudget = err.message;
        log(err.message);
      }
      return;
    }
    // Hold the reservation until the call reports its real usage.
    deps.budget.spentUsd += est.upperUsd;
    const records: AiCallRecord[] = [];
    const started = Date.now();
    let verdict: CheckVerdict | undefined;
    let error: string | undefined;
    try {
      [verdict] = await lane.run(records, () => checkerFor(v)([ci], { ctx, purpose: "eval_factcheck" }));
    } catch (e) {
      error = (e as Error)?.message?.slice(0, 200) ?? "check failed";
    }
    deps.budget.spentUsd -= est.upperUsd;
    const latencyMs = Date.now() - started;
    const usd = records.reduce((s, r) => s + callCostUsd(r.model, r), 0);
    out.calls.push({
      itemId: it.id,
      variant: v.id,
      held: error ? true : !verdict?.publish,
      outcome: error ? "error" : verdict?.outcome ?? "missing",
      answer: verdict?.answer ?? null,
      claims: verdict?.unsupportedClaims ?? [],
      latencyMs,
      usd,
      ...(error ? { error } : {}),
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface Rate {
  k: number;
  n: number;
  rate: number | null; // null when n = 0
  low: number | null; // Wilson 95% interval
  high: number | null;
}

export function wilson(k: number, n: number): Rate {
  if (n === 0) return { k, n, rate: null, low: null, high: null };
  const z = 1.959964;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { k, n, rate: p, low: Math.max(0, c - h), high: Math.min(1, c + h) };
}

export interface VariantMetrics {
  variant: string;
  recall: Rate; // known-bad held
  falseHold: Rate; // known-good held
  errors: number;
  checks: number;
  usdPerCheck: number | null;
  usdPer1000: number | null;
  latencyMs: { mean: number | null; p50: number | null; p95: number | null };
  // items the variant missed (bad, served) and wrongly held (good)
  missed: string[];
  wronglyHeld: string[];
}

function pct(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function variantIds(variants: ModelVariant[], execRows: boolean): string[] {
  return variants.flatMap((v) => (execRows ? [v.id, `${v.id}+exec`] : [v.id]));
}

export function score(items: EvalItem[], variants: ModelVariant[], run: EvalRun, family?: Family): VariantMetrics[] {
  const scope = items.filter((i) => !family || i.family === family);
  const byId = new Map(scope.map((i) => [i.id, i]));
  const exec = new Map(run.exec.map((e) => [e.itemId, e]));
  const out: VariantMetrics[] = [];
  for (const id of variantIds(variants, run.execAvailable === true)) {
    const base = id.replace(/\+exec$/, "");
    const withExec = id.endsWith("+exec");
    const rows = run.calls.filter((c) => c.variant === base && byId.has(c.itemId));
    const held = (c: CallResult) => {
      if (c.held) return true;
      if (!withExec) return false;
      const e = exec.get(c.itemId);
      return !!e && e.ran && e.agreed === false;
    };
    const bad = rows.filter((c) => byId.get(c.itemId)!.label === "bad");
    const good = rows.filter((c) => byId.get(c.itemId)!.label === "good");
    const lat = rows.map((c) => c.latencyMs).sort((a, b) => a - b);
    const usd = rows.reduce((s, c) => s + c.usd, 0);
    out.push({
      variant: id,
      recall: wilson(bad.filter(held).length, bad.length),
      falseHold: wilson(good.filter(held).length, good.length),
      errors: rows.filter((c) => c.outcome === "error").length,
      checks: rows.length,
      usdPerCheck: rows.length ? usd / rows.length : null,
      usdPer1000: rows.length ? (usd / rows.length) * 1000 : null,
      latencyMs: { mean: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null, p50: pct(lat, 0.5), p95: pct(lat, 0.95) },
      missed: bad.filter((c) => !held(c)).map((c) => c.itemId),
      wronglyHeld: good.filter(held).map((c) => c.itemId),
    });
  }
  return out;
}

export interface Rule {
  minRecall: number;
  maxFalseHold: number;
}
export const DEFAULT_RULE: Rule = { minRecall: 0.95, maxFalseHold: 0.05 };

export interface Recommendation {
  scope: string;
  variant: string | null;
  meetsBar: boolean;
  reason: string;
  smallSample: boolean;
}

// The cheapest variant that meets the bar (recall >= minRecall on the
// known-bad items, false holds <= maxFalseHold on the known-good ones);
// ties go to the faster one. If none meets it, the one with the best recall
// (then fewest false holds, then cheapest), flagged: no checker alone is
// enough there, so keep human review in front of that family's content.
export function recommend(scope: string, metrics: VariantMetrics[], rule: Rule = DEFAULT_RULE): Recommendation {
  const usable = metrics.filter((m) => m.recall.rate !== null && m.checks > 0);
  const smallSample = usable.length ? usable[0].recall.n < 10 || (usable[0].falseHold.n ?? 0) < 10 : true;
  if (!usable.length) return { scope, variant: null, meetsBar: false, reason: "no known-bad items scored in this scope", smallSample };
  const fh = (m: VariantMetrics) => m.falseHold.rate ?? 0;
  const cost = (m: VariantMetrics) => m.usdPer1000 ?? Infinity;
  const ok = usable.filter((m) => m.recall.rate! >= rule.minRecall && fh(m) <= rule.maxFalseHold);
  if (ok.length) {
    ok.sort((a, b) => cost(a) - cost(b) || (a.latencyMs.p50 ?? 0) - (b.latencyMs.p50 ?? 0));
    const m = ok[0];
    return {
      scope,
      variant: m.variant,
      meetsBar: true,
      reason: `cheapest meeting recall >= ${rule.minRecall * 100}% and false holds <= ${rule.maxFalseHold * 100}%: recall ${fmtRate(m.recall)}, false holds ${fmtRate(m.falseHold)}, $${(m.usdPer1000 ?? 0).toFixed(2)} per 1,000 checks`,
      smallSample,
    };
  }
  const best = [...usable].sort((a, b) => b.recall.rate! - a.recall.rate! || fh(a) - fh(b) || cost(a) - cost(b))[0];
  return {
    scope,
    variant: best.variant,
    meetsBar: false,
    reason: `NO variant meets the bar; best recall is ${best.variant} (recall ${fmtRate(best.recall)}, false holds ${fmtRate(best.falseHold)}). Keep human review in front of this family.`,
    smallSample,
  };
}

export function fmtRate(r: Rate): string {
  if (r.rate === null) return "n/a";
  return `${Math.round(r.rate * 100)}% (${r.k}/${r.n}, 95% CI ${Math.round((r.low ?? 0) * 100)}-${Math.round((r.high ?? 0) * 100)}%)`;
}

export interface EvalReport {
  startedAt: string;
  finishedAt: string;
  mock: boolean;
  budgetUsd: number;
  spentUsd: number;
  plan: EvalPlan;
  rule: Rule;
  variants: (ModelVariant | { id: string; label: string })[];
  execAvailable: boolean | null;
  stoppedAtBudget: string | null;
  items: { id: string; label: string; family: Family; track: string; finding: string; provenance: string; hasProgram: boolean }[];
  overall: VariantMetrics[];
  byFamily: Record<string, VariantMetrics[]>;
  recommendation: { overall: Recommendation; byFamily: Record<string, Recommendation> };
  calls: CallResult[];
  exec: ExecResult[];
}

export const FAMILIES: Family[] = ["clinical", "cloud", "it", "academic", "pm"];

export function buildReport(a: {
  items: EvalItem[];
  variants: ModelVariant[];
  run: EvalRun;
  plan: EvalPlan;
  budget: RunBudget;
  startedAt: string;
  mock: boolean;
  rule?: Rule;
}): EvalReport {
  const rule = a.rule ?? DEFAULT_RULE;
  const overall = score(a.items, a.variants, a.run);
  const byFamily: Record<string, VariantMetrics[]> = {};
  const recs: Record<string, Recommendation> = {};
  for (const f of FAMILIES) {
    if (!a.items.some((i) => i.family === f)) continue;
    byFamily[f] = score(a.items, a.variants, a.run, f);
    recs[f] = recommend(f, byFamily[f], rule);
  }
  const execRows = a.run.execAvailable === true;
  return {
    startedAt: a.startedAt,
    finishedAt: new Date().toISOString(),
    mock: a.mock,
    budgetUsd: a.budget.limitUsd,
    spentUsd: Number(a.budget.spentUsd.toFixed(6)),
    plan: a.plan,
    rule,
    variants: [
      ...a.variants,
      ...(execRows ? a.variants.map((v) => ({ id: `${v.id}+exec`, label: `${v.label} + sandboxed execution` })) : []),
    ],
    execAvailable: a.run.execAvailable,
    stoppedAtBudget: a.run.stoppedAtBudget,
    items: a.items.map((i) => ({ id: i.id, label: i.label, family: i.family, track: i.track, finding: i.finding, provenance: i.provenance, hasProgram: !!i.snippet })),
    overall,
    byFamily,
    recommendation: { overall: recommend("overall", overall, rule), byFamily: recs },
    calls: a.run.calls,
    exec: a.run.exec,
  };
}

const money = (n: number | null) => (n === null ? "n/a" : n < 0.01 ? `$${n.toFixed(5)}` : `$${n.toFixed(4)}`);

export function summaryMarkdown(r: EvalReport): string {
  const L: string[] = [];
  L.push(`# Fact-checker eval (REQ-196)`, "");
  L.push(`${r.mock ? "**MOCK RUN: fake model, no real cost; the numbers below test the harness, not the checker.** " : ""}Started ${r.startedAt}, finished ${r.finishedAt}. Budget $${r.budgetUsd.toFixed(2)}, spent $${r.spentUsd.toFixed(4)} (estimate before the run: typical $${r.plan.typicalUsd.toFixed(2)}, at most $${r.plan.upperUsd.toFixed(2)}).`);
  if (r.stoppedAtBudget) L.push("", `**Stopped at the budget** (${r.stoppedAtBudget}). Variants are compared on the items every variant reached.`);
  L.push("", `Set: ${r.items.filter((i) => i.label === "bad").length} known-bad, ${r.items.filter((i) => i.label === "good").length} known-good; ${r.items.filter((i) => i.hasProgram).length} carry a verification program. Sandboxed execution: ${r.execAvailable === null ? "not requested" : r.execAvailable ? "ran" : "UNAVAILABLE (no +exec rows)"}.`);
  L.push("", `Rule: the cheapest variant with recall >= ${r.rule.minRecall * 100}% and false holds <= ${r.rule.maxFalseHold * 100}%, per family.`, "");
  L.push("## Recommendation", "");
  const rec = (x: Recommendation) => `- **${x.scope}**: ${x.variant ?? "none"}${x.meetsBar ? "" : " (does not meet the bar)"}. ${x.reason}${x.smallSample ? " Small sample: treat as directional." : ""}`;
  L.push(rec(r.recommendation.overall));
  for (const f of Object.keys(r.recommendation.byFamily)) L.push(rec(r.recommendation.byFamily[f]));
  const table = (title: string, ms: VariantMetrics[]) => {
    L.push("", `## ${title}`, "");
    for (const m of ms) {
      L.push(
        `- **${m.variant}**: catches ${fmtRate(m.recall)} of known-bad; holds ${fmtRate(m.falseHold)} of known-good; ` +
          `${money(m.usdPerCheck)} per check, ${money(m.usdPer1000)} per 1,000; latency p50 ${m.latencyMs.p50 ?? "n/a"} ms, p95 ${m.latencyMs.p95 ?? "n/a"} ms` +
          `${m.errors ? `; ${m.errors} call error(s), counted as held` : ""}.` +
          `${m.missed.length ? ` Missed: ${m.missed.join(", ")}.` : ""}${m.wronglyHeld.length ? ` Wrongly held: ${m.wronglyHeld.join(", ")}.` : ""}`
      );
    }
  };
  table("All families", r.overall);
  for (const f of Object.keys(r.byFamily)) table(`Family: ${f}`, r.byFamily[f]);
  L.push("", "## How to read this", "");
  L.push("- Catch rate (recall) is the share of known-bad items the production gate would hold back with that checker. A miss is a wrong key a learner would have been served.");
  L.push("- False-hold rate is the share of known-good items it would hold back: lost content and extra regeneration cost, not a safety problem.");
  L.push("- The 95% intervals are wide at these sample sizes (one item moves a family's rate by 10-50 points). A family flagged 'small sample' needs more labelled items before its choice is final.");
  L.push("- Cost per check is from the API's own token counts at lib/ai-pricing.ts prices; per 1,000 is that times 1,000. Production batches several items per call, so its per-item cost is lower.");
  L.push("- +exec rows add the sandboxed program run; they differ from the plain row only on items that carry a program.");
  return L.join("\n") + "\n";
}
