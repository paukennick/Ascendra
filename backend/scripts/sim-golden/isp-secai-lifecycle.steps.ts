// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for SECAIPLUS/ai-claims-model-lifecycle-security
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "SECAIPLUS", slug: "ai-claims-model-lifecycle-security" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Lineage and plan read; trusted data; humans decide; monitoring with triggers; an honest decision", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["lineage", "deploy"] }, answers: { dataPrompt: "provenance", depPrompt: "assist", monPrompt: "monitor" }, close: { how: "honest" } }) },
      { id: "partialData", title: "Partly right on the data, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["lineage"] }, answers: { dataPrompt: "sample", depPrompt: "assist", monPrompt: "monitor" }, close: { how: "honest" } }) },
      { id: "partialMon", title: "Partly right on monitoring, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dataPrompt: "provenance", depPrompt: "assist", monPrompt: "quarterly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dataPrompt: "sample", depPrompt: "sampleReview", monPrompt: "quarterly" }, close: { how: "honest" } }) },
      { id: "badData", title: "Unvetted scraped labels used", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lineage", "deploy"] }, answers: { dataPrompt: "useAll", depPrompt: "assist", monPrompt: "monitor" }, close: { how: "honest" } }) },
      { id: "badDep", title: "Automatic denials with no human review", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lineage", "deploy"] }, answers: { dataPrompt: "provenance", depPrompt: "autoDeny", monPrompt: "monitor" }, close: { how: "honest" } }) },
      { id: "badMon", title: "The model released unmonitored", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lineage", "deploy"] }, answers: { dataPrompt: "provenance", depPrompt: "assist", monPrompt: "unwatched" }, close: { how: "honest" } }) },
    ],
  };
}
