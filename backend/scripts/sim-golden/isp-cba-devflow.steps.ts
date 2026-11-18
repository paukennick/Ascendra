// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CBA/backstage-upgrade-mismatched-packages
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CBA", slug: "backstage-upgrade-mismatched-packages" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Versions and errors read; aligned with versions:bump; the route bound; a clean multi-stage image; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["why", "tsc"] }, answers: { alignPrompt: "bump", typesPrompt: "fix", imagePrompt: "multi" }, close: { how: "honest" } }) },
      { id: "partialAlign", title: "Partly right on the versions, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["why"] }, answers: { alignPrompt: "pinBack", typesPrompt: "fix", imagePrompt: "multi" }, close: { how: "honest" } }) },
      { id: "partialImage", title: "Partly right on the image, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { alignPrompt: "bump", typesPrompt: "fix", imagePrompt: "hostBuild" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { alignPrompt: "pinBack", typesPrompt: "tsIgnore", imagePrompt: "hostBuild" }, close: { how: "honest" } }) },
      { id: "badAlign", title: "The lockfile deleted; hundreds of untested upgrades", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["why", "tsc"] }, answers: { alignPrompt: "nuke", typesPrompt: "fix", imagePrompt: "multi" }, close: { how: "honest" } }) },
      { id: "badTypes", title: "The type check removed from CI; a broken page shipped", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["why", "tsc"] }, answers: { alignPrompt: "bump", typesPrompt: "skipTsc", imagePrompt: "multi" }, close: { how: "honest" } }) },
      { id: "badImage", title: "Local tokens baked into the image", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["why", "tsc"] }, answers: { alignPrompt: "bump", typesPrompt: "fix", imagePrompt: "bakeSecrets" }, close: { how: "honest" } }) },
    ],
  };
}
