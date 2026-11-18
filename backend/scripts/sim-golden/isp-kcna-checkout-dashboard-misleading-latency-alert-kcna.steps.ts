// REQ-336: golden paths for the KCNA band of PCA/checkout-dashboard-misleading-latency-alert
// (KCNA/checkout-dashboard-misleading-latency-alert-kcna.band.json): the same case and paths, registered to the
// KCNA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-pca-dashboards.steps.ts";

export const ENTRY = { course: "KCNA", slug: "checkout-dashboard-misleading-latency-alert-kcna" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
