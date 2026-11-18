// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for DATAAI/churn-model-selection-leakage
// on the data screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "DATAAI", slug: "churn-model-selection-leakage" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Features and evaluation read; leakage fixed; precision at capacity; an honest recommendation", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["feats", "eval"] }, answers: { leakPrompt: "drop", metricPrompt: "precisionK", commPrompt: "honest" }, close: { how: "honest" } }) },
      { id: "partialLeak", title: "Partly right on model C, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["feats"] }, answers: { leakPrompt: "flag", metricPrompt: "precisionK", commPrompt: "honest" }, close: { how: "honest" } }) },
      { id: "partialComm", title: "Partly right on the recommendation, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { leakPrompt: "drop", metricPrompt: "precisionK", commPrompt: "technical" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { leakPrompt: "flag", metricPrompt: "auc", commPrompt: "technical" }, close: { how: "honest" } }) },
      { id: "badLeak", title: "The leaky model recommended", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["feats", "eval"] }, answers: { leakPrompt: "shipC", metricPrompt: "precisionK", commPrompt: "honest" }, close: { how: "honest" } }) },
      { id: "badMetric", title: "Models compared on accuracy", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["feats", "eval"] }, answers: { leakPrompt: "drop", metricPrompt: "accuracy", commPrompt: "honest" }, close: { how: "honest" } }) },
      { id: "badComm", title: "A truncated-axis chart for the executives", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["feats", "eval"] }, answers: { leakPrompt: "drop", metricPrompt: "precisionK", commPrompt: "truncated" }, close: { how: "honest" } }) },
    ],
  };
}
