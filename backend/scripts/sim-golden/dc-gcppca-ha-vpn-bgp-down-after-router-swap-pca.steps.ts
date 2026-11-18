// REQ-335: golden paths for the GCPPCA band of GCPNET/ha-vpn-bgp-down-after-router-swap
// (GCPPCA/ha-vpn-bgp-down-after-router-swap-pca.band.json): the same case and paths, registered to the
// GCPPCA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-bgp.steps.ts";

export const ENTRY = { course: "GCPPCA", slug: "ha-vpn-bgp-down-after-router-swap-pca" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
