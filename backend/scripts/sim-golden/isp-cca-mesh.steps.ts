// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CCA/cilium-wireguard-cross-node-plaintext
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CCA", slug: "cilium-wireguard-cross-node-plaintext" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Status and Ingress read; WireGuard rolled out; Gateway and routes split by role; per-node evidence; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["status", "ingress"] }, answers: { wgPrompt: "wireguard", gwPrompt: "roles", verifyPrompt: "evidence" }, close: { how: "honest" } }) },
      { id: "partialWg", title: "Partly right on encryption, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["status"] }, answers: { wgPrompt: "sidecars", gwPrompt: "roles", verifyPrompt: "evidence" }, close: { how: "honest" } }) },
      { id: "partialVerify", title: "Partly right on verification, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { wgPrompt: "wireguard", gwPrompt: "roles", verifyPrompt: "configOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { wgPrompt: "sidecars", gwPrompt: "oneTeam", verifyPrompt: "configOnly" }, close: { how: "honest" } }) },
      { id: "badWg", title: "Every agent restarted at once in clinic hours", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["status", "ingress"] }, answers: { wgPrompt: "allAtOnce", gwPrompt: "roles", verifyPrompt: "evidence" }, close: { how: "honest" } }) },
      { id: "badGw", title: "The Ingress deleted before the Gateway existed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["status", "ingress"] }, answers: { wgPrompt: "wireguard", gwPrompt: "deleteFirst", verifyPrompt: "evidence" }, close: { how: "honest" } }) },
      { id: "badVerify", title: "Closed with one node unchecked; it is still plaintext", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["status", "ingress"] }, answers: { wgPrompt: "wireguard", gwPrompt: "roles", verifyPrompt: "claim" }, close: { how: "honest" } }) },
    ],
  };
}
