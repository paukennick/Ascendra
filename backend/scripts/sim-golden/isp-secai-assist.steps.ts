// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for SECAIPLUS/ai-assistant-soc-triage-guardrails
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "SECAIPLUS", slug: "ai-assistant-soc-triage-guardrails" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Permissions and actions read; human approval; fix verified; out-of-band callback; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["perm", "acts"] }, answers: { autoPrompt: "approve", verifyPrompt: "review", deepfakePrompt: "callback" }, close: { how: "honest" } }) },
      { id: "partialAuto", title: "Partly right on autonomy, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["perm"] }, answers: { autoPrompt: "rateLimit", verifyPrompt: "review", deepfakePrompt: "callback" }, close: { how: "honest" } }) },
      { id: "partialDeepfake", title: "Partly right on the voice call, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { autoPrompt: "approve", verifyPrompt: "review", deepfakePrompt: "questions" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { autoPrompt: "rateLimit", verifyPrompt: "trustFinding", deepfakePrompt: "questions" }, close: { how: "honest" } }) },
      { id: "badAuto", title: "The agent disabled 40 accounts alone", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["perm", "acts"] }, answers: { autoPrompt: "full", verifyPrompt: "review", deepfakePrompt: "callback" }, close: { how: "honest" } }) },
      { id: "badVerify", title: "The AI's fix auto-merged", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["perm", "acts"] }, answers: { autoPrompt: "approve", verifyPrompt: "autoMerge", deepfakePrompt: "callback" }, close: { how: "honest" } }) },
      { id: "badDeepfake", title: "MFA reset on a cloned voice", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["perm", "acts"] }, answers: { autoPrompt: "approve", verifyPrompt: "review", deepfakePrompt: "reset" }, close: { how: "honest" } }) },
    ],
  };
}
