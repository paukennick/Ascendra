// REQ-198: study paths on the course page. The server sends the paths a
// course sits on (GET /api/courses/:id/path); this file turns them into
// the "Recommended before / Recommended after" rows and the ordered list.
// Pure, so node --test covers it.

export interface PathStep {
  trackId: string;
  code: string;
  title: string;
  when: string;
  why: string;
  position: number;
  current: boolean;
}

export interface CoursePath {
  slug: string;
  title: string;
  audience: string;
  steps: PathStep[];
  before: PathStep | null;
  after: PathStep | null;
}

export type NeighbourKind = "before" | "after";

export interface NeighbourRow {
  kind: NeighbourKind;
  label: string; // "Recommended before" / "Recommended after"
  step: PathStep;
  a11y: string;
}

export const NEIGHBOUR_LABEL: Record<NeighbourKind, string> = {
  before: "Recommended before",
  after: "Recommended after",
};

// Before first, then after; a path with neither (a one-course path, which
// the server never sends) gives no rows.
export function neighbourRows(path: CoursePath): NeighbourRow[] {
  const rows: NeighbourRow[] = [];
  for (const kind of ["before", "after"] as const) {
    const step = path[kind];
    if (!step) continue;
    rows.push({
      kind,
      label: NEIGHBOUR_LABEL[kind],
      step,
      a11y: `${NEIGHBOUR_LABEL[kind]} this course: ${step.title}. ${step.when}. Opens the course.`,
    });
  }
  return rows;
}

// "Step 2 of 3" for the course being viewed.
export function stepOfLine(path: CoursePath): string | null {
  const here = path.steps.find((s) => s.current);
  return here ? `Step ${here.position} of ${path.steps.length}` : null;
}

// One line per step for the ordered list, e.g. "1. Title: when".
export function stepLine(step: PathStep): string {
  return `${step.position}. ${step.title}${step.current ? " (this course)" : ""}: ${step.when}`;
}

// Defensive parse of the response: anything malformed is dropped, so a bad
// payload hides the panel instead of crashing the course page.
export function parsePaths(body: unknown): CoursePath[] {
  const list = (body as { paths?: unknown } | null)?.paths;
  if (!Array.isArray(list)) return [];
  const isStep = (s: unknown): s is PathStep => {
    const o = s as PathStep;
    return !!o && typeof o.trackId === "string" && typeof o.title === "string" && typeof o.when === "string" && typeof o.position === "number";
  };
  return list.filter((p): p is CoursePath => {
    const o = p as CoursePath;
    return (
      !!o &&
      typeof o.title === "string" &&
      Array.isArray(o.steps) &&
      o.steps.length >= 2 &&
      o.steps.every(isStep) &&
      (o.before === null || isStep(o.before)) &&
      (o.after === null || isStep(o.after))
    );
  });
}
