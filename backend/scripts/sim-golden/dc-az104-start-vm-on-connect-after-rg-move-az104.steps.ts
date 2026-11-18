// REQ-335: golden paths for the AZ104 band of AZ140/start-vm-on-connect-after-rg-move
// (AZ104/start-vm-on-connect-after-rg-move-az104.band.json): the same case and paths, registered to the
// AZ104 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az140-startvm.steps.ts";

export const ENTRY = { course: "AZ104", slug: "start-vm-on-connect-after-rg-move-az104" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
