// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PFMP/pfmp-bank-portfolio-escalation
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PFMP", slug: "pfmp-bank-portfolio-escalation" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Metrics and supply read; escalated; consolidated; rebalanced by priority; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["metrics", "supply"] }, answers: { escPrompt: "board", perfPrompt: "consolidate", resPrompt: "rebalance" }, close: { how: "honest" } }) },
      { id: "partialEsc", title: "Partly right on the escalation, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["metrics"] }, answers: { escPrompt: "later", perfPrompt: "consolidate", resPrompt: "rebalance" }, close: { how: "honest" } }) },
      { id: "partialRes", title: "Partly right on the resources, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { escPrompt: "board", perfPrompt: "consolidate", resPrompt: "hire" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { escPrompt: "later", perfPrompt: "bundle", resPrompt: "hire" }, close: { how: "honest" } }) },
      { id: "badEsc", title: "Absorbed without escalation", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["metrics", "supply"] }, answers: { escPrompt: "bury", perfPrompt: "consolidate", resPrompt: "rebalance" }, close: { how: "honest" } }) },
      { id: "badPerf", title: "A RAG list instead of metrics", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["metrics", "supply"] }, answers: { escPrompt: "board", perfPrompt: "rag", resPrompt: "rebalance" }, close: { how: "honest" } }) },
      { id: "badRes", title: "Engineers moved without approval", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["metrics", "supply"] }, answers: { escPrompt: "board", perfPrompt: "consolidate", resPrompt: "grab" }, close: { how: "honest" } }) },
    ],
  };
}
