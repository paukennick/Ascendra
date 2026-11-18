// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CGOA/gitops-store-fleet-patterns
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CGOA", slug: "gitops-store-fleet-patterns" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Network report and layout read; agents at the edge; environment directories; webhooks with polling; an honest decision", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["links", "repo"] }, answers: { wherePrompt: "agents", layoutPrompt: "dirs", triggerPrompt: "both" }, close: { how: "honest" } }) },
      { id: "partialWhere", title: "Partly right on reconciler placement, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["links"] }, answers: { wherePrompt: "hubAll", layoutPrompt: "dirs", triggerPrompt: "both" }, close: { how: "honest" } }) },
      { id: "partialTrigger", title: "Partly right on reconciliation triggers, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { wherePrompt: "agents", layoutPrompt: "dirs", triggerPrompt: "pollOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { wherePrompt: "hubAll", layoutPrompt: "mono", triggerPrompt: "pollOnly" }, close: { how: "honest" } }) },
      { id: "badWhere", title: "CI pushes to stores; 13 stores miss a fix", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["links", "repo"] }, answers: { wherePrompt: "scripts", layoutPrompt: "dirs", triggerPrompt: "both" }, close: { how: "honest" } }) },
      { id: "badLayout", title: "Branch per environment; a fix never reaches prod", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["links", "repo"] }, answers: { wherePrompt: "agents", layoutPrompt: "branches", triggerPrompt: "both" }, close: { how: "honest" } }) },
      { id: "badTrigger", title: "Webhooks only; stores miss a change for good", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["links", "repo"] }, answers: { wherePrompt: "agents", layoutPrompt: "dirs", triggerPrompt: "webhookOnly" }, close: { how: "honest" } }) },
    ],
  };
}
