// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for OTCA/otel-collector-oom-fanout-pii
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "OTCA", slug: "otel-collector-oom-fanout-pii" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Pipelines and internal metrics read; memory_limiter first with replicas; exporters isolated; redaction before export; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["cfg", "metrics"] }, answers: { memPrompt: "limiter", fanPrompt: "isolate", piiPrompt: "redact" }, close: { how: "honest" } }) },
      { id: "partialMem", title: "Partly right on memory, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["cfg"] }, answers: { memPrompt: "moreRam", fanPrompt: "isolate", piiPrompt: "redact" }, close: { how: "honest" } }) },
      { id: "partialPii", title: "Partly right on redaction, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { memPrompt: "limiter", fanPrompt: "isolate", piiPrompt: "vendorOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { memPrompt: "moreRam", fanPrompt: "bigQueue", piiPrompt: "vendorOnly" }, close: { how: "honest" } }) },
      { id: "badMem", title: "memory_limiter placed after batch; OOM again", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["cfg", "metrics"] }, answers: { memPrompt: "limiterLast", fanPrompt: "isolate", piiPrompt: "redact" }, close: { how: "honest" } }) },
      { id: "badFan", title: "The vendor exporter removed; fraud alerting blind", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["cfg", "metrics"] }, answers: { memPrompt: "limiter", fanPrompt: "dropVendor", piiPrompt: "redact" }, close: { how: "honest" } }) },
      { id: "badPii", title: "Emails left in exported spans", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["cfg", "metrics"] }, answers: { memPrompt: "limiter", fanPrompt: "isolate", piiPrompt: "nothing" }, close: { how: "honest" } }) },
    ],
  };
}
