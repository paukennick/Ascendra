// REQ-314: golden paths for the CySA+ band of the CEH sandbox report case
// (CYSAPLUS/sandbox-invoice-loader-cysa.band.json): the same case and paths.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./ceh-sandbox.steps.ts";

export const ENTRY = { course: "CYSAPLUS", slug: "sandbox-invoice-loader-cysa" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
