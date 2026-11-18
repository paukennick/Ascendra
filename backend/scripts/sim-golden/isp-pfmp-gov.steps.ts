// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PFMP/pfmp-university-portfolio-plan
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PFMP", slug: "pfmp-university-portfolio-plan" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Approvals and strategy read; a full plan; processes defined; the first decision through the model; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["lobby", "strat"] }, answers: { planPrompt: "full", procPrompt: "procs", apprvPrompt: "model" }, close: { how: "honest" } }) },
      { id: "partialPlan", title: "Partly right on the plan, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["lobby"] }, answers: { planPrompt: "listOnly", procPrompt: "procs", apprvPrompt: "model" }, close: { how: "honest" } }) },
      { id: "partialApprv", title: "Partly right on the first decision, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { planPrompt: "full", procPrompt: "procs", apprvPrompt: "exception" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { planPrompt: "listOnly", procPrompt: "riskOnly", apprvPrompt: "exception" }, close: { how: "honest" } }) },
      { id: "badPlan", title: "Everything left to one decision maker", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lobby", "strat"] }, answers: { planPrompt: "vcDecides", procPrompt: "procs", apprvPrompt: "model" }, close: { how: "honest" } }) },
      { id: "badProc", title: "No portfolio processes defined", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lobby", "strat"] }, answers: { planPrompt: "full", procPrompt: "skip", apprvPrompt: "model" }, close: { how: "honest" } }) },
      { id: "badApprv", title: "A 6 million dollar proposal approved outside the model", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lobby", "strat"] }, answers: { planPrompt: "full", procPrompt: "procs", apprvPrompt: "approveSelf" }, close: { how: "honest" } }) },
    ],
  };
}
