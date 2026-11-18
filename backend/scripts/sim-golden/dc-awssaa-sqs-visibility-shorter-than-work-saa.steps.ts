// REQ-335: golden paths for the AWSSAA band of AWSSAP/sqs-visibility-shorter-than-work
// (AWSSAA/sqs-visibility-shorter-than-work-saa.band.json): the same case and paths, registered to the
// AWSSAA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sap-sqs-visibility.steps.ts";

export const ENTRY = { course: "AWSSAA", slug: "sqs-visibility-shorter-than-work-saa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
