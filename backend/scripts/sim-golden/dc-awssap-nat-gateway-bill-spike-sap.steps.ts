// REQ-335: golden paths for the AWSSAP band of AWSSAA/nat-gateway-bill-spike
// (AWSSAP/nat-gateway-bill-spike-sap.band.json): the same case and paths, registered to the
// AWSSAP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-nat.steps.ts";

export const ENTRY = { course: "AWSSAP", slug: "nat-gateway-bill-spike-sap" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
