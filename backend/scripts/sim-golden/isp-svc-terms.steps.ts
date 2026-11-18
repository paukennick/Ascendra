// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for ITIL5FND/payroll-service-utility-warranty-sla
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "ITIL5FND", slug: "payroll-service-utility-warranty-sla" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Description and complaints read; utility and warranty; outcomes measured; an agreed SLA; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["desc", "compl"] }, answers: { uwPrompt: "both", outPrompt: "outcomes", slaPrompt: "agreed" }, close: { how: "honest" } }) },
      { id: "partialUw", title: "Partly right on utility and warranty, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["desc"] }, answers: { uwPrompt: "addFeatures", outPrompt: "outcomes", slaPrompt: "agreed" }, close: { how: "honest" } }) },
      { id: "partialSla", title: "Partly right on the service level agreement, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { uwPrompt: "both", outPrompt: "outcomes", slaPrompt: "internal" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { uwPrompt: "addFeatures", outPrompt: "moreOutputs", slaPrompt: "internal" }, close: { how: "honest" } }) },
      { id: "badUw", title: "The description left without warranty", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["desc", "compl"] }, answers: { uwPrompt: "unchanged", outPrompt: "outcomes", slaPrompt: "agreed" }, close: { how: "honest" } }) },
      { id: "badOut", title: "Files on time kept as the measure", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["desc", "compl"] }, answers: { uwPrompt: "both", outPrompt: "files", slaPrompt: "agreed" }, close: { how: "honest" } }) },
      { id: "badSla", title: "Best effort promised", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["desc", "compl"] }, answers: { uwPrompt: "both", outPrompt: "outcomes", slaPrompt: "vague" }, close: { how: "honest" } }) },
    ],
  };
}
