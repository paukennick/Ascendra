// REQ-323: golden paths for the strength and conditioning band of the NASM-CPT overhead squat case
// (NSCACSCS/cscs-squat-knees-cave.band.json): the same case and paths, on this course's objective.
//
//   npm run sim:golden -- steps cscs-band-valgus
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-valgus.steps.ts";

export const ENTRY = { course: "NSCACSCS", slug: "cscs-squat-knees-cave" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
