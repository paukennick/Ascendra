// REQ-109: pure helpers for the practice-exam screen (sprints and mock
// exams). Kept out of the screen so they can be tested with node --test.
import type { ExamFormat, ExamItem, ExamResponse } from "../types/exam.ts";

// Ordering without drag: move the step at `index` up (-1) or down (+1).
// Returns a new array; a move past either end changes nothing.
export function moveStep(order: number[], index: number, dir: -1 | 1): number[] {
  const to = index + dir;
  if (index < 0 || index >= order.length || to < 0 || to >= order.length) return order;
  const next = [...order];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

// The order an ordering question starts in: the saved one, else as shown.
export function initialOrder(item: Pick<ExamItem, "steps" | "response">): number[] {
  const n = item.steps?.length ?? 0;
  const saved = item.response?.order;
  if (saved && saved.length === n) return saved;
  return Array.from({ length: n }, (_, i) => i);
}

// Multiple response: toggle a choice, never more than selectCount picked
// (a full selection must drop one before adding another).
export function toggleChoice(selected: number[], index: number, max: number): number[] {
  if (selected.includes(index)) return selected.filter((i) => i !== index);
  if (selected.length >= max) return selected;
  return [...selected, index].sort((a, b) => a - b);
}

export function isAnswered(item: Pick<ExamItem, "format" | "selectCount">, r: ExamResponse | null): boolean {
  if (!r) return false;
  switch (item.format) {
    case "multiple_choice":
      return r.choice != null;
    case "multiple_response":
      return (r.choices?.length ?? 0) === (item.selectCount ?? 0);
    case "ordering":
      return (r.order?.length ?? 0) > 0;
    case "matching":
      return !!r.matches && r.matches.length > 0 && r.matches.every((m) => m != null);
  }
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six"];

export function formatInstruction(item: Pick<ExamItem, "format" | "selectCount">): string {
  switch (item.format) {
    case "multiple_choice":
      return "Choose one.";
    case "multiple_response":
      return `Choose ${NUMBER_WORDS[item.selectCount ?? 2] ?? item.selectCount}.`;
    case "ordering":
      return "Put the steps in order. Use Move up and Move down.";
    case "matching":
      return "Pick the matching answer for each item.";
  }
}

export const FORMAT_LABEL: Record<ExamFormat, string> = {
  multiple_choice: "Multiple choice",
  multiple_response: "Multiple response",
  ordering: "Ordering",
  matching: "Matching",
};

// "m:ss", or "h:mm:ss" past an hour. Negative shows 0:00.
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

// Seconds left on the server's deadline. The device clock may be wrong, so
// the offset between the server's clock and the device's when the session
// was loaded is applied: remaining = deadline - (serverNow + time since load).
export function remainingSeconds(
  deadlineAt: string | null,
  serverNow: string,
  loadedAtDeviceMs: number,
  deviceNowMs: number
): number | null {
  if (!deadlineAt) return null;
  const serverNowMs = Date.parse(serverNow) + (deviceNowMs - loadedAtDeviceMs);
  return Math.max(0, Math.round((Date.parse(deadlineAt) - serverNowMs) / 1000));
}

// Spoken at a few points rather than every second, so a screen reader isn't
// flooded.
export function timeAnnouncement(remaining: number | null): string | null {
  if (remaining == null) return null;
  const marks: Record<number, string> = {
    600: "Ten minutes left.",
    300: "Five minutes left.",
    60: "One minute left.",
  };
  return marks[remaining] ?? null;
}

export interface NavCounts {
  answered: number;
  unanswered: number;
  flagged: number;
}

export function navCounts(items: Pick<ExamItem, "answered" | "flagged">[]): NavCounts {
  const answered = items.filter((i) => i.answered).length;
  return { answered, unanswered: items.length - answered, flagged: items.filter((i) => i.flagged).length };
}

// The confirm line before submitting: what's still open, said plainly.
export function submitWarning(c: NavCounts): string {
  const parts: string[] = [];
  if (c.unanswered) parts.push(`${c.unanswered} unanswered`);
  if (c.flagged) parts.push(`${c.flagged} flagged for review`);
  return parts.length
    ? `You have ${parts.join(" and ")}. Blank answers count as wrong on the score but don't count against your mastery.`
    : "Every question has an answer.";
}

// Accessible label for a question number in the navigator.
export function navLabel(i: number, item: Pick<ExamItem, "answered" | "flagged">): string {
  return `Question ${i + 1}, ${item.answered ? "answered" : "not answered"}${item.flagged ? ", flagged for review" : ""}`;
}

// REQ-217 (FAIL-1049): whether leaving a running exam screen must first save
// the answers and warn about unsaved ones. Never against a sign-out, session
// expiry or lock, which remove the screen on purpose, nor once leaving has
// been confirmed.
export function examLeaveGuard(allowLeave: boolean, signedIn: boolean): boolean {
  return !allowLeave && signedIn;
}
