// REQ-320: golden paths for the AZ400 band of AI200/ai200-kql-checkout-latency
// (AZ400/kql-checkout-latency-az400.band.json): the same case and paths, registered to the
// AZ400 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai200-kql.steps.ts";

export const ENTRY = { course: "AZ400", slug: "kql-checkout-latency-az400" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
