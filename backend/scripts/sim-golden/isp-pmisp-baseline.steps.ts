// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMISP/approved-mitigations-schedule-baseline
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMISP", slug: "approved-mitigations-schedule-baseline" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Risk decisions and change log read; change request; new baseline; honest status; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["riskreg", "changelog"] }, answers: { crPrompt: "changeRequest", rebaselinePrompt: "newPmb", reportPrompt: "honestReport" }, close: { how: "honest" } }) },
      { id: "partialCr", title: "Partly right on change control, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["riskreg"] }, answers: { crPrompt: "notes", rebaselinePrompt: "newPmb", reportPrompt: "honestReport" }, close: { how: "honest" } }) },
      { id: "partialReport", title: "Partly right on variance reporting, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { crPrompt: "changeRequest", rebaselinePrompt: "newPmb", reportPrompt: "noMention" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { crPrompt: "notes", rebaselinePrompt: "keepOld", reportPrompt: "noMention" }, close: { how: "honest" } }) },
      { id: "badCr", title: "Activities added without change control", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["riskreg", "changelog"] }, answers: { crPrompt: "quietAdd", rebaselinePrompt: "newPmb", reportPrompt: "honestReport" }, close: { how: "honest" } }) },
      { id: "badRebaseline", title: "The baseline overwritten without a record", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["riskreg", "changelog"] }, answers: { crPrompt: "changeRequest", rebaselinePrompt: "overwrite", reportPrompt: "honestReport" }, close: { how: "honest" } }) },
      { id: "badReport", title: "The superseded finish date reported", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["riskreg", "changelog"] }, answers: { crPrompt: "changeRequest", rebaselinePrompt: "newPmb", reportPrompt: "hide" }, close: { how: "honest" } }) },
    ],
  };
}
