// REQ-335: golden paths for the GCPNET band of GCPSEC/vpcsc-blocks-partner-delivery-export
// (GCPNET/vpcsc-blocks-partner-delivery-export-net.band.json): the same case and paths, registered to the
// GCPNET objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpsec-vpcsc.steps.ts";

export const ENTRY = { course: "GCPNET", slug: "vpcsc-blocks-partner-delivery-export-net" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
