// REQ-335: golden paths for the AWSCLF band of AWSDEA/dynamodb-backfill-throttles-checkout
// (AWSCLF/dynamodb-backfill-throttles-checkout-clf.band.json): the same case and paths, registered to the
// AWSCLF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dea-ddb-throttle.steps.ts";

export const ENTRY = { course: "AWSCLF", slug: "dynamodb-backfill-throttles-checkout-clf" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
