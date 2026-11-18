// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIPBA/pba-requirement-change-impact
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIPBA", slug: "pba-requirement-change-impact" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Change traced and coverage checked; board decision; honest status; R-41 tested; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["rtm", "cover"] }, answers: { chgPrompt: "impact", statPrompt: "report", testPrompt: "addTest" }, close: { how: "honest" } }) },
      { id: "partialChg", title: "Partly right on the change, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["rtm"] }, answers: { chgPrompt: "smallNow", statPrompt: "report", testPrompt: "addTest" }, close: { how: "honest" } }) },
      { id: "partialTest", title: "Partly right on the untested requirement, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { chgPrompt: "impact", statPrompt: "report", testPrompt: "demo" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { chgPrompt: "smallNow", statPrompt: "counts", testPrompt: "demo" }, close: { how: "honest" } }) },
      { id: "badChg", title: "The change added without impact analysis", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["rtm", "cover"] }, answers: { chgPrompt: "justDo", statPrompt: "report", testPrompt: "addTest" }, close: { how: "honest" } }) },
      { id: "badStat", title: "The conflict left out of the status", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["rtm", "cover"] }, answers: { chgPrompt: "impact", statPrompt: "hide", testPrompt: "addTest" }, close: { how: "honest" } }) },
      { id: "badTest", title: "R-41 marked delivered without a test", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["rtm", "cover"] }, answers: { chgPrompt: "impact", statPrompt: "report", testPrompt: "assume" }, close: { how: "honest" } }) },
    ],
  };
}
