// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CAPM/community-center-issue-risk-scope
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CAPM", slug: "community-center-issue-risk-scope" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Log and scope read; sorted; assumption validated; gaps closed; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["log", "scope"] }, answers: { sortPrompt: "separate", assumePrompt: "validate", gapsPrompt: "closeGaps" }, close: { how: "honest" } }) },
      { id: "partialSort", title: "Partly right on sorting the log, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["log"] }, answers: { sortPrompt: "rename", assumePrompt: "validate", gapsPrompt: "closeGaps" }, close: { how: "honest" } }) },
      { id: "partialGaps", title: "Partly right on scope gaps, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { sortPrompt: "separate", assumePrompt: "validate", gapsPrompt: "later" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { sortPrompt: "rename", assumePrompt: "hope", gapsPrompt: "later" }, close: { how: "honest" } }) },
      { id: "badSort", title: "A live issue left in the risk log", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["log", "scope"] }, answers: { sortPrompt: "riskAll", assumePrompt: "validate", gapsPrompt: "closeGaps" }, close: { how: "honest" } }) },
      { id: "badAssume", title: "Kitchen started on contingency before the grant", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["log", "scope"] }, answers: { sortPrompt: "separate", assumePrompt: "spendAhead", gapsPrompt: "closeGaps" }, close: { how: "honest" } }) },
      { id: "badGaps", title: "Scope expanded past the budget cap", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["log", "scope"] }, answers: { sortPrompt: "separate", assumePrompt: "validate", gapsPrompt: "addAll" }, close: { how: "honest" } }) },
    ],
  };
}
