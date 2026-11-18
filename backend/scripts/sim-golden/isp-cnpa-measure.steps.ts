// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CNPA/platform-metrics-dora-review
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CNPA", slug: "platform-metrics-dora-review" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Data and baseline read; four DORA metrics; used for team learning; product measures for the platform; an honest decision", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["data", "base"] }, answers: { whichPrompt: "four", usePrompt: "improve", dxPrompt: "product" }, close: { how: "honest" } }) },
      { id: "partialWhich", title: "Partly right on the metrics, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["data"] }, answers: { whichPrompt: "speedOnly", usePrompt: "improve", dxPrompt: "product" }, close: { how: "honest" } }) },
      { id: "partialDx", title: "Partly right on developer experience, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { whichPrompt: "four", usePrompt: "improve", dxPrompt: "adoptionOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { whichPrompt: "speedOnly", usePrompt: "teamsRank", dxPrompt: "adoptionOnly" }, close: { how: "honest" } }) },
      { id: "badWhich", title: "Commits and tickets per developer adopted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["data", "base"] }, answers: { whichPrompt: "activity", usePrompt: "improve", dxPrompt: "product" }, close: { how: "honest" } }) },
      { id: "badUse", title: "Individuals ranked by the metrics", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["data", "base"] }, answers: { whichPrompt: "four", usePrompt: "people", dxPrompt: "product" }, close: { how: "honest" } }) },
      { id: "badDx", title: "The platform mandated with no feedback", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["data", "base"] }, answers: { whichPrompt: "four", usePrompt: "improve", dxPrompt: "mandate" }, close: { how: "honest" } }) },
    ],
  };
}
