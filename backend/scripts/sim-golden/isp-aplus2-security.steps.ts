// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for APLUS_CORE2/laptop-bitlocker-uac-firewall
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "APLUS_CORE2", slug: "laptop-bitlocker-uac-firewall" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Status and theft ticket read; BitLocker with escrow; standard users and UAC; firewall on; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["inv", "theft"] }, answers: { blPrompt: "escrow", uacPrompt: "standard", fwPrompt: "on" }, close: { how: "honest" } }) },
      { id: "partialBl", title: "Partly right on encryption, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["inv"] }, answers: { blPrompt: "someOnly", uacPrompt: "standard", fwPrompt: "on" }, close: { how: "honest" } }) },
      { id: "partialFw", title: "Partly right on the firewall, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { blPrompt: "escrow", uacPrompt: "standard", fwPrompt: "privateOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { blPrompt: "someOnly", uacPrompt: "uacOnly", fwPrompt: "privateOnly" }, close: { how: "honest" } }) },
      { id: "badBl", title: "Recovery keys saved on the laptops themselves", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["inv", "theft"] }, answers: { blPrompt: "keyOnDesktop", uacPrompt: "standard", fwPrompt: "on" }, close: { how: "honest" } }) },
      { id: "badUac", title: "UAC left off for admin reps", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["inv", "theft"] }, answers: { blPrompt: "escrow", uacPrompt: "leave", fwPrompt: "on" }, close: { how: "honest" } }) },
      { id: "badFw", title: "The firewall turned off on every laptop", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["inv", "theft"] }, answers: { blPrompt: "escrow", uacPrompt: "standard", fwPrompt: "off" }, close: { how: "honest" } }) },
    ],
  };
}
