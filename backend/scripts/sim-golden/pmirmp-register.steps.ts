// REQ-321 (sims-pm-2): golden paths for the PMI-RMP risk register on the
// governance board (PMIRMP/pmirmp-warehouse-risk-register.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIRMP", slug: "pmirmp-warehouse-risk-register" };

const a = (reg: string, quali: string, emv: string, trig: string) => ({ regPrompt: reg, qualPrompt: quali, emvPrompt: emv, trigPrompt: trig });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Plan read and vendor interviewed; register validated, rated on the matrix, R2 mitigated on its EMV, R5's trigger documented and fired, a full report", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["plan", "vendor"] }, answers: a("validated", "matrix", "mitigate", "documented"), close: { how: "honest" } }) },
      { id: "transfer", title: "A sound register and trigger, but R2 transferred at more than its exposure and five risks kept", reasoning: "partial",
        drive: (c) => play(c, { answers: a("top5", "matrix", "transfer", "documented"), close: { how: "honest" } }) },
      { id: "gutRatings", title: "Ratings by feel and a one-line report, with the mitigation and the trigger in place", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["vendor"] }, answers: a("validated", "gut", "mitigate", "documented"), close: { how: "summary" } }) },
      { id: "noTrigger", title: "Everything rated medium and no trigger: go-live at 91% fails in peak", reasoning: "missed",
        drive: (c) => play(c, { answers: a("asIs", "medium", "mitigate", "skipped"), close: { how: "summary" } }) },
      { id: "vagueTrigger", title: "A good register, then 'keep an eye on testing' instead of a trigger", reasoning: "missed",
        drive: (c) => play(c, { answers: a("validated", "matrix", "mitigate", "vague"), close: { how: "honest" } }) },
      { id: "accepted", title: "R2 accepted without analysis; the late software costs more than the reserve", reasoning: "missed",
        drive: (c) => play(c, { answers: a("validated", "matrix", "accept", "documented"), close: { how: "honest" } }) },
    ],
  };
}
