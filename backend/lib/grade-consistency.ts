// Audit 3 M1 (FAIL-295, FAIL-296): the server no longer takes the grader's
// verdict on trust.
//
// 1. Consistency. A "correct" verdict that the grader's own structured output
//    contradicts -- missedParts listed, a per-part score below "met", a
//    rubric check false -- was recorded as correct (the audit recorded a PBQ
//    "correct" with every part "missed", and an explain-back "correct" with
//    all four rubric checks false). reconcileVerdict() downgrades it: to
//    "incorrect" when every part / check failed, otherwise to "partial", and
//    says why in the feedback. It never upgrades a verdict.
//
// 2. Trivial answers. "." graded "correct" twice put an objective at
//    Independent with weighted accuracy 1.0. trivialAnswer() catches an
//    answer that is punctuation only, one word with no answer key, a stock non-answer
//    ("idk", "no idea"), or that only restates the question; such an answer
//    is graded incorrect here, without a model call.
//    One exception keeps short right answers honest: where there is an answer
//    key, a one-word answer is NOT trivial -- "256" to "SHA-256 output is ___
//    bits", or a synonym the key doesn't use, still goes to the grader, which
//    sees the key. Where there is no key (PBQ, unit check, lab report,
//    explain-back) every one-word answer is trivial: none of those can be
//    answered in a word.
//
// Applies to free-response grading (lib/free-response-grader.ts: lesson
// grade, lab report, Today's review, the grading eval), PBQ, unit check and
// explain-back.

import type { GradeResult } from "@/lib/prompts";

export type Verdict = "correct" | "partial" | "incorrect";

const STOP = new Set(
  "a an the is are was were be to of in on for and or it its this that what which who how why with as by at from does do did can you your i my me".split(" ")
);

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

const NON_ANSWERS = new Set([
  "idk",
  "i dont know",
  "i do not know",
  "dont know",
  "no idea",
  "not sure",
  "no clue",
  "pass",
  "skip",
  "dunno",
  "idk lol",
  "no clue sorry",
  "asdf",
  "i have no idea",
  "i dont know sorry",
  "just tell me",
  "tell me the answer",
]);

export type TrivialReason = "empty" | "punctuation" | "too_short" | "non_answer" | "restates_question";

export function trivialAnswer(
  answer: string,
  opts: { question: string; answerKey?: string | null }
): TrivialReason | null {
  const trimmed = answer.trim();
  if (!trimmed) return "empty";
  const words = normalizeWords(trimmed);
  if (!words.length) return "punctuation";
  const flat = words.join(" ");
  if (NON_ANSWERS.has(flat)) return "non_answer";
  const keyWords = new Set(normalizeWords(opts.answerKey ?? "").filter((w) => !STOP.has(w)));
  if (words.length < 2) {
    // With a key, one word may be a right answer the key words differently (a
    // synonym, another name for the service), so the grader -- which sees the
    // key -- decides. Without a key (PBQ, unit check, lab, explain-back) no
    // question can be answered in one word.
    if (keyWords.size) return null;
    return "too_short";
  }
  // Restating: every content word of the answer is already in the question,
  // and the answer covers most of the question.
  const qWords = new Set(normalizeWords(opts.question).filter((w) => !STOP.has(w)));
  const content = [...new Set(words.filter((w) => !STOP.has(w)))];
  if (content.length >= 2 && qWords.size >= 3) {
    const allInQuestion = content.every((w) => qWords.has(w));
    const coverage = content.filter((w) => qWords.has(w)).length / qWords.size;
    // An answer that uses a word of the key may be a real answer built from
    // the question's own words ("Counter mode turns a block cipher into a
    // stream cipher"), so it is only a restatement when it covers nearly all
    // of the question.
    const usesKeyWord = content.some((w) => keyWords.has(w));
    if (allInQuestion && coverage >= (usesKeyWord ? 0.9 : 0.6)) return "restates_question";
  }
  return null;
}

const TRIVIAL_FEEDBACK: Record<TrivialReason, string> = {
  empty: "There's no answer here yet.",
  punctuation: "There's no answer here yet -- just punctuation.",
  too_short: "One word isn't enough to show the idea.",
  non_answer: "That's an honest \"not sure\", and that's useful to know.",
  restates_question: "That repeats the question rather than answering it.",
};

// The grade recorded for a trivial answer: incorrect, with every sub-part
// missed, and feedback that treats it as information, not a failing.
export function trivialGrade(reason: TrivialReason, subParts: string[] = []): GradeResult & { trivial: TrivialReason } {
  return {
    verdict: "incorrect",
    feedback: `${TRIVIAL_FEEDBACK[reason]} Have a go in a sentence or two in your own words -- even a rough attempt shows what to work on next, and a miss here is just information.`,
    classification: "incomplete",
    missedParts: subParts.length ? [...subParts] : [],
    modelAnswer: "",
    fixNext: "Write your best attempt in your own words, even if you're unsure.",
    trivial: reason,
  };
}

export interface Evidence {
  missedParts?: string[] | null;
  partScores?: { score: string }[] | null;
  rubric?: Record<string, boolean> | null;
}

// Downgrades a verdict its own evidence contradicts. Returns the verdict to
// record and, when it changed, a sentence to add to the feedback.
export function reconcileVerdict(verdict: Verdict, ev: Evidence): { verdict: Verdict; note: string | null } {
  if (verdict === "incorrect") return { verdict, note: null };
  const parts = (ev.partScores ?? []).filter((p) => p && typeof p.score === "string");
  const rubric = ev.rubric ? Object.values(ev.rubric).filter((v) => typeof v === "boolean") : [];
  const missed = (ev.missedParts ?? []).filter((m) => typeof m === "string" && m.trim());
  const allPartsMissed = parts.length > 0 && parts.every((p) => p.score === "missed");
  const allRubricFalse = rubric.length > 0 && rubric.every((v) => !v);
  if (allPartsMissed || allRubricFalse) {
    return { verdict: "incorrect", note: "Recorded as incorrect: the grading found none of the required parts in this answer." };
  }
  if (verdict === "partial") return { verdict, note: null };
  const somePartShort = parts.some((p) => p.score !== "met");
  const someRubricFalse = rubric.some((v) => !v);
  if (missed.length || somePartShort || someRubricFalse) {
    const what = missed.length ? ` (${missed.slice(0, 4).join("; ")})` : "";
    return { verdict: "partial", note: `Recorded as partial: the grading flagged something still missing${what}.` };
  }
  return { verdict, note: null };
}

// Applies reconcileVerdict to a grader result object in place of the old
// verdict, appending the note to the feedback.
export function reconciled<T extends { verdict: Verdict; feedback: string }>(graded: T, ev: Evidence): T {
  const { verdict, note } = reconcileVerdict(graded.verdict, ev);
  if (!note) return graded;
  return { ...graded, verdict, feedback: `${graded.feedback} ${note}`.trim() };
}
