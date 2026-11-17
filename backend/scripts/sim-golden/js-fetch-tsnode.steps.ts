// REQ-312: golden paths for the TSNODE band of the JAVASCRIPT fetch case
// (TSNODE/js-rate-board-zero-percent-tsnode.band.json): the same case and
// paths in the board's Node.js proxy, registered to the TSNODE objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./js-fetch.steps.ts";

export const ENTRY = { course: "TSNODE", slug: "js-rate-board-zero-percent-tsnode" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
