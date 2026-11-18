// REQ-333: golden paths for the PTPREREQ band of DPT/stroke-balance-fall-risk
// (PTPREREQ/stroke-balance-fall-risk-ptprereq.band.json): the same case and paths, registered to the
// PTPREREQ objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-stroke.steps.ts";

export const ENTRY = { course: "PTPREREQ", slug: "stroke-balance-fall-risk-ptprereq" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
