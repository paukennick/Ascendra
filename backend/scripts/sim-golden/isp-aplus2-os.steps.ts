// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for APLUS_CORE2/windows-update-failure-restore-backup
// on the service-desk screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "APLUS_CORE2", slug: "windows-update-failure-restore-backup" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Logs and backup reports read; repaired and updated; System Restore; restore tested and backup protected; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["wulog", "bkp"] }, answers: { wuPrompt: "repair", restorePrompt: "sysrestore", bkPrompt: "test321" }, close: { how: "honest" } }) },
      { id: "partialWu", title: "Partly right on the update, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["wulog"] }, answers: { wuPrompt: "retry", restorePrompt: "sysrestore", bkPrompt: "test321" }, close: { how: "honest" } }) },
      { id: "partialBk", title: "Partly right on the backups, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { wuPrompt: "repair", restorePrompt: "sysrestore", bkPrompt: "trust" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { wuPrompt: "retry", restorePrompt: "safeMode", bkPrompt: "trust" }, close: { how: "honest" } }) },
      { id: "badWu", title: "Updates paused during tax season", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["wulog", "bkp"] }, answers: { wuPrompt: "pause", restorePrompt: "sysrestore", bkPrompt: "test321" }, close: { how: "honest" } }) },
      { id: "badRestore", title: "Reset this PC with remove everything", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["wulog", "bkp"] }, answers: { wuPrompt: "repair", restorePrompt: "reset", bkPrompt: "test321" }, close: { how: "honest" } }) },
      { id: "badBk", title: "Old backup versions deleted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["wulog", "bkp"] }, answers: { wuPrompt: "repair", restorePrompt: "sysrestore", bkPrompt: "deleteOld" }, close: { how: "honest" } }) },
    ],
  };
}
