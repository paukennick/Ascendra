// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIACP/wip-limits-flow-interruptions
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIACP", slug: "wip-limits-flow-interruptions" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Board and interruptions read; WIP limits; one intake; flow metrics; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["board", "chat"] }, answers: { wipPrompt: "limits", shieldPrompt: "intake", metricPrompt: "cycleTime" }, close: { how: "honest" } }) },
      { id: "partialWip", title: "Partly right on work in progress, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["board"] }, answers: { wipPrompt: "prioritize", shieldPrompt: "intake", metricPrompt: "cycleTime" }, close: { how: "honest" } }) },
      { id: "partialMetric", title: "Partly right on the flow metric, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { wipPrompt: "limits", shieldPrompt: "intake", metricPrompt: "velocity" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { wipPrompt: "prioritize", shieldPrompt: "dnd", metricPrompt: "velocity" }, close: { how: "honest" } }) },
      { id: "badWip", title: "More work started with 14 in progress", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["board", "chat"] }, answers: { wipPrompt: "addMore", shieldPrompt: "intake", metricPrompt: "cycleTime" }, close: { how: "honest" } }) },
      { id: "badShield", title: "Interruptions left unmanaged", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["board", "chat"] }, answers: { wipPrompt: "limits", shieldPrompt: "acceptAll", metricPrompt: "cycleTime" }, close: { how: "honest" } }) },
      { id: "badMetric", title: "Developers ranked by points", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["board", "chat"] }, answers: { wipPrompt: "limits", shieldPrompt: "intake", metricPrompt: "perPerson" }, close: { how: "honest" } }) },
    ],
  };
}
