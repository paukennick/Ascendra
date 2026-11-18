// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMISP/schedule-status-to-steering-committee
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMISP", slug: "schedule-status-to-steering-committee" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Variance and options analyzed; honest status; impacts for a decision; changes communicated; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["var", "opts"] }, answers: { repPrompt: "honest", caPrompt: "impacts", scopePrompt: "tell" }, close: { how: "honest" } }) },
      { id: "partialRep", title: "Partly right on the status report, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["var"] }, answers: { repPrompt: "amber", caPrompt: "impacts", scopePrompt: "tell" }, close: { how: "honest" } }) },
      { id: "partialScope", title: "Partly right on the scope question, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { repPrompt: "honest", caPrompt: "impacts", scopePrompt: "baselineOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { repPrompt: "amber", caPrompt: "crew", scopePrompt: "baselineOnly" }, close: { how: "honest" } }) },
      { id: "badRep", title: "Green reported while late", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["var", "opts"] }, answers: { repPrompt: "green", caPrompt: "impacts", scopePrompt: "tell" }, close: { how: "honest" } }) },
      { id: "badCa", title: "Migration testing cut to hold the date", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["var", "opts"] }, answers: { repPrompt: "honest", caPrompt: "compress", scopePrompt: "tell" }, close: { how: "honest" } }) },
      { id: "badScope", title: "Dates changed without change control", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["var", "opts"] }, answers: { repPrompt: "honest", caPrompt: "impacts", scopePrompt: "quiet" }, close: { how: "honest" } }) },
    ],
  };
}
