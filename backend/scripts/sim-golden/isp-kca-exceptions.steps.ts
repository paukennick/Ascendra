// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for KCA/kyverno-hostpath-exception-scope
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "KCA", slug: "kyverno-hostpath-exception-scope" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Request and permissions read; a one-rule, one-workload exception; approvers only; skips watched; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["req", "rbac"] }, answers: { scopePrompt: "narrow", whoPrompt: "restrict", watchPrompt: "reports" }, close: { how: "honest" } }) },
      { id: "partialScope", title: "Partly right on the scope, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["req"] }, answers: { scopePrompt: "namespace", whoPrompt: "restrict", watchPrompt: "reports" }, close: { how: "honest" } }) },
      { id: "partialWatch", title: "Partly right on the reports, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { scopePrompt: "narrow", whoPrompt: "restrict", watchPrompt: "calendar" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { scopePrompt: "namespace", whoPrompt: "review", watchPrompt: "calendar" }, close: { how: "honest" } }) },
      { id: "badScope", title: "The policy switched to Audit cluster-wide", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["req", "rbac"] }, answers: { scopePrompt: "auditAll", whoPrompt: "restrict", watchPrompt: "reports" }, close: { how: "honest" } }) },
      { id: "badWho", title: "Anyone may still create exceptions; one is self-granted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["req", "rbac"] }, answers: { scopePrompt: "narrow", whoPrompt: "leave", watchPrompt: "reports" }, close: { how: "honest" } }) },
      { id: "badWatch", title: "The exception never tracked; it outlives its reason", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["req", "rbac"] }, answers: { scopePrompt: "narrow", whoPrompt: "restrict", watchPrompt: "forget" }, close: { how: "honest" } }) },
    ],
  };
}
