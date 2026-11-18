// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CAPA/rollouts-analysis-gate-passes-bad-canary
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CAPA", slug: "rollouts-analysis-gate-passes-bad-canary" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Last run and template read; query and conditions fixed; the failing run aborts; background analysis added; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["lastRun", "query"] }, answers: { condPrompt: "fixed", abortPrompt: "letAbort", bgPrompt: "background" }, close: { how: "honest" } }) },
      { id: "partialCond", title: "Partly right on the conditions, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["lastRun"] }, answers: { condPrompt: "manualGate", abortPrompt: "letAbort", bgPrompt: "background" }, close: { how: "honest" } }) },
      { id: "partialBg", title: "Partly right on background analysis, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { condPrompt: "fixed", abortPrompt: "letAbort", bgPrompt: "longPause" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { condPrompt: "manualGate", abortPrompt: "retryLater", bgPrompt: "longPause" }, close: { how: "honest" } }) },
      { id: "badCond", title: "The template left as it was; a bad canary promoted to 50%", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lastRun", "query"] }, answers: { condPrompt: "keep", abortPrompt: "letAbort", bgPrompt: "background" }, close: { how: "honest" } }) },
      { id: "badAbort", title: "Full promotion over a failing analysis", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lastRun", "query"] }, answers: { condPrompt: "fixed", abortPrompt: "promote", bgPrompt: "background" }, close: { how: "honest" } }) },
      { id: "badBg", title: "The analysis removed; a pool leak at 50% promoted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["lastRun", "query"] }, answers: { condPrompt: "fixed", abortPrompt: "letAbort", bgPrompt: "removeAnalysis" }, close: { how: "honest" } }) },
    ],
  };
}
