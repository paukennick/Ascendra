// REQ-329 (docs/sims.md 22.36): golden paths for NCLEXRN/crash-survivor-wishes-she-had-died-too.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-rn-crisis
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "crash-survivor-wishes-she-had-died-too" };

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
    slug: "crash-survivor-wishes-she-had-died-too",
    paths: [
      {
        id: "expert",
        title: "Staying, a reflection, grounding, the screen at minute 6, every follow-up, observation and a room check, one next step, her supports and the provider",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["askNow"], ["askIntent"], ["askUrgent"], ["askCoping"], ["askSupports"], ["observe", {"level": "constant"}], ["roomCheck"], ["oneStep"], ["callSupport"], ["notifyMd"]], ["nonacute", "crisisPlan"]),
      },
      {
        id: "gaps",
        title: "An early screen, the urgent problem asked, checks every 15 minutes, the provider called, no next step",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["screen"], ["askNow"], ["askUrgent"], ["askSupports"], ["observe", {"level": "checks"}], ["notifyMd"]], ["nonacute", "crisisPlan"]),
      },
      {
        id: "sedatedAlone",
        title: "Advice, sedation asked for, left to rest, never screened",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["advise"], ["sedate"], ["leaveToRest"]], ["negative", "rest"]),
      },
      {
        id: "rupture",
        title: "Clich\u00e9s and advice: she shuts down",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
