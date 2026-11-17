// REQ-321: golden paths for the Cloud+ (CV0-004) band of AWSCLF/leaked-access-key
// (CLOUDPLUS/leaked-access-key-cloudplus.band.json): the same case and paths, registered to the
// CLOUDPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-clf-key.steps.ts";

export const ENTRY = { course: "CLOUDPLUS", slug: "leaked-access-key-cloudplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
