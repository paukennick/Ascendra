// REQ-297: golden paths for the CKA band of the KCNA Service selector outage
// (CKA/service-selector-no-endpoints-cka.band.json): the same outage and
// paths, registered to the CKA objective on Services with no endpoints.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./kcna-selector.steps.ts";

export const ENTRY = { course: "CKA", slug: "service-selector-no-endpoints-cka" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
