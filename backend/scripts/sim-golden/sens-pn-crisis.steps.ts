// REQ-329 (docs/sims.md 22.36): golden paths for NCLEXPN/clinic-eviction-no-way-out.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-pn-crisis
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCLEXPN", slug: "clinic-eviction-no-way-out" };

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
    slug: "clinic-eviction-no-way-out",
    paths: [
      {
        id: "expert",
        title: "Sitting with him, a reflection, grounding, the questions at minute 6, kept with staff, the RN at once, every follow-up, the social worker and 988",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["stayWith"], ["reportRn"], ["askNow"], ["askOthers"], ["askUrgent"], ["askSupports"], ["socialWork"], ["give988"]], ["nonacute", "reportedSupported"]),
      },
      {
        id: "gaps",
        title: "Direct questions, two follow-ups, kept with staff, the RN told, no social worker or 988",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["screen"], ["askNow"], ["askSupports"], ["stayWith"], ["reportRn"]], ["nonacute", "reportedSupported"]),
      },
      {
        id: "waitingRoom",
        title: "A housing promise, advice, the waiting room, never the questions",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["fixIt"], ["advise"], ["waitingRoom"]], ["negative", "bpOnly"]),
      },
      {
        id: "rupture",
        title: "'It'll work out' and 'relax': he leaves",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
