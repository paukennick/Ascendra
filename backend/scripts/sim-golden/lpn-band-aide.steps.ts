// REQ-334: golden paths for the LPN/VN band of NCLEXPN/aide-feeding-thin-liquids-dysphagia
// (LPNVN/aide-feeding-thin-liquids-dysphagia-lpn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps lpn-band-aide
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pn-aide.steps.ts";

export const ENTRY = { course: "LPNVN", slug: "aide-feeding-thin-liquids-dysphagia-lpn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
