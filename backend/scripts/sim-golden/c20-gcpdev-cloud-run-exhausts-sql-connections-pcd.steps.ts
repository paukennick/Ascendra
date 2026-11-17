// REQ-320: golden paths for the GCPDEV band of GCPDBE/cloud-run-exhausts-sql-connections
// (GCPDEV/cloud-run-exhausts-sql-connections-pcd.band.json): the same case and paths, registered to the
// GCPDEV objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdbe-pooling.steps.ts";

export const ENTRY = { course: "GCPDEV", slug: "cloud-run-exhausts-sql-connections-pcd" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
