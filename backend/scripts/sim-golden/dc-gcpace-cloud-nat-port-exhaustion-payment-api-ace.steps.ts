// REQ-335: golden paths for the GCPACE band of GCPNET/cloud-nat-port-exhaustion-payment-api
// (GCPACE/cloud-nat-port-exhaustion-payment-api-ace.band.json): the same case and paths, registered to the
// GCPACE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-natports.steps.ts";

export const ENTRY = { course: "GCPACE", slug: "cloud-nat-port-exhaustion-payment-api-ace" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
