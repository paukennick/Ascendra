// REQ-335: golden paths for the GCPDEVOPS band of GCPDBE/cloud-run-exhausts-sql-connections
// (GCPDEVOPS/cloud-run-exhausts-sql-connections-devops.band.json): the same case and paths, registered to the
// GCPDEVOPS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdbe-pooling.steps.ts";

export const ENTRY = { course: "GCPDEVOPS", slug: "cloud-run-exhausts-sql-connections-devops" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
