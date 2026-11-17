// REQ-320: golden paths for the AWSSCS band of AWSCLF/leaked-access-key
// (AWSSCS/leaked-access-key-scs.band.json): the same case and paths, registered to the
// AWSSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-clf-key.steps.ts";

export const ENTRY = { course: "AWSSCS", slug: "leaked-access-key-scs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
