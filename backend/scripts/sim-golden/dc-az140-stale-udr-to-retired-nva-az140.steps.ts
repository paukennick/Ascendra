// REQ-335: golden paths for the AZ140 band of AZ700/stale-udr-to-retired-nva
// (AZ140/stale-udr-to-retired-nva-az140.band.json): the same case and paths, registered to the
// AZ140 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az700-udr.steps.ts";

export const ENTRY = { course: "AZ140", slug: "stale-udr-to-retired-nva-az140" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
