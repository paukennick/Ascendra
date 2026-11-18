// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CYSAPLUS/vuln-reporting-kpis-inhibitors
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CYSAPLUS", slug: "vuln-reporting-kpis-inhibitors" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Trends and contract read; tailored reports; an action plan for the inhibitor; outcome KPIs; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["trend", "inhib"] }, answers: { audPrompt: "tailored", inhPrompt: "plan", kpiPrompt: "meaningful" }, close: { how: "honest" } }) },
      { id: "partialAud", title: "Partly right on the audiences, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["trend"] }, answers: { audPrompt: "summaryAll", inhPrompt: "plan", kpiPrompt: "meaningful" }, close: { how: "honest" } }) },
      { id: "partialKpi", title: "Partly right on SOC metrics, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { audPrompt: "tailored", inhPrompt: "plan", kpiPrompt: "volumePlus" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { audPrompt: "summaryAll", inhPrompt: "waitVendor", kpiPrompt: "volumePlus" }, close: { how: "honest" } }) },
      { id: "badAud", title: "The raw scan export sent to the risk committee", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["trend", "inhib"] }, answers: { audPrompt: "rawDump", inhPrompt: "plan", kpiPrompt: "meaningful" }, close: { how: "honest" } }) },
      { id: "badInh", title: "Patched without the vendor's validation", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["trend", "inhib"] }, answers: { audPrompt: "tailored", inhPrompt: "patchAnyway", kpiPrompt: "meaningful" }, close: { how: "honest" } }) },
      { id: "badKpi", title: "A target to halve alert volume", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["trend", "inhib"] }, answers: { audPrompt: "tailored", inhPrompt: "plan", kpiPrompt: "targetVolume" }, close: { how: "honest" } }) },
    ],
  };
}
