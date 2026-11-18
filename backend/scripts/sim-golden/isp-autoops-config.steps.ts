// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for AUTOOPSPLUS/terraform-drift-state-lock
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "AUTOOPSPLUS", slug: "terraform-drift-state-lock" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Drift and backend read; drift reverted and detected; lock respected; remote state; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["plan", "backend"] }, answers: { driftPrompt: "revertDrift", lockPrompt: "waitLock", statePrompt: "remote" }, close: { how: "honest" } }) },
      { id: "partialDrift", title: "Partly right on the drift, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["plan"] }, answers: { driftPrompt: "consoleFix", lockPrompt: "waitLock", statePrompt: "remote" }, close: { how: "honest" } }) },
      { id: "partialState", title: "Partly right on state storage, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { driftPrompt: "revertDrift", lockPrompt: "waitLock", statePrompt: "sharedDrive" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { driftPrompt: "consoleFix", lockPrompt: "cancelRun", statePrompt: "sharedDrive" }, close: { how: "honest" } }) },
      { id: "badDrift", title: "The open SSH rule accepted into configuration", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "backend"] }, answers: { driftPrompt: "acceptDrift", lockPrompt: "waitLock", statePrompt: "remote" }, close: { how: "honest" } }) },
      { id: "badLock", title: "Another run's lock forced open", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "backend"] }, answers: { driftPrompt: "revertDrift", lockPrompt: "forceUnlock", statePrompt: "remote" }, close: { how: "honest" } }) },
      { id: "badState", title: "State kept on a laptop", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "backend"] }, answers: { driftPrompt: "revertDrift", lockPrompt: "waitLock", statePrompt: "keepLocal" }, close: { how: "honest" } }) },
    ],
  };
}
