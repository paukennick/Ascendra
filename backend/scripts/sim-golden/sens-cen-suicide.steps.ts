// REQ-329 (docs/sims.md 22.36): golden paths for CEN/ed-screen-positive-wants-to-go-home.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-cen-suicide
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CEN", slug: "ed-screen-positive-wants-to-go-home" };

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
    slug: "ed-screen-positive-wants-to-go-home",
    paths: [
      {
        id: "expert",
        title: "Results first, a reflection, normalizing, the screen at minute 6, every follow-up question, constant observation in the safe room, the physician and evaluator",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["askNow"], ["askPlan"], ["askIntent"], ["askBehavior"], ["askAccess"], ["askSupports"], ["observe", {"level": "constant"}], ["safeRoom"], ["belongings"], ["notifyMd"], ["pageBh"], ["sister"]], ["acute", "evalHold"]),
      },
      {
        id: "gaps",
        title: "An early screen, two follow-up questions, checks every 15 minutes in the safe room, the physician told but no evaluator paged",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["askNow"], ["askPlan"], ["askSupports"], ["observe", {"level": "checks"}], ["safeRoom"], ["notifyMd"]], ["acute", "evalHold"]),
      },
      {
        id: "neverScreened",
        title: "Advice and a promise, never the screen, left alone, discharged with a sleep aid",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["advise"], ["contract"], ["leaveAlone"]], ["negative", "sleepAid"]),
      },
      {
        id: "rupture",
        title: "False reassurance and advice before any screen: he walks out",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
