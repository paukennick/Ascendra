// REQ-335: golden paths for the AZ120 band of AZ700/stale-udr-to-retired-nva
// (AZ120/stale-udr-to-retired-nva-az120.band.json): the same case and paths, registered to the
// AZ120 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az700-udr.steps.ts";

export const ENTRY = { course: "AZ120", slug: "stale-udr-to-retired-nva-az120" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
