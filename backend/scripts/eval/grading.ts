// Offline free-response grading eval. Runs the PRODUCTION grader
// (lib/free-response-grader.ts, the same function POST /api/grade calls) on
// every case in grading-cases.json and reports how often its verdict and
// missed-parts agree with the expected ones.
//
//   cd backend
//   ANTHROPIC_API_KEY=... npm run eval:grading -- [options]
//
// The cases are a DRAFT written by Claude (see "_status" at the top of the
// file). Agreement with them is evidence to investigate, not a score: read each
// disagreement and decide whether the grader or the expected verdict is wrong.
// No database is used and the ai_calls log is off.
//
// Options
//   --cases <file>       cases file (default scripts/eval/grading-cases.json)
//   --model <id>         grade with this model instead of ANTHROPIC_FAST_MODEL / the default
//   --domain <name>      only cases in that domain (security-plus, aws-saa, ccrn, pt)
//   --concurrency <k>    cases in flight at once (default 4)
//   --reference <mode>   with (default; what production does: it always passes the
//                        lesson's answer key) | without | both (two runs, compared)
//   --dry-run            validate the cases file and print counts; needs no API key
import "../../supabase/seed/env-local";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { closePool } from "../../lib/db";
import { getFastModel } from "../../lib/anthropic";
import { gradeFreeResponse } from "../../lib/free-response-grader";
import { aggregateGrading, gradeOutputProblems, parseGradingCases } from "./scoring";
import { referenceRuns, runGradingEval, type ReferenceMode } from "./runner";
import { makeRunDir, pct, renderGradingSummary } from "./report";

process.env.AI_CALL_LOG = "off";

const BACKEND_ROOT = resolve(__dirname, "../..");

function parseArgs(argv: string[]) {
  const a = { cases: join(__dirname, "grading-cases.json"), model: undefined as string | undefined, domain: undefined as string | undefined, concurrency: 4, dryRun: false, reference: "with" as ReferenceMode };
  const need = (i: number, flag: string): string => {
    const v = argv[i + 1];
    if (!v || v.startsWith("--")) throw new Error(`${flag} needs a value.`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case "--cases": a.cases = resolve(need(i++, flag)); break;
      case "--model": a.model = need(i++, flag); break;
      case "--domain": a.domain = need(i++, flag); break;
      case "--concurrency": a.concurrency = Number(need(i++, flag)); break;
      case "--dry-run": a.dryRun = true; break;
      case "--reference": {
        const v = need(i++, flag);
        if (v !== "with" && v !== "without" && v !== "both") throw new Error("--reference must be with, without or both.");
        a.reference = v;
        break;
      }
      default: throw new Error(`Unknown option ${flag}. See the usage comment at the top of scripts/eval/grading.ts.`);
    }
  }
  if (!Number.isInteger(a.concurrency) || a.concurrency < 1 || a.concurrency > 16) throw new Error("--concurrency must be 1 to 16.");
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(readFileSync(args.cases, "utf8")) as { _status?: string };
  let cases = parseGradingCases(raw);
  if (args.domain) cases = cases.filter((c) => c.domain === args.domain);
  if (!cases.length) throw new Error("No cases selected.");

  const byDomain = new Map<string, number>();
  for (const c of cases) byDomain.set(c.domain, (byDomain.get(c.domain) ?? 0) + 1);
  console.log(`${raw._status ?? ""}\n`);
  console.log(`${cases.length} cases: ${[...byDomain].map(([k, v]) => `${k}=${v}`).join(", ")}`);
  if (args.dryRun) return;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. The eval needs a key (it is read from the environment or backend/.env.local; it is never printed).");
  }
  const model = args.model ?? getFastModel();
  const startedAt = new Date().toISOString();
  const runDir = makeRunDir(BACKEND_ROOT, "grading");
  console.log(`Grading with ${model}. Output: ${runDir}`);

  for (const withRef of referenceRuns(args.reference)) {
    const label = withRef ? "with-reference" : "without-reference";
    console.log(`\n== ${label} ==`);
    const records = await runGradingEval(cases, {
      concurrency: args.concurrency,
      grade: (c) =>
        gradeFreeResponse({
          userId: null,
          taughtText: c.taughtText,
          question: c.question,
          answer: c.answer,
          answerKey: withRef ? c.referenceAnswer : undefined,
          ctx: c.track,
          model,
          purpose: "eval_grading",
        }),
      onProgress(done, total, rec) {
        const status = rec.error ? "ERROR   " : rec.score!.verdictMatch ? "agree   " : "DISAGREE";
        const got = rec.output ? `${rec.output.verdict} (expected ${rec.case.expectedVerdict})` : rec.error;
        const bad = rec.output ? gradeOutputProblems(rec.output) : [];
        console.log(`[${String(done).padStart(String(total).length)}/${total}] ${status} ${rec.case.id}: ${got}${bad.length ? `  INCONSISTENT: ${bad.join(", ")}` : ""}`);
      },
    });

    const summary = aggregateGrading(records);
    const meta = { kind: "grading" as const, startedAt, models: { grader: model }, note: `${raw._status ?? ""} (${label})` };
    writeFileSync(join(runDir, `grading-results-${label}.json`), JSON.stringify({ meta, summary, records }, null, 2));
    writeFileSync(join(runDir, `grading-summary-${label}.md`), renderGradingSummary(summary, meta));

    console.log(`\nVerdict agreement: ${pct(summary.verdictAgreement)} (${summary.verdictAgreement.pass}/${summary.verdictAgreement.total}); ${summary.errors} errored.`);
    console.log(`Too lenient: ${summary.tooLenient}, too harsh: ${summary.tooHarsh}`);
    console.log(`Missed-parts present/absent agreement: ${pct(summary.missedPresenceAgreement)}; expected parts also listed: ${pct(summary.missedRecall.mean)}`);
    if (summary.disagreements.length) console.log(`Read these first: ${summary.disagreements.join(", ")}`);
  }
  console.log(`\nResults: ${runDir}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
