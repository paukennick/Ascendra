// REQ-329 (docs/sims.md 22.36): golden paths for CEN/ed-threat-against-former-supervisor.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-cen-homicide
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CEN", slug: "ed-threat-against-former-supervisor" };

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
    slug: "ed-threat-against-former-supervisor",
    paths: [
      {
        id: "expert",
        title: "Space and a calm open, a reflection, the frame on confidentiality, direct questions at minute 6, every follow-up, constant observation, the report under the policy",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["askTarget"], ["askPlan"], ["askIntent"], ["askHistory"], ["askAccess"], ["askSupports"], ["observe", {"level": "constant"}], ["belongings"], ["notifyMd"], ["reportThreat"], ["pageBh"]], ["high", "evalHold"]),
      },
      {
        id: "gaps",
        title: "Early questions, two follow-ups, checks every 15 minutes, the physician told, the threat not reported under the policy",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["askTarget"], ["askIntent"], ["askSupports"], ["observe", {"level": "checks"}], ["notifyMd"]], ["high", "evalHold"]),
      },
      {
        id: "secretAndSent",
        title: "A promise of secrecy, a call to the supervisor, no questions, sent home",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["promiseSecret"], ["warnSelf"], ["advise"]], ["low", "discharge"]),
      },
      {
        id: "rupture",
        title: "Telling him what he means and to let it go: he walks out",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
