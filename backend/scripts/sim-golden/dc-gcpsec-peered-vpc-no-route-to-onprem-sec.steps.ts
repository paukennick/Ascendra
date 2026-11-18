// REQ-335: golden paths for the GCPSEC band of GCPNET/peered-vpc-no-route-to-onprem
// (GCPSEC/peered-vpc-no-route-to-onprem-sec.band.json): the same case and paths, registered to the
// GCPSEC objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-peering.steps.ts";

export const ENTRY = { course: "GCPSEC", slug: "peered-vpc-no-route-to-onprem-sec" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
