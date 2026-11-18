// REQ-335: golden paths for the GCPPDE band of GCPMLE/retrain-pipeline-trains-on-broken-feed
// (GCPPDE/retrain-pipeline-trains-on-broken-feed-pde.band.json): the same case and paths, registered to the
// GCPPDE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpmle-validate.steps.ts";

export const ENTRY = { course: "GCPPDE", slug: "retrain-pipeline-trains-on-broken-feed-pde" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
