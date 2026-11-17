// REQ-321 (sims-pm-2): golden paths for the PMP permit portal on the project
// dashboard's predictive mode (PMP/pmp-permit-portal-hybrid-plan.sim.json).
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMP", slug: "pmp-permit-portal-hybrid-plan" };

const a = (approach: string, estimate: string, change: string, velocity: string) => ({ approachPrompt: approach, estimatePrompt: estimate, changePrompt: change, velocityPrompt: velocity });
const run = { periodVar: "week", runPhase: "build", periodTimer: "week" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Law read and counter staff heard; a hybrid in one plan, PERT and parametric estimates, the amendment through change control, launch scope agreed with the product owner, recorded", reasoning: "met",
        drive: (c) => play(c, { ...run, inspect: { 0: ["law", "users"] }, answers: a("hybrid", "threePoint", "ccb", "reprioritize"), close: { how: "closed" } }) },
      { id: "allPredictive", title: "Everything specified up front; otherwise controlled", reasoning: "partial",
        drive: (c) => play(c, { ...run, answers: a("predictive", "threePoint", "ccb", "reprioritize"), close: { how: "closed" } }) },
      { id: "analogyBacklog", title: "An estimate by analogy and the amendment put in one backlog", reasoning: "partial",
        drive: (c) => play(c, { ...run, inspect: { 0: ["law"] }, answers: a("hybrid", "analogous", "backlog", "reprioritize"), close: { how: "skipped" } }) },
      { id: "parked", title: "The amendment parked until after launch", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("hybrid", "threePoint", "ignore", "reprioritize"), close: { how: "closed" } }) },
      { id: "noBaseline", title: "Everything adaptive with no baseline for the fee module", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("adaptive", "threePoint", "ccb", "reprioritize"), close: { how: "closed" } }) },
      { id: "optimistic", title: "The vendor's 8 days, then two developers added late", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("hybrid", "vendor", "ccb", "addDevs"), close: { how: "skipped" } }) },
      { id: "overrun", title: "Everything specified up front, the vendor's estimate, the amendment in one backlog and developers added late", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("predictive", "vendor", "backlog", "addDevs"), close: { how: "skipped" } }) },
      { id: "cutTests", title: "The fee module's testers moved to the wizard", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("hybrid", "threePoint", "ccb", "cutTests"), close: { how: "closed" } }) },
    ],
  };
}
