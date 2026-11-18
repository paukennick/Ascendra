// REQ-333: golden paths for the PCAP band of PYTHON/py-packing-slips-mutable-default
// (PCAP/packing-slips-mutable-default-pcap.band.json): the same case and paths, registered to the
// PCAP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./py-default.steps.ts";

export const ENTRY = { course: "PCAP", slug: "packing-slips-mutable-default-pcap" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
