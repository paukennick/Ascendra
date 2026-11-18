// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CYSAPLUS/container-cve-compensating-controls
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CYSAPLUS", slug: "container-cve-compensating-controls" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Exposure and intel read; exposed APIs first; layered controls; rescanned before closing; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["exposure", "kev"] }, answers: { prioPrompt: "exposed", compPrompt: "layered", verifyPrompt: "rescan" }, close: { how: "honest" } }) },
      { id: "partialPrio", title: "Partly right on prioritization, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["exposure"] }, answers: { prioPrompt: "allSame", compPrompt: "layered", verifyPrompt: "rescan" }, close: { how: "honest" } }) },
      { id: "partialVerify", title: "Partly right on verification, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { prioPrompt: "exposed", compPrompt: "layered", verifyPrompt: "ticketClose" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { prioPrompt: "allSame", compPrompt: "wafOnly", verifyPrompt: "ticketClose" }, close: { how: "honest" } }) },
      { id: "badPrio", title: "Batch containers first; an exposed API exploited", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["exposure", "kev"] }, answers: { prioPrompt: "batchFirst", compPrompt: "layered", verifyPrompt: "rescan" }, close: { how: "honest" } }) },
      { id: "badComp", title: "The risk accepted without controls", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["exposure", "kev"] }, answers: { prioPrompt: "exposed", compPrompt: "acceptRisk", verifyPrompt: "rescan" }, close: { how: "honest" } }) },
      { id: "badVerify", title: "Controls removed before verifying the rollout", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["exposure", "kev"] }, answers: { prioPrompt: "exposed", compPrompt: "layered", verifyPrompt: "removeFirst" }, close: { how: "honest" } }) },
    ],
  };
}
