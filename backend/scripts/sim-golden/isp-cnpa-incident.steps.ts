// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CNPA/platform-ingress-outage-tabletop
// on the tabletop screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CNPA", slug: "platform-ingress-outage-tabletop" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Plan and budget read; platform-led command; gaps owned and dated; a blameless review with the budget applied; an honest report", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["plan", "budget"] }, answers: { cmdPrompt: "commander", runbookPrompt: "owned", reviewPrompt: "blameless" }, close: { how: "honest" } }) },
      { id: "partialCmd", title: "Partly right on command, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["plan"] }, answers: { cmdPrompt: "tickets", runbookPrompt: "owned", reviewPrompt: "blameless" }, close: { how: "honest" } }) },
      { id: "partialReview", title: "Partly right on the review, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { cmdPrompt: "commander", runbookPrompt: "owned", reviewPrompt: "skipBudget" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { cmdPrompt: "tickets", runbookPrompt: "noted", reviewPrompt: "skipBudget" }, close: { how: "honest" } }) },
      { id: "badCmd", title: "The outage fixed quietly; tenants roll back healthy releases", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "budget"] }, answers: { cmdPrompt: "silent", runbookPrompt: "owned", reviewPrompt: "blameless" }, close: { how: "honest" } }) },
      { id: "badRunbook", title: "One senior engineer made the plan", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "budget"] }, answers: { cmdPrompt: "commander", runbookPrompt: "hero", reviewPrompt: "blameless" }, close: { how: "honest" } }) },
      { id: "badReview", title: "The report names and blames an engineer", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "budget"] }, answers: { cmdPrompt: "commander", runbookPrompt: "owned", reviewPrompt: "blame" }, close: { how: "honest" } }) },
    ],
  };
}
