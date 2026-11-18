// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMISP/data-center-schedule-plan-integration
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMISP", slug: "data-center-schedule-plan-integration" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Procurement and risks read; lead times linked; constraints applied; PMB under control; an honest note", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["procplan", "risks"] }, answers: { procPrompt: "link", riskPrompt: "calendar", basePrompt: "pmb" }, close: { how: "honest" } }) },
      { id: "partialProc", title: "Partly right on procurement, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["procplan"] }, answers: { procPrompt: "note", riskPrompt: "calendar", basePrompt: "pmb" }, close: { how: "honest" } }) },
      { id: "partialBase", title: "Partly right on the baseline, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { procPrompt: "link", riskPrompt: "calendar", basePrompt: "schedOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { procPrompt: "note", riskPrompt: "reserve", basePrompt: "schedOnly" }, close: { how: "honest" } }) },
      { id: "badProc", title: "Moves kept before the switches arrive", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["procplan", "risks"] }, answers: { procPrompt: "ignore", riskPrompt: "calendar", basePrompt: "pmb" }, close: { how: "honest" } }) },
      { id: "badRisk", title: "Moves forced into the freeze", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["procplan", "risks"] }, answers: { procPrompt: "link", riskPrompt: "override", basePrompt: "pmb" }, close: { how: "honest" } }) },
      { id: "badBase", title: "No baseline set", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["procplan", "risks"] }, answers: { procPrompt: "link", riskPrompt: "calendar", basePrompt: "noBase" }, close: { how: "honest" } }) },
    ],
  };
}
