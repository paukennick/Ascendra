// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMICP/transit-depot-interface-points
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMICP", slug: "transit-depot-interface-points" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Clash and scopes read; register; classification; settled and improved; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["clash", "scopes"] }, answers: { ipsPrompt: "register", classifyPrompt: "classified", changePrompt: "contractual" }, close: { how: "honest" } }) },
      { id: "partialIps", title: "Partly right on interface points, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["clash"] }, answers: { ipsPrompt: "weekly", classifyPrompt: "classified", changePrompt: "contractual" }, close: { how: "honest" } }) },
      { id: "partialChange", title: "Partly right on the slab change, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { ipsPrompt: "register", classifyPrompt: "classified", changePrompt: "split" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { ipsPrompt: "weekly", classifyPrompt: "equal", changePrompt: "split" }, close: { how: "honest" } }) },
      { id: "badIps", title: "Interfaces left to the contractors", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["clash", "scopes"] }, answers: { ipsPrompt: "contractors", classifyPrompt: "classified", changePrompt: "contractual" }, close: { how: "honest" } }) },
      { id: "badClassify", title: "Only physical interfaces tracked", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["clash", "scopes"] }, answers: { ipsPrompt: "register", classifyPrompt: "ignoreSoft", changePrompt: "contractual" }, close: { how: "honest" } }) },
      { id: "badChange", title: "The rework absorbed without a lesson", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["clash", "scopes"] }, answers: { ipsPrompt: "register", classifyPrompt: "classified", changePrompt: "owner" }, close: { how: "honest" } }) },
    ],
  };
}
