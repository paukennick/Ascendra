// Offline lesson-quality eval. Cannot run without an Anthropic API key, a
// database to sample objectives from, and a little money; see usage below.
//
//   cd backend
//   ANTHROPIC_API_KEY=... DATABASE_URL=... npm run eval:lessons -- [options]
//
// What it does: takes a deterministic, stratified (by track type) sample of
// objectives from the shared catalog, generates a lesson for each with the
// configured production models (or --model), and has an independent judge
// model (default claude-opus-5-5) grade each against a rubric drawn from the
// coach rules in lib/prompts.ts. It NEVER writes to lesson_content (or any
// table): lessons are generated in memory and written only to
// backend/eval-results/<timestamp>-lessons/ (gitignored). The ai_calls log is
// switched off for the run.
//
// Options
//   --n <count>          objectives to sample (default 50)
//   --seed <text>        sampling seed (default "lesson-eval-1"); same data + n + seed = same sample
//   --model <id>         generate with this model instead of ANTHROPIC_MODEL / the default
//   --judge <id>         judge model (default claude-opus-5-5)
//   --concurrency <k>    objectives in flight at once (default 4)
//   --dry-run            print the sample and exit; needs the database, not an API key
//   --compare <dir>      after the run, diff it against the results in <dir>
//   --compare <dirA> --against <dirB>
//                        no generation: just diff two earlier runs (A baseline, B candidate)
//
// Cost: per objective, 2 generation calls + 2 judge calls (rubric, independent
// solve). 50 objectives = 200 calls; the judge calls are on the largest model.
import "../../supabase/seed/env-local";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { query, closePool } from "../../lib/db";
import { callClaudeStructured } from "../../lib/anthropic";
import { claudeGenerator, loadObjective } from "../../lib/lesson-generation";
import { coachRules } from "../../lib/prompts";
import { aggregateLessons, compareLessonRuns, rubricJudgeSchema, solveSchema, stratifiedSample, type LessonContentLike } from "./scoring";
import { runLessonEval, type SampledObjective } from "./runner";
import { loadLessonRun, makeRunDir, renderLessonComparison, renderLessonSummary, pct } from "./report";

process.env.AI_CALL_LOG = "off"; // the eval must not write to the database

const BACKEND_ROOT = resolve(__dirname, "../..");
const DEFAULT_JUDGE = "claude-opus-5-5";

interface Args {
  n: number;
  seed: string;
  model?: string;
  judge: string;
  concurrency: number;
  dryRun: boolean;
  compare?: string;
  against?: string;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { n: 50, seed: "lesson-eval-1", judge: DEFAULT_JUDGE, concurrency: 4, dryRun: false };
  const need = (i: number, flag: string): string => {
    const v = argv[i + 1];
    if (!v || v.startsWith("--")) throw new Error(`${flag} needs a value.`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case "--n": a.n = Number(need(i++, flag)); break;
      case "--seed": a.seed = need(i++, flag); break;
      case "--model": a.model = need(i++, flag); break;
      case "--judge": a.judge = need(i++, flag); break;
      case "--concurrency": a.concurrency = Number(need(i++, flag)); break;
      case "--compare": a.compare = need(i++, flag); break;
      case "--against": a.against = need(i++, flag); break;
      case "--dry-run": a.dryRun = true; break;
      default: throw new Error(`Unknown option ${flag}. See the usage comment at the top of scripts/eval/lessons.ts.`);
    }
  }
  if (!Number.isInteger(a.n) || a.n < 1 || a.n > 500) throw new Error("--n must be an integer from 1 to 500.");
  if (!Number.isInteger(a.concurrency) || a.concurrency < 1 || a.concurrency > 16) throw new Error("--concurrency must be 1 to 16.");
  if (a.against && !a.compare) throw new Error("--against only makes sense together with --compare.");
  return a;
}

async function sampleObjectives(n: number, seed: string): Promise<SampledObjective[]> {
  // Shared catalog only (user_id is null): never sample a learner's private track.
  const rows = await query<{ id: string; title: string; unit_title: string; track_title: string; track_type: string }>(
    `select o.id, o.title, cu.title as unit_title, st.title as track_title, st.track_type::text as track_type
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where st.user_id is null
      order by o.id`
  );
  const all: SampledObjective[] = rows.map((r) => ({
    id: r.id, stratum: r.track_type, title: r.title, unitTitle: r.unit_title, trackTitle: r.track_title,
  }));
  return stratifiedSample(all, n, seed);
}

function lessonText(l: LessonContentLike): string {
  const numbered = (cs: string[]) => cs.map((c, i) => `  ${i}. ${c}`).join("\n");
  return [
    `GUESS PROMPT: ${l.guessPrompt}`,
    `TEACH:\n${l.teach}`,
    `GUIDED PRACTICE (free-response form): ${l.fadeProblem}\nChoices (multiple-choice form):\n${numbered(l.fadeChoices)}`,
    `SOLO CHECK (free-response form): ${l.soloCheck}\nChoices (multiple-choice form):\n${numbered(l.soloChoices)}`,
  ].join("\n\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Diff-only mode: two earlier runs, no database, no API.
  if (args.compare && args.against) {
    const a = loadLessonRun(args.compare);
    const b = loadLessonRun(args.against);
    console.log(renderLessonComparison(compareLessonRuns(a, b), `baseline ${args.compare} (candidate: ${args.against})`));
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (backend/.env.local or the environment).");
  const sample = await sampleObjectives(args.n, args.seed);
  const strata = new Map<string, number>();
  for (const s of sample) strata.set(s.stratum, (strata.get(s.stratum) ?? 0) + 1);
  console.log(`Sampled ${sample.length} objectives: ${[...strata].map(([k, v]) => `${k}=${v}`).join(", ")}`);
  if (args.dryRun) {
    for (const s of sample) console.log(`  ${s.stratum.padEnd(13)} ${s.trackTitle} / ${s.title}`);
    return;
  }
  if (!sample.length) throw new Error("No objectives found in the shared catalog.");
  // Federation (Vercel OIDC) is not available off Vercel; a plain key is.
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. The eval needs a key (it is read from the environment or backend/.env.local; it is never printed).");
  }
  if (args.model) process.env.ANTHROPIC_MODEL = args.model;

  const baseline = args.compare ? loadLessonRun(args.compare) : undefined; // fail before spending anything
  const startedAt = new Date().toISOString();
  const runDir = makeRunDir(BACKEND_ROOT, "lessons");
  console.log(`Generating with ${claudeGenerator.model()}, judging with ${args.judge}. ~${sample.length * 4} model calls. Output: ${runDir}`);

  const { records, lessons } = await runLessonEval(sample, {
    concurrency: args.concurrency,
    async generate(obj) {
      const objRow = await loadObjective(obj.id);
      if (!objRow) throw new Error("objective vanished from the database");
      // The production generator, as in production (REQ-139: teach first,
      // then practice from its teaching text), and deliberately not
      // ensureGeneration/saveLesson: nothing is stored.
      const intro = await claudeGenerator.intro(objRow);
      const practice = await claudeGenerator.practice(objRow, undefined, { teach: intro.teach });
      return { ...intro, ...practice };
    },
    async judge(obj, lesson) {
      const objRow = await loadObjective(obj.id);
      return callClaudeStructured({
        system: {
          stable:
            "You are a strict reviewer of study-lesson content. The lesson you will see was written by a model " +
            "following these coach rules; judge it against them, not against your own preferences.\n\n" +
            coachRules(objRow?.ctx ?? undefined),
          task:
            "Assess the lesson on each rubric item. Be strict and specific: a term counts as defined only if the " +
            "teach text explicitly defines it; 'exactly one worked example' fails on zero or on two or more; the " +
            "misconception must be named, not implied. Quote the offending words in your note when something fails.",
        },
        messages: [{
          role: "user",
          content: `Track: ${obj.trackTitle}\nUnit: ${obj.unitTitle}\nObjective: ${obj.title}\n\n${lessonText(lesson)}`,
        }],
        schema: rubricJudgeSchema,
        maxTokens: 3000,
        model: args.judge,
        effort: "high",
        purpose: "eval_judge",
      });
    },
    async solve(obj, lesson) {
      // Only the questions and choices: no teach text, no stored index, no *Why line.
      const numbered = (cs: string[]) => cs.map((c, i) => `  ${i}. ${c}`).join("\n");
      return callClaudeStructured({
        system: "You are an expert answering multiple-choice study questions. Answer each one independently, from your own knowledge, choosing the single best option. Reply with the 0-based index of your choice.",
        messages: [{
          role: "user",
          content:
            `Subject: ${obj.trackTitle} (${obj.title})\n\nQuestion 1: ${lesson.fadeProblem}\n${numbered(lesson.fadeChoices)}\n\n` +
            `Question 2: ${lesson.soloCheck}\n${numbered(lesson.soloChoices)}`,
        }],
        schema: solveSchema,
        maxTokens: 2000,
        model: args.judge,
        effort: "high",
        purpose: "eval_judge",
      });
    },
    onProgress(done, total, rec) {
      const status = rec.error ? "ERROR" : rec.score!.allPass ? "pass " : "FAIL ";
      console.log(`[${String(done).padStart(String(total).length)}/${total}] ${status} ${rec.trackType.padEnd(13)} ${rec.objective}`);
    },
  });

  const summary = aggregateLessons(records);
  const meta = {
    kind: "lessons" as const,
    startedAt,
    seed: args.seed,
    models: { generation: claudeGenerator.model(), judge: args.judge },
  };
  const comparison = baseline ? { against: args.compare!, result: compareLessonRuns(baseline, records) } : undefined;
  writeFileSync(join(runDir, "lessons-results.json"), JSON.stringify({ meta, summary, records }, null, 2));
  writeFileSync(join(runDir, "lessons-content.json"), JSON.stringify(lessons, null, 2));
  writeFileSync(join(runDir, "lessons-summary.md"), renderLessonSummary(summary, records, meta, comparison));

  console.log(`\nAll criteria pass: ${pct(summary.allPass)} (${summary.allPass.pass}/${summary.allPass.total}); ${summary.errors} errored.`);
  for (const [c, r] of Object.entries(summary.passRates)) console.log(`  ${c.padEnd(28)} ${pct(r)}`);
  if (comparison) console.log("\n" + renderLessonComparison(comparison.result, comparison.against));
  console.log(`\nResults: ${runDir}`);
}

main()
  .catch((err) => {
    console.error(err instanceof z.ZodError ? err.message : err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
