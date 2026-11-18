// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for TECHPLUS/browser-passwords-ai-assistant-help
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "TECHPLUS", slug: "browser-passwords-ai-assistant-help" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Add-ons and users read; browser cleaned; passwords in the manager; AI answer verified; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["addons", "ask"] }, answers: { brPrompt: "clean", pwPrompt: "manager", aiPrompt: "verify" }, close: { how: "honest" } }) },
      { id: "partialBr", title: "Partly right on the browser, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["addons"] }, answers: { brPrompt: "cacheOnly", pwPrompt: "manager", aiPrompt: "verify" }, close: { how: "honest" } }) },
      { id: "partialAi", title: "Partly right on the AI answer, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { brPrompt: "clean", pwPrompt: "manager", aiPrompt: "disclaimer" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { brPrompt: "cacheOnly", pwPrompt: "protectSheet", aiPrompt: "disclaimer" }, close: { how: "honest" } }) },
      { id: "badBr", title: "Private browsing used instead of removing add-ons", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["addons", "ask"] }, answers: { brPrompt: "private", pwPrompt: "manager", aiPrompt: "verify" }, close: { how: "honest" } }) },
      { id: "badPw", title: "Passwords saved in the shared desk browser", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["addons", "ask"] }, answers: { brPrompt: "clean", pwPrompt: "browserSave", aiPrompt: "verify" }, close: { how: "honest" } }) },
      { id: "badAi", title: "The AI answer published unverified", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["addons", "ask"] }, answers: { brPrompt: "clean", pwPrompt: "manager", aiPrompt: "post" }, close: { how: "honest" } }) },
    ],
  };
}
