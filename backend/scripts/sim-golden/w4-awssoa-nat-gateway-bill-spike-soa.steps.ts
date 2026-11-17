// REQ-316: golden paths for the AWS CloudOps Engineer Associate (SOA-C03) band of AWSSAA/nat-gateway-bill-spike
// (AWSSOA/nat-gateway-bill-spike-soa.band.json): the same case and paths, registered to the
// AWSSOA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-nat.steps.ts";

export const ENTRY = { course: "AWSSOA", slug: "nat-gateway-bill-spike-soa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
