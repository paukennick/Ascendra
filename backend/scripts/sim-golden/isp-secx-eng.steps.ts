// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for SECURITYX/devsecops-pipeline-iot-fleet-crypto
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "SECURITYX", slug: "devsecops-pipeline-iot-fleet-crypto" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Pipeline and update path read; gates; signed firmware; crypto agility; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["pipe", "dev"] }, answers: { gatesPrompt: "devsecops", signPrompt: "signed", cryptoPrompt: "agile" }, close: { how: "honest" } }) },
      { id: "partialGates", title: "Partly right on the pipeline, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["pipe"] }, answers: { gatesPrompt: "manual", signPrompt: "signed", cryptoPrompt: "agile" }, close: { how: "honest" } }) },
      { id: "partialCrypto", title: "Partly right on crypto agility, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { gatesPrompt: "devsecops", signPrompt: "signed", cryptoPrompt: "bigger" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { gatesPrompt: "manual", signPrompt: "tls", cryptoPrompt: "bigger" }, close: { how: "honest" } }) },
      { id: "badGates", title: "Shipped without security gates", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pipe", "dev"] }, answers: { gatesPrompt: "ship", signPrompt: "signed", cryptoPrompt: "agile" }, close: { how: "honest" } }) },
      { id: "badSign", title: "Signing key stored in the repository", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pipe", "dev"] }, answers: { gatesPrompt: "devsecops", signPrompt: "keyInRepo", cryptoPrompt: "agile" }, close: { how: "honest" } }) },
      { id: "badCrypto", title: "Device keys left unrotatable", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["pipe", "dev"] }, answers: { gatesPrompt: "devsecops", signPrompt: "signed", cryptoPrompt: "ignore" }, close: { how: "honest" } }) },
    ],
  };
}
