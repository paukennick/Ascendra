// REQ-316: golden paths for the AWS CloudOps Engineer Associate (SOA-C03) band of AWSCLF/leaked-access-key
// (AWSSOA/leaked-access-key-soa.band.json): the same case and paths, registered to the
// AWSSOA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-clf-key.steps.ts";

export const ENTRY = { course: "AWSSOA", slug: "leaked-access-key-soa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
