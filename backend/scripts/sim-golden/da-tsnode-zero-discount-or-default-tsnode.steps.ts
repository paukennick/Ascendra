// REQ-333: golden paths for the TSNODE band of JAVASCRIPT/js-zero-discount-or-default
// (TSNODE/zero-discount-or-default-tsnode.band.json): the same case and paths, registered to the
// TSNODE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./js-nullish.steps.ts";

export const ENTRY = { course: "TSNODE", slug: "zero-discount-or-default-tsnode" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
