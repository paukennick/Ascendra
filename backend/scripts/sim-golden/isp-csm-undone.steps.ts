// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CSM/undone-work-end-of-sprint
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CSM", slug: "undone-work-end-of-sprint" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Backlog read and stakeholder heard; undone returned; only Done presented; Definition kept; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["board", "pressure"] }, answers: { undonePrompt: "backlog", presentPrompt: "onlyDone", doneDefPrompt: "keepDod" }, close: { how: "honest" } }) },
      { id: "partialUndone", title: "Partly right on item A, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["board"] }, answers: { undonePrompt: "extend", presentPrompt: "onlyDone", doneDefPrompt: "keepDod" }, close: { how: "honest" } }) },
      { id: "partialDoneDef", title: "Partly right on the Definition of Done, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { undonePrompt: "backlog", presentPrompt: "onlyDone", doneDefPrompt: "waive" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { undonePrompt: "extend", presentPrompt: "vague", doneDefPrompt: "waive" }, close: { how: "honest" } }) },
      { id: "badUndone", title: "Item A released with failing security scans", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["board", "pressure"] }, answers: { undonePrompt: "releaseA", presentPrompt: "onlyDone", doneDefPrompt: "keepDod" }, close: { how: "honest" } }) },
      { id: "badPresent", title: "Undone work reported as complete", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["board", "pressure"] }, answers: { undonePrompt: "backlog", presentPrompt: "claimFive", doneDefPrompt: "keepDod" }, close: { how: "honest" } }) },
      { id: "badDoneDef", title: "Security scan removed from the Definition of Done", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["board", "pressure"] }, answers: { undonePrompt: "backlog", presentPrompt: "onlyDone", doneDefPrompt: "dropScan" }, close: { how: "honest" } }) },
    ],
  };
}
