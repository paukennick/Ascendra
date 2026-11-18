// REQ-335: golden paths for the GCPPCA band of GCPSEC/vpcsc-blocks-partner-delivery-export
// (GCPPCA/vpcsc-blocks-partner-delivery-export-pca.band.json): the same case and paths, registered to the
// GCPPCA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpsec-vpcsc.steps.ts";

export const ENTRY = { course: "GCPPCA", slug: "vpcsc-blocks-partner-delivery-export-pca" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
