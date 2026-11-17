// REQ-329 (docs/sims.md 22.36): golden paths for NCLEXPN/day-room-threat-then-emergency-medicine.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-pn-deescalate
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCLEXPN", slug: "day-room-threat-then-emergency-medicine" };

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
    slug: "day-room-threat-then-emergency-medicine",
    paths: [
      {
        id: "expert",
        title: "Alone and calm, a reflection, a limit and a choice, the threat explored, the checklist and what he wants, others moved, his notebook back, the RN, then monitoring",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["scoreBvc"], ["askWants"], ["askSleep"], ["space"], ["notebook"], ["tellRn"], ["monitor"]], ["high", "calmMonitored"]),
      },
      {
        id: "gaps",
        title: "A calm start, the threat explored, the others moved, the RN told, no monitoring after the medication",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["screen"], ["scoreBvc"], ["askWants"], ["space"], ["tellRn"]], ["high", "calmMonitored"]),
      },
      {
        id: "forceAndLeft",
        title: "A show of force, the RN told, then left alone after the medication",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["crowd"], ["tellRn"], ["leaveAfter"]], ["low", "leftAlone"]),
      },
      {
        id: "rupture",
        title: "'Calm down': it escalates",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
