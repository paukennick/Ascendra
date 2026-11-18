// REQ-333: golden paths for the PYAUTO band of PCAP/pcap-csv-encoding-mangled-names
// (PYAUTO/csv-encoding-mangled-names-pyauto.band.json): the same case and paths, registered to the
// PYAUTO objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pcap-encoding.steps.ts";

export const ENTRY = { course: "PYAUTO", slug: "csv-encoding-mangled-names-pyauto" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
