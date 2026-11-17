// REQ-320: golden paths for the AWSANS band of AWSSAA/nat-gateway-bill-spike
// (AWSANS/nat-gateway-bill-spike-ans.band.json): the same case and paths, registered to the
// AWSANS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-nat.steps.ts";

export const ENTRY = { course: "AWSANS", slug: "nat-gateway-bill-spike-ans" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
