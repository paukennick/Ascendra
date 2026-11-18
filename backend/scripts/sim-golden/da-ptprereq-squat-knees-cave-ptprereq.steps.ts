// REQ-333: golden paths for the PTPREREQ band of NASMCPT/cpt-squat-knees-cave
// (PTPREREQ/squat-knees-cave-ptprereq.band.json): the same case and paths, registered to the
// PTPREREQ objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cpt-valgus.steps.ts";

export const ENTRY = { course: "PTPREREQ", slug: "squat-knees-cave-ptprereq" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
