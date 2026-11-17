// REQ-320: golden paths for the AZ104 band of AI200/ai200-kql-checkout-latency
// (AZ104/kql-checkout-latency-az104.band.json): the same case and paths, registered to the
// AZ104 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai200-kql.steps.ts";

export const ENTRY = { course: "AZ104", slug: "kql-checkout-latency-az104" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
