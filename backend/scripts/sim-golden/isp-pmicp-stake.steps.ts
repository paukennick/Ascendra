// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMICP/school-build-stakeholders-culture
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMICP", slug: "school-build-stakeholders-culture" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Map and crews read; key stakeholders engaged; communication adapted; tailored messages; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["map", "crews"] }, answers: { idPrompt: "assess", cultPrompt: "adapt", msgPrompt: "tailored" }, close: { how: "honest" } }) },
      { id: "partialId", title: "Partly right on identifying stakeholders, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["map"] }, answers: { idPrompt: "listOnly", cultPrompt: "adapt", msgPrompt: "tailored" }, close: { how: "honest" } }) },
      { id: "partialMsg", title: "Partly right on messages, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { idPrompt: "assess", cultPrompt: "adapt", msgPrompt: "oneLetter" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { idPrompt: "listOnly", cultPrompt: "interpreter", msgPrompt: "oneLetter" }, close: { how: "honest" } }) },
      { id: "badId", title: "Infection control not engaged", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["map", "crews"] }, answers: { idPrompt: "later", cultPrompt: "adapt", msgPrompt: "tailored" }, close: { how: "honest" } }) },
      { id: "badCult", title: "Crews held to an impossible commitment", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["map", "crews"] }, answers: { idPrompt: "assess", cultPrompt: "push", msgPrompt: "tailored" }, close: { how: "honest" } }) },
      { id: "badMsg", title: "No advance notice", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["map", "crews"] }, answers: { idPrompt: "assess", cultPrompt: "adapt", msgPrompt: "nothing" }, close: { how: "honest" } }) },
    ],
  };
}
