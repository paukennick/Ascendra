// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CSM/sprint-review-demo-to-working-session
// on the project-dashboard screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CSM", slug: "sprint-review-demo-to-working-session" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Notes read and Product Owner asked; stakeholders invited; hands-on inspection; backlog adapted; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["reviews", "talk"] }, answers: { invitePrompt: "stakeholders", formatPrompt: "handsOn", adaptPrompt: "updateBacklog" }, close: { how: "honest" } }) },
      { id: "partialInvite", title: "Partly right on who attends, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["reviews"] }, answers: { invitePrompt: "poOnly", formatPrompt: "handsOn", adaptPrompt: "updateBacklog" }, close: { how: "honest" } }) },
      { id: "partialAdapt", title: "Partly right on adapting the backlog, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { invitePrompt: "stakeholders", formatPrompt: "handsOn", adaptPrompt: "noteIt" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { invitePrompt: "poOnly", formatPrompt: "demo", adaptPrompt: "noteIt" }, close: { how: "honest" } }) },
      { id: "badInvite", title: "The Review turned into an executive presentation", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["reviews", "talk"] }, answers: { invitePrompt: "execs", formatPrompt: "handsOn", adaptPrompt: "updateBacklog" }, close: { how: "honest" } }) },
      { id: "badFormat", title: "The Review run as a slide sign-off", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["reviews", "talk"] }, answers: { invitePrompt: "stakeholders", formatPrompt: "slides", adaptPrompt: "updateBacklog" }, close: { how: "honest" } }) },
      { id: "badAdapt", title: "Review feedback ignored", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["reviews", "talk"] }, answers: { invitePrompt: "stakeholders", formatPrompt: "handsOn", adaptPrompt: "ignoreFb" }, close: { how: "honest" } }) },
    ],
  };
}
