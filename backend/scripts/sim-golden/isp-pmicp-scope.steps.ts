// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMICP/school-build-change-orders
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMICP", slug: "school-build-change-orders" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Log and budget read; tiered process; outcome triage; value engineering; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["log", "budget"] }, answers: { procPrompt: "tiered", evalPrompt: "outcome", vePrompt: "ve" }, close: { how: "honest" } }) },
      { id: "partialProc", title: "Partly right on the change process, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["log"] }, answers: { procPrompt: "faster", evalPrompt: "outcome", vePrompt: "ve" }, close: { how: "honest" } }) },
      { id: "partialVe", title: "Partly right on value engineering, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { procPrompt: "tiered", evalPrompt: "outcome", vePrompt: "cutScope" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { procPrompt: "faster", evalPrompt: "first", vePrompt: "cutScope" }, close: { how: "honest" } }) },
      { id: "badProc", title: "Crews told to build before approval", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["log", "budget"] }, answers: { procPrompt: "atRisk", evalPrompt: "outcome", vePrompt: "ve" }, close: { how: "honest" } }) },
      { id: "badEval", title: "Every change approved", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["log", "budget"] }, answers: { procPrompt: "tiered", evalPrompt: "all", vePrompt: "ve" }, close: { how: "honest" } }) },
      { id: "badVe", title: "The code-required upgrade deferred", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["log", "budget"] }, answers: { procPrompt: "tiered", evalPrompt: "outcome", vePrompt: "skipCode" }, close: { how: "honest" } }) },
    ],
  };
}
