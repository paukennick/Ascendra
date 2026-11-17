// REQ-320: golden paths for the AZ305 band of AI200/ai200-kql-checkout-latency
// (AZ305/kql-checkout-latency-az305.band.json): the same case and paths, registered to the
// AZ305 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai200-kql.steps.ts";

export const ENTRY = { course: "AZ305", slug: "kql-checkout-latency-az305" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
