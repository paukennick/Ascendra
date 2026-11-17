// REQ-316: golden paths for the AWS Solutions Architect Associate (SAA-C03) band of AWSCLF/leaked-access-key
// (AWSSAA/leaked-access-key-saa.band.json): the same case and paths, registered to the
// AWSSAA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-clf-key.steps.ts";

export const ENTRY = { course: "AWSSAA", slug: "leaked-access-key-saa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
