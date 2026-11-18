// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PFMP/pfmp-council-portfolio-risk-reserve
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PFMP", slug: "pfmp-council-portfolio-risk-reserve" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Dependencies and exposure read; dependency risk registered; register tied to goals; reserve approved; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["deps", "exposure"] }, answers: { depPrompt: "depRisk", regPrompt: "register", resPrompt: "reserve" }, close: { how: "honest" } }) },
      { id: "partialDep", title: "Partly right on dependencies, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["deps"] }, answers: { depPrompt: "tellPms", regPrompt: "register", resPrompt: "reserve" }, close: { how: "honest" } }) },
      { id: "partialRes", title: "Partly right on the reserve, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { depPrompt: "depRisk", regPrompt: "register", resPrompt: "padEach" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { depPrompt: "tellPms", regPrompt: "spreadsheet", resPrompt: "padEach" }, close: { how: "honest" } }) },
      { id: "badDep", title: "Risk left to project registers", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["deps", "exposure"] }, answers: { depPrompt: "projectOnly", regPrompt: "register", resPrompt: "reserve" }, close: { how: "honest" } }) },
      { id: "badReg", title: "Escalations left in email", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["deps", "exposure"] }, answers: { depPrompt: "depRisk", regPrompt: "emails", resPrompt: "reserve" }, close: { how: "honest" } }) },
      { id: "badRes", title: "No portfolio reserve", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["deps", "exposure"] }, answers: { depPrompt: "depRisk", regPrompt: "register", resPrompt: "nothing" }, close: { how: "honest" } }) },
    ],
  };
}
