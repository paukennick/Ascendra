// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CCA/cilium-default-deny-breaks-dns
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CCA", slug: "cilium-default-deny-breaks-dns" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Drops and policy read; DNS with an L7 rule; the processor by FQDN; the database by identity; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["hubble", "policy"] }, answers: { dnsPrompt: "dnsRule", fqdnPrompt: "toFqdn", identPrompt: "labels" }, close: { how: "honest" } }) },
      { id: "partialDns", title: "Partly right on DNS, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["hubble"] }, answers: { dnsPrompt: "dnsNoL7", fqdnPrompt: "toFqdn", identPrompt: "labels" }, close: { how: "honest" } }) },
      { id: "partialIdent", title: "Partly right on the database rule, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dnsPrompt: "dnsRule", fqdnPrompt: "toFqdn", identPrompt: "both" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dnsPrompt: "dnsNoL7", fqdnPrompt: "toCidr", identPrompt: "both" }, close: { how: "honest" } }) },
      { id: "badDns", title: "Enforcement set to never cluster-wide", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["hubble", "policy"] }, answers: { dnsPrompt: "never", fqdnPrompt: "toFqdn", identPrompt: "labels" }, close: { how: "honest" } }) },
      { id: "badFqdn", title: "Egress opened to the world on every port", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["hubble", "policy"] }, answers: { dnsPrompt: "dnsRule", fqdnPrompt: "world", identPrompt: "labels" }, close: { how: "honest" } }) },
      { id: "badIdent", title: "The database rule switched to a Pod IP; it breaks on reschedule", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["hubble", "policy"] }, answers: { dnsPrompt: "dnsRule", fqdnPrompt: "toFqdn", identPrompt: "ipOnly" }, close: { how: "honest" } }) },
    ],
  };
}
