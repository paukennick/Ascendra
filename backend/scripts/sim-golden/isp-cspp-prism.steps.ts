// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CSPP/cspp-prism-solar-farm-lifecycle
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CSPP", slug: "cspp-prism-solar-farm-lifecycle" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Plan and survey read; whole life cycle; opportunities planned; sustainable procurement; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["plan", "members"] }, answers: { lifePrompt: "full", oppPrompt: "both", procPrompt: "criteria" }, close: { how: "honest" } }) },
      { id: "partialLife", title: "Partly right on the life cycle, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["plan"] }, answers: { lifePrompt: "ops", oppPrompt: "both", procPrompt: "criteria" }, close: { how: "honest" } }) },
      { id: "partialProc", title: "Partly right on procurement, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { lifePrompt: "full", oppPrompt: "both", procPrompt: "cheapCheck" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { lifePrompt: "ops", oppPrompt: "note", procPrompt: "cheapCheck" }, close: { how: "honest" } }) },
      { id: "badLife", title: "The plan kept to commissioning", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "members"] }, answers: { lifePrompt: "handover", oppPrompt: "both", procPrompt: "criteria" }, close: { how: "honest" } }) },
      { id: "badOpp", title: "Herbicide chosen for vegetation", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "members"] }, answers: { lifePrompt: "full", oppPrompt: "herbicide", procPrompt: "criteria" }, close: { how: "honest" } }) },
      { id: "badProc", title: "The cheapest, untraceable supplier chosen", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "members"] }, answers: { lifePrompt: "full", oppPrompt: "both", procPrompt: "cheapest" }, close: { how: "honest" } }) },
    ],
  };
}
