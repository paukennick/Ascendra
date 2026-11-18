// REQ-333: golden paths for the MSCS band of SQL/sql-flash-sale-oversold
// (MSCS/sql-flash-sale-oversold-mscs.band.json): the same case and paths, registered to the
// MSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sql-oversold.steps.ts";

export const ENTRY = { course: "MSCS", slug: "sql-flash-sale-oversold-mscs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
