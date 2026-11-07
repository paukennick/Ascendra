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
// Callers regenerate once on failure, then fail cleanly (a 503 the app shows
// as "try again"), and never store the bad content.

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
export async function generateValid<T>(
  what: string,
  generate: (attempt: number) => Promise<T>,
  problemsOf: (t: T) => string[],
  log: (msg: string) => void = (m) => console.warn(m)
): Promise<T> {
  let last: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const out = await generate(attempt);
    last = problemsOf(out);
    if (!last.length) return out;
    log(`[content-validator] ${what} failed check (attempt ${attempt}): ${last.slice(0, 5).join(" ")}`);
  }
  throw new InvalidContentError(what, last);
}
