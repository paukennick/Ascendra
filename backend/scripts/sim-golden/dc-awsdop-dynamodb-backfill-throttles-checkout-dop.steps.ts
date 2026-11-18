// REQ-335: golden paths for the AWSDOP band of AWSDEA/dynamodb-backfill-throttles-checkout
// (AWSDOP/dynamodb-backfill-throttles-checkout-dop.band.json): the same case and paths, registered to the
// AWSDOP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dea-ddb-throttle.steps.ts";

export const ENTRY = { course: "AWSDOP", slug: "dynamodb-backfill-throttles-checkout-dop" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
