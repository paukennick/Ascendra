// REQ-333: golden paths for the SQL band of DP300/sleeping-session-blocks-orders
// (SQL/open-transaction-blocks-orders-sql.band.json): the same case and paths, registered to the
// SQL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dp300-blocking.steps.ts";

export const ENTRY = { course: "SQL", slug: "open-transaction-blocks-orders-sql" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
