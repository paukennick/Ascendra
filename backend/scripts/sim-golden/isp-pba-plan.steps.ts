// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIPBA/pba-requirements-management-plan
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIPBA", slug: "pba-requirements-management-plan" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Lessons and stakeholders read; a plan; traceability; agreed acceptance; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["lessons", "stake"] }, answers: { rmpPrompt: "plan", tracePrompt: "strategy", accPrompt: "together" }, close: { how: "honest" } }) },
      { id: "partialRmp", title: "Partly right on the plan, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["lessons"] }, answers: { rmpPrompt: "template", tracePrompt: "strategy", accPrompt: "together" }, close: { how: "honest" } }) },
      { id: "partialAcc", title: "Partly right on acceptance criteria, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rmpPrompt: "plan", tracePrompt: "strategy", accPrompt: "baOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rmpPrompt: "template", tracePrompt: "partial", accPrompt: "baOnly" }, close: { how: "honest" } }) },
      { id: "badRmp", title: "Requirements collected by email again", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lessons", "stake"] }, answers: { rmpPrompt: "emails", tracePrompt: "strategy", accPrompt: "together" }, close: { how: "honest" } }) },
      { id: "badTrace", title: "No traceability", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lessons", "stake"] }, answers: { rmpPrompt: "plan", tracePrompt: "nothing", accPrompt: "together" }, close: { how: "honest" } }) },
      { id: "badAcc", title: "Acceptance left to UAT", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lessons", "stake"] }, answers: { rmpPrompt: "plan", tracePrompt: "strategy", accPrompt: "later" }, close: { how: "honest" } }) },
    ],
  };
}
