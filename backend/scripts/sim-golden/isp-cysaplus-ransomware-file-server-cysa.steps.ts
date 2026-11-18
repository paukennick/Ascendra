// REQ-336: golden paths for the CYSAPLUS band of SECPLUS/ransomware-file-server
// (CYSAPLUS/ransomware-file-server-cysa.band.json): the same case and paths, registered to the
// CYSAPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-ransomware.steps.ts";

export const ENTRY = { course: "CYSAPLUS", slug: "ransomware-file-server-cysa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
