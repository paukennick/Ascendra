// REQ-321 (sims-pm-2): golden paths for the CSPP P5 impact review on the
// governance board (CSPP/cspp-school-laptop-p5-review.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CSPP", slug: "cspp-school-laptop-p5-review" };

const a = (p5: string, device: string, disposal: string, claim: string) => ({ p5Prompt: p5, offerPrompt: device, dispPrompt: disposal, claimPrompt: claim });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Offers compared over six years and recyclers checked; a full P5 analysis, offer B, the certified recycler, an honest announcement and a re-rated closing report", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["tco", "recyclers"] }, answers: a("full", "repairable", "certified", "honest"), close: { how: "honest" } }) },
      { id: "energyOnly", title: "Energy use only as the analysis; old laptops stored; nothing published", reasoning: "partial",
        drive: (c) => play(c, { answers: a("planetOnly", "repairable", "store", "silent"), close: { how: "honest" } }) },
      { id: "cheapest", title: "A full analysis, then the lowest price; disposal and reporting sound", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["recyclers"] }, answers: a("full", "cheapest", "certified", "honest"), close: { how: "honest" } }) },
      { id: "broker", title: "The supplier's form as the analysis, then the old laptops sold to a broker with no known destination", reasoning: "missed",
        drive: (c) => play(c, { answers: a("skip", "cheapest", "lowest", "silent"), close: { how: "summary" } }) },
      { id: "zeroClaim", title: "Offsets bought and a 'zero-impact' announcement published", reasoning: "missed",
        drive: (c) => play(c, { answers: a("planetOnly", "offset", "certified", "zero"), close: { how: "summary" } }) },
      { id: "goodButClaim", title: "Everything right until the 'zero-impact' headline", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["tco"] }, answers: a("full", "repairable", "certified", "zero"), close: { how: "honest" } }) },
    ],
  };
}
