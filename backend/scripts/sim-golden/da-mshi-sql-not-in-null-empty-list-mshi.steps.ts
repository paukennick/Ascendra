// REQ-333: golden paths for the MSHI band of SQL/sql-not-in-null-empty-list
// (MSHI/sql-not-in-null-empty-list-mshi.band.json): the same case and paths, registered to the
// MSHI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sql-notin.steps.ts";

export const ENTRY = { course: "MSHI", slug: "sql-not-in-null-empty-list-mshi" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
