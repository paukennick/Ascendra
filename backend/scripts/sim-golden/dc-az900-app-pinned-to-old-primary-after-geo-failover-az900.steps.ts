// REQ-335: golden paths for the AZ900 band of DP300/app-pinned-to-old-primary-after-geo-failover
// (AZ900/app-pinned-to-old-primary-after-geo-failover-az900.band.json): the same case and paths, registered to the
// AZ900 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dp300-fog.steps.ts";

export const ENTRY = { course: "AZ900", slug: "app-pinned-to-old-primary-after-geo-failover-az900" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
