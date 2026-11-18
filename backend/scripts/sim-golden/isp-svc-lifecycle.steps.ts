// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for ITIL5FND/booking-service-lifecycle-activities
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "ITIL5FND", slug: "booking-service-lifecycle-activities" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Plan and receptionists read; iterative plan; support then design; evidence-led next iteration; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["plan", "reception"] }, answers: { iterPrompt: "iterate", actPrompt: "operate", nextPrompt: "feedback" }, close: { how: "honest" } }) },
      { id: "partialIter", title: "Partly right on the plan's shape, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["plan"] }, answers: { iterPrompt: "phases", actPrompt: "operate", nextPrompt: "feedback" }, close: { how: "honest" } }) },
      { id: "partialNext", title: "Partly right on the next iteration, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { iterPrompt: "iterate", actPrompt: "operate", nextPrompt: "original" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { iterPrompt: "phases", actPrompt: "redesign", nextPrompt: "original" }, close: { how: "honest" } }) },
      { id: "badIter", title: "The straight-line plan kept", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "reception"] }, answers: { iterPrompt: "line", actPrompt: "operate", nextPrompt: "feedback" }, close: { how: "honest" } }) },
      { id: "badAct", title: "The reminder fault left for later", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "reception"] }, answers: { iterPrompt: "iterate", actPrompt: "ignore", nextPrompt: "feedback" }, close: { how: "honest" } }) },
      { id: "badNext", title: "Rolled out to every clinic", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "reception"] }, answers: { iterPrompt: "iterate", actPrompt: "operate", nextPrompt: "allClinics" }, close: { how: "honest" } }) },
    ],
  };
}
