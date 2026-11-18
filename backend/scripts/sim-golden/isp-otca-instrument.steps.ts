// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for OTCA/otel-instrumentation-plan-checkout
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "OTCA", slug: "otel-instrumentation-plan-checkout" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Inventory and postmortem read; agents; manual spans with context; semantic conventions; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["inv", "pm"] }, answers: { autoPrompt: "agents", manualPrompt: "combine", semconvPrompt: "conventions" }, close: { how: "honest" } }) },
      { id: "partialAuto", title: "Partly right on the Java and Python services, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["inv"] }, answers: { autoPrompt: "manualAll", manualPrompt: "combine", semconvPrompt: "conventions" }, close: { how: "honest" } }) },
      { id: "partialSemconv", title: "Partly right on attribute names, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { autoPrompt: "agents", manualPrompt: "combine", semconvPrompt: "mapping" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { autoPrompt: "manualAll", manualPrompt: "logsOnly", semconvPrompt: "mapping" }, close: { how: "honest" } }) },
      { id: "badAuto", title: "Only the two newest services instrumented", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["inv", "pm"] }, answers: { autoPrompt: "skipLegacy", manualPrompt: "combine", semconvPrompt: "conventions" }, close: { how: "honest" } }) },
      { id: "badManual", title: "Gateway spans started as new traces", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["inv", "pm"] }, answers: { autoPrompt: "agents", manualPrompt: "noContext", semconvPrompt: "conventions" }, close: { how: "honest" } }) },
      { id: "badSemconv", title: "A custom naming scheme that splits the data", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["inv", "pm"] }, answers: { autoPrompt: "agents", manualPrompt: "combine", semconvPrompt: "custom" }, close: { how: "honest" } }) },
    ],
  };
}
