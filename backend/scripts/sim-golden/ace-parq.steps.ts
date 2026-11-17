// REQ-314: golden paths for the ACE-CPT band of the NASM-CPT PAR-Q+ first session
// (ACECPT/ace-parq-chest-tightness.band.json): the same session and paths, on this course's objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-parq.steps.ts";

export const ENTRY = { course: "ACECPT", slug: "ace-parq-chest-tightness" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
