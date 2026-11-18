// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CSPP/cspp-flood-resilient-clinic
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CSPP", slug: "cspp-flood-resilient-clinic" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Flood study and community read; resilience objectives; triple bottom line; wetland restored; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["flood", "comm"] }, answers: { resPrompt: "resilient", tblPrompt: "tbl", regenPrompt: "restore" }, close: { how: "honest" } }) },
      { id: "partialRes", title: "Partly right on resilience, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["flood"] }, answers: { resPrompt: "solarOnly", tblPrompt: "tbl", regenPrompt: "restore" }, close: { how: "honest" } }) },
      { id: "partialRegen", title: "Partly right on regeneration, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { resPrompt: "resilient", tblPrompt: "tbl", regenPrompt: "keep" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { resPrompt: "solarOnly", tblPrompt: "costOnly", regenPrompt: "keep" }, close: { how: "honest" } }) },
      { id: "badRes", title: "Flood risk left to insurance", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["flood", "comm"] }, answers: { resPrompt: "ignoreFlood", tblPrompt: "tbl", regenPrompt: "restore" }, close: { how: "honest" } }) },
      { id: "badTbl", title: "Local jobs promised without budget", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["flood", "comm"] }, answers: { resPrompt: "resilient", tblPrompt: "promise", regenPrompt: "restore" }, close: { how: "honest" } }) },
      { id: "badRegen", title: "The wetland filled for parking", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["flood", "comm"] }, answers: { resPrompt: "resilient", tblPrompt: "tbl", regenPrompt: "fill" }, close: { how: "honest" } }) },
    ],
  };
}
