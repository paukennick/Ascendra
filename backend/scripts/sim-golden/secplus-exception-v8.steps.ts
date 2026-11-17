// REQ-313: golden paths for the SECPLUSV8 band of cism-risk-appetite-exception
// (SECPLUSV8/risk-exception-appetite-v8.band.json): the same case and paths, registered to the
// SECPLUSV8 objective (docs/sims.md 22.26).
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cism-exception.steps.ts";

export const ENTRY = { course: "SECPLUSV8", slug: "risk-exception-appetite-v8" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
