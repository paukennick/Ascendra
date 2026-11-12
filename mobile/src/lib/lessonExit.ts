// REQ-250 (FAIL-1640): leaving a lesson. A pilot tester felt "locked into the
// lesson": on the web a reload or a link opened straight to a lesson leaves
// no history, so the header had no back arrow, and nothing on screen said the
// place was kept. The lesson now has its own way out on every step (and on
// its loading and error states), a way to the course's Progress screen and to
// Home, and one line saying the place is saved.
//
// Pure (no React Native imports) so `npm test` can run it under node:test.

import type { Step } from "./lesson-steps.ts";
import { courseHome } from "./goBack.ts";

export const LEAVE_NOTE = "Your place is saved — leave any time and pick up here.";

// The done screen has its own exits ("Back to course", "Next objective") and
// nothing left to save, so the note is not shown there.
export function showLeaveNote(step: Step): boolean {
  return step !== "done";
}

// "Save and exit" goes back when there is a screen to return to (goBackOr),
// otherwise it replaces the lesson with its course.
export function lessonExitFallback(trackId: string): string {
  return courseHome(trackId);
}

export function courseProgressPath(trackId: string): string {
  return `${courseHome(trackId)}/progress`;
}

function normalize(p: string): string {
  const noQuery = p.split("?")[0].split("#")[0];
  return noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery || "/";
}

// "Home" from a lesson: pop back to Home when it is in the stack (the usual
// Home -> Course -> Lesson), otherwise replace the lesson with Home, so the
// lesson isn't left underneath for Back to return to. Never a push: Home's
// route name is unique, so dismissTo pops to the right screen (navPlan.ts).
export function homeExitMode(stackPaths: readonly string[]): "dismissTo" | "replace" {
  return stackPaths.some((p) => normalize(p) === "/") ? "dismissTo" : "replace";
}

// REQ-250 (FAIL-1642): how an objective row on the course and Mastery pages
// reads. A saved place before any graded check used to read "Not started".
export const SAVED_PLACE_LABEL = "Place saved";
export function objectiveRowStatus(o: { mastery_status?: string | null; lesson_saved_at?: string | null }): {
  status: string;
  saved: boolean;
} {
  const saved = !!o.lesson_saved_at;
  const mastery = o.mastery_status ?? "Not started";
  return { status: saved && mastery === "Not started" ? "In progress" : mastery, saved };
}
