// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CNPE/tekton-pipeline-updates-git
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CNPE", slug: "tekton-pipeline-updates-git" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Pipeline and run read; Git-based deploy; tasks ordered; finally cleanup; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["pipe", "run"] }, answers: { deployPrompt: "gitUpdate", orderPrompt: "runAfter", cleanupPrompt: "finally" }, close: { how: "honest" } }) },
      { id: "partialDeploy", title: "Partly right on the deploy task, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["pipe"] }, answers: { deployPrompt: "stagingOnly", orderPrompt: "runAfter", cleanupPrompt: "finally" }, close: { how: "honest" } }) },
      { id: "partialCleanup", title: "Partly right on cleanup, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { deployPrompt: "gitUpdate", orderPrompt: "runAfter", cleanupPrompt: "cron" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { deployPrompt: "stagingOnly", orderPrompt: "tagUntested", cleanupPrompt: "cron" }, close: { how: "honest" } }) },
      { id: "badDeploy", title: "kubectl apply kept with self-heal off", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pipe", "run"] }, answers: { deployPrompt: "keepApply", orderPrompt: "runAfter", cleanupPrompt: "finally" }, close: { how: "honest" } }) },
      { id: "badOrder", title: "Tests removed from the pipeline", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pipe", "run"] }, answers: { deployPrompt: "gitUpdate", orderPrompt: "dropTests", cleanupPrompt: "finally" }, close: { how: "honest" } }) },
      { id: "badCleanup", title: "Cleanup left as a regular last task", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pipe", "run"] }, answers: { deployPrompt: "gitUpdate", orderPrompt: "runAfter", cleanupPrompt: "lastTask" }, close: { how: "honest" } }) },
    ],
  };
}
