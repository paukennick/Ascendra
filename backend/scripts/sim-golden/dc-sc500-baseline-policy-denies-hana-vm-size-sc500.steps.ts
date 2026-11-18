// REQ-335: golden paths for the SC500 band of AZ120/baseline-policy-denies-hana-vm-size
// (SC500/baseline-policy-denies-hana-vm-size-sc500.band.json): the same case and paths, registered to the
// SC500 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az120-policy.steps.ts";

export const ENTRY = { course: "SC500", slug: "baseline-policy-denies-hana-vm-size-sc500" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
