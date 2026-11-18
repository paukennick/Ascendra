// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CNPA/platform-pipeline-supply-chain
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CNPA", slug: "platform-pipeline-supply-chain" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Secrets and registry read; OIDC; signed and verified; SBOM attestations; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["secrets", "registry"] }, answers: { identPrompt: "oidc", signPrompt: "signVerify", sbomPrompt: "attest" }, close: { how: "honest" } }) },
      { id: "partialIdent", title: "Partly right on pipeline identity, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["secrets"] }, answers: { identPrompt: "rotate", signPrompt: "signVerify", sbomPrompt: "attest" }, close: { how: "honest" } }) },
      { id: "partialSbom", title: "Partly right on SBOMs, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { identPrompt: "oidc", signPrompt: "signVerify", sbomPrompt: "artifact" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { identPrompt: "rotate", signPrompt: "signOnly", sbomPrompt: "artifact" }, close: { how: "honest" } }) },
      { id: "badIdent", title: "The shared admin key kept", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["secrets", "registry"] }, answers: { identPrompt: "keep", signPrompt: "signVerify", sbomPrompt: "attest" }, close: { how: "honest" } }) },
      { id: "badSign", title: "Images left unsigned and unverified", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["secrets", "registry"] }, answers: { identPrompt: "oidc", signPrompt: "skip", sbomPrompt: "attest" }, close: { how: "honest" } }) },
      { id: "badSbom", title: "No SBOMs kept", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["secrets", "registry"] }, answers: { identPrompt: "oidc", signPrompt: "signVerify", sbomPrompt: "noSbom" }, close: { how: "honest" } }) },
    ],
  };
}
