// REQ-251: offline answer-choice style report. Scores question JSON with the
// app's validator (lib/content-validator.ts) and prints the finding rates by
// kind. No model, no database, no network.
//
//   cd backend
//   npm run items:style -- <file-or-dir> [more ...] [--json] [--label <text>]
//
// Inputs: .json or .jsonl files, or directories of them. Any practice half
// (fadeChoices/soloChoices, camelCase or lesson_content's snake_case) or quiz
// item (question, choices, correctIndex) anywhere inside is scored. To score
// stored lessons, export them first (read-only), for example:
//   psql "$DATABASE_URL" -At -c "select json_agg(t) from (select fade_problem, fade_choices, fade_correct_index, solo_check, solo_choices, solo_correct_index, model, generated_at from lesson_content where generated_at > '2026-11-12') t" > lessons.json
// Prints counts and rates only, never question text.
import { filesUnder, rawOptionSets, renderReport, scoreFile, summarize, type ScoredItem } from "./item-style-report-lib";
import { readFileSync } from "node:fs";

function main(argv: string[]): number {
  const paths: string[] = [];
  let json = false;
  let label = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") json = true;
    else if (argv[i] === "--label") label = argv[++i] ?? "";
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("usage: npm run items:style -- <file-or-dir> [...] [--json] [--label <text>]");
      return 0;
    } else paths.push(argv[i]);
  }
  if (!paths.length) {
    console.error("usage: npm run items:style -- <file-or-dir> [...] [--json] [--label <text>]");
    return 2;
  }
  const files = paths.flatMap(filesUnder);
  const items: ScoredItem[] = [];
  const raw: ReturnType<typeof rawOptionSets> = [];
  for (const f of files) {
    items.push(...scoreFile(f));
    const text = readFileSync(f, "utf8");
    const values = f.endsWith(".jsonl") ? text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [JSON.parse(text)];
    for (const v of values) raw.push(...rawOptionSets(v));
  }
  const report = summarize(items, raw);
  console.log(json ? JSON.stringify({ label, files: files.length, ...report }, null, 2) : renderReport(report, label));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
