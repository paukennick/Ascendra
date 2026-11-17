// REQ-321: golden paths for the Cloud+ (CV0-004) band of AWSSAA/nat-gateway-bill-spike
// (CLOUDPLUS/nat-gateway-bill-spike-cloudplus.band.json): the same case and paths, registered to the
// CLOUDPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-nat.steps.ts";

export const ENTRY = { course: "CLOUDPLUS", slug: "nat-gateway-bill-spike-cloudplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
