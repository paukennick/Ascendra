// REQ-333: golden paths for the PTPREREQ band of DPT/dizziness-central-red-flags
// (PTPREREQ/central-dizziness-red-flags-ptprereq.band.json): the same case and paths, registered to the
// PTPREREQ objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-central.steps.ts";

export const ENTRY = { course: "PTPREREQ", slug: "central-dizziness-red-flags-ptprereq" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
