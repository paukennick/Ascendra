// REQ-251: an offline report of the answer-choice style findings
// (lib/content-validator.ts lessonPracticeLint / quizItemLint) over stored
// or generated question JSON. No model call, no database, no network: it
// reads files and scores them with the validator the app uses, so the lead
// can compare a trial's first drafts (or stored lessons) before and after a
// prompt change. The model's effect itself still needs a measured trial.
//
// It finds every practice half (fadeChoices/soloChoices, camelCase as the
// model writes it or snake_case as lesson_content stores it) and every quiz
// item (question + choices + correctIndex) anywhere inside the JSON it is
// given, so a pregen dump, an eval run's lessons-content.json, a psql
// json_agg export of lesson_content or a list of drafts all work.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ABSOLUTE_WORDS, keyLengthLimit } from "../lib/item-style";
import {
  lessonPracticeHardProblems,
  lessonPracticeLint,
  quizItemLint,
} from "../lib/content-validator";
import type { LessonPracticeContent, CoachQuizItem } from "../lib/prompts";

export interface ScoredItem {
  source: string; // file and JSON path, never the text
  kind: "practice" | "quiz";
  hard: string[];
  lint: string[];
}

type Json = unknown;
const isObj = (v: Json): v is Record<string, Json> => !!v && typeof v === "object" && !Array.isArray(v);

// A practice half in the model's camelCase, from either spelling.
export function asPractice(o: Record<string, Json>): Partial<LessonPracticeContent> | null {
  const pick = (camel: string, snake: string) => (camel in o ? o[camel] : o[snake]);
  const fadeChoices = pick("fadeChoices", "fade_choices");
  const soloChoices = pick("soloChoices", "solo_choices");
  if (!Array.isArray(fadeChoices) && !Array.isArray(soloChoices)) return null;
  return {
    fadeProblem: pick("fadeProblem", "fade_problem") as string,
    fadeChoices: fadeChoices as string[],
    fadeCorrectIndex: pick("fadeCorrectIndex", "fade_correct_index") as number,
    fadeWhy: pick("fadeWhy", "fade_why") as string,
    soloCheck: pick("soloCheck", "solo_check") as string,
    soloChoices: soloChoices as string[],
    soloCorrectIndex: pick("soloCorrectIndex", "solo_correct_index") as number,
    soloWhy: pick("soloWhy", "solo_why") as string,
    ...(pick("fadeOptionReasons", "fade_option_reasons") ? { fadeOptionReasons: pick("fadeOptionReasons", "fade_option_reasons") as string[] } : {}),
    ...(pick("soloOptionReasons", "solo_option_reasons") ? { soloOptionReasons: pick("soloOptionReasons", "solo_option_reasons") as string[] } : {}),
  };
}

function asQuiz(o: Record<string, Json>): Partial<CoachQuizItem> | null {
  const idx = "correctIndex" in o ? o.correctIndex : o.correct_index;
  if (typeof o.question !== "string" || !Array.isArray(o.choices) || typeof idx !== "number") return null;
  return { question: o.question, choices: o.choices as string[], correctIndex: idx };
}

// Every practice half and quiz item inside a parsed JSON value.
export function scoreJson(value: Json, source: string): ScoredItem[] {
  const out: ScoredItem[] = [];
  const walk = (v: Json, path: string) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (!isObj(v)) return;
    const p = asPractice(v);
    if (p) {
      out.push({ source: `${source}${path}`, kind: "practice", hard: lessonPracticeHardProblems(p), lint: lessonPracticeLint(p) });
      return;
    }
    const q = asQuiz(v);
    if (q) {
      out.push({ source: `${source}${path}`, kind: "quiz", hard: [], lint: quizItemLint(q) });
      return;
    }
    for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(value, "");
  return out;
}

// A .json file, or a .jsonl file (one JSON value per line).
export function scoreFile(file: string): ScoredItem[] {
  const text = readFileSync(file, "utf8");
  if (file.endsWith(".jsonl")) {
    return text
      .split("\n")
      .map((l, i) => [l.trim(), i] as const)
      .filter(([l]) => l)
      .flatMap(([l, i]) => scoreJson(JSON.parse(l), `${file}:${i + 1}`));
  }
  return scoreJson(JSON.parse(text), file);
}

export function filesUnder(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path)
    .sort()
    .flatMap((n) => filesUnder(join(path, n)))
    .filter((f) => /\.jsonl?$/.test(f));
}

// The finding categories the trial reported, from the validator's messages.
// "Guided" / "Solo" / "Quiz" is the question; the rest is the rule.
export function category(problem: string): string {
  const q = /^Guided/.test(problem) ? "Guided" : /^Solo/.test(problem) ? "Solo" : /^Quiz/.test(problem) ? "Quiz" : "Other";
  if (/much longer than/.test(problem)) return `${q}: right answer much longer than the others`;
  if (/absolute word/.test(problem)) return `${q}: wrong option uses an absolute word`;
  if (/asks for \d+ but/.test(problem)) return `${q}: asks for N but an option lists a different count`;
  if (/all\/none of the above/.test(problem)) return `${q}: all/none of the above`;
  if (/labels itself/.test(problem)) return `${q}: option labels itself`;
  return `${q}: other`;
}

export interface StyleReport {
  items: number;
  practice: number;
  quiz: number;
  withHard: number;
  withStyle: number;
  // items with at least one finding of the category (each item counted once)
  byCategory: Record<string, number>;
  // wrong options flagged, by the cue word found
  byCueWord: Record<string, number>;
  // option sets where the key is the longest option / over the length limit
  optionSets: number;
  keyLongest: number;
  keyOverLimit: number;
}

export function summarize(items: ScoredItem[], raw: { stem: unknown; choices: unknown; key: unknown }[] = []): StyleReport {
  const r: StyleReport = {
    items: items.length,
    practice: items.filter((i) => i.kind === "practice").length,
    quiz: items.filter((i) => i.kind === "quiz").length,
    withHard: items.filter((i) => i.hard.length).length,
    withStyle: items.filter((i) => i.lint.length).length,
    byCategory: {},
    byCueWord: {},
    optionSets: 0,
    keyLongest: 0,
    keyOverLimit: 0,
  };
  for (const it of items) {
    for (const c of new Set(it.lint.map(category))) r.byCategory[c] = (r.byCategory[c] ?? 0) + 1;
    for (const p of it.lint) {
      const m = /absolute word "([^"]+)"/.exec(p);
      if (m) r.byCueWord[m[1]] = (r.byCueWord[m[1]] ?? 0) + 1;
    }
  }
  for (const s of raw) {
    if (!Array.isArray(s.choices) || !s.choices.every((c) => typeof c === "string") || !Number.isInteger(s.key)) continue;
    const choices = (s.choices as string[]).map((c) => c.trim());
    const k = s.key as number;
    if (k < 0 || k >= choices.length) continue;
    r.optionSets++;
    const others = choices.filter((_, i) => i !== k);
    if (others.every((o) => o.length < choices[k].length)) r.keyLongest++;
    const mean = others.reduce((n, o) => n + o.length, 0) / others.length;
    if (choices[k].length > keyLengthLimit(mean)) r.keyOverLimit++;
  }
  return r;
}

// The option sets (stem, choices, key) inside a parsed JSON value, for the
// length figures that do not depend on the validator's wording.
export function rawOptionSets(value: Json): { stem: unknown; choices: unknown; key: unknown }[] {
  const out: { stem: unknown; choices: unknown; key: unknown }[] = [];
  const walk = (v: Json) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!isObj(v)) return;
    const p = asPractice(v);
    if (p) {
      out.push({ stem: p.fadeProblem, choices: p.fadeChoices, key: p.fadeCorrectIndex });
      out.push({ stem: p.soloCheck, choices: p.soloChoices, key: p.soloCorrectIndex });
      return;
    }
    const q = asQuiz(v);
    if (q) {
      out.push({ stem: q.question, choices: q.choices, key: q.correctIndex });
      return;
    }
    Object.values(v).forEach(walk);
  };
  walk(value);
  return out;
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "-");

export function renderReport(r: StyleReport, label = ""): string {
  const lines: string[] = [];
  lines.push(`Answer-choice style report${label ? ` (${label})` : ""}`);
  lines.push(`Items: ${r.items} (${r.practice} lesson practice halves, ${r.quiz} quiz items)`);
  lines.push(`With a hard problem: ${r.withHard} (${pct(r.withHard, r.items)})`);
  lines.push(`With any style finding: ${r.withStyle} (${pct(r.withStyle, r.items)})`);
  lines.push("");
  lines.push("Items with each kind of finding (an item counts once per kind):");
  const cats = Object.entries(r.byCategory).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!cats.length) lines.push("  none");
  for (const [c, n] of cats) lines.push(`  ${String(n).padStart(4)}  ${pct(n, r.items).padStart(4)}  ${c}`);
  lines.push("");
  lines.push("Wrong options flagged, by cue word:");
  const words = ABSOLUTE_WORDS.filter((w) => r.byCueWord[w]).map((w) => `${w} ${r.byCueWord[w]}`);
  lines.push(`  ${words.length ? words.join(", ") : "none"}`);
  lines.push("");
  lines.push(`Option sets: ${r.optionSets}`);
  lines.push(`  right answer is the longest option: ${r.keyLongest} (${pct(r.keyLongest, r.optionSets)}; chance with 4 options is about 25%)`);
  lines.push(`  right answer over the length limit: ${r.keyOverLimit} (${pct(r.keyOverLimit, r.optionSets)})`);
  return lines.join("\n");
}
