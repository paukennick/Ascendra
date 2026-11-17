// REQ-321 (sims-pm-2): golden paths for the PgMP steering reviews on the
// governance board (PGMP/pgmp-transit-program-steering-review.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PGMP", slug: "pgmp-transit-program-steering-review" };

const a = (status: string, riskR: string, gate: string, benefit: string) => ({ statusPrompt: status, riskPrompt: riskR, gatePrompt: gate, benefitPrompt: benefit });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Data consolidated and registers read; the integration variance corrected, the certification risk escalated, conditional gate authorization, the adoption variance corrected, an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["consolidate", "registers"] }, answers: a("consolidated", "escalated", "conditional", "corrective"), close: { how: "honest" } }) },
      { id: "ragReports", title: "Four RAG reports passed on as the program status; everything else controlled", reasoning: "partial",
        drive: (c) => play(c, { answers: a("rag", "escalated", "conditional", "corrective"), close: { how: "honest" } }) },
      { id: "waitAndDefer", title: "Gate postponed a month and the benefits variance left for closure", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["consolidate"] }, answers: a("consolidated", "escalated", "postpone", "defer"), close: { how: "honest" } }) },
      { id: "riskInProject", title: "The certification risk left with the project team; it fails certification in month 3", reasoning: "missed",
        drive: (c) => play(c, { answers: a("consolidated", "team", "conditional", "corrective"), close: { how: "summary" } }) },
      { id: "selfGate", title: "The deployment gate declared passed by the program manager", reasoning: "missed",
        drive: (c) => play(c, { answers: a("consolidated", "escalated", "self", "corrective"), close: { how: "honest" } }) },
      { id: "cutScope", title: "Another project's scope cut to fund the lab, without the committee", reasoning: "missed",
        drive: (c) => play(c, { answers: a("consolidated", "cut", "conditional", "corrective"), close: { how: "honest" } }) },
      { id: "takeover", title: "The integration project taken over with an unplanned overtime team, and the benefits target moved", reasoning: "missed",
        drive: (c) => play(c, { answers: a("takeover", "escalated", "conditional", "retarget"), close: { how: "summary" } }) },
    ],
  };
}
