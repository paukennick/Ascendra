// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CNPE/crossplane-database-claim-api
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CNPE", slug: "crossplane-database-claim-api" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Draft and composition read; validated schema; status conditions; versioned; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["draft", "comp"] }, answers: { schemaPrompt: "validated", statusPrompt: "cond", verPrompt: "v1beta2" }, close: { how: "honest" } }) },
      { id: "partialSchema", title: "Partly right on the schema, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["draft"] }, answers: { schemaPrompt: "docsOnly", statusPrompt: "cond", verPrompt: "v1beta2" }, close: { how: "honest" } }) },
      { id: "partialVer", title: "Partly right on versioning, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { schemaPrompt: "validated", statusPrompt: "cond", verPrompt: "bothFields" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { schemaPrompt: "docsOnly", statusPrompt: "events", verPrompt: "bothFields" }, close: { how: "honest" } }) },
      { id: "badSchema", title: "Unvalidated sizes passed through", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["draft", "comp"] }, answers: { schemaPrompt: "passthrough", statusPrompt: "cond", verPrompt: "v1beta2" }, close: { how: "honest" } }) },
      { id: "badStatus", title: "No status reported", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["draft", "comp"] }, answers: { schemaPrompt: "validated", statusPrompt: "noStatus", verPrompt: "v1beta2" }, close: { how: "honest" } }) },
      { id: "badVer", title: "The field renamed in place", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["draft", "comp"] }, answers: { schemaPrompt: "validated", statusPrompt: "cond", verPrompt: "rename" }, close: { how: "honest" } }) },
    ],
  };
}
