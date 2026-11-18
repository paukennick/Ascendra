// REQ-335: golden paths for the AZ104 band of DP300/public-access-off-reporting-resolves-public-ip
// (AZ104/public-access-off-reporting-resolves-public-ip-az104.band.json): the same case and paths, registered to the
// AZ104 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dp300-privatelink.steps.ts";

export const ENTRY = { course: "AZ104", slug: "public-access-off-reporting-resolves-public-ip-az104" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
