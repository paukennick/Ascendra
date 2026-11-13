// REQ-250: "I'm locked into the lesson" (pilot feedback, 2026-11-12).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  LEAVE_NOTE,
  courseProgressPath,
  homeExitMode,
  lessonExitFallback,
  objectiveRowStatus,
  showLeaveNote,
} from "./lessonExit.ts";
import { goBackOr, type BackRouter } from "./goBack.ts";
import { savedStepFor } from "./lessonProgress.ts";
import { nextCourseStep } from "./nextStep.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const lessonScreen = readFileSync(path.join(here, "../../app/(app)/course/[trackId]/lesson/[objectiveId].tsx"), "utf8");

function fakeRouter(canGoBack: boolean) {
  const calls: string[] = [];
  const r: BackRouter = {
    canGoBack: () => canGoBack,
    back: () => void calls.push("back"),
    replace: (href) => void calls.push(`replace ${href}`),
  };
  return { r, calls };
}

describe("Save and exit (FAIL-1640)", () => {
  test("goes back when the lesson was opened from somewhere", () => {
    const { r, calls } = fakeRouter(true);
    goBackOr(r, lessonExitFallback("t1"));
    assert.deepEqual(calls, ["back"]);
  });
  test("after a reload or a direct link (no history) it replaces the lesson with its course", () => {
    const { r, calls } = fakeRouter(false);
    goBackOr(r, lessonExitFallback("t 1/x"));
    assert.deepEqual(calls, ["replace /course/t%201%2Fx"]);
  });
  test("the Progress screen is this course's", () => {
    assert.equal(courseProgressPath("abc"), "/course/abc/progress");
  });
  test("Home pops back when Home is in the stack, otherwise replaces (never leaves the lesson underneath)", () => {
    assert.equal(homeExitMode(["/", "/course/t1", "/course/t1/lesson/o1"]), "dismissTo");
    assert.equal(homeExitMode(["/course/t1/lesson/o1"]), "replace");
    assert.equal(homeExitMode(["/course/t1", "/course/t1/lesson/o1"]), "replace");
    assert.equal(homeExitMode([]), "replace");
  });
  test("the note is on every step but the done screen, which has its own exits", () => {
    for (const s of ["guess", "teach", "fade", "solo", "lab"] as const) assert.equal(showLeaveNote(s), true, s);
    assert.equal(showLeaveNote("done"), false);
    assert.match(LEAVE_NOTE, /place is saved/);
  });
  test("the screen wires the exit into the header on every state (loading and error too), not router.back()", () => {
    assert.equal((lessonScreen.match(/<Stack\.Screen options=\{headerOptions\} \/>/g) ?? []).length, 3);
    assert.match(lessonScreen, /useGoBack\(lessonExitFallback\(trackId\)\)/);
    assert.match(lessonScreen, /accessibilityLabel="Save and exit"/);
    assert.match(lessonScreen, /accessibilityLabel="Course progress"/);
    assert.ok(!/router\.back\(\)/.test(lessonScreen));
    // Each way out sends the pending account save first.
    for (const fn of ["saveAndExit", "goHome", "openProgress"]) {
      assert.match(lessonScreen, new RegExp(`function ${fn}\\(\\) \\{\\n\\s+flushServerSave\\(\\);`), fn);
    }
  });
});

describe("leaving at 'Try it' keeps the place (FAIL-1641)", () => {
  test("the lab step is saved as the graded Solo step; guess and done clear", () => {
    assert.equal(savedStepFor("lab"), "solo");
    for (const s of ["teach", "fade", "solo"]) assert.equal(savedStepFor(s), s);
    assert.equal(savedStepFor("guess"), null);
    assert.equal(savedStepFor("done"), null);
  });
  test("the screen saves through savedStepFor", () => {
    assert.match(lessonScreen, /const savedStep = savedStepFor\(step\);/);
    assert.match(lessonScreen, /step: savedStep,/);
  });
});

describe("the course page shows a saved place (FAIL-1642)", () => {
  const o = (id: string, mastery_status?: "Guided" | "Independent", lesson_saved_at?: string) => ({
    id,
    title: `Objective ${id}`,
    mastery_status,
    lesson_saved_at,
  });
  test("a place saved before any graded check reads In progress, not Not started", () => {
    assert.deepEqual(objectiveRowStatus(o("a", undefined, "2026-11-12T10:00:00Z")), { status: "In progress", saved: true });
    assert.deepEqual(objectiveRowStatus(o("a", "Guided", "2026-11-12T10:00:00Z")), { status: "Guided", saved: true });
    assert.deepEqual(objectiveRowStatus(o("a")), { status: "Not started", saved: false });
    assert.deepEqual(objectiveRowStatus({ mastery_status: null, lesson_saved_at: null }), { status: "Not started", saved: false });
  });
  test("with nothing graded, a saved place makes the button Continue to it, not Start course", () => {
    const s = nextCourseStep([{ id: "u1", objectives: [o("a"), o("b", undefined, "2026-11-12T10:00:00Z")] }]);
    assert.equal(s?.kind, "continue");
    assert.equal(s && "objectiveId" in s ? s.objectiveId : null, "b");
    assert.match(s?.a11y ?? "", /where you left off/);
  });
  test("the most recently saved place wins, ahead of an earlier half-done objective", () => {
    const s = nextCourseStep([
      { id: "u1", objectives: [o("a", "Guided"), o("b", undefined, "2026-11-10T10:00:00Z")] },
      { id: "u2", objectives: [o("c", "Independent", "2026-11-12T10:00:00Z")] },
    ]);
    assert.equal(s && "objectiveId" in s ? s.objectiveId : null, "c");
    assert.equal(s && "unitId" in s ? s.unitId : null, "u2");
  });
  test("without a saved place nothing changes", () => {
    assert.equal(nextCourseStep([{ id: "u1", objectives: [o("a"), o("b")] }])?.kind, "start");
    assert.equal(nextCourseStep([{ id: "u1", objectives: [o("a", "Independent")] }])?.kind, "review");
  });
});
