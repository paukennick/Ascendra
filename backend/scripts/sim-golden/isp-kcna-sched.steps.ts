// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for KCNA/pending-pods-requests-taints-selectors
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "KCNA", slug: "pending-pods-requests-taints-selectors" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Events and specs read; requests sized; toleration with selector; selector fixed; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["events", "specs"] }, answers: { requestsPrompt: "rightSize", gpuPrompt: "tolerate", selectorPrompt: "fixLabel" }, close: { how: "honest" } }) },
      { id: "partialRequests", title: "Partly right on requests, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["events"] }, answers: { requestsPrompt: "addNodes", gpuPrompt: "tolerate", selectorPrompt: "fixLabel" }, close: { how: "honest" } }) },
      { id: "partialSelector", title: "Partly right on the node selector, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { requestsPrompt: "rightSize", gpuPrompt: "tolerate", selectorPrompt: "dropSelector" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { requestsPrompt: "addNodes", gpuPrompt: "tolerOnly", selectorPrompt: "dropSelector" }, close: { how: "honest" } }) },
      { id: "badRequests", title: "Web left with no requests", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["events", "specs"] }, answers: { requestsPrompt: "noRequests", gpuPrompt: "tolerate", selectorPrompt: "fixLabel" }, close: { how: "honest" } }) },
      { id: "badGpu", title: "The GPU taint removed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["events", "specs"] }, answers: { requestsPrompt: "rightSize", gpuPrompt: "untaint", selectorPrompt: "fixLabel" }, close: { how: "honest" } }) },
      { id: "badSelector", title: "Nodes relabeled to match a typo", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["events", "specs"] }, answers: { requestsPrompt: "rightSize", gpuPrompt: "tolerate", selectorPrompt: "relabel" }, close: { how: "honest" } }) },
    ],
  };
}
