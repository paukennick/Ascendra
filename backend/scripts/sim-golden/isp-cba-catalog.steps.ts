// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CBA/backstage-catalog-ingestion-gaps
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CBA", slug: "backstage-catalog-ingestion-gaps" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Errors and provider read; fixed at the source; new organization scanned and orphans removed; push-event refresh; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["errors", "provider"] }, answers: { schemaPrompt: "fixSource", orphansPrompt: "addOrg", refreshPrompt: "webhook" }, close: { how: "honest" } }) },
      { id: "partialSchema", title: "Partly right on the validation errors, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["errors"] }, answers: { schemaPrompt: "manualReg", orphansPrompt: "addOrg", refreshPrompt: "webhook" }, close: { how: "honest" } }) },
      { id: "partialRefresh", title: "Partly right on the schedule, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { schemaPrompt: "fixSource", orphansPrompt: "addOrg", refreshPrompt: "manualRefresh" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { schemaPrompt: "manualReg", orphansPrompt: "keepOrphans", refreshPrompt: "manualRefresh" }, close: { how: "honest" } }) },
      { id: "badSchema", title: "Schema validation switched off; search breaks", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["errors", "provider"] }, answers: { schemaPrompt: "disableValidation", orphansPrompt: "addOrg", refreshPrompt: "webhook" }, close: { how: "honest" } }) },
      { id: "badOrphans", title: "The whole catalog deleted to rebuild", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["errors", "provider"] }, answers: { schemaPrompt: "fixSource", orphansPrompt: "wipe", refreshPrompt: "webhook" }, close: { how: "honest" } }) },
      { id: "badRefresh", title: "A 10-second schedule; the rate limit exhausted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["errors", "provider"] }, answers: { schemaPrompt: "fixSource", orphansPrompt: "addOrg", refreshPrompt: "tenSeconds" }, close: { how: "honest" } }) },
    ],
  };
}
