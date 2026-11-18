// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for DATAPLUS/branch-sales-merge-duplicates-outliers
// on the data screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "DATAPLUS", slug: "branch-sales-merge-duplicates-outliers" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Counts and profile read; dimension deduplicated; online channel; real peaks kept; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["counts", "profile"] }, answers: { dupPrompt: "dedupeDim", missingPrompt: "categorize", outlierPrompt: "keepReal" }, close: { how: "honest" } }) },
      { id: "partialDup", title: "Partly right on the duplication, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["counts"] }, answers: { dupPrompt: "distinctAll", missingPrompt: "categorize", outlierPrompt: "keepReal" }, close: { how: "honest" } }) },
      { id: "partialOutlier", title: "Partly right on the outliers, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dupPrompt: "dedupeDim", missingPrompt: "categorize", outlierPrompt: "cap" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dupPrompt: "distinctAll", missingPrompt: "note", outlierPrompt: "cap" }, close: { how: "honest" } }) },
      { id: "badDup", title: "The duplicated extract reported", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["counts", "profile"] }, answers: { dupPrompt: "ignoreDup", missingPrompt: "categorize", outlierPrompt: "keepReal" }, close: { how: "honest" } }) },
      { id: "badMissing", title: "Missing store codes imputed to the busiest store", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["counts", "profile"] }, answers: { dupPrompt: "dedupeDim", missingPrompt: "impute", outlierPrompt: "keepReal" }, close: { how: "honest" } }) },
      { id: "badOutlier", title: "Real peak days deleted as outliers", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["counts", "profile"] }, answers: { dupPrompt: "dedupeDim", missingPrompt: "categorize", outlierPrompt: "delete" }, close: { how: "honest" } }) },
    ],
  };
}
