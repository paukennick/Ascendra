// Markdown rendering and run-directory helpers for the evals. Rendering is
// pure (string in, string out); only makeRunDir/loadLessonRun touch the disk.
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  LESSON_CRITERIA,
  type GradingSummary,
  type LessonEvalRecord,
  type LessonRunComparison,
  type LessonSummary,
  type Rate,
  VERDICTS,
} from "./scoring";

export const pct = (r: Rate | number): string => {
  const v = typeof r === "number" ? r : r.rate;
  return `${(v * 100).toFixed(0)}%`;
};
const frac = (r: Rate) => `${pct(r)} (${r.pass}/${r.total})`;
const signed = (d: number) => `${d >= 0 ? "+" : ""}${(d * 100).toFixed(0)} pts`;

export interface RunMeta {
  kind: "lessons" | "grading";
  startedAt: string;
  models: Record<string, string>;
  seed?: string;
  note?: string;
}

function metaBlock(meta: RunMeta): string {
  const models = Object.entries(meta.models).map(([k, v]) => `- ${k}: \`${v}\``).join("\n");
  return `Run: ${meta.kind}, started ${meta.startedAt}${meta.seed ? `, seed \`${meta.seed}\`` : ""}\n\n${models}\n${meta.note ? `\n${meta.note}\n` : ""}`;
}

export function renderLessonSummary(
  summary: LessonSummary,
  records: LessonEvalRecord[],
  meta: RunMeta,
  comparison?: { against: string; result: LessonRunComparison }
): string {
  const lines: string[] = [`# Lesson eval`, "", metaBlock(meta)];
  lines.push(`Objectives: ${summary.total} sampled, ${summary.scored} scored, ${summary.errors} errored.`, "");
  lines.push(`**All criteria pass: ${frac(summary.allPass)}**`, "", "## Pass rate by criterion", "");
  for (const c of LESSON_CRITERIA) lines.push(`- ${c}: ${frac(summary.passRates[c])}`);
  lines.push("", "## By track type", "");
  for (const [type, s] of Object.entries(summary.byTrackType)) {
    const worst = [...LESSON_CRITERIA].sort((a, b) => s.passRates[a].rate - s.passRates[b].rate)[0];
    lines.push(`- ${type} (n=${s.scored}): all-pass ${frac(s.allPass)}; weakest ${worst} ${pct(s.passRates[worst])}`);
  }
  const failing = records.filter((r) => r.score && !r.score.allPass);
  if (failing.length) {
    lines.push("", "## Failures", "");
    for (const r of failing.slice(0, 40)) {
      const bad = LESSON_CRITERIA.filter((c) => !r.score!.criteria[c].pass);
      lines.push(`- ${r.trackTitle} / ${r.objective}: ${bad.map((c) => `${c} (${r.score!.criteria[c].note.slice(0, 140)})`).join("; ")}`);
    }
    if (failing.length > 40) lines.push(`- ... and ${failing.length - 40} more in results.json`);
  }
  const errored = records.filter((r) => r.error);
  if (errored.length) {
    lines.push("", "## Errors (not scored)", "");
    for (const r of errored.slice(0, 20)) lines.push(`- ${r.objective}: ${r.error}`);
  }
  if (comparison) lines.push("", renderLessonComparison(comparison.result, comparison.against));
  return lines.join("\n") + "\n";
}

export function renderLessonComparison(cmp: LessonRunComparison, againstLabel: string): string {
  const lines = [
    `## Compared with ${againstLabel}`,
    "",
    `${cmp.commonObjectives} objectives in both runs (${cmp.onlyInA} only in the baseline, ${cmp.onlyInB} only in this run). Baseline -> this run.`,
    "",
    `- all criteria pass: ${pct(cmp.allPass.a)} -> ${pct(cmp.allPass.b)} (${signed(cmp.allPass.delta)})`,
  ];
  for (const c of cmp.criteria) lines.push(`- ${c.criterion}: ${pct(c.a)} -> ${pct(c.b)} (${signed(c.delta)})`);
  const worse = cmp.flipped.filter((f) => f.from && !f.to);
  const better = cmp.flipped.filter((f) => !f.from && f.to);
  lines.push("", `Flipped to failing (${worse.length}):`);
  for (const f of worse.slice(0, 25)) lines.push(`- ${f.objective}: ${f.criterion}`);
  lines.push("", `Flipped to passing (${better.length}):`);
  for (const f of better.slice(0, 25)) lines.push(`- ${f.objective}: ${f.criterion}`);
  return lines.join("\n");
}

export function renderGradingSummary(summary: GradingSummary, meta: RunMeta): string {
  const lines: string[] = [`# Grading eval`, "", metaBlock(meta)];
  lines.push(
    `Cases: ${summary.total}, ${summary.scored} graded, ${summary.errors} errored.`,
    "",
    "The expected verdicts are a draft written by Claude, not ground truth: read every disagreement before trusting a number here.",
    "",
    `**Verdict agreement: ${frac(summary.verdictAgreement)}**`,
    "",
    `- graded more leniently than expected: ${summary.tooLenient}`,
    `- graded more harshly than expected: ${summary.tooHarsh}`,
    `- missed-parts present/absent agreement: ${frac(summary.missedPresenceAgreement)}`,
    `- expected missed parts the grader also listed (mean, ${summary.missedRecall.cases} cases): ${pct(summary.missedRecall.mean)}`,
    `- single-part or fully-answered cases where the grader still listed missed parts: ${frac(summary.overFlagged)}`,
    "",
    "## Confusion (rows: expected, columns: graded)",
    "",
    `| expected \\ graded | ${VERDICTS.join(" | ")} |`,
    `|---|${VERDICTS.map(() => "---").join("|")}|`
  );
  for (const e of VERDICTS) lines.push(`| ${e} | ${VERDICTS.map((a) => summary.confusion[e][a]).join(" | ")} |`);
  lines.push("", "## Verdict agreement by domain", "");
  for (const [k, v] of Object.entries(summary.byDomain)) lines.push(`- ${k}: ${frac(v)}`);
  lines.push("", "## By tag", "");
  for (const [k, v] of Object.entries(summary.byTag)) lines.push(`- ${k}: ${frac(v)}`);
  if (summary.disagreements.length) {
    lines.push("", "## Verdict disagreements (case ids)", "", summary.disagreements.map((d) => `\`${d}\``).join(", "));
  }
  return lines.join("\n") + "\n";
}

// backend/eval-results/<timestamp>/ (gitignored). The timestamp is the run's
// start, filesystem-safe, sortable.
export function makeRunDir(backendRoot: string, label: string, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dir = join(backendRoot, "eval-results", `${stamp}-${label}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Reads the per-objective records of an earlier lessons run, for --compare.
export function loadLessonRun(dir: string): LessonEvalRecord[] {
  const file = join(resolve(dir), "lessons-results.json");
  if (!existsSync(file)) throw new Error(`No lessons-results.json in ${dir} -- is that a lessons eval directory?`);
  const data = JSON.parse(readFileSync(file, "utf8")) as { records?: LessonEvalRecord[] };
  if (!Array.isArray(data.records)) throw new Error(`${file} has no "records" array.`);
  return data.records;
}
