// REQ-320: golden paths for the AWSSCS band of AWSSAA/guardduty-role-credentials-macie
// (AWSSCS/guardduty-role-credentials-macie-scs.band.json): the same case and paths, registered to the
// AWSSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./saa-guardduty.steps.ts";

export const ENTRY = { course: "AWSSCS", slug: "guardduty-role-credentials-macie-scs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
