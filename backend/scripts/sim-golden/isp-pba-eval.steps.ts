// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIPBA/pba-deployed-solution-evaluation
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIPBA", slug: "pba-deployed-solution-evaluation" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Results and scope measured; evaluated against the case; gap traced; accepted with gap recorded; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["measure", "gap"] }, answers: { evalPrompt: "caseMeasures", deltaPrompt: "explain", signoffPrompt: "both" }, close: { how: "honest" } }) },
      { id: "partialEval", title: "Partly right on the evaluation, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["measure"] }, answers: { evalPrompt: "survey", deltaPrompt: "explain", signoffPrompt: "both" }, close: { how: "honest" } }) },
      { id: "partialSignoff", title: "Partly right on sign-off, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { evalPrompt: "caseMeasures", deltaPrompt: "explain", signoffPrompt: "hold" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { evalPrompt: "survey", deltaPrompt: "blameUsers", signoffPrompt: "hold" }, close: { how: "honest" } }) },
      { id: "badEval", title: "Success declared without measurement", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["measure", "gap"] }, answers: { evalPrompt: "accept", deltaPrompt: "explain", signoffPrompt: "both" }, close: { how: "honest" } }) },
      { id: "badDelta", title: "Replacement recommended", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["measure", "gap"] }, answers: { evalPrompt: "caseMeasures", deltaPrompt: "newSystem", signoffPrompt: "both" }, close: { how: "honest" } }) },
      { id: "badSignoff", title: "Signed off with the gap dropped", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["measure", "gap"] }, answers: { evalPrompt: "caseMeasures", deltaPrompt: "explain", signoffPrompt: "silent" }, close: { how: "honest" } }) },
    ],
  };
}
