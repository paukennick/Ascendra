// REQ-336: golden paths for the CEH band of SECPLUS/cloud-iam-backdoor
// (CEH/cloud-iam-backdoor-ceh.band.json): the same case and paths, registered to the
// CEH objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-cloud.steps.ts";

export const ENTRY = { course: "CEH", slug: "cloud-iam-backdoor-ceh" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
