// REQ-335: golden paths for the AWSAIF band of AWSMLA/endpoint-scaling-latency
// (AWSAIF/endpoint-scaling-latency-aif.band.json): the same case and paths, registered to the
// AWSAIF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-mla-scaling.steps.ts";

export const ENTRY = { course: "AWSAIF", slug: "endpoint-scaling-latency-aif" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
