// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for AUTOOPSPLUS/pipeline-blue-green-slo-iam
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "AUTOOPSPLUS", slug: "pipeline-blue-green-slo-iam" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "History and credentials read; blue-green; SLO rollback; OIDC; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["hist", "creds"] }, answers: { strategyPrompt: "bluegreen", sloPrompt: "sloGate", iamPrompt: "oidc" }, close: { how: "honest" } }) },
      { id: "partialStrategy", title: "Partly right on the strategy, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["hist"] }, answers: { strategyPrompt: "rolling", sloPrompt: "sloGate", iamPrompt: "oidc" }, close: { how: "honest" } }) },
      { id: "partialIam", title: "Partly right on the credentials, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { strategyPrompt: "bluegreen", sloPrompt: "sloGate", iamPrompt: "rotate" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { strategyPrompt: "rolling", sloPrompt: "manualWatch", iamPrompt: "rotate" }, close: { how: "honest" } }) },
      { id: "badStrategy", title: "In-place releases kept", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["hist", "creds"] }, answers: { strategyPrompt: "inPlaceFast", sloPrompt: "sloGate", iamPrompt: "oidc" }, close: { how: "honest" } }) },
      { id: "badSlo", title: "Blue deleted right after the switch", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["hist", "creds"] }, answers: { strategyPrompt: "bluegreen", sloPrompt: "noCheck", iamPrompt: "oidc" }, close: { how: "honest" } }) },
      { id: "badIam", title: "The old admin key left in CI", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["hist", "creds"] }, answers: { strategyPrompt: "bluegreen", sloPrompt: "sloGate", iamPrompt: "leave" }, close: { how: "honest" } }) },
    ],
  };
}
