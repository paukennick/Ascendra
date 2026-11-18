// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIRMP/rail-signalling-risk-plan
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIRMP", slug: "rail-signalling-risk-plan" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Appetites and lists read; thresholds per objective; one RBS; RACI and communication; an honest decision", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["appetite", "lists"] }, answers: { thrPrompt: "perObjective", rbsPrompt: "rbs", raciPrompt: "raci" }, close: { how: "honest" } }) },
      { id: "partialThr", title: "Partly right on the thresholds, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["appetite"] }, answers: { thrPrompt: "costOnly", rbsPrompt: "rbs", raciPrompt: "raci" }, close: { how: "honest" } }) },
      { id: "partialRaci", title: "Partly right on roles and communication, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { thrPrompt: "perObjective", rbsPrompt: "rbs", raciPrompt: "pmOwns" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { thrPrompt: "costOnly", rbsPrompt: "mapping", raciPrompt: "pmOwns" }, close: { how: "honest" } }) },
      { id: "badThr", title: "Thresholds left to contractors", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["appetite", "lists"] }, answers: { thrPrompt: "nothing", rbsPrompt: "rbs", raciPrompt: "raci" }, close: { how: "honest" } }) },
      { id: "badRbs", title: "Three incompatible scales kept", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["appetite", "lists"] }, answers: { thrPrompt: "perObjective", rbsPrompt: "keepThree", raciPrompt: "raci" }, close: { how: "honest" } }) },
      { id: "badRaci", title: "No risk roles defined", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["appetite", "lists"] }, answers: { thrPrompt: "perObjective", rbsPrompt: "rbs", raciPrompt: "noRoles" }, close: { how: "honest" } }) },
    ],
  };
}
