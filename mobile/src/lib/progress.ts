// REQ-100: course readiness, in plain language. The numbers come from the
// server (GET /api/courses/:id -> readiness; backend/lib/readiness.ts):
// per-objective weighted accuracy across every kind of question, rolled up by
// the exam blueprint's domain weights. Coverage (how much of the course has
// any evidence) is shown apart from accuracy, so a learner who has only tried
// a few objectives is never told they are ready.
//
// Replaces REQ-078's examReadiness(), which weighted the share of objectives
// at Independent or above and could not tell "not practiced" from "weak".
import type { CourseReadiness } from "../types/index.ts";

export interface ReadinessSummary {
  headline: string;
  // Big number to show beside the headline; null when it would mislead.
  percent: number | null;
  lines: string[];
}

export function readinessSummary(r: CourseReadiness | null | undefined): ReadinessSummary | null {
  if (!r || r.objectives === 0) return null;
  const share = r.blueprintWeighted ? `${r.coveragePercent}% of the exam by weight` : `${r.coveragePercent}% of the course`;
  const practiced = `You've practiced ${r.practiced} of ${r.objectives} objectives (${share}).`;
  const accuracy =
    r.accuracyPercent == null ? null : `On what you've practiced, your weighted accuracy is ${r.accuracyPercent}%.`;
  const focus = r.domains.find((d) => d.unitId === r.focusUnitId);
  const next = focus ? `Biggest gain next: ${focus.title}.` : null;
  const keep = (xs: Array<string | null>) => xs.filter((x): x is string => !!x);

  switch (r.status) {
    case "no_evidence":
      return {
        headline: "No evidence yet",
        percent: null,
        lines: ["Answer a few questions and your readiness estimate will start to show here."],
      };
    case "not_enough_evidence":
      return {
        headline: "Not enough evidence yet",
        percent: null,
        lines: keep([practiced, accuracy, "Practice more objectives before reading much into a readiness score.", next]),
      };
    case "ready":
      return {
        headline: "Looking exam-ready",
        percent: r.readinessPercent,
        lines: keep([practiced, accuracy, "Keep it fresh with spaced review so it stays that way."]),
      };
    default:
      return {
        headline: "Building readiness",
        percent: r.readinessPercent,
        lines: keep([practiced, accuracy, next]),
      };
  }
}

// One line per exam domain for the mastery matrix.
export function domainLine(d: CourseReadiness["domains"][number]): string {
  const parts = [`${d.practiced}/${d.objectives} practiced`];
  if (d.accuracyPercent != null) parts.push(`${d.accuracyPercent}% accuracy`);
  parts.push(`${d.readinessPercent}% ready`);
  return parts.join(" · ");
}
