// REQ-333: golden paths for the PTPREREQ band of NPTEPTA/pta-back-pain-new-bladder-symptoms
// (PTPREREQ/back-pain-bladder-symptoms-ptprereq.band.json): the same case and paths, registered to the
// PTPREREQ objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pta-ces.steps.ts";

export const ENTRY = { course: "PTPREREQ", slug: "back-pain-bladder-symptoms-ptprereq" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
