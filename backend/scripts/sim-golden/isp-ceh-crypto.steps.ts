// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CEH/weak-crypto-findings-legacy-portal
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CEH", slug: "weak-crypto-findings-legacy-portal" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "TLS and hashes read; modern TLS; salted slow hash; internal CA; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["tls", "hashes"] }, answers: { protoPrompt: "modern", hashPrompt: "argon", pkiPrompt: "internalCa" }, close: { how: "honest" } }) },
      { id: "partialProto", title: "Partly right on the protocol, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["tls"] }, answers: { protoPrompt: "keep12", hashPrompt: "argon", pkiPrompt: "internalCa" }, close: { how: "honest" } }) },
      { id: "partialPki", title: "Partly right on the certificate, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { protoPrompt: "modern", hashPrompt: "argon", pkiPrompt: "pinSelf" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { protoPrompt: "keep12", hashPrompt: "sha256", pkiPrompt: "pinSelf" }, close: { how: "honest" } }) },
      { id: "badProto", title: "TLS 1.0 rated informational", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["tls", "hashes"] }, answers: { protoPrompt: "lowRisk", hashPrompt: "argon", pkiPrompt: "internalCa" }, close: { how: "honest" } }) },
      { id: "badHash", title: "Encrypting unsalted hashes with a key in the config", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["tls", "hashes"] }, answers: { protoPrompt: "modern", hashPrompt: "encrypt", pkiPrompt: "internalCa" }, close: { how: "honest" } }) },
      { id: "badPki", title: "Click-through left as normal", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["tls", "hashes"] }, answers: { protoPrompt: "modern", hashPrompt: "argon", pkiPrompt: "ignoreWarn" }, close: { how: "honest" } }) },
    ],
  };
}
