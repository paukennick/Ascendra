// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMICPMAI/ai-triage-feasibility-risk
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMICPMAI", slug: "ai-triage-feasibility-risk" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Data and agents read; feasible scope; risks assessed; change plan; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["data", "agents"] }, answers: { feasPrompt: "scoped", riskPrompt: "assess", adoptPrompt: "change" }, close: { how: "honest" } }) },
      { id: "partialFeas", title: "Partly right on feasibility, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["data"] }, answers: { feasPrompt: "both", riskPrompt: "assess", adoptPrompt: "change" }, close: { how: "honest" } }) },
      { id: "partialAdopt", title: "Partly right on adoption, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { feasPrompt: "scoped", riskPrompt: "assess", adoptPrompt: "train" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { feasPrompt: "both", riskPrompt: "security", adoptPrompt: "train" }, close: { how: "honest" } }) },
      { id: "badFeas", title: "Feasibility skipped", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["data", "agents"] }, answers: { feasPrompt: "noAssess", riskPrompt: "assess", adoptPrompt: "change" }, close: { how: "honest" } }) },
      { id: "badRisk", title: "Risk assessment skipped", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["data", "agents"] }, answers: { feasPrompt: "scoped", riskPrompt: "skip", adoptPrompt: "change" }, close: { how: "honest" } }) },
      { id: "badAdopt", title: "Use mandated with per-agent tracking", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["data", "agents"] }, answers: { feasPrompt: "scoped", riskPrompt: "assess", adoptPrompt: "mandate" }, close: { how: "honest" } }) },
    ],
  };
}
