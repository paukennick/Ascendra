// REQ-320: golden paths for the AZ104 band of AZ140/fslogix-share-missing-share-permission
// (AZ104/fslogix-share-missing-share-permission-az104.band.json): the same case and paths, registered to the
// AZ104 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az140-fslogix.steps.ts";

export const ENTRY = { course: "AZ104", slug: "fslogix-share-missing-share-permission-az104" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
