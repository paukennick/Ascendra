// REQ-314: golden paths for the NCCPT-CPT band of the NASM-CPT overhead squat case
// (NCCPTCPT/nccpt-squat-knees-cave.band.json): the same case and paths, on this course's objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-valgus.steps.ts";

export const ENTRY = { course: "NCCPTCPT", slug: "nccpt-squat-knees-cave" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
