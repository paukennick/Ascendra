// REQ-335: golden paths for the AZ700 band of DP300/public-access-off-reporting-resolves-public-ip
// (AZ700/public-access-off-reporting-resolves-public-ip-az700.band.json): the same case and paths, registered to the
// AZ700 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dp300-privatelink.steps.ts";

export const ENTRY = { course: "AZ700", slug: "public-access-off-reporting-resolves-public-ip-az700" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
