// REQ-335: golden paths for the AWSSCS band of AWSSAP/region-scp-blocks-global-services
// (AWSSCS/region-scp-blocks-global-services-scs.band.json): the same case and paths, registered to the
// AWSSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sap-scp-region.steps.ts";

export const ENTRY = { course: "AWSSCS", slug: "region-scp-blocks-global-services-scs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
