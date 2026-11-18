// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for LINUXFUND/ssh-keys-listening-port-copy
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "LINUXFUND", slug: "ssh-keys-listening-port-copy" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Auth log and ports read; keys then passwords off; Redis on localhost; rsync over SSH; honest notes", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["auth", "ports"] }, answers: { keysPrompt: "keyFirst", redisPrompt: "bindLocal", copyPrompt: "rsync" }, close: { how: "honest" } }) },
      { id: "partialKeys", title: "Partly right on SSH keys, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["auth"] }, answers: { keysPrompt: "keepPw", redisPrompt: "bindLocal", copyPrompt: "rsync" }, close: { how: "honest" } }) },
      { id: "partialCopy", title: "Partly right on the copy, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { keysPrompt: "keyFirst", redisPrompt: "bindLocal", copyPrompt: "scp" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { keysPrompt: "keepPw", redisPrompt: "firewall", copyPrompt: "scp" }, close: { how: "honest" } }) },
      { id: "badKeys", title: "Password login disabled before installing a key", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["auth", "ports"] }, answers: { keysPrompt: "pwOffFirst", redisPrompt: "bindLocal", copyPrompt: "rsync" }, close: { how: "honest" } }) },
      { id: "badRedis", title: "Redis left listening on every interface", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["auth", "ports"] }, answers: { keysPrompt: "keyFirst", redisPrompt: "ignorePort", copyPrompt: "rsync" }, close: { how: "honest" } }) },
      { id: "badCopy", title: "Plain FTP set up for the copy", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["auth", "ports"] }, answers: { keysPrompt: "keyFirst", redisPrompt: "bindLocal", copyPrompt: "ftp" }, close: { how: "honest" } }) },
    ],
  };
}
