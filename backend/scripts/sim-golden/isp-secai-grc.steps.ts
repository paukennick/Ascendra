// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for SECAIPLUS/ai-hiring-screener-compliance
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "SECAIPLUS", slug: "ai-hiring-screener-compliance" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Use case and legal note read; high-risk; framework applied; EU hosting without training; an honest decision", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["use", "law"] }, answers: { clsPrompt: "high", rmfPrompt: "nist", sovPrompt: "euHost" }, close: { how: "honest" } }) },
      { id: "partialCls", title: "Partly right on classification, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["use"] }, answers: { clsPrompt: "usOnly", rmfPrompt: "nist", sovPrompt: "euHost" }, close: { how: "honest" } }) },
      { id: "partialSov", title: "Partly right on data sovereignty, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { clsPrompt: "high", rmfPrompt: "nist", sovPrompt: "anonymize" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { clsPrompt: "usOnly", rmfPrompt: "checklist", sovPrompt: "anonymize" }, close: { how: "honest" } }) },
      { id: "badCls", title: "Recruitment AI treated as a low-risk tool", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["use", "law"] }, answers: { clsPrompt: "lowRisk", rmfPrompt: "nist", sovPrompt: "euHost" }, close: { how: "honest" } }) },
      { id: "badRmf", title: "The vendor's fairness claim accepted untested", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["use", "law"] }, answers: { clsPrompt: "high", rmfPrompt: "trustVendor", sovPrompt: "euHost" }, close: { how: "honest" } }) },
      { id: "badSov", title: "Vendor defaults accepted: US hosting and training", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["use", "law"] }, answers: { clsPrompt: "high", rmfPrompt: "nist", sovPrompt: "default" }, close: { how: "honest" } }) },
    ],
  };
}
