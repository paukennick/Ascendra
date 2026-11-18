// REQ-333: golden paths for the MSCS band of CEH/ceh-blind-sqli-search
// (MSCS/ceh-blind-sqli-search-mscs.band.json): the same case and paths, registered to the
// MSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ceh-sqli.steps.ts";

export const ENTRY = { course: "MSCS", slug: "ceh-blind-sqli-search-mscs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
