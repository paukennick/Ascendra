// REQ-316: golden paths for the Security+ (SY0-701) band of SECURITYX/ot-segmentation-breach
// (SECPLUS/ot-segmentation-breach-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./sx-ot.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "ot-segmentation-breach-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
