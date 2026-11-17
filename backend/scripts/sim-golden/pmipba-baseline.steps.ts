// REQ-321 (sims-pm-2): golden paths for the PMI-PBA requirements baseline on
// the project dashboard's predictive mode
// (PMIPBA/pmipba-claims-portal-baseline-signoff.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIPBA", slug: "pmipba-claims-portal-baseline-signoff" };

const a = (conflict: string, alloc: string, signoff: string, cr: string) => ({ conflictPrompt: conflict, allocPrompt: alloc, signPrompt: signoff, crPrompt: cr });
const run = { periodVar: "week", runPhase: "build", periodTimer: "week" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Trace reviewed and prototype shown; the conflict settled in a scored workshop, 33 baselined and 9 deferred, sign-off by the plan's rule, CR-04 through the board, baseline v1.1", reasoning: "met",
        drive: (c) => play(c, { ...run, inspect: { 0: ["trace", "proto"] }, answers: a("workshop", "allocated", "consensus", "impact"), close: { how: "trace" } }) },
      { id: "overtime", title: "All 42 requirements baselined with overtime; otherwise controlled", reasoning: "partial",
        drive: (c) => play(c, { ...run, answers: a("workshop", "all", "consensus", "impact"), close: { how: "trace" } }) },
      { id: "buySignature", title: "The trend report added unsized to win Finance's signature", reasoning: "partial",
        drive: (c) => play(c, { ...run, inspect: { 0: ["trace"] }, answers: a("workshop", "allocated", "addSilently", "impact"), close: { how: "skip" } }) },
      { id: "unsigned", title: "Build started on an unsigned baseline", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("workshop", "allocated", "startBuild", "impact"), close: { how: "trace" } }) },
      { id: "loudest", title: "The conflict decided by seniority; Finance overruled", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("loudest", "allocated", "consensus", "impact"), close: { how: "trace" } }) },
      { id: "overrun", title: "Both rules kept, the regulator's reports cut, the fraud field added on request", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("both", "cutCompliance", "consensus", "direct"), close: { how: "skip" } }) },
      { id: "frozen", title: "A sound baseline, then the change refused because 'the baseline is frozen'", reasoning: "partial",
        drive: (c) => play(c, { ...run, answers: a("workshop", "allocated", "consensus", "rejected"), close: { how: "trace" } }) },
    ],
  };
}
