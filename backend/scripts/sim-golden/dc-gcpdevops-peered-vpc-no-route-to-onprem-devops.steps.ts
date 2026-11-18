// REQ-335: golden paths for the GCPDEVOPS band of GCPNET/peered-vpc-no-route-to-onprem
// (GCPDEVOPS/peered-vpc-no-route-to-onprem-devops.band.json): the same case and paths, registered to the
// GCPDEVOPS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-peering.steps.ts";

export const ENTRY = { course: "GCPDEVOPS", slug: "peered-vpc-no-route-to-onprem-devops" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
