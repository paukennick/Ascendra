// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PENTESTPLUS/pentest-password-spray-lockouts
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PENTESTPLUS", slug: "pentest-password-spray-lockouts" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Rules and policy read; paced spray; safe confirmation; credential escalated; an honest log", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["roe", "policy"] }, answers: { sprayPrompt: "paced", exploitPrompt: "confirm", credsPrompt: "escalate" }, close: { how: "honest" } }) },
      { id: "partialSpray", title: "Partly right on the spray, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["roe"] }, answers: { sprayPrompt: "small", exploitPrompt: "confirm", credsPrompt: "escalate" }, close: { how: "honest" } }) },
      { id: "partialCreds", title: "Partly right on found credentials, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { sprayPrompt: "paced", exploitPrompt: "confirm", credsPrompt: "reportLater" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { sprayPrompt: "small", exploitPrompt: "skipIt", credsPrompt: "reportLater" }, close: { how: "honest" } }) },
      { id: "badSpray", title: "Ten passwords per account at once; mass lockout", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["roe", "policy"] }, answers: { sprayPrompt: "tenNow", exploitPrompt: "confirm", credsPrompt: "escalate" }, close: { how: "honest" } }) },
      { id: "badExploit", title: "An unstable exploit run during clinic hours", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["roe", "policy"] }, answers: { sprayPrompt: "paced", exploitPrompt: "fireAway", credsPrompt: "escalate" }, close: { how: "honest" } }) },
      { id: "badCreds", title: "The credential used on out-of-scope clinical systems", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["roe", "policy"] }, answers: { sprayPrompt: "paced", exploitPrompt: "confirm", credsPrompt: "useWide" }, close: { how: "honest" } }) },
    ],
  };
}
