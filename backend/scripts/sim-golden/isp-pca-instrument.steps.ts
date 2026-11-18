// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PCA/metrics-naming-route-label-review
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PCA", slug: "metrics-naming-route-label-review" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Diff and /metrics read; a seconds histogram; route-template labels; _total counter; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["diff", "scrapeOut"] }, answers: { latPrompt: "histogram", pathPrompt: "route", namesPrompt: "conventions" }, close: { how: "honest" } }) },
      { id: "partialLat", title: "Partly right on latency, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["diff"] }, answers: { latPrompt: "summary", pathPrompt: "route", namesPrompt: "conventions" }, close: { how: "honest" } }) },
      { id: "partialNames", title: "Partly right on naming, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { latPrompt: "histogram", pathPrompt: "route", namesPrompt: "separate" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { latPrompt: "summary", pathPrompt: "dropPath", namesPrompt: "separate" }, close: { how: "honest" } }) },
      { id: "badLat", title: "Latency kept as a last-value gauge", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["diff", "scrapeOut"] }, answers: { latPrompt: "keepGauge", pathPrompt: "route", namesPrompt: "conventions" }, close: { how: "honest" } }) },
      { id: "badPath", title: "Raw URL paths shipped as a label", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["diff", "scrapeOut"] }, answers: { latPrompt: "histogram", pathPrompt: "keepRaw", namesPrompt: "conventions" }, close: { how: "honest" } }) },
      { id: "badNames", title: "Requests made a resetting gauge", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["diff", "scrapeOut"] }, answers: { latPrompt: "histogram", pathPrompt: "route", namesPrompt: "gaugeCount" }, close: { how: "honest" } }) },
    ],
  };
}
