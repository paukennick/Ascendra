// REQ-262 (levels phase 2, part 3): the beginner version of a lesson, the
// pure part -- no React Native, so it is unit tested. BUILT BUT SWITCHED OFF on
// the server: until a course's switch is on and a version is written, no
// lesson carries `version: "beginner"` and nothing here runs.
//
// What a beginner version looks like in the app: Teach in 3 to 5 small steps,
// each with a quick multiple-choice check right after it, then the worked
// example card, then the usual way on to Guided. The quick checks are
// formative: checked here, with instant feedback that explains the picked
// option, never graded on the server, never an attempt, never mastery
// evidence (so the key arrives with the step). The Guided and Solo checks are
// graded on the server as always.

import type { TeachCards } from "./lessonExperience";

export const MIN_STEPS = 3;
export const MAX_STEPS = 5;

export interface TeachStepCheck {
  question: string;
  choices: string[];
  correctIndex: number;
  reasons: string[];
}
export interface TeachStepData {
  title: string;
  plain: string;
  example: string;
  precise: string;
  check: TeachStepCheck;
}

const str = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

// The steps of a lesson payload, or null when it is not a beginner version or
// the steps are not a usable list of 3 to 5 well-formed steps (then the
// standard cards are shown, as before: a malformed variant never blocks a lesson).
export function beginnerSteps(lesson: unknown): TeachStepData[] | null {
  if (!lesson || typeof lesson !== "object") return null;
  const l = lesson as Record<string, unknown>;
  if (l.version !== "beginner" || !Array.isArray(l.teachSteps)) return null;
  if (l.teachSteps.length < MIN_STEPS || l.teachSteps.length > MAX_STEPS) return null;
  const out: TeachStepData[] = [];
  for (const raw of l.teachSteps) {
    if (!raw || typeof raw !== "object") return null;
    const s = raw as Record<string, unknown>;
    const c = s.check as Record<string, unknown> | null | undefined;
    if (!str(s.title) || !str(s.plain) || !str(s.example) || !str(s.precise) || !c || typeof c !== "object") return null;
    if (!str(c.question) || !Array.isArray(c.choices) || c.choices.length < 2 || !c.choices.every(str)) return null;
    if (!Number.isInteger(c.correctIndex) || (c.correctIndex as number) < 0 || (c.correctIndex as number) >= c.choices.length) return null;
    if (!Array.isArray(c.reasons) || c.reasons.length !== c.choices.length || !c.reasons.every(str)) return null;
    out.push({
      title: s.title,
      plain: s.plain,
      example: s.example,
      precise: s.precise,
      check: { question: c.question, choices: c.choices as string[], correctIndex: c.correctIndex as number, reasons: c.reasons as string[] },
    });
  }
  return out;
}

// What the grade, hint and report requests carry so the server grades against
// the version actually shown (absent = the standard lesson). Sent only when
// the steps were really shown: a beginner payload whose steps could not be
// used is displayed as the standard cards, but its Guided item is still the
// beginner one, so the version is named whenever the payload says so.
export function lessonVariantFields(lesson: unknown): { lessonVariant: "new" } | Record<string, never> {
  return lesson && typeof lesson === "object" && (lesson as Record<string, unknown>).version === "beginner" ? { lessonVariant: "new" } : {};
}

// The cards that still show after the steps: the worked example (with its
// self-explanation prompt). The steps replace the definition, why and mistake
// cards. Null when the lesson has no example card.
export function exampleCardsOnly(cards: TeachCards | null): TeachCards | null {
  if (!cards) return null;
  const example = cards.cards.filter((c) => c.kind === "example");
  if (!example.length) return null;
  return { cards: example, selfExplain: cards.selfExplain };
}

export interface StepCheckFeedback {
  correct: boolean;
  correctIndex: number;
  // why the picked option is right or wrong
  reason: string;
  // when wrong, why the right one is right
  rightReason: string | null;
}

export function stepCheckFeedback(check: TeachStepCheck, picked: number): StepCheckFeedback | null {
  if (!Number.isInteger(picked) || picked < 0 || picked >= check.choices.length) return null;
  const correct = picked === check.correctIndex;
  return { correct, correctIndex: check.correctIndex, reason: check.reasons[picked], rightReason: correct ? null : check.reasons[check.correctIndex] };
}

// One step at a time. `answered` is whether the quick check was answered or
// skipped; Next is allowed either way (the check never blocks the lesson).
export interface StepsProgress {
  index: number;
  total: number;
  isLast: boolean;
  label: string;
}
export function stepsProgress(index: number, total: number): StepsProgress {
  const i = Math.min(Math.max(Number.isInteger(index) ? index : 0, 0), Math.max(total - 1, 0));
  return { index: i, total, isLast: i === total - 1, label: `Step ${i + 1} of ${total}` };
}

export const SKIP_CHECK_LABEL = "Skip check";
export const STEPS_DONE_NOTE = "That's the idea in small steps. Next, the full worked example, then practice.";

// The server answers 409 `lesson_changed` when the version an answer names is
// no longer available (the switch went off, the version was replaced).
export function isLessonChanged(err: unknown): boolean {
  const e = err as { status?: unknown; data?: unknown } | null;
  if (!e || e.status !== 409) return false;
  const d = e.data as { code?: unknown } | null | undefined;
  return !!d && typeof d === "object" && d.code === "lesson_changed";
}
