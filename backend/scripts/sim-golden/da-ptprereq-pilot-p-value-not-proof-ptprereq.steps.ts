// REQ-333: golden paths for the PTPREREQ band of CMPCBS/cmpcbs-pilot-p-value-not-proof
// (PTPREREQ/pilot-p-value-not-proof-ptprereq.band.json): the same case and paths, registered to the
// PTPREREQ objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cmp-pvalue.steps.ts";

export const ENTRY = { course: "PTPREREQ", slug: "pilot-p-value-not-proof-ptprereq" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
