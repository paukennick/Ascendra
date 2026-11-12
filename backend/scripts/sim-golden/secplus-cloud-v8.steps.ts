// REQ-231: golden paths for the V8 band of the leaked-cloud-key incident
// (SECPLUSV8/cloud-iam-backdoor-v8.band.json): the same incident and
// paths, registered to the SY0-801 objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./secplus-cloud.steps.ts";

export const ENTRY = { course: "SECPLUSV8", slug: "cloud-iam-backdoor-v8" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
