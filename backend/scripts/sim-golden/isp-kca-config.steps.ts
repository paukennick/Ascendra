// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for KCA/kyverno-webhook-timeouts-node-drain
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "KCA", slug: "kyverno-webhook-timeouts-node-drain" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Deployments and ConfigMap read; HA with Fail kept; a per-policy timeout; default filters restored; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["deploy", "cm"] }, answers: { haPrompt: "replicas", timeoutPrompt: "perPolicy", filtersPrompt: "restore" }, close: { how: "honest" } }) },
      { id: "partialHa", title: "Partly right on availability, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["deploy"] }, answers: { haPrompt: "two", timeoutPrompt: "perPolicy", filtersPrompt: "restore" }, close: { how: "honest" } }) },
      { id: "partialFilters", title: "Partly right on resource filters, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { haPrompt: "replicas", timeoutPrompt: "perPolicy", filtersPrompt: "moreCpu" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { haPrompt: "two", timeoutPrompt: "global30", filtersPrompt: "moreCpu" }, close: { how: "honest" } }) },
      { id: "badHa", title: "failurePolicy set to Ignore; a privileged Pod slips in", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["deploy", "cm"] }, answers: { haPrompt: "ignore", timeoutPrompt: "perPolicy", filtersPrompt: "restore" }, close: { how: "honest" } }) },
      { id: "badTimeout", title: "The verifyImages policy deleted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["deploy", "cm"] }, answers: { haPrompt: "replicas", timeoutPrompt: "dropVerify", filtersPrompt: "restore" }, close: { how: "honest" } }) },
      { id: "badFilters", title: "Application namespaces excluded to cut load", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["deploy", "cm"] }, answers: { haPrompt: "replicas", timeoutPrompt: "perPolicy", filtersPrompt: "excludeAll" }, close: { how: "honest" } }) },
    ],
  };
}
