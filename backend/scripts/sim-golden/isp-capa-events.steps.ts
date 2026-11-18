// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CAPA/argo-events-upload-storm
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CAPA", slug: "argo-events-upload-storm" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Sensor log and EventBus read; dependency filtered; trigger parameterized; JetStream with replicas and the lost samples replayed; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["events", "bus"] }, answers: { filterPrompt: "dataFilter", paramPrompt: "params", durablePrompt: "jetstream" }, close: { how: "honest" } }) },
      { id: "partialFilter", title: "Partly right on the filter, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["events"] }, answers: { filterPrompt: "inWorkflow", paramPrompt: "params", durablePrompt: "jetstream" }, close: { how: "honest" } }) },
      { id: "partialDurable", title: "Partly right on the EventBus, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { filterPrompt: "dataFilter", paramPrompt: "params", durablePrompt: "replayOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { filterPrompt: "inWorkflow", paramPrompt: "listBucket", durablePrompt: "replayOnly" }, close: { how: "honest" } }) },
      { id: "badFilter", title: "The EventSource deleted; real samples unprocessed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["events", "bus"] }, answers: { filterPrompt: "deleteSource", paramPrompt: "params", durablePrompt: "jetstream" }, close: { how: "honest" } }) },
      { id: "badParam", title: "'latest' rerun hourly; most samples skipped", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["events", "bus"] }, answers: { filterPrompt: "dataFilter", paramPrompt: "rerunLatest", durablePrompt: "jetstream" }, close: { how: "honest" } }) },
      { id: "badDurable", title: "The lost events ignored; two samples never processed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["events", "bus"] }, answers: { filterPrompt: "dataFilter", paramPrompt: "params", durablePrompt: "ignore" }, close: { how: "honest" } }) },
    ],
  };
}
