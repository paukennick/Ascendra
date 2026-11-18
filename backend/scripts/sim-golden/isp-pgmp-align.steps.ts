// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PGMP/pgmp-ports-business-case-alignment
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PGMP", slug: "pgmp-ports-business-case-alignment" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Strategy and proposal read; objectives aligned; quantified case; charter approved; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["strategy", "vendor"] }, answers: { alignPrompt: "reframe", casePrompt: "quantify", charterPrompt: "charter" }, close: { how: "honest" } }) },
      { id: "partialAlign", title: "Partly right on alignment, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["strategy"] }, answers: { alignPrompt: "both", casePrompt: "quantify", charterPrompt: "charter" }, close: { how: "honest" } }) },
      { id: "partialCharter", title: "Partly right on the charter, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { alignPrompt: "reframe", casePrompt: "quantify", charterPrompt: "letter" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { alignPrompt: "both", casePrompt: "vendorNumbers", charterPrompt: "letter" }, close: { how: "honest" } }) },
      { id: "badAlign", title: "The vendor's labor-cut objective adopted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["strategy", "vendor"] }, answers: { alignPrompt: "vendorCase", casePrompt: "quantify", charterPrompt: "charter" }, close: { how: "honest" } }) },
      { id: "badCase", title: "No business case", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["strategy", "vendor"] }, answers: { alignPrompt: "reframe", casePrompt: "noCase", charterPrompt: "charter" }, close: { how: "honest" } }) },
      { id: "badCharter", title: "The crane order signed before the charter", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["strategy", "vendor"] }, answers: { alignPrompt: "reframe", casePrompt: "quantify", charterPrompt: "buy" }, close: { how: "honest" } }) },
    ],
  };
}
