// REQ-335: golden paths for the AZ305 band of AI200/cosmos-query-without-partition-key-429
// (AZ305/cosmos-query-without-partition-key-429-az305.band.json): the same case and paths, registered to the
// AZ305 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai200-cosmos.steps.ts";

export const ENTRY = { course: "AZ305", slug: "cosmos-query-without-partition-key-429-az305" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
