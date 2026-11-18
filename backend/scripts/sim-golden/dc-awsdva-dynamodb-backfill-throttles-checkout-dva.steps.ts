// REQ-335: golden paths for the AWSDVA band of AWSDEA/dynamodb-backfill-throttles-checkout
// (AWSDVA/dynamodb-backfill-throttles-checkout-dva.band.json): the same case and paths, registered to the
// AWSDVA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dea-ddb-throttle.steps.ts";

export const ENTRY = { course: "AWSDVA", slug: "dynamodb-backfill-throttles-checkout-dva" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
