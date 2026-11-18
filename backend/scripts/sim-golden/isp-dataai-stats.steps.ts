// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for DATAAI/pricing-ab-test-significance
// on the data screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "DATAAI", slug: "pricing-ab-test-significance" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Plan and data type read; full duration; chi-squared with CI; effect against cost; an honest readout", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["plan", "dtype"] }, answers: { peekPrompt: "runFull", testPrompt: "chisq", practicalPrompt: "effect" }, close: { how: "honest" } }) },
      { id: "partialPeek", title: "Partly right on early stopping, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["plan"] }, answers: { peekPrompt: "extend", testPrompt: "chisq", practicalPrompt: "effect" }, close: { how: "honest" } }) },
      { id: "partialPractical", title: "Partly right on practical significance, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { peekPrompt: "runFull", testPrompt: "chisq", practicalPrompt: "pOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { peekPrompt: "extend", testPrompt: "ttest", practicalPrompt: "pOnly" }, close: { how: "honest" } }) },
      { id: "badPeek", title: "The test stopped on day 4", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "dtype"] }, answers: { peekPrompt: "stop", testPrompt: "chisq", practicalPrompt: "effect" }, close: { how: "honest" } }) },
      { id: "badTest", title: "ANOVA on the wrong metric", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "dtype"] }, answers: { peekPrompt: "runFull", testPrompt: "anova", practicalPrompt: "effect" }, close: { how: "honest" } }) },
      { id: "badPractical", title: "Rolled out on significance alone", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["plan", "dtype"] }, answers: { peekPrompt: "runFull", testPrompt: "chisq", practicalPrompt: "rollOut" }, close: { how: "honest" } }) },
    ],
  };
}
