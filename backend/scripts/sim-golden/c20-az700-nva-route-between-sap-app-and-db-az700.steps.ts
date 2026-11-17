// REQ-320: golden paths for the AZ700 band of AZ120/nva-route-between-sap-app-and-db
// (AZ700/nva-route-between-sap-app-and-db-az700.band.json): the same case and paths, registered to the
// AZ700 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az120-nva.steps.ts";

export const ENTRY = { course: "AZ700", slug: "nva-route-between-sap-app-and-db-az700" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
