// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CGOA/gitops-rollback-feedback-loop
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CGOA", slug: "gitops-rollback-feedback-loop" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Status and history read; reverted in Git; notifications on; billing reconciled; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["appget", "gitlog"] }, answers: { rollbackPrompt: "gitRevert", loopPrompt: "notify", continuousPrompt: "reconciler" }, close: { how: "honest" } }) },
      { id: "partialRollback", title: "Partly right on the rollback, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["appget"] }, answers: { rollbackPrompt: "uiRollback", loopPrompt: "notify", continuousPrompt: "reconciler" }, close: { how: "honest" } }) },
      { id: "partialContinuous", title: "Partly right on 'continuous', and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rollbackPrompt: "gitRevert", loopPrompt: "notify", continuousPrompt: "hourly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rollbackPrompt: "uiRollback", loopPrompt: "watchUi", continuousPrompt: "hourly" }, close: { how: "honest" } }) },
      { id: "badRollback", title: "The live Deployment edited by hand", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["appget", "gitlog"] }, answers: { rollbackPrompt: "kubectlSet", loopPrompt: "notify", continuousPrompt: "reconciler" }, close: { how: "honest" } }) },
      { id: "badLoop", title: "Health forced to always report Healthy", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["appget", "gitlog"] }, answers: { rollbackPrompt: "gitRevert", loopPrompt: "ignoreHealth", continuousPrompt: "reconciler" }, close: { how: "honest" } }) },
      { id: "badContinuous", title: "A one-time CI push accepted as GitOps", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["appget", "gitlog"] }, answers: { rollbackPrompt: "gitRevert", loopPrompt: "notify", continuousPrompt: "acceptPush" }, close: { how: "honest" } }) },
    ],
  };
}
