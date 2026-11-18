// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CNPA/platform-as-product-golden-path
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CNPA", slug: "platform-as-product-golden-path" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Teams interviewed and tools inventoried; product goal; golden path; product measures; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["interviews", "inventory"] }, answers: { goalPrompt: "cognitive", pathPrompt: "golden", measurePrompt: "nps" }, close: { how: "honest" } }) },
      { id: "partialGoal", title: "Partly right on the platform's goal, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["interviews"] }, answers: { goalPrompt: "standardize", pathPrompt: "golden", measurePrompt: "nps" }, close: { how: "honest" } }) },
      { id: "partialMeasure", title: "Partly right on measuring success, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { goalPrompt: "cognitive", pathPrompt: "golden", measurePrompt: "templates" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { goalPrompt: "standardize", pathPrompt: "wiki", measurePrompt: "templates" }, close: { how: "honest" } }) },
      { id: "badGoal", title: "A mandatory platform decreed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["interviews", "inventory"] }, answers: { goalPrompt: "decree", pathPrompt: "golden", measurePrompt: "nps" }, close: { how: "honest" } }) },
      { id: "badPath", title: "One locked template for all", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["interviews", "inventory"] }, answers: { goalPrompt: "cognitive", pathPrompt: "locked", measurePrompt: "nps" }, close: { how: "honest" } }) },
      { id: "badMeasure", title: "Adoption made a mandatory KPI", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["interviews", "inventory"] }, answers: { goalPrompt: "cognitive", pathPrompt: "golden", measurePrompt: "mandateKpi" }, close: { how: "honest" } }) },
    ],
  };
}
