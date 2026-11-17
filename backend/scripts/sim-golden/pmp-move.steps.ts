// REQ-321 (sims-pm-2): golden paths for the PMP contact center move on the
// project dashboard's predictive mode
// (PMP/pmp-contact-center-move-procurement.sim.json). No prototype exists, so
// the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMP", slug: "pmp-contact-center-move-procurement" };

const a = (contract: string, res: string, vendor: string, finance: string) => ({ contractPrompt: contract, resPrompt: res, vendorPrompt: vendor, financePrompt: finance });
const run = { periodVar: "week", runPhase: "build", periodTimer: "week" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Plan and contract read; time and materials with a ceiling, the engineer negotiated, a cure notice, the overrun funded through change control, contracts closed", reasoning: "met",
        drive: (c) => play(c, { ...run, inspect: { 0: ["rmp", "contracts"] }, answers: a("tm", "negotiate", "cure", "request"), close: { how: "closed" } }) },
      { id: "fixedPrice", title: "A fixed price on the uncertain migration; everything else controlled", reasoning: "partial",
        drive: (c) => play(c, { ...run, answers: a("fixed", "negotiate", "cure", "request"), close: { how: "closed" } }) },
      { id: "paidAndWaited", title: "The late vendor paid with no review; otherwise controlled", reasoning: "partial",
        drive: (c) => play(c, { ...run, inspect: { 0: ["rmp"] }, answers: a("tm", "negotiate", "wait", "request"), close: { how: "skipped" } }) },
      { id: "hidden", title: "The overrun moved to next quarter's operating budget", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("tm", "negotiate", "cure", "hide"), close: { how: "closed" } }) },
      { id: "override", title: "The sponsor asked to overrule the IT director", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("tm", "override", "cure", "request"), close: { how: "closed" } }) },
      { id: "cutTraining", title: "Training cut unannounced to stay within budget", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("tm", "negotiate", "cure", "cutTraining"), close: { how: "closed" } }) },
      { id: "overrun", title: "Uncapped cost-plus, the engineer lost, the vendor terminated", reasoning: "missed",
        drive: (c) => play(c, { ...run, answers: a("costplus", "accept", "terminate", "request"), close: { how: "skipped" } }) },
    ],
  };
}
