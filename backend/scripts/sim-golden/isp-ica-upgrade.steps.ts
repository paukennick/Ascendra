// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for ICA/istio-canary-revision-upgrade
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "ICA", slug: "istio-canary-revision-upgrade" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Precheck and labels read; a 1-23 revision; namespaces moved one by one; 1.22 removed at zero proxies; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["precheck", "labels"] }, answers: { methodPrompt: "revision", movePrompt: "oneByOne", oldPrompt: "verifyRemove" }, close: { how: "honest" } }) },
      { id: "partialMethod", title: "Partly right on the method, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["precheck"] }, answers: { methodPrompt: "inPlace", movePrompt: "oneByOne", oldPrompt: "verifyRemove" }, close: { how: "honest" } }) },
      { id: "partialOld", title: "Partly right on the old control plane, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { methodPrompt: "revision", movePrompt: "oneByOne", oldPrompt: "keepOld" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { methodPrompt: "inPlace", movePrompt: "allLabels", oldPrompt: "keepOld" }, close: { how: "honest" } }) },
      { id: "badMethod", title: "A two-minor jump in place", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["precheck", "labels"] }, answers: { methodPrompt: "skip", movePrompt: "oneByOne", oldPrompt: "verifyRemove" }, close: { how: "honest" } }) },
      { id: "badMove", title: "Both injection labels left on the namespaces", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["precheck", "labels"] }, answers: { methodPrompt: "revision", movePrompt: "bothLabels", oldPrompt: "verifyRemove" }, close: { how: "honest" } }) },
      { id: "badOld", title: "The old revision removed while a proxy used it", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["precheck", "labels"] }, answers: { methodPrompt: "revision", movePrompt: "oneByOne", oldPrompt: "removeNow" }, close: { how: "honest" } }) },
    ],
  };
}
