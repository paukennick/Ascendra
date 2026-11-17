// REQ-329 (docs/sims.md 22.36): golden paths for NCLEXPN/rehab-resident-no-use-to-anyone.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-pn-report
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCLEXPN", slug: "rehab-resident-no-use-to-anyone" };

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
    slug: "rehab-resident-no-use-to-anyone",
    paths: [
      {
        id: "expert",
        title: "Sitting down, a reflection, normalizing, the questions at minute 6, the RN phoned from the room, kept in sight, every follow-up, the drawer checked, a bedside handoff",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["callRn"], ["stayWith"], ["askPlan"], ["askAccess"], ["askPast"], ["askSupports"], ["drawer"], ["handoff"]], ["positive", "reportedInSight"]),
      },
      {
        id: "gaps",
        title: "Direct questions, one follow-up, the RN phoned, kept in sight, no handoff",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["askPlan"], ["askSupports"], ["callRn"], ["stayWith"]], ["positive", "reportedInSight"]),
      },
      {
        id: "secretAndLeft",
        title: "A promise of secrecy, advice, then left alone; charted for later",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["keepSecret"], ["advise"], ["leaveToFind"]], ["venting", "chartLater"]),
      },
      {
        id: "rupture",
        title: "'You don't mean that' and advice: he shuts down",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
