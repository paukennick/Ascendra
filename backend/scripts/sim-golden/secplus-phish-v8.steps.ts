// REQ-231: golden paths for the V8 band of the phished-account incident
// (SECPLUSV8/phish-to-account-takeover-v8.band.json): the same incident and
// paths, registered to the SY0-801 objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./secplus-phish.steps.ts";

export const ENTRY = { course: "SECPLUSV8", slug: "phish-to-account-takeover-v8" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
