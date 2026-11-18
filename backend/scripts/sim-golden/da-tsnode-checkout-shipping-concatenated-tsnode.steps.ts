// REQ-333: golden paths for the TSNODE band of JAVASCRIPT/js-checkout-shipping-concatenated
// (TSNODE/checkout-shipping-concatenated-tsnode.band.json): the same case and paths, registered to the
// TSNODE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./js-coerce.steps.ts";

export const ENTRY = { course: "TSNODE", slug: "checkout-shipping-concatenated-tsnode" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
