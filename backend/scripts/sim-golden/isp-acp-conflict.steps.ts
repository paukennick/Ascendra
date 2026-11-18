// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIACP/agile-team-conflict-root-cause
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIACP", slug: "agile-team-conflict-root-cause" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Both sides heard and flow read; level diagnosed; collaborative agreement; inspected at retrospective; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["listen", "flow"] }, answers: { levelPrompt: "diagnose", collabPrompt: "collaborate", followPrompt: "retro" }, close: { how: "honest" } }) },
      { id: "partialLevel", title: "Partly right on the conflict's level, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["listen"] }, answers: { levelPrompt: "wait", collabPrompt: "collaborate", followPrompt: "retro" }, close: { how: "honest" } }) },
      { id: "partialFollow", title: "Partly right on follow-through, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { levelPrompt: "diagnose", collabPrompt: "collaborate", followPrompt: "trust" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { levelPrompt: "wait", collabPrompt: "compromise", followPrompt: "trust" }, close: { how: "honest" } }) },
      { id: "badLevel", title: "One person blamed to the manager", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["listen", "flow"] }, answers: { levelPrompt: "blameOne", collabPrompt: "collaborate", followPrompt: "retro" }, close: { how: "honest" } }) },
      { id: "badCollab", title: "A solution imposed on the team", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["listen", "flow"] }, answers: { levelPrompt: "diagnose", collabPrompt: "force", followPrompt: "retro" }, close: { how: "honest" } }) },
      { id: "badFollow", title: "A warning to report violators", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["listen", "flow"] }, answers: { levelPrompt: "diagnose", collabPrompt: "collaborate", followPrompt: "punish" }, close: { how: "honest" } }) },
    ],
  };
}
