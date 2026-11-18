// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for APLUS_CORE1/developer-vm-resources-host-starved
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "APLUS_CORE1", slug: "developer-vm-resources-host-starved" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Allocations and disk read; resized; VT-x on; snapshots consolidated; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["alloc", "disk"] }, answers: { memPrompt: "fit", vtxPrompt: "firmware", snapPrompt: "consolidate" }, close: { how: "honest" } }) },
      { id: "partialMem", title: "Partly right on the allocation, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["alloc"] }, answers: { memPrompt: "oneAtATime", vtxPrompt: "firmware", snapPrompt: "consolidate" }, close: { how: "honest" } }) },
      { id: "partialSnap", title: "Partly right on the snapshots, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { memPrompt: "fit", vtxPrompt: "firmware", snapPrompt: "move" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { memPrompt: "oneAtATime", vtxPrompt: "reinstall", snapPrompt: "move" }, close: { how: "honest" } }) },
      { id: "badMem", title: "A 64 GB page file to cover over-allocation", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["alloc", "disk"] }, answers: { memPrompt: "pagefile", vtxPrompt: "firmware", snapPrompt: "consolidate" }, close: { how: "honest" } }) },
      { id: "badVtx", title: "Secure Boot and the TPM disabled", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["alloc", "disk"] }, answers: { memPrompt: "fit", vtxPrompt: "secureBootOff", snapPrompt: "consolidate" }, close: { how: "honest" } }) },
      { id: "badSnap", title: "Snapshot files deleted in Explorer", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["alloc", "disk"] }, answers: { memPrompt: "fit", vtxPrompt: "firmware", snapPrompt: "deleteFiles" }, close: { how: "honest" } }) },
    ],
  };
}
