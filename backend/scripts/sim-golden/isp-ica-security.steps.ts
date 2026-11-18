// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for ICA/istio-strict-mtls-allow-policy-lockout
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "ICA", slug: "istio-strict-mtls-allow-policy-lockout" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Callers and policies read; clients into the mesh before STRICT; exact ALLOW rules; principals updated; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["conn", "pols"] }, answers: { mtlsPrompt: "injectFirst", authzPrompt: "allow", idnPrompt: "both" }, close: { how: "honest" } }) },
      { id: "partialMtls", title: "Partly right on STRICT mTLS, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["conn"] }, answers: { mtlsPrompt: "portException", authzPrompt: "allow", idnPrompt: "both" }, close: { how: "honest" } }) },
      { id: "partialIdn", title: "Partly right on identities, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { mtlsPrompt: "injectFirst", authzPrompt: "allow", idnPrompt: "namespaceWide" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { mtlsPrompt: "portException", authzPrompt: "denyOnly", idnPrompt: "namespaceWide" }, close: { how: "honest" } }) },
      { id: "badMtls", title: "STRICT applied mesh-wide with plaintext callers left", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["conn", "pols"] }, answers: { mtlsPrompt: "strictNow", authzPrompt: "allow", idnPrompt: "both" }, close: { how: "honest" } }) },
      { id: "badAuthz", title: "An ALLOW policy listing only claims-web's writes", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["conn", "pols"] }, answers: { mtlsPrompt: "injectFirst", authzPrompt: "writeOnly", idnPrompt: "both" }, close: { how: "honest" } }) },
      { id: "badIdn", title: "The policy left naming the old ServiceAccount", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["conn", "pols"] }, answers: { mtlsPrompt: "injectFirst", authzPrompt: "allow", idnPrompt: "ignore" }, close: { how: "honest" } }) },
    ],
  };
}
