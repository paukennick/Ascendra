// REQ-333: golden paths for the MSCS band of SQL/sql-slow-login-seq-scan
// (MSCS/sql-slow-login-seq-scan-mscs.band.json): the same case and paths, registered to the
// MSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sql-slow-login.steps.ts";

export const ENTRY = { course: "MSCS", slug: "sql-slow-login-seq-scan-mscs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
