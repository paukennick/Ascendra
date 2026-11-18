// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIRMP/airport-baggage-residual-secondary-risks
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIRMP", slug: "airport-baggage-residual-secondary-risks" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Responses and register reviewed; secondary risk owned; expired risks closed; overall risk reported; an honest decision", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["resp", "stale"] }, answers: { secPrompt: "add", closePrompt: "cleanup", levelPrompt: "overall" }, close: { how: "honest" } }) },
      { id: "partialSec", title: "Partly right on the secondary risk, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["resp"] }, answers: { secPrompt: "note", closePrompt: "cleanup", levelPrompt: "overall" }, close: { how: "honest" } }) },
      { id: "partialLevel", title: "Partly right on overall risk, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { secPrompt: "add", closePrompt: "cleanup", levelPrompt: "top10" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { secPrompt: "note", closePrompt: "archive", levelPrompt: "top10" }, close: { how: "honest" } }) },
      { id: "badSec", title: "The secondary risk ignored", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["resp", "stale"] }, answers: { secPrompt: "ignore", closePrompt: "cleanup", levelPrompt: "overall" }, close: { how: "honest" } }) },
      { id: "badClose", title: "Unchanged entries deleted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["resp", "stale"] }, answers: { secPrompt: "add", closePrompt: "deleteAll", levelPrompt: "overall" }, close: { how: "honest" } }) },
      { id: "badLevel", title: "A reassuring summary without figures", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["resp", "stale"] }, answers: { secPrompt: "add", closePrompt: "cleanup", levelPrompt: "allGreen" }, close: { how: "honest" } }) },
    ],
  };
}
