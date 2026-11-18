// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for DATAPLUS/delivery-times-skew-rates-correlation
// on the data screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "DATAPLUS", slug: "delivery-times-skew-rates-correlation" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Data profiled; median and percentiles; rates; correlation with a trial; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["dist", "regions"] }, answers: { centerPrompt: "median", ratesPrompt: "rate", causePrompt: "correlation" }, close: { how: "honest" } }) },
      { id: "partialCenter", title: "Partly right on the typical time, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["dist"] }, answers: { centerPrompt: "meanNote", ratesPrompt: "rate", causePrompt: "correlation" }, close: { how: "honest" } }) },
      { id: "partialCause", title: "Partly right on the budget claim, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { centerPrompt: "median", ratesPrompt: "rate", causePrompt: "rOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { centerPrompt: "meanNote", ratesPrompt: "countsNoted", causePrompt: "rOnly" }, close: { how: "honest" } }) },
      { id: "badCenter", title: "Outliers deleted without explanation", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dist", "regions"] }, answers: { centerPrompt: "dropOut", ratesPrompt: "rate", causePrompt: "correlation" }, close: { how: "honest" } }) },
      { id: "badRates", title: "Regions ranked by raw counts", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dist", "regions"] }, answers: { centerPrompt: "median", ratesPrompt: "counts", causePrompt: "correlation" }, close: { how: "honest" } }) },
      { id: "badCause", title: "Overtime doubled on a correlation", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dist", "regions"] }, answers: { centerPrompt: "median", ratesPrompt: "rate", causePrompt: "causal" }, close: { how: "honest" } }) },
    ],
  };
}
