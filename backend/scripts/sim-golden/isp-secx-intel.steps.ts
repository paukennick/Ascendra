// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for SECURITYX/threat-intel-campaign-enterprise-hunt
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "SECURITYX", slug: "threat-intel-campaign-enterprise-hunt" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Advisory and versions read; behavior detection enterprise-wide; coordinated incident; sanitized sharing; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["adv", "versions"] }, answers: { intelPrompt: "behaviors", huntPrompt: "coordinate", sharePrompt: "sanitized" }, close: { how: "honest" } }) },
      { id: "partialIntel", title: "Partly right on the intelligence, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["adv"] }, answers: { intelPrompt: "iocsOnly", huntPrompt: "coordinate", sharePrompt: "sanitized" }, close: { how: "honest" } }) },
      { id: "partialShare", title: "Partly right on sharing back, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { intelPrompt: "behaviors", huntPrompt: "coordinate", sharePrompt: "noShare" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { intelPrompt: "iocsOnly", huntPrompt: "unitOnly", sharePrompt: "noShare" }, close: { how: "honest" } }) },
      { id: "badIntel", title: "The advisory forwarded by email only", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["adv", "versions"] }, answers: { intelPrompt: "forward", huntPrompt: "coordinate", sharePrompt: "sanitized" }, close: { how: "honest" } }) },
      { id: "badHunt", title: "The gateway reimaged before collecting evidence", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["adv", "versions"] }, answers: { intelPrompt: "behaviors", huntPrompt: "reimage", sharePrompt: "sanitized" }, close: { how: "honest" } }) },
      { id: "badShare", title: "Internal incident details published", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["adv", "versions"] }, answers: { intelPrompt: "behaviors", huntPrompt: "coordinate", sharePrompt: "public" }, close: { how: "honest" } }) },
    ],
  };
}
