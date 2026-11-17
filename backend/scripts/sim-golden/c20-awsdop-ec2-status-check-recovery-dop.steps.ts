// REQ-320: golden paths for the AWSDOP band of AWSSOA/ec2-status-check-recovery
// (AWSDOP/ec2-status-check-recovery-dop.band.json): the same case and paths, registered to the
// AWSDOP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-soa-recover.steps.ts";

export const ENTRY = { course: "AWSDOP", slug: "ec2-status-check-recovery-dop" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
