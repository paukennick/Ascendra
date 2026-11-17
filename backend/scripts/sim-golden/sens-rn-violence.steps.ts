// REQ-329 (docs/sims.md 22.36): golden paths for NCLEXRN/visiting-hours-threat-on-the-unit.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-rn-violence
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "visiting-hours-threat-on-the-unit" };

function say(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.ended || c.run.state.phase !== "session") return;
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, risk: string, disposition: string): void {
  if (c.run.state.ended) return;
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("document", { risk, disposition });
}

type Step = [string, Record<string, string>?];
function drive(c: Ctl, steps: Step[], doc?: [string, string]): void {
  for (const [a, p] of steps) say(c, a, p);
  if (doc) close(c, doc[0], doc[1]);
}

export function spec(): StepsSpec {
  return {
    slug: "visiting-hours-threat-on-the-unit",
    paths: [
      {
        id: "expert",
        title: "Distance and an exit, a reflection, the frame on confidentiality, the direct question at minute 6, the checklist and follow-ups, precautions before 18:00, the report under the policy",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["scoreBvc"], ["askIntent"], ["askPlan"], ["askHistory"], ["askSupports"], ["security"], ["observe", {"level": "constant"}], ["removeItems"], ["notifyMd"], ["reportThreat"]], ["high", "precautions"]),
      },
      {
        id: "gaps",
        title: "An early question, the checklist and intent, security called, the provider told, the threat not reported under the policy",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["scoreBvc"], ["askIntent"], ["askSupports"], ["security"], ["notifyMd"]], ["high", "precautions"]),
      },
      {
        id: "secretAndVisit",
        title: "A promise of secrecy, a confrontation, never the question, the visit goes ahead",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["promiseSecret"], ["confront"], ["advise"]], ["low", "routine"]),
      },
      {
        id: "rupture",
        title: "Telling him what he means and to calm down: it escalates",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
