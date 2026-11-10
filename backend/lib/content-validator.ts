// Audit 3 M2 + L2 (FAIL-297, FAIL-306): one check for generated lessons and
// "Quiz me" items before they are stored and shared.
//
// The structured-output schema guarantees shapes (4 options, an index in
// range) but not content: the audit stored a SHARED lesson with options
// ["256","256","128","512"] (a learner who picked the second "256" was marked
// wrong), an empty Solo question and an empty guess prompt. Exam items
// (lib/exam-formats.ts) and review items (lib/review-service.ts) already had
// checks; lessons and quiz items did not.
//
// What is checked (problems() returns one plain sentence per failure):
//  - every question/prompt/teaching text is non-empty and within its cap;
//  - options are non-empty, distinct after normalizing case, spacing and
//    punctuation, and each within its cap; the correct index is in range;
//  - option reasons, where given, have one entry per option, none empty;
//  - quiz hints are non-empty;
//  - language (L2): the text is in the course language. Only English is
//    checked today (every catalog course is English): at least 90% of the
//    letters are Latin script, and the longer texts contain common English
//    function words. A course in another language would pass `language`.
//  - distractors (REQ-187, audit 2026-11-09 R5/P6): in 45 of 64 stored keys
//    the right answer was the longest option, and 9 of 14 AWS keys were
//    option A. distractorProblems() is a deterministic lint of the
//    ITEM_WRITING_RULES the prompt already states: the key no longer than
//    about 1.25x the mean distractor; no absolute cue words the stem does not
//    use itself; no "all/none of the above"; a stem that asks for N things
//    ("which TWO ...") gets N in every option; no option that labels itself
//    ("(correct)", "distractor"); and no explanation that names an option
//    by position, since the stored order is shuffled (shuffleChoices).
// Callers regenerate once on failure, then fail cleanly (a 503 the app shows
// as "try again"), and never store the bad content. The second attempt is
// told what failed (generateValid passes the problems to the generator).

import type { LessonIntroContent, LessonPracticeContent, CoachQuizItem } from "@/lib/prompts";
import { UserFacingError } from "@/lib/http";

export const CONTENT_LIMITS = {
  question: 1_500,
  option: 400,
  reason: 600,
  why: 800,
  guessPrompt: 800,
  teach: 12_000,
  hint: 600,
  explanation: 1_500,
} as const;

const normOption = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\p{P}]+/gu, " ")
    .trim();

function text(label: string, v: unknown, max: number, out: string[]): void {
  if (typeof v !== "string" || !v.trim()) out.push(`${label} is empty.`);
  else if (v.length > max) out.push(`${label} is longer than ${max} characters.`);
}

function options(label: string, choices: unknown, correctIndex: unknown, reasons: unknown, out: string[]): void {
  if (!Array.isArray(choices) || choices.length < 2) {
    out.push(`${label} needs at least 2 options.`);
    return;
  }
  const seen = new Set<string>();
  choices.forEach((c, i) => {
    if (typeof c !== "string" || !c.trim()) out.push(`${label} option ${i + 1} is empty.`);
    else if (c.length > CONTENT_LIMITS.option) out.push(`${label} option ${i + 1} is too long.`);
    else {
      const n = normOption(c);
      if (seen.has(n)) out.push(`${label} has a duplicate option ("${c.slice(0, 40)}").`);
      seen.add(n);
    }
  });
  if (!Number.isInteger(correctIndex) || (correctIndex as number) < 0 || (correctIndex as number) >= choices.length) {
    out.push(`${label} correct index is out of range.`);
  }
  if (reasons !== undefined && reasons !== null) {
    if (!Array.isArray(reasons) || reasons.length !== choices.length) out.push(`${label} needs one reason per option.`);
    else
      reasons.forEach((r, i) => {
        if (typeof r !== "string" || !r.trim()) out.push(`${label} reason ${i + 1} is empty.`);
        else if (r.length > CONTENT_LIMITS.reason) out.push(`${label} reason ${i + 1} is too long.`);
      });
  }
}

const FUNCTION_WORDS = /\b(the|and|is|are|of|to|in|a|that|it|for|on|with|as|this|be|or|by)\b/gi;

// L2: is this text in English? Lenient on purpose: technical text is full of
// acronyms, numbers and code.
export function languageProblem(texts: string[], language = "en"): string | null {
  if (language !== "en") return null;
  const all = texts.filter((t) => typeof t === "string").join(" ");
  const letters = all.match(/\p{L}/gu) ?? [];
  if (letters.length < 20) return null;
  const latin = letters.filter((ch) => /\p{Script=Latin}/u.test(ch)).length;
  if (latin / letters.length < 0.9) return "The text is not in the course language (English).";
  const words = all.split(/\s+/).filter(Boolean).length;
  const fn = (all.match(FUNCTION_WORDS) ?? []).length;
  if (words >= 40 && fn / words < 0.05) return "The text does not read as English.";
  return null;
}

// ---------------------------------------------------------------------------
// Distractor lint (REQ-187)
// ---------------------------------------------------------------------------

// How much longer than the mean distractor the key may be. Short options get
// a few characters of slack: "TCP 443" vs "UDP 53" is not a length cue.
export const KEY_LENGTH_RATIO = 1.25;
export const KEY_LENGTH_SLACK_CHARS = 8;

const ABSOLUTE_WORDS = ["always", "never", "only", "all", "none", "every", "guaranteed", "completely"] as const;
const ABOVE = /\b(all|none|both|neither) of (the )?(above|these|the options)\b/i;
const SELF_LABEL = /\((?:in)?correct\)|\b(?:distractor|trick option|the (?:right|wrong|correct|incorrect) (?:answer|option)|not the answer)\b/i;
// "Option B", "answer (C)", "choice 2", "the second option". The letter must
// be a capital, so "answer a question" is not a match.
const POSITION_REF = /\b(?:[Oo]ption|[Aa]nswer|[Cc]hoice)\s*(?:\(?[A-D]\)?|[1-4])(?![\w-])|\b(?:[Ff]irst|[Ss]econd|[Tt]hird|[Ff]ourth|[Ll]ast) (?:option|answer|choice)\b/;

const NUMBER_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, "2": 2, "3": 3, "4": 4, "5": 5 };
const COUNT_ASK = /\b(?:which|what|name|list|choose|select|identify|pick|give)\s+(?:the\s+)?(two|three|four|five|2|3|4|5)\b/i;

const words = (s: string) => new Set((s.toLowerCase().match(/[a-z]+/g) ?? []));

// How many things an option lists: comma, semicolon, slash or "and" separated.
export function listedCount(option: string): number {
  return option
    .replace(/\([^)]*\)/g, " ")
    .split(/\s*(?:,|;|\/|\band\b|\bplus\b|&)\s*/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0).length;
}

// The count a stem asks for ("Which TWO controls ..."), or null.
export function requestedCount(stem: string): number | null {
  const m = COUNT_ASK.exec(stem);
  return m ? NUMBER_WORDS[m[1].toLowerCase()] ?? null : null;
}

export function distractorProblems(label: string, stem: unknown, choices: unknown, correctIndex: unknown): string[] {
  const out: string[] = [];
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every((c) => typeof c === "string")) return out;
  if (!Number.isInteger(correctIndex) || (correctIndex as number) < 0 || (correctIndex as number) >= choices.length) return out;
  const opts = choices as string[];
  const key = opts[correctIndex as number].trim();
  const distractors = opts.filter((_, i) => i !== correctIndex).map((o) => o.trim());
  const mean = distractors.reduce((n, d) => n + d.length, 0) / distractors.length;
  if (key.length > KEY_LENGTH_RATIO * mean && key.length - mean > KEY_LENGTH_SLACK_CHARS) {
    out.push(`${label}: the right answer is much longer than the other options (${key.length} vs about ${Math.round(mean)} characters); make the options parallel.`);
  }
  const stemText = typeof stem === "string" ? stem : "";
  const stemWords = words(stemText);
  opts.forEach((o, i) => {
    const w = words(o);
    const abs = ABSOLUTE_WORDS.filter((a) => w.has(a) && !stemWords.has(a));
    if (abs.length) out.push(`${label} option ${i + 1} uses the absolute word "${abs[0]}"; reword it without a cue word.`);
    if (ABOVE.test(o)) out.push(`${label} option ${i + 1} is an "all/none of the above" option.`);
    if (SELF_LABEL.test(o)) out.push(`${label} option ${i + 1} labels itself as right or wrong.`);
  });
  const n = requestedCount(stemText);
  if (n !== null) {
    opts.forEach((o, i) => {
      const got = listedCount(o);
      if (got !== n) out.push(`${label} asks for ${n} but option ${i + 1} lists ${got}; every option must list exactly ${n}.`);
    });
  }
  return out;
}

// The explanations are shown after the learner answers in their own shuffled
// order, so "option B" or "the first choice" points at the wrong text.
function positionRefProblems(label: string, texts: unknown[], out: string[]): void {
  for (const t of texts) {
    if (typeof t === "string" && POSITION_REF.test(t)) {
      out.push(`${label} explanation refers to an option by its position ("${t.match(POSITION_REF)![0]}"); name the option's content instead.`);
      return;
    }
  }
}

// Stored answer position (REQ-187): a fresh random order for the choices
// (and their per-option reasons), with the key's index moved to match. The
// learner already sees a per-learner order (lib/choice-order.ts); this fixes
// the STORED order, which the fact-checker and every exported copy see.
export function shuffleChoices<R>(
  choices: string[],
  correctIndex: number,
  reasons?: R[] | null,
  random: () => number = Math.random
): { choices: string[]; correctIndex: number; reasons: R[] | undefined } {
  const order = choices.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    choices: order.map((i) => choices[i]),
    correctIndex: order.indexOf(correctIndex),
    reasons: Array.isArray(reasons) && reasons.length === choices.length ? order.map((i) => reasons[i]) : reasons ?? undefined,
  };
}

export function shufflePractice<T extends { fadeChoices: string[]; fadeCorrectIndex: number; fadeOptionReasons?: string[]; soloChoices: string[]; soloCorrectIndex: number; soloOptionReasons?: string[] }>(
  p: T,
  random: () => number = Math.random
): T {
  const f = shuffleChoices(p.fadeChoices, p.fadeCorrectIndex, p.fadeOptionReasons, random);
  const s = shuffleChoices(p.soloChoices, p.soloCorrectIndex, p.soloOptionReasons, random);
  return {
    ...p,
    fadeChoices: f.choices,
    fadeCorrectIndex: f.correctIndex,
    ...(f.reasons ? { fadeOptionReasons: f.reasons } : {}),
    soloChoices: s.choices,
    soloCorrectIndex: s.correctIndex,
    ...(s.reasons ? { soloOptionReasons: s.reasons } : {}),
  };
}

export function lessonIntroProblems(intro: Partial<LessonIntroContent>): string[] {
  const out: string[] = [];
  text("Guess prompt", intro.guessPrompt, CONTENT_LIMITS.guessPrompt, out);
  text("Teaching text", intro.teach, CONTENT_LIMITS.teach, out);
  const lang = languageProblem([intro.guessPrompt ?? "", intro.teach ?? ""]);
  if (lang) out.push(lang);
  return out;
}

export function lessonPracticeProblems(p: Partial<LessonPracticeContent>): string[] {
  const out: string[] = [];
  text("Guided question", p.fadeProblem, CONTENT_LIMITS.question, out);
  options("Guided question", p.fadeChoices, p.fadeCorrectIndex, p.fadeOptionReasons, out);
  text("Guided explanation", p.fadeWhy, CONTENT_LIMITS.why, out);
  text("Solo question", p.soloCheck, CONTENT_LIMITS.question, out);
  options("Solo question", p.soloChoices, p.soloCorrectIndex, p.soloOptionReasons, out);
  text("Solo explanation", p.soloWhy, CONTENT_LIMITS.why, out);
  out.push(...distractorProblems("Guided question", p.fadeProblem, p.fadeChoices, p.fadeCorrectIndex));
  out.push(...distractorProblems("Solo question", p.soloCheck, p.soloChoices, p.soloCorrectIndex));
  positionRefProblems("Guided question", [p.fadeWhy, ...(p.fadeOptionReasons ?? [])], out);
  positionRefProblems("Solo question", [p.soloWhy, ...(p.soloOptionReasons ?? [])], out);
  const lang = languageProblem([p.fadeProblem ?? "", p.soloCheck ?? "", ...(p.fadeChoices ?? []), ...(p.soloChoices ?? []), p.fadeWhy ?? "", p.soloWhy ?? ""]);
  if (lang) out.push(lang);
  return out;
}

export function quizItemProblems(q: Partial<CoachQuizItem>): string[] {
  const out: string[] = [];
  text("Quiz question", q.question, CONTENT_LIMITS.question, out);
  options("Quiz question", q.choices, q.correctIndex, undefined, out);
  if (!Array.isArray(q.hints) || !q.hints.length) out.push("Quiz hints are missing.");
  else q.hints.forEach((h, i) => text(`Quiz hint ${i + 1}`, h, CONTENT_LIMITS.hint, out));
  text("Quiz explanation", q.explanation, CONTENT_LIMITS.explanation, out);
  out.push(...distractorProblems("Quiz question", q.question, q.choices, q.correctIndex));
  positionRefProblems("Quiz question", [q.explanation, ...(q.hints ?? [])], out);
  const lang = languageProblem([q.question ?? "", ...(q.choices ?? []), q.explanation ?? ""]);
  if (lang) out.push(lang);
  return out;
}

export class InvalidContentError extends UserFacingError {
  constructor(readonly what: string, readonly problems: string[]) {
    super(`We couldn't put together a good ${what} just now. Nothing was saved -- please try again in a moment.`, 503);
    this.name = "InvalidContentError";
  }
}

// Generate, check, regenerate once on failure, then fail cleanly. The bad
// content is never returned (so never stored).
// REQ-187: the second attempt is handed the first one's problems, so a
// generator can steer the model away from them (fixFor below).
export async function generateValid<T>(
  what: string,
  generate: (attempt: number, previousProblems: string[]) => Promise<T>,
  problemsOf: (t: T) => string[],
  log: (msg: string) => void = (m) => console.warn(m)
): Promise<T> {
  let last: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const out = await generate(attempt, last);
    last = problemsOf(out);
    if (!last.length) return out;
    log(`[content-validator] ${what} failed check (attempt ${attempt}): ${last.slice(0, 5).join(" ")}`);
  }
  throw new InvalidContentError(what, last);
}

// The steer for a retry after failed checks: what to fix, one line each.
export function fixFor(problems: string[]): string | undefined {
  if (!problems.length) return undefined;
  return `A previous draft failed these checks. Fix every one:\n${problems.slice(0, 12).map((p) => `- ${p}`).join("\n")}`;
}
