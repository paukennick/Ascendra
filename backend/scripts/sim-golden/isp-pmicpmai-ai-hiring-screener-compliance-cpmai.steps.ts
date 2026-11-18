// REQ-336: golden paths for the PMICPMAI band of SECAIPLUS/ai-hiring-screener-compliance
// (PMICPMAI/ai-hiring-screener-compliance-cpmai.band.json): the same case and paths, registered to the
// PMICPMAI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-secai-grc.steps.ts";

export const ENTRY = { course: "PMICPMAI", slug: "ai-hiring-screener-compliance-cpmai" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
