// REQ-335: golden paths for the AWSDOP band of AWSSAP/region-scp-blocks-global-services
// (AWSDOP/region-scp-blocks-global-services-dop.band.json): the same case and paths, registered to the
// AWSDOP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sap-scp-region.steps.ts";

export const ENTRY = { course: "AWSDOP", slug: "region-scp-blocks-global-services-dop" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
