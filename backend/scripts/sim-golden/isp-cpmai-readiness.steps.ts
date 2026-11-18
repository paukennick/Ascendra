// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMICPMAI/returns-forecast-data-readiness
// on the data screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMICPMAI", slug: "returns-forecast-data-readiness" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Coverage and history profiled; readiness judged; phased plan; business terms; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["coverage", "history"] }, answers: { fitPrompt: "gapAnalysis", planPrompt: "phase", tellPrompt: "businessTerms" }, close: { how: "honest" } }) },
      { id: "partialFit", title: "Partly right on fit to need, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["coverage"] }, answers: { fitPrompt: "volume", planPrompt: "phase", tellPrompt: "businessTerms" }, close: { how: "honest" } }) },
      { id: "partialTell", title: "Partly right on telling leadership, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { fitPrompt: "gapAnalysis", planPrompt: "phase", tellPrompt: "technical" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { fitPrompt: "volume", planPrompt: "wait", tellPrompt: "technical" }, close: { how: "honest" } }) },
      { id: "badFit", title: "Store labels imputed from online data", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["coverage", "history"] }, answers: { fitPrompt: "impute", planPrompt: "phase", tellPrompt: "businessTerms" }, close: { how: "honest" } }) },
      { id: "badPlan", title: "Another retailer's data bought to fill the gap", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["coverage", "history"] }, answers: { fitPrompt: "gapAnalysis", planPrompt: "scrape", tellPrompt: "businessTerms" }, close: { how: "honest" } }) },
      { id: "badTell", title: "Full readiness reported for stores", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["coverage", "history"] }, answers: { fitPrompt: "gapAnalysis", planPrompt: "phase", tellPrompt: "allGo" }, close: { how: "honest" } }) },
    ],
  };
}
