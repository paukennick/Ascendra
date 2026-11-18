// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PGMP/pgmp-benefits-sustainment-transition
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PGMP", slug: "pgmp-benefits-sustainment-transition" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Register and operations read; synergy captured; sustainment plan; honest transition; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["ben", "ops"] }, answers: { synPrompt: "merge", susPrompt: "plan", transPrompt: "transition" }, close: { how: "honest" } }) },
      { id: "partialSyn", title: "Partly right on synergies, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["ben"] }, answers: { synPrompt: "later", susPrompt: "plan", transPrompt: "transition" }, close: { how: "honest" } }) },
      { id: "partialTrans", title: "Partly right on the transition, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { synPrompt: "merge", susPrompt: "plan", transPrompt: "declare" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { synPrompt: "later", susPrompt: "doc", transPrompt: "declare" }, close: { how: "honest" } }) },
      { id: "badSyn", title: "The portal's payment module removed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["ben", "ops"] }, answers: { synPrompt: "cut", susPrompt: "plan", transPrompt: "transition" }, close: { how: "honest" } }) },
      { id: "badSus", title: "No sustainment plan", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["ben", "ops"] }, answers: { synPrompt: "merge", susPrompt: "nothing", transPrompt: "transition" }, close: { how: "honest" } }) },
      { id: "badTrans", title: "The program kept open indefinitely", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["ben", "ops"] }, answers: { synPrompt: "merge", susPrompt: "plan", transPrompt: "extend" }, close: { how: "honest" } }) },
    ],
  };
}
