// REQ-335: golden paths for the GCPSEC band of GCPNET/cloud-nat-port-exhaustion-payment-api
// (GCPSEC/cloud-nat-port-exhaustion-payment-api-sec.band.json): the same case and paths, registered to the
// GCPSEC objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-natports.steps.ts";

export const ENTRY = { course: "GCPSEC", slug: "cloud-nat-port-exhaustion-payment-api-sec" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
