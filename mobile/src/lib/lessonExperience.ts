// REQ-106: pure rules behind the lesson-experience upgrades -- Teach as short
// cards (research #14), one self-explanation prompt in the worked example
// (#13), the adaptive Guided suggestion (#12) and the lab report (#7). The
// lesson screen and src/components/teachCards.tsx / labReport.tsx render them.

export type TeachCardKind = "definition" | "why" | "example" | "mistake";
export interface TeachCard {
  kind: TeachCardKind;
  title: string;
  body: string;
  steps?: string[];
}
export interface SelfExplainPrompt {
  step: number; // 1-based, into the example card's steps
  question: string;
  modelExplanation: string;
}
export interface TeachCards {
  cards: TeachCard[];
  selfExplain: SelfExplainPrompt | null;
}

import type { GuessMatch } from "./lessonProgress";
export type { GuessMatch, TeachState } from "./lessonProgress";
export type LearnerHistory = "none" | "some" | "strong";

// Cards from the lesson payload, or null for a lesson cached before cards
// (shown as one block of text, as before) or anything malformed.
export function usableCards(v: unknown): TeachCards | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.cards) || o.cards.length < 1) return null;
  const cards = o.cards.filter(
    (c): c is TeachCard =>
      !!c && typeof c === "object" && typeof (c as TeachCard).title === "string" && typeof (c as TeachCard).body === "string"
  );
  if (cards.length !== o.cards.length) return null;
  const se = o.selfExplain as SelfExplainPrompt | null | undefined;
  const example = cards.find((c) => c.kind === "example");
  const selfExplain =
    se && typeof se.question === "string" && typeof se.modelExplanation === "string" &&
    Number.isInteger(se.step) && se.step >= 1 && se.step <= (example?.steps?.length ?? 0)
      ? se
      : null;
  return { cards, selfExplain };
}

// A saved card index from a longer lesson (or junk) lands on a real card.
export function clampCard(card: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(0, Math.floor(Number.isFinite(card) ? card : 0)), count - 1);
}

// What a screen reader announces when a card comes into view.
export function cardAnnouncement(index: number, count: number, title: string): string {
  return `Card ${index + 1} of ${count}: ${title}`;
}

// A horizontal swipe, not a scroll: far enough sideways and clearly more
// sideways than vertical. Returns the direction to move, or 0.
export const SWIPE_MIN_DX = 50;
export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_MIN_DX || Math.abs(dx) < 2 * Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

// Whether the pan responder should take the gesture at all (before it is
// long enough to count), so vertical scrolling is never captured.
export function claimsPan(dx: number, dy: number): boolean {
  return Math.abs(dx) > 12 && Math.abs(dx) > 2 * Math.abs(dy);
}

// ---------------------------------------------------------------------------
// Adaptive Guided suggestion (research #12, expertise reversal). Always a
// suggestion with a clear choice; nothing is skipped or added on its own.
//
//   offer-skip    the guess was close AND the learner already holds
//                 Independent or Transfer-ready here: offer "Skip guided --
//                 go straight to the solo check".
//   full-example  no history here AND the guess was off (or skipped): show
//                 the full worked example, every step, above Guided.
//   standard      everything else, and whenever a signal is missing.
// ---------------------------------------------------------------------------
export type FadingPlan = "offer-skip" | "full-example" | "standard";

export function fadingPlan(input: {
  guessed: boolean;
  guessMatch: GuessMatch | null;
  history: LearnerHistory | null;
}): FadingPlan {
  if (input.guessed && input.guessMatch === "close" && input.history === "strong") return "offer-skip";
  if (input.history === "none" && (!input.guessed || input.guessMatch === "off")) return "full-example";
  return "standard";
}

export const SKIP_GUIDED_NOTE =
  "Your guess was on track and you've done well on this objective before, so guided practice is optional. " +
  "The solo check is still where your level is earned.";
export const FULL_EXAMPLE_NOTE = "New to this one? Here's the full worked example, every step, before you try one with a step missing.";

// ---------------------------------------------------------------------------
// Labs (research #7).
// ---------------------------------------------------------------------------
export const LAB_SAFETY_NOTES = [
  "Use your own computer or a free-tier account you control.",
  "Never run this against production systems, work machines or anything you don't own or have permission to test.",
  "Don't paste passwords, keys, tokens or personal data into your report.",
];

// Says plainly what a lab report counts for on this version.
export const LAB_COUNTS_NOTE =
  "Optional. Your report gets feedback and is saved, but it doesn't change your mastery level yet.";

// The answers to send: one per question, at least one filled in.
export function labReportReady(answers: string[], questionCount: number): boolean {
  return answers.length === questionCount && answers.some((a) => a.trim().length > 0);
}
