// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for ICA/istio-503s-stale-proxies-missing-subset
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "ICA", slug: "istio-503s-stale-proxies-missing-subset" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Analyzer and proxy-status read; subset defined; istiod fixed and synced; TLS corrected; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["analyze", "pstatus"] }, answers: { subsetPrompt: "addSubset", stalePrompt: "fixIstiod", tlsPrompt: "fixTls" }, close: { how: "honest" } }) },
      { id: "partialSubset", title: "Partly right on the subset, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["analyze"] }, answers: { subsetPrompt: "rollback", stalePrompt: "fixIstiod", tlsPrompt: "fixTls" }, close: { how: "honest" } }) },
      { id: "partialTls", title: "Partly right on the mTLS mismatch, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { subsetPrompt: "addSubset", stalePrompt: "fixIstiod", tlsPrompt: "permissive" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { subsetPrompt: "rollback", stalePrompt: "restartStale", tlsPrompt: "permissive" }, close: { how: "honest" } }) },
      { id: "badSubset", title: "Every Pod restarted; the conflict remains", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["analyze", "pstatus"] }, answers: { subsetPrompt: "restartAll", stalePrompt: "fixIstiod", tlsPrompt: "fixTls" }, close: { how: "honest" } }) },
      { id: "badStale", title: "istiod deleted to reinstall during the incident", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["analyze", "pstatus"] }, answers: { subsetPrompt: "addSubset", stalePrompt: "deleteIstiod", tlsPrompt: "fixTls" }, close: { how: "honest" } }) },
      { id: "badTls", title: "ratings removed from the mesh", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["analyze", "pstatus"] }, answers: { subsetPrompt: "addSubset", stalePrompt: "fixIstiod", tlsPrompt: "disableMesh" }, close: { how: "honest" } }) },
    ],
  };
}
