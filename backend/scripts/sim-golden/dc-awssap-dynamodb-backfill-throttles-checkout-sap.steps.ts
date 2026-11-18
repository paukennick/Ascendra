// REQ-335: golden paths for the AWSSAP band of AWSDEA/dynamodb-backfill-throttles-checkout
// (AWSSAP/dynamodb-backfill-throttles-checkout-sap.band.json): the same case and paths, registered to the
// AWSSAP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dea-ddb-throttle.steps.ts";

export const ENTRY = { course: "AWSSAP", slug: "dynamodb-backfill-throttles-checkout-sap" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
