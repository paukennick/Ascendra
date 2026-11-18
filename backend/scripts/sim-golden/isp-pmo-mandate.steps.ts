// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIPMOCP/pmo-mandate-charter-sponsor
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIPMOCP", slug: "pmo-mandate-charter-sponsor" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "History and units read; scope and rights; agreed charter; active sponsor; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["history", "bus"] }, answers: { scopePrompt: "decisionRights", charterPrompt: "fullCharter", sponsorPrompt: "activeSponsor" }, close: { how: "honest" } }) },
      { id: "partialScope", title: "Partly right on scope and authority, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["history"] }, answers: { scopePrompt: "advisory", charterPrompt: "fullCharter", sponsorPrompt: "activeSponsor" }, close: { how: "honest" } }) },
      { id: "partialSponsor", title: "Partly right on sponsorship, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { scopePrompt: "decisionRights", charterPrompt: "fullCharter", sponsorPrompt: "emailOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { scopePrompt: "advisory", charterPrompt: "template", sponsorPrompt: "emailOnly" }, close: { how: "honest" } }) },
      { id: "badScope", title: "The PMO given authority over every decision", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["history", "bus"] }, answers: { scopePrompt: "everything", charterPrompt: "fullCharter", sponsorPrompt: "activeSponsor" }, close: { how: "honest" } }) },
      { id: "badCharter", title: "Status reports started without a charter", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["history", "bus"] }, answers: { scopePrompt: "decisionRights", charterPrompt: "noCharter", sponsorPrompt: "activeSponsor" }, close: { how: "honest" } }) },
      { id: "badSponsor", title: "The PMO run without a sponsor", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["history", "bus"] }, answers: { scopePrompt: "decisionRights", charterPrompt: "fullCharter", sponsorPrompt: "noSponsor" }, close: { how: "honest" } }) },
    ],
  };
}
