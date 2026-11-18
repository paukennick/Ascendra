// REQ-335: golden paths for the AWSDVA band of AWSSAP/sqs-visibility-shorter-than-work
// (AWSDVA/sqs-visibility-shorter-than-work-dva.band.json): the same case and paths, registered to the
// AWSDVA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sap-sqs-visibility.steps.ts";

export const ENTRY = { course: "AWSDVA", slug: "sqs-visibility-shorter-than-work-dva" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
