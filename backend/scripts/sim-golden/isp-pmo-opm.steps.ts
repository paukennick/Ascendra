// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIPMOCP/pmo-opm-competency-framework
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIPMOCP", slug: "pmo-opm-competency-framework" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Competencies and causes read; tailored framework; change control prioritized; mentoring in reviews; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["assess", "causes"] }, answers: { framePrompt: "tailored", capPrompt: "change", mentorPrompt: "pair" }, close: { how: "honest" } }) },
      { id: "partialFrame", title: "Partly right on the framework, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["assess"] }, answers: { framePrompt: "generic", capPrompt: "change", mentorPrompt: "pair" }, close: { how: "honest" } }) },
      { id: "partialMentor", title: "Partly right on mentoring and performance, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { framePrompt: "tailored", capPrompt: "change", mentorPrompt: "mentorOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { framePrompt: "generic", capPrompt: "training", mentorPrompt: "mentorOnly" }, close: { how: "honest" } }) },
      { id: "badFrame", title: "A generic course instead of a framework", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["assess", "causes"] }, answers: { framePrompt: "nothing", capPrompt: "change", mentorPrompt: "pair" }, close: { how: "honest" } }) },
      { id: "badCap", title: "A new tool bought as the fix", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["assess", "causes"] }, answers: { framePrompt: "tailored", capPrompt: "tool", mentorPrompt: "pair" }, close: { how: "honest" } }) },
      { id: "badMentor", title: "A public ranking", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["assess", "causes"] }, answers: { framePrompt: "tailored", capPrompt: "change", mentorPrompt: "rank" }, close: { how: "honest" } }) },
    ],
  };
}
