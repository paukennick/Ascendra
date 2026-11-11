// REQ-196: the fact-checker eval (lib/factcheck-eval.ts). Which checker
// does each subject family need? Run by the "Fact-checker eval" workflow
// (manual); locally with --mock.
//
//   npm run eval:factcheck                      estimate only: prints the budget, no call
//   npm run eval:factcheck -- --run             run every variant (default budget $5)
//   npm run eval:factcheck -- --run --budget 2  hard cap in USD (max 25)
//   npm run eval:factcheck -- --run --variants haiku,sonnet+think
//   npm run eval:factcheck -- --run --no-exec   skip sandboxed execution
//   npm run eval:factcheck -- --run --mock      fake model, no key, no cost (tests the harness)
//   npm run eval:factcheck -- --out <dir>       where results.json and summary.md go
//
// The estimate is always printed first. --run needs ANTHROPIC_API_KEY (the
// workflow's repository secret) unless --mock. If DATABASE_URL is set (the workflow's fresh,
// seeded Postgres -- never production), each item's course context comes
// from the seeded catalog, as in production; otherwise items are checked
// with no course context. Usage never reaches ai_calls.
import "../supabase/seed/env-local";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { closePool, queryOne } from "../lib/db";
import { __setClientForTest } from "../lib/anthropic";
import { coachContextForTrack, type CoachContext } from "../lib/coach-context";
import { RunBudget } from "../lib/run-budget";
import { dockerRunner, sandboxSelfTest } from "../lib/sandbox-runner";
import { DEFAULT_RUN_LIMITS } from "../lib/verify-execution";
import { buildReport, installEvalSink, modelVariants, parseEvalSet, planEval, runEval, summaryMarkdown } from "../lib/factcheck-eval";

export const MAX_BUDGET_USD = 25;

interface Args {
  run: boolean;
  budget: number;
  variants: string[] | null;
  exec: boolean;
  mock: boolean;
  out: string;
  concurrency: number;
}

export function parseArgs(argv: string[]): Args {
  const a: Args = { run: false, budget: 5, variants: null, exec: true, mock: false, out: resolve("factcheck-eval-results"), concurrency: 4 };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${f} needs a value`);
      return v;
    };
    switch (f) {
      case "--run": a.run = true; break;
      case "--budget": {
        const n = Number(val());
        if (!(Number.isFinite(n) && n > 0 && n <= MAX_BUDGET_USD)) throw new Error(`--budget must be above 0 and at most ${MAX_BUDGET_USD}`);
        a.budget = n;
        break;
      }
      case "--variants": a.variants = val().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--no-exec": a.exec = false; break;
      case "--mock": a.mock = true; break;
      case "--out": a.out = resolve(val()); break;
      case "--concurrency": {
        const n = Number(val());
        if (!(Number.isInteger(n) && n >= 1 && n <= 8)) throw new Error("--concurrency must be 1-8");
        a.concurrency = n;
        break;
      }
      default: throw new Error(`Unknown option ${f}`);
    }
  }
  return a;
}

// --mock: answers option 0 with no claims, and reports token usage like the
// API does, so the budget, cost and latency code all run.
function installMockModel(): void {
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("mock: create not used");
      },
      parse: async (body: { model: string }) => ({
        parsed_output: { results: [{ key: "i1", answer: [0], unsupportedClaims: [] }] },
        usage: { input_tokens: 900, output_tokens: body.model.includes("haiku") ? 60 : 80 },
        stop_reason: "end_turn",
      }),
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const items = parseEvalSet(JSON.parse(readFileSync(join(__dirname, "../lib/fixtures/factcheck-eval-set.json"), "utf8")));
  const all = modelVariants();
  const variants = args.variants ? all.filter((v) => args.variants!.includes(v.id)) : all;
  if (!variants.length) throw new Error(`--variants: pick from ${all.map((v) => v.id).join(", ")}`);
  const hasDb = !!process.env.DATABASE_URL;
  const ctxCache = new Map<string, CoachContext | undefined>();
  const ctxFor = async (code: string) => {
    if (!hasDb) return undefined;
    if (!ctxCache.has(code)) {
      const t = await queryOne<{ id: string }>(`select id from subject_tracks where code = $1 and user_id is null limit 1`, [code]).catch(() => null);
      ctxCache.set(code, t ? ((await coachContextForTrack(t.id)) ?? undefined) : undefined);
    }
    return ctxCache.get(code);
  };

  const plan = await planEval({ items, variants, ctxFor });
  console.log(`Fact-checker eval: ${items.length} items x ${variants.length} variants = ${plan.calls} model calls${hasDb ? " (course context from the seeded catalog)" : " (no course context: DATABASE_URL not set)"}.`);
  for (const v of variants) {
    const p = plan.perVariant[v.id];
    console.log(`  ${v.id.padEnd(13)} ${v.label}: ${p.calls} calls, typical ~$${p.typicalUsd.toFixed(3)}, at most $${p.upperUsd.toFixed(3)}`);
  }
  console.log(`Estimate: typical ~$${plan.typicalUsd.toFixed(2)}, at most $${plan.upperUsd.toFixed(2)}. Budget for this run: $${args.budget.toFixed(2)}${plan.upperUsd > args.budget ? " (it may stop at the cap; every variant is compared on the items all of them reached)" : ""}.`);
  if (!args.run) {
    console.log("Estimate only. Add --run to make the calls.");
    return;
  }
  if (args.mock) installMockModel();
  else if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set. Use --mock to test the harness.");

  let runner = null;
  if (args.exec) {
    const st = await sandboxSelfTest(dockerRunner(), DEFAULT_RUN_LIMITS, `canary-${Date.now()}`);
    if (st.ok) runner = dockerRunner();
    else console.log(`Sandbox self-test did not pass${st.available ? "" : " (Docker unavailable)"}: the +exec variants are not run.`);
  }

  const budget = new RunBudget(args.budget);
  installEvalSink(budget);
  const startedAt = new Date().toISOString();
  const run = await runEval({ items, variants, budget, ctxFor, runner, concurrency: args.concurrency, log: (m) => console.log(m) });
  if (runner === null && args.exec) run.execAvailable = false;
  const report = buildReport({ items, variants, run, plan, budget, startedAt, mock: args.mock });
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, "results.json"), JSON.stringify(report, null, 1));
  const md = summaryMarkdown(report);
  writeFileSync(join(args.out, "summary.md"), md);
  console.log(md);
  console.log(`Wrote ${join(args.out, "results.json")} and summary.md. Spent $${budget.spentUsd.toFixed(4)} of $${args.budget.toFixed(2)}.`);
  if (run.stoppedAtBudget) process.exitCode = 2;
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
