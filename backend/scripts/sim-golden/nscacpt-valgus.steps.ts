// REQ-314: golden paths for the NSCA-CPT band of the NASM-CPT overhead squat case
// (NSCACPT/nscacpt-squat-knees-cave.band.json): the same case and paths, on this course's objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-valgus.steps.ts";

export const ENTRY = { course: "NSCACPT", slug: "nscacpt-squat-knees-cave" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
