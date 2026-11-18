// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMICPMAI/ai-model-selection-interpretability
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMICPMAI", slug: "ai-model-selection-interpretability" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Benchmarks and regulation read; interpretable model; QA protocols; conditional go; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["bench", "reg"] }, answers: { algoPrompt: "trees", qaPrompt: "protocol", gonogoPrompt: "conditional" }, close: { how: "honest" } }) },
      { id: "partialAlgo", title: "Partly right on the algorithm, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["bench"] }, answers: { algoPrompt: "lr", qaPrompt: "protocol", gonogoPrompt: "conditional" }, close: { how: "honest" } }) },
      { id: "partialGonogo", title: "Partly right on readiness, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { algoPrompt: "trees", qaPrompt: "protocol", gonogoPrompt: "delay" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { algoPrompt: "lr", qaPrompt: "moreSplits", gonogoPrompt: "delay" }, close: { how: "honest" } }) },
      { id: "badAlgo", title: "The unexplainable model chosen", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["bench", "reg"] }, answers: { algoPrompt: "dnn", qaPrompt: "protocol", gonogoPrompt: "conditional" }, close: { how: "honest" } }) },
      { id: "badQa", title: "A single random split accepted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["bench", "reg"] }, answers: { algoPrompt: "trees", qaPrompt: "trust", gonogoPrompt: "conditional" }, close: { how: "honest" } }) },
      { id: "badGonogo", title: "Launched with a known disparity", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["bench", "reg"] }, answers: { algoPrompt: "trees", qaPrompt: "protocol", gonogoPrompt: "go" }, close: { how: "honest" } }) },
    ],
  };
}
