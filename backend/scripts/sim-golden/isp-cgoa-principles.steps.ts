// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CGOA/gitops-claim-review-push-pipeline
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CGOA", slug: "gitops-claim-review-push-pipeline" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Pipeline and history read; pull required; fixes through Git; settings versioned; an honest decision", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["pipeline", "history"] }, answers: { pushPrompt: "pull", editsPrompt: "reconcile", storePrompt: "git" }, close: { how: "honest" } }) },
      { id: "partialPush", title: "Partly right on the push pipeline, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["pipeline"] }, answers: { pushPrompt: "scope", editsPrompt: "reconcile", storePrompt: "git" }, close: { how: "honest" } }) },
      { id: "partialStore", title: "Partly right on the config store, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { pushPrompt: "pull", editsPrompt: "reconcile", storePrompt: "snapshot" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { pushPrompt: "scope", editsPrompt: "ticket", storePrompt: "snapshot" }, close: { how: "honest" } }) },
      { id: "badPush", title: "The push pipeline approved as GitOps; its token leaks", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pipeline", "history"] }, answers: { pushPrompt: "approve", editsPrompt: "reconcile", storePrompt: "git" }, close: { how: "honest" } }) },
      { id: "badEdits", title: "Reconciliation turned off; hot-fixes overwritten", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pipeline", "history"] }, answers: { pushPrompt: "pull", editsPrompt: "noReconcile", storePrompt: "git" }, close: { how: "honest" } }) },
      { id: "badStore", title: "The unversioned store kept; a bad edit can't be rolled back", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pipeline", "history"] }, answers: { pushPrompt: "pull", editsPrompt: "reconcile", storePrompt: "keep" }, close: { how: "honest" } }) },
    ],
  };
}
