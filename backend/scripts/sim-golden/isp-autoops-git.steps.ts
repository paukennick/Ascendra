// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for AUTOOPSPLUS/shared-repo-revert-semver-hotfix
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "AUTOOPSPLUS", slug: "shared-repo-revert-semver-hotfix" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "History and diff read; reverted; major version; hotfix branch; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["log", "diff"] }, answers: { undoPrompt: "revert", versionPrompt: "major", hotfixPrompt: "hotfixBranch" }, close: { how: "honest" } }) },
      { id: "partialUndo", title: "Partly right on undoing the commit, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["log"] }, answers: { undoPrompt: "localFix", versionPrompt: "major", hotfixPrompt: "hotfixBranch" }, close: { how: "honest" } }) },
      { id: "partialHotfix", title: "Partly right on the hotfix, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { undoPrompt: "revert", versionPrompt: "major", hotfixPrompt: "fromMain" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { undoPrompt: "localFix", versionPrompt: "minor", hotfixPrompt: "fromMain" }, close: { how: "honest" } }) },
      { id: "badUndo", title: "main reset and force-pushed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["log", "diff"] }, answers: { undoPrompt: "forcePush", versionPrompt: "major", hotfixPrompt: "hotfixBranch" }, close: { how: "honest" } }) },
      { id: "badVersion", title: "The released v2.3.1 tag moved", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["log", "diff"] }, answers: { undoPrompt: "revert", versionPrompt: "retag", hotfixPrompt: "hotfixBranch" }, close: { how: "honest" } }) },
      { id: "badHotfix", title: "Production deployed from a feature branch", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["log", "diff"] }, answers: { undoPrompt: "revert", versionPrompt: "major", hotfixPrompt: "featureBranch" }, close: { how: "honest" } }) },
    ],
  };
}
