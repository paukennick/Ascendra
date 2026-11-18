// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for APLUS_CORE1/office-server-raid-psu-printer
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "APLUS_CORE1", slug: "office-server-raid-psu-printer" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Specs and printer log read; RAID 5; an 850 W supply; the fuser kit fitted cool; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["specs", "printlog"] }, answers: { raidPrompt: "raid5", psuPrompt: "size", fuserPrompt: "kit" }, close: { how: "honest" } }) },
      { id: "partialRaid", title: "Partly right on the RAID level, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["specs"] }, answers: { raidPrompt: "raid1", psuPrompt: "size", fuserPrompt: "kit" }, close: { how: "honest" } }) },
      { id: "partialFuser", title: "Partly right on the printer, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { raidPrompt: "raid5", psuPrompt: "size", fuserPrompt: "toner" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { raidPrompt: "raid1", psuPrompt: "oneGpu", fuserPrompt: "toner" }, close: { how: "honest" } }) },
      { id: "badRaid", title: "RAID 0 for capacity; a drive fails", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["specs", "printlog"] }, answers: { raidPrompt: "raid0", psuPrompt: "size", fuserPrompt: "kit" }, close: { how: "honest" } }) },
      { id: "badPsu", title: "Adapters on an undersized supply; a melted connector", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["specs", "printlog"] }, answers: { raidPrompt: "raid5", psuPrompt: "adapter", fuserPrompt: "kit" }, close: { how: "honest" } }) },
      { id: "badFuser", title: "The fuser handled while hot", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["specs", "printlog"] }, answers: { raidPrompt: "raid5", psuPrompt: "size", fuserPrompt: "hotHands" }, close: { how: "honest" } }) },
    ],
  };
}
