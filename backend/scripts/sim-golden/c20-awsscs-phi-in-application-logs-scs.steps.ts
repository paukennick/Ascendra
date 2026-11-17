// REQ-320: golden paths for the AWSSCS band of AWSDVA/phi-in-application-logs
// (AWSSCS/phi-in-application-logs-scs.band.json): the same case and paths, registered to the
// AWSSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-dva-phi.steps.ts";

export const ENTRY = { course: "AWSSCS", slug: "phi-in-application-logs-scs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
