// REQ-335: golden paths for the AWSSCS band of SECPLUS/cloud-iam-backdoor
// (AWSSCS/cloud-iam-backdoor-scs.band.json): the same case and paths, registered to the
// AWSSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-cloud.steps.ts";

export const ENTRY = { course: "AWSSCS", slug: "cloud-iam-backdoor-scs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
