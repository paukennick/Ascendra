// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CKS/restricted-profile-payments-rollout
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CKS", slug: "restricted-profile-payments-rollout" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Dry run and spec read; warn and audit first; the full hardened context; the Secret mounted, narrowed and encrypted; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["dry", "spec"] }, answers: { psaPrompt: "warnFirst", ctxPrompt: "hardened", secPrompt: "mount" }, close: { how: "honest" } }) },
      { id: "partialPsa", title: "Partly right on the profile rollout, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["dry"] }, answers: { psaPrompt: "baseline", ctxPrompt: "hardened", secPrompt: "mount" }, close: { how: "honest" } }) },
      { id: "partialSec", title: "Partly right on the Secret, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { psaPrompt: "warnFirst", ctxPrompt: "hardened", secPrompt: "mountOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { psaPrompt: "baseline", ctxPrompt: "nonRootOnly", secPrompt: "mountOnly" }, close: { how: "honest" } }) },
      { id: "badPsa", title: "restricted enforced before the workloads were fixed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dry", "spec"] }, answers: { psaPrompt: "enforceNow", ctxPrompt: "hardened", secPrompt: "mount" }, close: { how: "honest" } }) },
      { id: "badCtx", title: "The container made privileged and the namespace exempted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dry", "spec"] }, answers: { psaPrompt: "warnFirst", ctxPrompt: "privileged", secPrompt: "mount" }, close: { how: "honest" } }) },
      { id: "badSec", title: "The password moved into a ConfigMap", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dry", "spec"] }, answers: { psaPrompt: "warnFirst", ctxPrompt: "hardened", secPrompt: "configMap" }, close: { how: "honest" } }) },
    ],
  };
}
