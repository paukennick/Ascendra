// REQ-335: golden paths for the AZ900 band of AZ120/baseline-policy-denies-hana-vm-size
// (AZ900/baseline-policy-denies-hana-vm-size-az900.band.json): the same case and paths, registered to the
// AZ900 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az120-policy.steps.ts";

export const ENTRY = { course: "AZ900", slug: "baseline-policy-denies-hana-vm-size-az900" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
