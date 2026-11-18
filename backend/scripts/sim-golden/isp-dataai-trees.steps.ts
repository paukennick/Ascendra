// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for DATAAI/loan-default-trees-forest-boosting
// on the data screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "DATAAI", slug: "loan-default-trees-forest-boosting" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Results and features read; random forest; early stopping; permutation importance; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["tree", "feats"] }, answers: { variancePrompt: "forest", boostPrompt: "earlyStop", importancePrompt: "permutation" }, close: { how: "honest" } }) },
      { id: "partialVariance", title: "Partly right on the overfit tree, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["tree"] }, answers: { variancePrompt: "prune", boostPrompt: "earlyStop", importancePrompt: "permutation" }, close: { how: "honest" } }) },
      { id: "partialImportance", title: "Partly right on the drivers, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { variancePrompt: "forest", boostPrompt: "earlyStop", importancePrompt: "dropIds" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { variancePrompt: "prune", boostPrompt: "fixed300", importancePrompt: "dropIds" }, close: { how: "honest" } }) },
      { id: "badVariance", title: "Depth tuned on the test set", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["tree", "feats"] }, answers: { variancePrompt: "tuneTest", boostPrompt: "earlyStop", importancePrompt: "permutation" }, close: { how: "honest" } }) },
      { id: "badBoost", title: "5,000 boosting rounds chosen on training loss", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["tree", "feats"] }, answers: { variancePrompt: "forest", boostPrompt: "allTrees", importancePrompt: "permutation" }, close: { how: "honest" } }) },
      { id: "badImportance", title: "customer_id reported as the main driver", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["tree", "feats"] }, answers: { variancePrompt: "forest", boostPrompt: "earlyStop", importancePrompt: "reportId" }, close: { how: "honest" } }) },
    ],
  };
}
