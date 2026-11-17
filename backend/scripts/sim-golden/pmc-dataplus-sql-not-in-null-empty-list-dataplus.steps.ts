// REQ-321: golden paths for the Data+ (DA0-002) band of SQL/sql-not-in-null-empty-list
// (DATAPLUS/sql-not-in-null-empty-list-dataplus.band.json): the same case and paths, registered to the
// DATAPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sql-notin.steps.ts";

export const ENTRY = { course: "DATAPLUS", slug: "sql-not-in-null-empty-list-dataplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
