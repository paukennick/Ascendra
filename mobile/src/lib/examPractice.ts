// REQ-109: pure helpers for the practice-exam screen (sprints and mock
// exams). Kept out of the screen so they can be tested with node --test.
import type { ExamFormat, ExamItem, ExamMockState, ExamProfile, ExamResponse } from "../types/exam.ts";

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

// ---------------------------------------------------------------------------
// REQ-298: the review screen, the timer's states, the start screen's summary,
// and the actions a keyboard layer can drive.
// ---------------------------------------------------------------------------

export type ReviewFilter = "all" | "unanswered" | "flagged";

export interface ReviewRow {
  index: number; // position in the list of questions, 0-based
  number: number; // the number shown, 1-based
  unitTitle: string;
  answered: boolean;
  flagged: boolean;
  label: string; // spoken: "Question 4, not answered, flagged for review. Domain."
}

// The review screen's list, in question order. "unanswered" and "flagged" are
// the two lists a real exam's review screen offers; a question can be in both.
export function reviewRows(
  items: Pick<ExamItem, "answered" | "flagged" | "unitTitle">[],
  filter: ReviewFilter
): ReviewRow[] {
  return items
    .map((it, index) => ({
      index,
      number: index + 1,
      unitTitle: it.unitTitle,
      answered: it.answered,
      flagged: it.flagged,
      label: `${navLabel(index, it)}. ${it.unitTitle}. Opens the question.`,
    }))
    .filter((r) => (filter === "unanswered" ? !r.answered : filter === "flagged" ? r.flagged : true));
}

// Spoken when the filter changes (LiveAnnouncement), so the new list is not silent.
export function reviewFilterAnnouncement(filter: ReviewFilter, shown: number): string {
  const what = filter === "unanswered" ? "unanswered" : filter === "flagged" ? "flagged" : "";
  if (!shown) return filter === "all" ? "No questions." : `No ${what} questions.`;
  return `${shown} ${what ? what + " " : ""}question${shown === 1 ? "" : "s"} shown.`;
}

// The clock's states. "low" is the last minute (the clock turns to the warning
// colour); "expired" means the server's deadline has passed and the answers
// saved so far are being submitted. An untimed session has no clock.
export type TimerState = "untimed" | "running" | "low" | "expired";

export const LOW_TIME_SECONDS = 60;

export function timerState(remainingSecondsLeft: number | null): TimerState {
  if (remainingSecondsLeft == null) return "untimed";
  if (remainingSecondsLeft <= 0) return "expired";
  return remainingSecondsLeft <= LOW_TIME_SECONDS ? "low" : "running";
}

export interface MockStartSummary {
  short: boolean;
  title: string; // "Full-length form: 65 questions" / "Short form: 38 of 65 questions"
  timeLine: string; // minutes, and how they were set
  lines: string[]; // plain sentences, in reading order
}

// The mock card's words, from what the server said about the exam and the
// bank. Never says "official" for a length that was not read from a source,
// and never hides a short form.
export function mockStartSummary(profile: ExamProfile, state: ExamMockState | null): MockStartSummary {
  const m = profile.mock;
  const requested = profile.mockQuestions;
  const canBuild = state ? state.canBuild : requested;
  const short = !!state?.short && canBuild < requested;
  const pace = profile.secondsPerQuestion;
  const minutes = profile.durationMinutes;
  const timedMinutes = short && pace ? Math.round((pace * canBuild) / 60) : minutes;
  const timeLine = timedMinutes
    ? `${timedMinutes} minutes${short ? ", the exam's pace" : m?.confirmed ? ", like the real exam" : ""}${m?.minutesNote ? " (see the note below)" : ""}.`
    : "The exam's time limit isn't published, so a timed mock allows 90 seconds a question.";
  const title = short
    ? `Short form: ${canBuild} of ${requested} questions`
    : m?.practiceOnly
      ? `Mixed practice test: ${requested} questions`
      : `Full-length form: ${requested} questions`;
  const lines: string[] = [];
  if (m?.note) lines.push(m.note);
  if (short && state?.reason) lines.push(state.reason);
  if (short && state?.thinDomains.length) {
    lines.push(
      `Thinnest: ${state.thinDomains
        .slice(0, 3)
        .map((d) => `${d.title} (${d.have} of ${d.need})`)
        .join("; ")}.`
    );
  }
  if (m) {
    lines.push(
      m.weights === "exam_blueprint"
        ? `Questions follow the exam's published domain weights.`
        : "No body publishes weights for this exam, so questions follow our own study emphasis, not the exam's."
    );
  }
  if (m?.minutesNote) lines.push(m.minutesNote);
  if (m?.notReproduced) lines.push(`Not in the mock: ${m.notReproduced}.`);
  if (state && state.repeats > 0 && !short) {
    lines.push(`${state.repeats} of these are questions you've seen before, so they count for less toward your mastery.`);
  }
  return { short, title, timeLine, lines };
}

// What a keyboard layer (the N / P / F shortcuts) drives. The practice screen
// builds one of these from its own state and keeps it current; a handler
// should call these and nothing else, so the screen's rules (save before
// leaving a question, the clock, the review screen) stay in one place.
export interface ExamNavActions {
  previous: () => void; // P
  next: () => void; // N
  toggleFlag: () => void; // F
  openReview: () => void;
  closeReview: () => void;
  submit: () => void;
}
