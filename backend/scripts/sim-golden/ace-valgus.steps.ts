// REQ-314: golden paths for the ACE-CPT band of the NASM-CPT overhead squat case
// (ACECPT/ace-squat-knees-cave.band.json): the same case and paths, on this course's objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-valgus.steps.ts";

export const ENTRY = { course: "ACECPT", slug: "ace-squat-knees-cave" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
