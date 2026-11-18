// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for ITIL5FND/hr-portal-rollout-four-dimensions
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "ITIL5FND", slug: "hr-portal-rollout-four-dimensions" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Usage and stores read; four dimensions; external factors; relaunch across dimensions; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["usage", "stores"] }, answers: { dimPrompt: "four", pestlePrompt: "pestle", relaunchPrompt: "together" }, close: { how: "honest" } }) },
      { id: "partialDim", title: "Partly right on the neglected dimension, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["usage"] }, answers: { dimPrompt: "techOnly", pestlePrompt: "pestle", relaunchPrompt: "together" }, close: { how: "honest" } }) },
      { id: "partialRelaunch", title: "Partly right on the relaunch, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dimPrompt: "four", pestlePrompt: "pestle", relaunchPrompt: "trainOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { dimPrompt: "techOnly", pestlePrompt: "mobileOnly", relaunchPrompt: "trainOnly" }, close: { how: "honest" } }) },
      { id: "badDim", title: "Store staff blamed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["usage", "stores"] }, answers: { dimPrompt: "blameStaff", pestlePrompt: "pestle", relaunchPrompt: "together" }, close: { how: "honest" } }) },
      { id: "badPestle", title: "The access duty ignored", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["usage", "stores"] }, answers: { dimPrompt: "four", pestlePrompt: "ignoreLaw", relaunchPrompt: "together" }, close: { how: "honest" } }) },
      { id: "badRelaunch", title: "Relaunched unchanged", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["usage", "stores"] }, answers: { dimPrompt: "four", pestlePrompt: "pestle", relaunchPrompt: "same" }, close: { how: "honest" } }) },
    ],
  };
}
