// REQ-335: golden paths for the AWSSAA band of AWSDEA/dynamodb-backfill-throttles-checkout
// (AWSSAA/dynamodb-backfill-throttles-checkout-saa.band.json): the same case and paths, registered to the
// AWSSAA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dea-ddb-throttle.steps.ts";

export const ENTRY = { course: "AWSSAA", slug: "dynamodb-backfill-throttles-checkout-saa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
