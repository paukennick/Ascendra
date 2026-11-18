// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIPMOCP/pmo-team-competency-kpis
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIPMOCP", slug: "pmo-team-competency-kpis" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Survey and skills read; role framework; IDPs and mentoring; outcome KPIs; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["survey", "skills"] }, answers: { rolesPrompt: "roleFw", idpPrompt: "plans", kpiPrompt: "kpis" }, close: { how: "honest" } }) },
      { id: "partialRoles", title: "Partly right on role competencies, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["survey"] }, answers: { rolesPrompt: "generic", idpPrompt: "plans", kpiPrompt: "kpis" }, close: { how: "honest" } }) },
      { id: "partialKpi", title: "Partly right on measuring the PMO, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rolesPrompt: "roleFw", idpPrompt: "plans", kpiPrompt: "satisfaction" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rolesPrompt: "generic", idpPrompt: "course", kpiPrompt: "satisfaction" }, close: { how: "honest" } }) },
      { id: "badRoles", title: "Analysts to be replaced", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["survey", "skills"] }, answers: { rolesPrompt: "hireOnly", idpPrompt: "plans", kpiPrompt: "kpis" }, close: { how: "honest" } }) },
      { id: "badIdp", title: "No development", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["survey", "skills"] }, answers: { rolesPrompt: "roleFw", idpPrompt: "nothing", kpiPrompt: "kpis" }, close: { how: "honest" } }) },
      { id: "badKpi", title: "Report counts kept", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["survey", "skills"] }, answers: { rolesPrompt: "roleFw", idpPrompt: "plans", kpiPrompt: "output" }, close: { how: "honest" } }) },
    ],
  };
}
