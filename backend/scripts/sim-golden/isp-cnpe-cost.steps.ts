// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CNPE/opencost-rightsizing-review
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CNPE", slug: "opencost-rightsizing-review" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Allocation and usage read; right-sized from p95; showback by team; autoscaling with priorities; an honest decision", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["alloc", "usage"] }, answers: { sizePrompt: "staged", showPrompt: "showback", scalePrompt: "autoscale" }, close: { how: "honest" } }) },
      { id: "partialSize", title: "Partly right on right-sizing, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["alloc"] }, answers: { sizePrompt: "nonProdOnly", showPrompt: "showback", scalePrompt: "autoscale" }, close: { how: "honest" } }) },
      { id: "partialScale", title: "Partly right on autoscaling, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { sizePrompt: "staged", showPrompt: "showback", scalePrompt: "fewerFixed" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { sizePrompt: "nonProdOnly", showPrompt: "platformPays", scalePrompt: "fewerFixed" }, close: { how: "honest" } }) },
      { id: "badSize", title: "Every request cut by 60% at once", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["alloc", "usage"] }, answers: { sizePrompt: "cutAll", showPrompt: "showback", scalePrompt: "autoscale" }, close: { how: "honest" } }) },
      { id: "badShow", title: "The bill split evenly across teams", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["alloc", "usage"] }, answers: { sizePrompt: "staged", showPrompt: "evenSplit", scalePrompt: "autoscale" }, close: { how: "honest" } }) },
      { id: "badScale", title: "The cluster capped at 30 nodes", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["alloc", "usage"] }, answers: { sizePrompt: "staged", showPrompt: "showback", scalePrompt: "cap" }, close: { how: "honest" } }) },
    ],
  };
}
