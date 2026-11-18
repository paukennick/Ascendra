// REQ-335: golden paths for the AWSCLF band of AWSSAP/sqs-visibility-shorter-than-work
// (AWSCLF/sqs-visibility-shorter-than-work-clf.band.json): the same case and paths, registered to the
// AWSCLF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sap-sqs-visibility.steps.ts";

export const ENTRY = { course: "AWSCLF", slug: "sqs-visibility-shorter-than-work-clf" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
