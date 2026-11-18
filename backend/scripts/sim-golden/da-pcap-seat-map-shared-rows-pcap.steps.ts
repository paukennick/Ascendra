// REQ-333: golden paths for the PCAP band of PCEP/pcep-seat-map-shared-rows
// (PCAP/seat-map-shared-rows-pcap.band.json): the same case and paths, registered to the
// PCAP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pcep-rows.steps.ts";

export const ENTRY = { course: "PCAP", slug: "seat-map-shared-rows-pcap" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
