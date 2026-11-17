// REQ-314: golden paths for the Security+ band of the CISSP facility console case
// (SECPLUS/datahall-tailgate-cooling-secplus.band.json): the same case and paths.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cissp-facility.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "datahall-tailgate-cooling-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
