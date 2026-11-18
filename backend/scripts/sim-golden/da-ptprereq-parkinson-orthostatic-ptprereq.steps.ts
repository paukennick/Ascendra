// REQ-333: golden paths for the PTPREREQ band of DPT/parkinson-freezing-session
// (PTPREREQ/parkinson-orthostatic-ptprereq.band.json): the same case and paths, registered to the
// PTPREREQ objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-parkinson.steps.ts";

export const ENTRY = { course: "PTPREREQ", slug: "parkinson-orthostatic-ptprereq" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
