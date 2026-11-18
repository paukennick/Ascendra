// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PSMI/po-delegates-backlog-to-analyst
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PSMI", slug: "po-delegates-backlog-to-analyst" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Backlogs read and Priya asked; accountability kept; one backlog; DoD held; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["backlogs", "ask"] }, answers: { delegPrompt: "poAccountable", oneblPrompt: "merge", acceptPrompt: "dodHolds" }, close: { how: "honest" } }) },
      { id: "partialDeleg", title: "Partly right on delegation, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["backlogs"] }, answers: { delegPrompt: "unclear", oneblPrompt: "merge", acceptPrompt: "dodHolds" }, close: { how: "honest" } }) },
      { id: "partialAccept", title: "Partly right on acceptance, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { delegPrompt: "poAccountable", oneblPrompt: "merge", acceptPrompt: "deferPriya" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { delegPrompt: "unclear", oneblPrompt: "sync", acceptPrompt: "deferPriya" }, close: { how: "honest" } }) },
      { id: "badDeleg", title: "The analyst declared Product Owner", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["backlogs", "ask"] }, answers: { delegPrompt: "marcoPo", oneblPrompt: "merge", acceptPrompt: "dodHolds" }, close: { how: "honest" } }) },
      { id: "badOnebl", title: "Team B kept its own backlog", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["backlogs", "ask"] }, answers: { delegPrompt: "poAccountable", oneblPrompt: "bOwn", acceptPrompt: "dodHolds" }, close: { how: "honest" } }) },
      { id: "badAccept", title: "Undone work accepted as done", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["backlogs", "ask"] }, answers: { delegPrompt: "poAccountable", oneblPrompt: "merge", acceptPrompt: "acceptIt" }, close: { how: "honest" } }) },
    ],
  };
}
