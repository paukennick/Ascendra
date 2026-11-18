// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for KCA/kyverno-match-exclude-blocks-deletes
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "KCA", slug: "kyverno-match-exclude-blocks-deletes" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Policy and report read; CREATE and UPDATE only; a namespaceSelector; an any exclude; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["pol", "report"] }, answers: { opsPrompt: "createUpdate", selPrompt: "nsSelector", excPrompt: "any" }, close: { how: "honest" } }) },
      { id: "partialOps", title: "Partly right on operations, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["pol"] }, answers: { opsPrompt: "audit", selPrompt: "nsSelector", excPrompt: "any" }, close: { how: "honest" } }) },
      { id: "partialExc", title: "Partly right on the exclude block, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { opsPrompt: "createUpdate", selPrompt: "nsSelector", excPrompt: "twoPolicies" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { opsPrompt: "audit", selPrompt: "addName", excPrompt: "twoPolicies" }, close: { how: "honest" } }) },
      { id: "badOps", title: "On-call removes the webhook to delete Pods", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pol", "report"] }, answers: { opsPrompt: "forceDelete", selPrompt: "nsSelector", excPrompt: "any" }, close: { how: "honest" } }) },
      { id: "badSel", title: "Every namespace matched; CoreDNS denied", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pol", "report"] }, answers: { opsPrompt: "createUpdate", selPrompt: "allNs", excPrompt: "any" }, close: { how: "honest" } }) },
      { id: "badExc", title: "Everyone with the edit role excluded", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pol", "report"] }, answers: { opsPrompt: "createUpdate", selPrompt: "nsSelector", excPrompt: "clusterRole" }, close: { how: "honest" } }) },
    ],
  };
}
