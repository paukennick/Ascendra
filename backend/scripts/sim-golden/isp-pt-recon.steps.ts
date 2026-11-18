// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PENTESTPLUS/pentest-recon-ot-printer-scope
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PENTESTPLUS", slug: "pentest-recon-ot-printer-scope" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "OSINT and assets read; OT excluded; measured scan; prioritized surface; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["osint", "assets"] }, answers: { rangePrompt: "exclude", ratePrompt: "polite", surfacePrompt: "prioritize" }, close: { how: "honest" } }) },
      { id: "partialRange", title: "Partly right on the scan range, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["osint"] }, answers: { rangePrompt: "pause", ratePrompt: "polite", surfacePrompt: "prioritize" }, close: { how: "honest" } }) },
      { id: "partialSurface", title: "Partly right on the attack surface, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rangePrompt: "exclude", ratePrompt: "polite", surfacePrompt: "flat" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rangePrompt: "pause", ratePrompt: "slow", surfacePrompt: "flat" }, close: { how: "honest" } }) },
      { id: "badRange", title: "The OT subnet scanned with the office range", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["osint", "assets"] }, answers: { rangePrompt: "scanAll", ratePrompt: "polite", surfacePrompt: "prioritize" }, close: { how: "honest" } }) },
      { id: "badRate", title: "The fastest timing across every port and address", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["osint", "assets"] }, answers: { rangePrompt: "exclude", ratePrompt: "insane", surfacePrompt: "prioritize" }, close: { how: "honest" } }) },
      { id: "badSurface", title: "A third party's portal added to the targets", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["osint", "assets"] }, answers: { rangePrompt: "exclude", ratePrompt: "polite", surfacePrompt: "vendor" }, close: { how: "honest" } }) },
    ],
  };
}
