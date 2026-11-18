// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMISP/hospital-wing-monte-carlo-milestone
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMISP", slug: "hospital-wing-monte-carlo-milestone" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Estimates and network read; Monte Carlo; near-critical path treated; confidence reported; an honest report", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["est", "net"] }, answers: { simPrompt: "monte", nearPrompt: "focus", rerunPrompt: "report" }, close: { how: "honest" } }) },
      { id: "partialSim", title: "Partly right on the analysis, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["est"] }, answers: { simPrompt: "pert", nearPrompt: "focus", rerunPrompt: "report" }, close: { how: "honest" } }) },
      { id: "partialRerun", title: "Partly right on the result, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { simPrompt: "monte", nearPrompt: "focus", rerunPrompt: "p50" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { simPrompt: "pert", nearPrompt: "cpOnly", rerunPrompt: "p50" }, close: { how: "honest" } }) },
      { id: "badSim", title: "The deterministic date reported as safe", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["est", "net"] }, answers: { simPrompt: "deterministic", nearPrompt: "focus", rerunPrompt: "report" }, close: { how: "honest" } }) },
      { id: "badNear", title: "The near-critical path ignored", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["est", "net"] }, answers: { simPrompt: "monte", nearPrompt: "ignore", rerunPrompt: "report" }, close: { how: "honest" } }) },
      { id: "badRerun", title: "Hidden padding on every activity", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["est", "net"] }, answers: { simPrompt: "monte", nearPrompt: "focus", rerunPrompt: "pad" }, close: { how: "honest" } }) },
    ],
  };
}
