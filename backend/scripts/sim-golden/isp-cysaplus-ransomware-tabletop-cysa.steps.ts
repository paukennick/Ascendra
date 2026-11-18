// REQ-336: golden paths for the CYSAPLUS band of CISM/cism-ransomware-tabletop
// (CYSAPLUS/ransomware-tabletop-cysa.band.json): the same case and paths, registered to the
// CYSAPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cism-tabletop.steps.ts";

export const ENTRY = { course: "CYSAPLUS", slug: "ransomware-tabletop-cysa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
