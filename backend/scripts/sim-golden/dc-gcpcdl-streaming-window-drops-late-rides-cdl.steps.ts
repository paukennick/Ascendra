// REQ-335: golden paths for the GCPCDL band of GCPPDE/streaming-window-drops-late-rides
// (GCPCDL/streaming-window-drops-late-rides-cdl.band.json): the same case and paths, registered to the
// GCPCDL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcppde-lateness.steps.ts";

export const ENTRY = { course: "GCPCDL", slug: "streaming-window-drops-late-rides-cdl" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
