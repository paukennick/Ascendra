// REQ-320: golden paths for the AZ104 band of AZ700/stale-udr-to-retired-nva
// (AZ104/stale-udr-to-retired-nva-az104.band.json): the same case and paths, registered to the
// AZ104 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az700-udr.steps.ts";

export const ENTRY = { course: "AZ104", slug: "stale-udr-to-retired-nva-az104" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
