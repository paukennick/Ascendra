// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CYSAPLUS/network-indicators-rogue-scan-beacon
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CYSAPLUS", slug: "network-indicators-rogue-scan-beacon" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "DHCP and flows read; device contained; sweep investigated; beacon hunted; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["dhcp", "flows"] }, answers: { roguePrompt: "quarantine", sweepPrompt: "isolate", beaconPrompt: "c2" }, close: { how: "honest" } }) },
      { id: "partialRogue", title: "Partly right on the rogue device, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["dhcp"] }, answers: { roguePrompt: "blockMac", sweepPrompt: "isolate", beaconPrompt: "c2" }, close: { how: "honest" } }) },
      { id: "partialBeacon", title: "Partly right on the beacon, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { roguePrompt: "quarantine", sweepPrompt: "isolate", beaconPrompt: "blockIp" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { roguePrompt: "blockMac", sweepPrompt: "blockPorts", beaconPrompt: "blockIp" }, close: { how: "honest" } }) },
      { id: "badRogue", title: "The rogue device dismissed as a printer", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dhcp", "flows"] }, answers: { roguePrompt: "printer", sweepPrompt: "isolate", beaconPrompt: "c2" }, close: { how: "honest" } }) },
      { id: "badSweep", title: "Unscheduled enumeration assumed authorized", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dhcp", "flows"] }, answers: { roguePrompt: "quarantine", sweepPrompt: "assumeIt", beaconPrompt: "c2" }, close: { how: "honest" } }) },
      { id: "badBeacon", title: "The beacon deferred to next week", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["dhcp", "flows"] }, answers: { roguePrompt: "quarantine", sweepPrompt: "isolate", beaconPrompt: "ticket" }, close: { how: "honest" } }) },
    ],
  };
}
