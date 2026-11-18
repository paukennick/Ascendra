// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CSSGB/define-charter-dpmo-claims
// on the data screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CSSGB", slug: "define-charter-dpmo-claims" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Data and owner read; measured problem; DPMO with a guard metric; plan and risks; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["data", "owner"] }, answers: { probPrompt: "specific", metricPrompt: "dpmo", riskPrompt: "plan" }, close: { how: "honest" } }) },
      { id: "partialProb", title: "Partly right on the problem statement, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["data"] }, answers: { probPrompt: "broad", metricPrompt: "dpmo", riskPrompt: "plan" }, close: { how: "honest" } }) },
      { id: "partialRisk", title: "Partly right on plan and risks, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { probPrompt: "specific", metricPrompt: "dpmo", riskPrompt: "datesOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { probPrompt: "broad", metricPrompt: "dpu", riskPrompt: "datesOnly" }, close: { how: "honest" } }) },
      { id: "badProb", title: "A solution written as the problem", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["data", "owner"] }, answers: { probPrompt: "solution", metricPrompt: "dpmo", riskPrompt: "plan" }, close: { how: "honest" } }) },
      { id: "badMetric", title: "Complaints used as the metric", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["data", "owner"] }, answers: { probPrompt: "specific", metricPrompt: "count", riskPrompt: "plan" }, close: { how: "honest" } }) },
      { id: "badRisk", title: "No plan or risks in the charter", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["data", "owner"] }, answers: { probPrompt: "specific", metricPrompt: "dpmo", riskPrompt: "noPlan" }, close: { how: "honest" } }) },
    ],
  };
}
