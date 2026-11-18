// REQ-333: golden paths for the MSCS band of LINUXPLUS/full-var-stops-database
// (MSCS/full-var-stops-database-mscs.band.json): the same case and paths, registered to the
// MSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./linux-full-var.steps.ts";

export const ENTRY = { course: "MSCS", slug: "full-var-stops-database-mscs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
