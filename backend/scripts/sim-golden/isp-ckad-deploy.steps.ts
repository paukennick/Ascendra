// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CKAD/stuck-rollout-helm-upgrade-failed
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CKAD", slug: "stuck-rollout-helm-upgrade-failed" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Rollout and Helm history read; undo to revision 11; maxUnavailable 0; helm rollback with atomic upgrades; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["status", "helm"] }, answers: { undoPrompt: "rollback", stratPrompt: "surge", helmfixPrompt: "helmRollback" }, close: { how: "honest" } }) },
      { id: "partialUndo", title: "Partly right on the stuck rollout, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["status"] }, answers: { undoPrompt: "patchForward", stratPrompt: "surge", helmfixPrompt: "helmRollback" }, close: { how: "honest" } }) },
      { id: "partialHelmfix", title: "Partly right on the Helm release, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { undoPrompt: "rollback", stratPrompt: "surge", helmfixPrompt: "kubectlFix" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { undoPrompt: "patchForward", stratPrompt: "half", helmfixPrompt: "kubectlFix" }, close: { how: "honest" } }) },
      { id: "badUndo", title: "The Deployment deleted and re-created from an old copy", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["status", "helm"] }, answers: { undoPrompt: "recreate", stratPrompt: "surge", helmfixPrompt: "helmRollback" }, close: { how: "honest" } }) },
      { id: "badStrat", title: "The strategy switched to Recreate", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["status", "helm"] }, answers: { undoPrompt: "rollback", stratPrompt: "recreateStrat", helmfixPrompt: "helmRollback" }, close: { how: "honest" } }) },
      { id: "badHelmfix", title: "The Helm release uninstalled and reinstalled", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["status", "helm"] }, answers: { undoPrompt: "rollback", stratPrompt: "surge", helmfixPrompt: "uninstall" }, close: { how: "honest" } }) },
    ],
  };
}
