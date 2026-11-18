// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIPMOCP/pmo-phased-service-rollout
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIPMOCP", slug: "pmo-phased-service-rollout" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Data and support checked; phased; onboarded; escalated per procedure; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["pilot", "support"] }, answers: { rolloutPrompt: "phased", flowPrompt: "onboard", escPrompt: "procedure" }, close: { how: "honest" } }) },
      { id: "partialRollout", title: "Partly right on the rollout, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["pilot"] }, answers: { rolloutPrompt: "half", flowPrompt: "onboard", escPrompt: "procedure" }, close: { how: "honest" } }) },
      { id: "partialEsc", title: "Partly right on escalation, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rolloutPrompt: "phased", flowPrompt: "onboard", escPrompt: "adhoc" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rolloutPrompt: "half", flowPrompt: "guideOnly", escPrompt: "adhoc" }, close: { how: "honest" } }) },
      { id: "badRollout", title: "A big-bang launch", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pilot", "support"] }, answers: { rolloutPrompt: "bigBang", flowPrompt: "onboard", escPrompt: "procedure" }, close: { how: "honest" } }) },
      { id: "badFlow", title: "No onboarding", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pilot", "support"] }, answers: { rolloutPrompt: "phased", flowPrompt: "nothing", escPrompt: "procedure" }, close: { how: "honest" } }) },
      { id: "badEsc", title: "The tool defended without checking", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pilot", "support"] }, answers: { rolloutPrompt: "phased", flowPrompt: "onboard", escPrompt: "defend" }, close: { how: "honest" } }) },
    ],
  };
}
