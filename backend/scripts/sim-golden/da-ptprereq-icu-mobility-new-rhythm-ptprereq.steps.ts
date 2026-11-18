// REQ-333: golden paths for the PTPREREQ band of DPT/icu-early-mobility
// (PTPREREQ/icu-mobility-new-rhythm-ptprereq.band.json): the same case and paths, registered to the
// PTPREREQ objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-icu.steps.ts";

export const ENTRY = { course: "PTPREREQ", slug: "icu-mobility-new-rhythm-ptprereq" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
