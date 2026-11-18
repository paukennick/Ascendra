// REQ-335: golden paths for the GCPACE band of GCPNET/peered-vpc-no-route-to-onprem
// (GCPACE/peered-vpc-no-route-to-onprem-ace.band.json): the same case and paths, registered to the
// GCPACE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-peering.steps.ts";

export const ENTRY = { course: "GCPACE", slug: "peered-vpc-no-route-to-onprem-ace" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
