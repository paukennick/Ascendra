// REQ-335: golden paths for the AWSDEA band of AWSSOA/rds-update-without-where-pitr
// (AWSDEA/rds-update-without-where-pitr-dea.band.json): the same case and paths, registered to the
// AWSDEA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./soa-pitr.steps.ts";

export const ENTRY = { course: "AWSDEA", slug: "rds-update-without-where-pitr-dea" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
