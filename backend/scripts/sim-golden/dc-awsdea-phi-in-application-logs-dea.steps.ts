// REQ-335: golden paths for the AWSDEA band of AWSDVA/phi-in-application-logs
// (AWSDEA/phi-in-application-logs-dea.band.json): the same case and paths, registered to the
// AWSDEA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-dva-phi.steps.ts";

export const ENTRY = { course: "AWSDEA", slug: "phi-in-application-logs-dea" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
