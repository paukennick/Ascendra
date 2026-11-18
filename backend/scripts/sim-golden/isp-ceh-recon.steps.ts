// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CEH/authorized-recon-osint-exposure
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CEH", slug: "authorized-recon-osint-exposure" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Sources and rules read; stayed passive; minimal data; prioritized report; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["osint", "roe"] }, answers: { passivePrompt: "note", peoplePrompt: "minimal", reportPrompt: "risk" }, close: { how: "honest" } }) },
      { id: "partialPassive", title: "Partly right on staying passive, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["osint"] }, answers: { passivePrompt: "lightTouch", peoplePrompt: "minimal", reportPrompt: "risk" }, close: { how: "honest" } }) },
      { id: "partialReport", title: "Partly right on the report, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { passivePrompt: "note", peoplePrompt: "minimal", reportPrompt: "raw" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { passivePrompt: "lightTouch", peoplePrompt: "list", reportPrompt: "raw" }, close: { how: "honest" } }) },
      { id: "badPassive", title: "Active scanning in the passive phase", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["osint", "roe"] }, answers: { passivePrompt: "scan", peoplePrompt: "minimal", reportPrompt: "risk" }, close: { how: "honest" } }) },
      { id: "badPeople", title: "Staff contacted on social networks", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["osint", "roe"] }, answers: { passivePrompt: "note", peoplePrompt: "contact", reportPrompt: "risk" }, close: { how: "honest" } }) },
      { id: "badReport", title: "A client finding posted publicly", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["osint", "roe"] }, answers: { passivePrompt: "note", peoplePrompt: "minimal", reportPrompt: "publish" }, close: { how: "honest" } }) },
    ],
  };
}
