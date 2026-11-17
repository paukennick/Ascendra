// REQ-321 (sims-pm-2): golden paths for the PfMP portfolio rebalancing on the
// governance board (PFMP/pfmp-water-utility-rebalance.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PFMP", slug: "pfmp-water-utility-rebalance" };

const a = (impact: string, scen: string, rec: string, realloc: string) => ({ impactPrompt: impact, scenPrompt: scen, recPrompt: rec, reallocPrompt: realloc });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Strategy read and dependencies mapped; components re-scored, three scenarios evaluated, scenario B approved by the board, engineers moved from the paused app, a full record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["strategy", "deps"] }, answers: a("rescored", "three", "governed", "reallocated"), close: { how: "honest" } }) },
      { id: "oneScenario", title: "Only the CEO's scenario worked up; the app team kept together while leak detection waits", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["strategy"] }, answers: a("rescored", "one", "governed", "keep"), close: { how: "honest" } }) },
      { id: "carryOn", title: "No impact assessment and a re-ordered list, then a governed decision", reasoning: "partial",
        drive: (c) => play(c, { answers: a("carryOn", "gut", "governed", "reallocated"), close: { how: "summary" } }) },
      { id: "cutBilling", title: "Scenario C recommended without the dependency: billing cancelled, the meters cannot be billed", reasoning: "missed",
        drive: (c) => play(c, { answers: a("rescored", "one", "cutBilling", "reallocated"), close: { how: "honest" } }) },
      { id: "direct", title: "Scenario B put in place before the board meets", reasoning: "missed",
        drive: (c) => play(c, { answers: a("rescored", "three", "direct", "reallocated"), close: { how: "honest" } }) },
      { id: "cancelEarly", title: "Two approved components cancelled in week 2 without analysis or the board", reasoning: "missed",
        drive: (c) => play(c, { answers: a("cancelled", "gut", "governed", "reallocated"), close: { how: "summary" } }) },
      { id: "contractors", title: "A governed decision, then contractors hired over budget while the app team sits idle", reasoning: "missed",
        drive: (c) => play(c, { answers: a("rescored", "three", "governed", "contract"), close: { how: "honest" } }) },
    ],
  };
}
