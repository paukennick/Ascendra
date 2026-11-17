// REQ-329 (docs/sims.md 22.36): golden paths for FNPAANP/clinic-depression-follow-up-item-nine.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-fnp-outpatient
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "FNPAANP", slug: "clinic-depression-follow-up-item-nine" };

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
    slug: "clinic-depression-follow-up-item-nine",
    paths: [
      {
        id: "expert",
        title: "Facing her, a reflection, normalizing, the questions at minute 6, every follow-up, a six-step plan ending with means safety, treatment, a warm handoff, a call in two days",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["askMethod"], ["askIntent"], ["askPlan"], ["askBehavior"], ["askAccess"], ["askSupports"], ["planStep", {"step": "warning"}], ["planStep", {"step": "people"}], ["planStep", {"step": "pros"}], ["planStep", {"step": "coping"}], ["planStep", {"step": "means"}], ["startTreatment"], ["warmHandoff"], ["followUp", {"when": "call48"}]], ["moderate", "outpatient"]),
      },
      {
        id: "gaps",
        title: "Early questions, three follow-ups, a three-step plan without means safety, treatment, a visit in four weeks",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["askIntent"], ["askPlan"], ["askSupports"], ["planStep", {"step": "warning"}], ["planStep", {"step": "people"}], ["planStep", {"step": "pros"}], ["startTreatment"], ["followUp", {"when": "month"}]], ["moderate", "outpatient"]),
      },
      {
        id: "listOnly",
        title: "Advice, a contract and a therapist list, never the questions",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["advise"], ["contract"], ["referOnly"]], ["low", "routine"]),
      },
      {
        id: "rupture",
        title: "Reassurance and advice first: she leaves",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
