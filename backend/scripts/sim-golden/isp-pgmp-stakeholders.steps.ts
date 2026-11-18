// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PGMP/pgmp-hospital-stakeholder-risks
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PGMP", slug: "pgmp-hospital-stakeholder-risks" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Interviews and lessons read; concerns registered; KPIs agreed; go-live shaped together; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["interviews", "history"] }, answers: { risksPrompt: "register", kpiPrompt: "kpis", supPrompt: "engage" }, close: { how: "honest" } }) },
      { id: "partialRisks", title: "Partly right on stakeholder risks, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["interviews"] }, answers: { risksPrompt: "minutes", kpiPrompt: "kpis", supPrompt: "engage" }, close: { how: "honest" } }) },
      { id: "partialSup", title: "Partly right on support, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { risksPrompt: "register", kpiPrompt: "kpis", supPrompt: "compromise" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { risksPrompt: "minutes", kpiPrompt: "sponsorOnly", supPrompt: "compromise" }, close: { how: "honest" } }) },
      { id: "badRisks", title: "Concerns dismissed as resistance", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["interviews", "history"] }, answers: { risksPrompt: "dismiss", kpiPrompt: "kpis", supPrompt: "engage" }, close: { how: "honest" } }) },
      { id: "badKpi", title: "Vague promises instead of KPIs", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["interviews", "history"] }, answers: { risksPrompt: "register", kpiPrompt: "vague", supPrompt: "engage" }, close: { how: "honest" } }) },
      { id: "badSup", title: "January go-live forced", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["interviews", "history"] }, answers: { risksPrompt: "register", kpiPrompt: "kpis", supPrompt: "override" }, close: { how: "honest" } }) },
    ],
  };
}
