// REQ-335: golden paths for the AWSCLF band of AWSSOA/ec2-status-check-recovery
// (AWSCLF/ec2-status-check-recovery-clf.band.json): the same case and paths, registered to the
// AWSCLF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-soa-recover.steps.ts";

export const ENTRY = { course: "AWSCLF", slug: "ec2-status-check-recovery-clf" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
