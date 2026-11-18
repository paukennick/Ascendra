// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIACP/blameless-retro-psychological-safety
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIACP", slug: "blameless-retro-psychological-safety" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Review read and one-to-ones held; blameless rerun; safe retrospective; challenge welcomed; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["email", "oneToOnes"] }, answers: { blamePrompt: "blameless", retroPrompt: "dialogue", challengePrompt: "welcome" }, close: { how: "honest" } }) },
      { id: "partialBlame", title: "Partly right on the outage review, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["email"] }, answers: { blamePrompt: "privateTalk", retroPrompt: "dialogue", challengePrompt: "welcome" }, close: { how: "honest" } }) },
      { id: "partialChallenge", title: "Partly right on the challenge, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { blamePrompt: "blameless", retroPrompt: "dialogue", challengePrompt: "thankPrivately" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { blamePrompt: "privateTalk", retroPrompt: "anonOnly", challengePrompt: "thankPrivately" }, close: { how: "honest" } }) },
      { id: "badBlame", title: "The blaming review left standing", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["email", "oneToOnes"] }, answers: { blamePrompt: "moveOn", retroPrompt: "dialogue", challengePrompt: "welcome" }, close: { how: "honest" } }) },
      { id: "badRetro", title: "The manager ran the retrospective", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["email", "oneToOnes"] }, answers: { blamePrompt: "blameless", retroPrompt: "managerRuns", challengePrompt: "welcome" }, close: { how: "honest" } }) },
      { id: "badChallenge", title: "The challenge dismissed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["email", "oneToOnes"] }, answers: { blamePrompt: "blameless", retroPrompt: "dialogue", challengePrompt: "dismiss" }, close: { how: "honest" } }) },
    ],
  };
}
