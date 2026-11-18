// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CNPE/platform-deploys-failing-webhook-quota
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CNPE", slug: "platform-deploys-failing-webhook-quota" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Sync and autoscaler traced; values fixed in Git; quota and priorities; verified on SLOs with alerts; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["sync", "nodes"] }, answers: { admPrompt: "fixValues", capPrompt: "quotaPriority", verifyPrompt: "evidence" }, close: { how: "honest" } }) },
      { id: "partialAdm", title: "Partly right on the admission webhook, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["sync"] }, answers: { admPrompt: "manualEdit", capPrompt: "quotaPriority", verifyPrompt: "evidence" }, close: { how: "honest" } }) },
      { id: "partialVerify", title: "Partly right on verification, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { admPrompt: "fixValues", capPrompt: "quotaPriority", verifyPrompt: "closeOnSync" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { admPrompt: "manualEdit", capPrompt: "waitQuota", verifyPrompt: "closeOnSync" }, close: { how: "honest" } }) },
      { id: "badAdm", title: "Kyverno's webhook configuration deleted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["sync", "nodes"] }, answers: { admPrompt: "deleteWebhook", capPrompt: "quotaPriority", verifyPrompt: "evidence" }, close: { how: "honest" } }) },
      { id: "badCap", title: "Other tenants' Deployments deleted for capacity", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["sync", "nodes"] }, answers: { admPrompt: "fixValues", capPrompt: "deleteTenants", verifyPrompt: "evidence" }, close: { how: "honest" } }) },
      { id: "badVerify", title: "Declared fixed without checking", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["sync", "nodes"] }, answers: { admPrompt: "fixValues", capPrompt: "quotaPriority", verifyPrompt: "claimDone" }, close: { how: "honest" } }) },
    ],
  };
}
