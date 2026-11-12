// REQ-119 (Audit 3 product M4): the course page's one primary button.
//
// It used to say "Continue studying" even with nothing started, and it
// looked for the first unit whose counts said "unfinished" and then for an
// objective inside it -- a unit with no objectives listed made the button
// do nothing at all. Now:
//   - nothing started            -> "Start course", the first objective
//   - something started          -> "Continue", the first objective (in
//                                   course order) still short of
//                                   Independent: a half-done one first if
//                                   any, so a lesson already open is
//                                   finished before a new one starts
//   - everything Independent+    -> "Review", today's review
//   - no objectives at all       -> null (the page says so instead)
//
// REQ-250 (FAIL-1642): a lesson left part-way has a saved place
// (lesson_saved_at) even before any graded check, when the objective still
// reads "Not started". Such a place counts as started, and the most recently
// saved one is offered first: "Continue" opens it where the learner left off.

import type { MasteryStatus } from "../types/index.ts";

export interface StepObjective {
  id: string;
  title: string;
  mastery_status?: MasteryStatus;
  lesson_saved_at?: string | null;
}

export interface StepUnit {
  id: string;
  objectives?: StepObjective[];
}

export type CourseStep =
  | { kind: "start" | "continue"; label: string; a11y: string; unitId: string; objectiveId: string; objectiveTitle: string }
  | { kind: "review"; label: string; a11y: string };

const DONE: ReadonlySet<string> = new Set(["Independent", "Transfer-ready"]);
const IN_PROGRESS: ReadonlySet<string> = new Set(["Introduced", "Guided", "Needs review"]);

export function nextCourseStep(units: readonly StepUnit[] | null | undefined): CourseStep | null {
  const all: { unitId: string; o: StepObjective }[] = [];
  for (const u of units ?? []) for (const o of u.objectives ?? []) all.push({ unitId: u.id, o });
  if (!all.length) return null;

  const status = (o: StepObjective) => o.mastery_status ?? "Not started";
  const savedAt = (o: StepObjective) => (o.lesson_saved_at ? Date.parse(o.lesson_saved_at) || 0 : 0);
  let resume: { unitId: string; o: StepObjective } | null = null;
  for (const x of all) if (savedAt(x.o) > (resume ? savedAt(resume.o) : 0)) resume = x;
  if (resume) {
    return {
      kind: "continue",
      label: "Continue",
      a11y: `Continue with ${resume.o.title}, where you left off`,
      unitId: resume.unitId,
      objectiveId: resume.o.id,
      objectiveTitle: resume.o.title,
    };
  }
  const started = all.some((x) => status(x.o) !== "Not started");
  if (!started) {
    const first = all[0];
    return {
      kind: "start",
      label: "Start course",
      a11y: `Start course with ${first.o.title}`,
      unitId: first.unitId,
      objectiveId: first.o.id,
      objectiveTitle: first.o.title,
    };
  }
  const next = all.find((x) => IN_PROGRESS.has(status(x.o))) ?? all.find((x) => !DONE.has(status(x.o)));
  if (!next) return { kind: "review", label: "Review", a11y: "Everything is at Independent or above. Open today's review" };
  return {
    kind: "continue",
    label: "Continue",
    a11y: `Continue with ${next.o.title}`,
    unitId: next.unitId,
    objectiveId: next.o.id,
    objectiveTitle: next.o.title,
  };
}
