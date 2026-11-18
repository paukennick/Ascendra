// REQ-333: golden paths for the PYTHON band of PCEP/pcep-shipping-tiers-unreachable-branch
// (PYTHON/shipping-tiers-unreachable-branch-python.band.json): the same case and paths, registered to the
// PYTHON objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pcep-elif.steps.ts";

export const ENTRY = { course: "PYTHON", slug: "shipping-tiers-unreachable-branch-python" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
