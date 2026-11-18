// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CAPM/library-app-requirements-techniques
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CAPM", slug: "library-app-requirements-techniques" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Stakeholders and lessons read; workshop; interviews and observation; survey and stories; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["stakeholders", "lessons"] }, answers: { staffPrompt: "workshop", deskPrompt: "observe", patronsPrompt: "survey" }, close: { how: "honest" } }) },
      { id: "partialStaff", title: "Partly right on branch rules, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["stakeholders"] }, answers: { staffPrompt: "interviews12", deskPrompt: "observe", patronsPrompt: "survey" }, close: { how: "honest" } }) },
      { id: "partialPatrons", title: "Partly right on 30,000 patrons, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { staffPrompt: "workshop", deskPrompt: "observe", patronsPrompt: "focusOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { staffPrompt: "interviews12", deskPrompt: "assumeDesk", patronsPrompt: "focusOnly" }, close: { how: "honest" } }) },
      { id: "badStaff", title: "One branch's rules imposed on all", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["stakeholders", "lessons"] }, answers: { staffPrompt: "pickOne", deskPrompt: "observe", patronsPrompt: "survey" }, close: { how: "honest" } }) },
      { id: "badDesk", title: "Front-desk staff left out of elicitation", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["stakeholders", "lessons"] }, answers: { staffPrompt: "workshop", deskPrompt: "skipDesk", patronsPrompt: "survey" }, close: { how: "honest" } }) },
      { id: "badPatrons", title: "Patron stories written from assumptions", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["stakeholders", "lessons"] }, answers: { staffPrompt: "workshop", deskPrompt: "observe", patronsPrompt: "guess" }, close: { how: "honest" } }) },
    ],
  };
}
