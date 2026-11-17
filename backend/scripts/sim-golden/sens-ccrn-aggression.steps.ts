// REQ-329 (docs/sims.md 22.36): golden paths for CCRNADULT/icu-threatens-staff-pulls-cannula.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-ccrn-aggression
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "icu-threatens-staff-pulls-cannula" };

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
    slug: "icu-threatens-staff-pulls-cannula",
    paths: [
      {
        id: "expert",
        title: "One calm voice, a reflection, a limit and a choice, the threat explored, every cause found, space, security out of sight, oxygen and pain treated, the provider",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["scoreBvc"], ["checkOxygen"], ["askPain"], ["camIcu"], ["askWants"], ["space"], ["security"], ["oxygenOn"], ["painDose"], ["notifyMd"]], ["high", "calmed"]),
      },
      {
        id: "gaps",
        title: "A calm start, the threat explored, the oxygen found and fixed, security nearby, the provider called, the delirium missed and the pain left untreated",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["screen"], ["checkOxygen"], ["askPain"], ["security"], ["oxygenOn"], ["notifyMd"]], ["high", "calmed"]),
      },
      {
        id: "restrainedFirst",
        title: "Hands on, then restraints, never the question or the cause",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["handsOn"], ["restrain"]], ["low", "restrained"]),
      },
      {
        id: "rupture",
        title: "'Calm down': he climbs out of bed",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
