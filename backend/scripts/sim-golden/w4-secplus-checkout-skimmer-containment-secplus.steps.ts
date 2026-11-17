// REQ-316: golden paths for the Security+ (SY0-701) band of CISM/cism-checkout-skimmer-containment
// (SECPLUS/checkout-skimmer-containment-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cism-contain.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "checkout-skimmer-containment-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
