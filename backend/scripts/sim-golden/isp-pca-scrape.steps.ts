// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PCA/prometheus-relabel-drops-targets-cardinality
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PCA", slug: "prometheus-relabel-drops-targets-cardinality" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Dropped targets and TSDB status read; regex fixed; label dropped at ingestion; timing fitted; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["targets", "card"] }, answers: { relabelPrompt: "fixRegex", labelPrompt: "dropLabel", timingPrompt: "fit" }, close: { how: "honest" } }) },
      { id: "partialRelabel", title: "Partly right on the relabel rule, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["targets"] }, answers: { relabelPrompt: "revert", labelPrompt: "dropLabel", timingPrompt: "fit" }, close: { how: "honest" } }) },
      { id: "partialTiming", title: "Partly right on the scrape timing, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { relabelPrompt: "fixRegex", labelPrompt: "dropLabel", timingPrompt: "ignoreFlap" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { relabelPrompt: "revert", labelPrompt: "moreMemory", timingPrompt: "ignoreFlap" }, close: { how: "honest" } }) },
      { id: "badRelabel", title: "Discovery replaced by a static list of Pod IPs", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["targets", "card"] }, answers: { relabelPrompt: "static", labelPrompt: "dropLabel", timingPrompt: "fit" }, close: { how: "honest" } }) },
      { id: "badLabel", title: "All tracking API series deleted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["targets", "card"] }, answers: { relabelPrompt: "fixRegex", labelPrompt: "deleteMetric", timingPrompt: "fit" }, close: { how: "honest" } }) },
      { id: "badTiming", title: "scrape_timeout longer than scrape_interval", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["targets", "card"] }, answers: { relabelPrompt: "fixRegex", labelPrompt: "dropLabel", timingPrompt: "timeoutLong" }, close: { how: "honest" } }) },
    ],
  };
}
