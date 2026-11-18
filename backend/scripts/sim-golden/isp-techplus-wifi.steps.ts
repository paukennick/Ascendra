// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for TECHPLUS/office-wifi-printer-new-ap
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "TECHPLUS", slug: "office-wifi-printer-new-ap" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Signal surveyed and access point read; coverage added; plotter wired; current secure access point; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["survey", "ap"] }, answers: { roomPrompt: "addAp", printerPrompt: "wired", buyPrompt: "current" }, close: { how: "honest" } }) },
      { id: "partialRoom", title: "Partly right on the meeting room, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["survey"] }, answers: { roomPrompt: "reboot", printerPrompt: "wired", buyPrompt: "current" }, close: { how: "honest" } }) },
      { id: "partialBuy", title: "Partly right on the new access point, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { roomPrompt: "addAp", printerPrompt: "wired", buyPrompt: "cheap" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { roomPrompt: "reboot", printerPrompt: "extender", buyPrompt: "cheap" }, close: { how: "honest" } }) },
      { id: "badRoom", title: "Staff sent to personal hotspots", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["survey", "ap"] }, answers: { roomPrompt: "hotspot", printerPrompt: "wired", buyPrompt: "current" }, close: { how: "honest" } }) },
      { id: "badPrinter", title: "An open network created for the printer", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["survey", "ap"] }, answers: { roomPrompt: "addAp", printerPrompt: "openSsid", buyPrompt: "current" }, close: { how: "honest" } }) },
      { id: "badBuy", title: "An access point without encryption installed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["survey", "ap"] }, answers: { roomPrompt: "addAp", printerPrompt: "wired", buyPrompt: "noSecurity" }, close: { how: "honest" } }) },
    ],
  };
}
