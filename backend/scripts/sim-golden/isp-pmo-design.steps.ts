// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIPMOCP/pmo-service-catalog-slas
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIPMOCP", slug: "pmo-service-catalog-slas" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Interviews and current work read; personas; needs-based catalog; SLAs; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["needs", "today"] }, answers: { custsPrompt: "personas", catPrompt: "catalog", slaPrompt: "slas" }, close: { how: "honest" } }) },
      { id: "partialCusts", title: "Partly right on customers, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["needs"] }, answers: { custsPrompt: "execOnly", catPrompt: "catalog", slaPrompt: "slas" }, close: { how: "honest" } }) },
      { id: "partialSla", title: "Partly right on service levels, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { custsPrompt: "personas", catPrompt: "catalog", slaPrompt: "one" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { custsPrompt: "execOnly", catPrompt: "everything", slaPrompt: "one" }, close: { how: "honest" } }) },
      { id: "badCusts", title: "Needs assumed without assessment", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["needs", "today"] }, answers: { custsPrompt: "assume", catPrompt: "catalog", slaPrompt: "slas" }, close: { how: "honest" } }) },
      { id: "badCat", title: "Status chasing kept as the core service", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["needs", "today"] }, answers: { custsPrompt: "personas", catPrompt: "policing", slaPrompt: "slas" }, close: { how: "honest" } }) },
      { id: "badSla", title: "Best effort with no SLAs", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["needs", "today"] }, answers: { custsPrompt: "personas", catPrompt: "catalog", slaPrompt: "noSla" }, close: { how: "honest" } }) },
    ],
  };
}
