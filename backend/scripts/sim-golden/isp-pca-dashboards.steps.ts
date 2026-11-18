// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PCA/checkout-dashboard-misleading-latency-alert
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PCA", slug: "checkout-dashboard-misleading-latency-alert" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Panel and rules read; p99 from bucket rates; windows of four scrapes; burn-rate pages; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["panel", "rules"] }, answers: { quantPrompt: "hq", windowPrompt: "longer", pagePrompt: "burn" }, close: { how: "honest" } }) },
      { id: "partialQuant", title: "Partly right on the latency panel, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["panel"] }, answers: { quantPrompt: "maxAvg", windowPrompt: "longer", pagePrompt: "burn" }, close: { how: "honest" } }) },
      { id: "partialPage", title: "Partly right on the page, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { quantPrompt: "hq", windowPrompt: "longer", pagePrompt: "threshold" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { quantPrompt: "maxAvg", windowPrompt: "irate", pagePrompt: "threshold" }, close: { how: "honest" } }) },
      { id: "badQuant", title: "Per-instance p99s averaged", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["panel", "rules"] }, answers: { quantPrompt: "avgQuant", windowPrompt: "longer", pagePrompt: "burn" }, close: { how: "honest" } }) },
      { id: "badWindow", title: "Every job scraped every second", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["panel", "rules"] }, answers: { quantPrompt: "hq", windowPrompt: "faster", pagePrompt: "burn" }, close: { how: "honest" } }) },
      { id: "badPage", title: "The CPU page lowered to 60%", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["panel", "rules"] }, answers: { quantPrompt: "hq", windowPrompt: "longer", pagePrompt: "moreCpu" }, close: { how: "honest" } }) },
    ],
  };
}
