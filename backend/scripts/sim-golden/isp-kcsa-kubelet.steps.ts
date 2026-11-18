// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for KCSA/kubelet-anonymous-alwaysallow
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "KCSA", slug: "kubelet-anonymous-alwaysallow" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Endpoint tested and config read; anonymous off; Webhook authorization; least-privilege monitoring; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["curl", "config"] }, answers: { anonPrompt: "authn", authzPrompt: "webhook", monitorPrompt: "statsOnly" }, close: { how: "honest" } }) },
      { id: "partialAnon", title: "Partly right on anonymous access, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["curl"] }, answers: { anonPrompt: "firewall", authzPrompt: "webhook", monitorPrompt: "statsOnly" }, close: { how: "honest" } }) },
      { id: "partialMonitor", title: "Partly right on monitoring access, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { anonPrompt: "authn", authzPrompt: "webhook", monitorPrompt: "statsProxy" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { anonPrompt: "firewall", authzPrompt: "keepAllow", monitorPrompt: "statsProxy" }, close: { how: "honest" } }) },
      { id: "badAnon", title: "Anonymous kubelet access left on", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["curl", "config"] }, answers: { anonPrompt: "leave", authzPrompt: "webhook", monitorPrompt: "statsOnly" }, close: { how: "honest" } }) },
      { id: "badAuthz", title: "Anonymous access restored with AlwaysAllow", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["curl", "config"] }, answers: { anonPrompt: "authn", authzPrompt: "noAuthn", monitorPrompt: "statsOnly" }, close: { how: "honest" } }) },
      { id: "badMonitor", title: "The monitoring agent made cluster-admin", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["curl", "config"] }, answers: { anonPrompt: "authn", authzPrompt: "webhook", monitorPrompt: "admin" }, close: { how: "honest" } }) },
    ],
  };
}
