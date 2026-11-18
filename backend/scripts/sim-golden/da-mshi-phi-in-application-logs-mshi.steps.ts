// REQ-333: golden paths for the MSHI band of AWSDVA/phi-in-application-logs
// (MSHI/phi-in-application-logs-mshi.band.json): the same case and paths, registered to the
// MSHI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-dva-phi.steps.ts";

export const ENTRY = { course: "MSHI", slug: "phi-in-application-logs-mshi" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
