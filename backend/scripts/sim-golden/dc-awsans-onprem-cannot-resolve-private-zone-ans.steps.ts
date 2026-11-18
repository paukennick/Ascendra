// REQ-335: golden paths for the AWSANS band of AWSSAP/onprem-cannot-resolve-private-zone
// (AWSANS/onprem-cannot-resolve-private-zone-ans.band.json): the same case and paths, registered to the
// AWSANS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sap-hybrid-dns.steps.ts";

export const ENTRY = { course: "AWSANS", slug: "onprem-cannot-resolve-private-zone-ans" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
