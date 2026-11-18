// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CSPP/cspp-highway-sustainability-plan-bribery
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CSPP", slug: "cspp-highway-sustainability-plan-bribery" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Plan and villages reviewed; refused and controlled; community plan; leading indicators; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["smp", "villages"] }, answers: { abcPrompt: "refuse", communityPrompt: "invest", indPrompt: "lead" }, close: { how: "honest" } }) },
      { id: "partialAbc", title: "Partly right on anti-bribery, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["smp"] }, answers: { abcPrompt: "ask", communityPrompt: "invest", indPrompt: "lead" }, close: { how: "honest" } }) },
      { id: "partialInd", title: "Partly right on indicators, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { abcPrompt: "refuse", communityPrompt: "invest", indPrompt: "lagOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { abcPrompt: "ask", communityPrompt: "charity", indPrompt: "lagOnly" }, close: { how: "honest" } }) },
      { id: "badAbc", title: "The permit fee paid", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["smp", "villages"] }, answers: { abcPrompt: "pay", communityPrompt: "invest", indPrompt: "lead" }, close: { how: "honest" } }) },
      { id: "badCommunity", title: "Compensation left to the government", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["smp", "villages"] }, answers: { abcPrompt: "refuse", communityPrompt: "ignore", indPrompt: "lead" }, close: { how: "honest" } }) },
      { id: "badInd", title: "The plan handed off", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["smp", "villages"] }, answers: { abcPrompt: "refuse", communityPrompt: "invest", indPrompt: "delegate" }, close: { how: "honest" } }) },
    ],
  };
}
