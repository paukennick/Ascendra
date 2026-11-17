// REQ-316: golden paths for the AWS Cloud Practitioner (CLF-C02) band of AWSSAA/nat-gateway-bill-spike
// (AWSCLF/nat-gateway-bill-spike-clf.band.json): the same case and paths, registered to the
// AWSCLF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-nat.steps.ts";

export const ENTRY = { course: "AWSCLF", slug: "nat-gateway-bill-spike-clf" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
