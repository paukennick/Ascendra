// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIACP/increment-goal-early-feedback-pilot
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIACP", slug: "increment-goal-early-feedback-pilot" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Ride-along and error data read; value-first goal; pilot on real jobs; adapted and measured; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["pain", "errors"] }, answers: { goalPrompt: "valueFirst", feedbackPrompt: "pilot", adaptPrompt: "adaptMeasure" }, close: { how: "honest" } }) },
      { id: "partialGoal", title: "Partly right on the increment goal, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["pain"] }, answers: { goalPrompt: "mixed", feedbackPrompt: "pilot", adaptPrompt: "adaptMeasure" }, close: { how: "honest" } }) },
      { id: "partialAdapt", title: "Partly right on acting on feedback, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { goalPrompt: "valueFirst", feedbackPrompt: "pilot", adaptPrompt: "note" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { goalPrompt: "mixed", feedbackPrompt: "demo", adaptPrompt: "note" }, close: { how: "honest" } }) },
      { id: "badGoal", title: "The most visible feature built first", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pain", "errors"] }, answers: { goalPrompt: "visible", feedbackPrompt: "pilot", adaptPrompt: "adaptMeasure" }, close: { how: "honest" } }) },
      { id: "badFeedback", title: "Feedback held until the end", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pain", "errors"] }, answers: { goalPrompt: "valueFirst", feedbackPrompt: "wait", adaptPrompt: "adaptMeasure" }, close: { how: "honest" } }) },
      { id: "badAdapt", title: "Pilot feedback dismissed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pain", "errors"] }, answers: { goalPrompt: "valueFirst", feedbackPrompt: "pilot", adaptPrompt: "dismiss" }, close: { how: "honest" } }) },
    ],
  };
}
