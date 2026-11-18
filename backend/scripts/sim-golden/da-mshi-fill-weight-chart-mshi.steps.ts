// REQ-333: golden paths for the MSHI band of CSSGB/cssgb-fill-weight-chart
// (MSHI/fill-weight-chart-mshi.band.json): the same case and paths, registered to the
// MSHI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cssgb-chart.steps.ts";

export const ENTRY = { course: "MSHI", slug: "fill-weight-chart-mshi" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
