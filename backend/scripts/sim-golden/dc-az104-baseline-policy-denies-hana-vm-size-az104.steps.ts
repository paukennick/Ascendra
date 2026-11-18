// REQ-335: golden paths for the AZ104 band of AZ120/baseline-policy-denies-hana-vm-size
// (AZ104/baseline-policy-denies-hana-vm-size-az104.band.json): the same case and paths, registered to the
// AZ104 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az120-policy.steps.ts";

export const ENTRY = { course: "AZ104", slug: "baseline-policy-denies-hana-vm-size-az104" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
