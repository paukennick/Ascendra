// REQ-320: golden paths for the AZ900 band of AI200/ai200-kql-checkout-latency
// (AZ900/kql-checkout-latency-az900.band.json): the same case and paths, registered to the
// AZ900 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai200-kql.steps.ts";

export const ENTRY = { course: "AZ900", slug: "kql-checkout-latency-az900" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
