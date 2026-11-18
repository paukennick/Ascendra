// REQ-333: golden paths for the PTPREREQ band of NPTEPTA/pta-six-minute-walk-saturation-drops
// (PTPREREQ/six-minute-walk-saturation-ptprereq.band.json): the same case and paths, registered to the
// PTPREREQ objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pta-6mwt.steps.ts";

export const ENTRY = { course: "PTPREREQ", slug: "six-minute-walk-saturation-ptprereq" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
