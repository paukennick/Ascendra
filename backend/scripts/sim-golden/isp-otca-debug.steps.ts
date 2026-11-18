// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for OTCA/otel-missing-traces-pipeline-debug
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "OTCA", slug: "otel-missing-traces-pipeline-debug" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Metrics and log read; filter debugged and fixed; key fixed via the Secret; gap reported with alerts; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["internal", "logs"] }, answers: { filtPrompt: "debugExp", authPrompt: "fixKey", lossPrompt: "honest" }, close: { how: "honest" } }) },
      { id: "partialFilt", title: "Partly right on the filter, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["internal"] }, answers: { filtPrompt: "removeFilter", authPrompt: "fixKey", lossPrompt: "honest" }, close: { how: "honest" } }) },
      { id: "partialLoss", title: "Partly right on the gap, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { filtPrompt: "debugExp", authPrompt: "fixKey", lossPrompt: "noAlert" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { filtPrompt: "removeFilter", authPrompt: "retry", lossPrompt: "noAlert" }, close: { how: "honest" } }) },
      { id: "badFilt", title: "Collectors and services restarted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["internal", "logs"] }, answers: { filtPrompt: "restart", authPrompt: "fixKey", lossPrompt: "honest" }, close: { how: "honest" } }) },
      { id: "badAuth", title: "The API key pasted into the ConfigMap", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["internal", "logs"] }, answers: { filtPrompt: "debugExp", authPrompt: "inline", lossPrompt: "honest" }, close: { how: "honest" } }) },
      { id: "badLoss", title: "A replay promised for dropped spans", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["internal", "logs"] }, answers: { filtPrompt: "debugExp", authPrompt: "fixKey", lossPrompt: "claimReplay" }, close: { how: "honest" } }) },
    ],
  };
}
