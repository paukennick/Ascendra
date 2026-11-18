// REQ-333: golden paths for the PTPREREQ band of NPTEPTA/pta-treadmill-pressure-falls-with-grade
// (PTPREREQ/treadmill-pressure-falls-with-grade-ptprereq.band.json): the same case and paths, registered to the
// PTPREREQ objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pta-bp.steps.ts";

export const ENTRY = { course: "PTPREREQ", slug: "treadmill-pressure-falls-with-grade-ptprereq" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
