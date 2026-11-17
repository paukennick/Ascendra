// REQ-312: golden paths for the PCAP band of the PYTHON traceback case
// (PCAP/py-import-crash-traceback-pcap.band.json): the same case and paths,
// registered to the PCAP objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./py-trace.steps.ts";

export const ENTRY = { course: "PCAP", slug: "py-import-crash-traceback-pcap" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
