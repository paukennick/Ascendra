// REQ-314: golden paths for the NCCPT-CPT band of the NASM-CPT PAR-Q+ first session
// (NCCPTCPT/nccpt-parq-chest-tightness.band.json): the same session and paths, on this course's objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-parq.steps.ts";

export const ENTRY = { course: "NCCPTCPT", slug: "nccpt-parq-chest-tightness" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
