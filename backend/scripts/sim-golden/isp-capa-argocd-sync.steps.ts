// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CAPA/argocd-prune-moved-database
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CAPA", slug: "argocd-prune-moved-database" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Diff and policy read; prune stopped with Prune=false and adoption; the scale-up through Git; the migration as a PreSync hook; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["diff", "policy"] }, answers: { prunePrompt: "protect", healPrompt: "gitChange", hookPrompt: "presync" }, close: { how: "honest" } }) },
      { id: "partialPrune", title: "Partly right on the prune, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["diff"] }, answers: { prunePrompt: "manualOff", healPrompt: "gitChange", hookPrompt: "presync" }, close: { how: "honest" } }) },
      { id: "partialHook", title: "Partly right on the migration, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { prunePrompt: "protect", healPrompt: "gitChange", hookPrompt: "manualJob" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { prunePrompt: "manualOff", healPrompt: "healOff", hookPrompt: "manualJob" }, close: { how: "honest" } }) },
      { id: "badPrune", title: "The automated prune run without reading the diff; the database deleted", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["diff", "policy"] }, answers: { prunePrompt: "letPrune", healPrompt: "gitChange", hookPrompt: "presync" }, close: { how: "honest" } }) },
      { id: "badHeal", title: "A kubectl scale loop against self-heal; Pods flap", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["diff", "policy"] }, answers: { prunePrompt: "protect", healPrompt: "fight", hookPrompt: "presync" }, close: { how: "honest" } }) },
      { id: "badHook", title: "A forced Replace=true sync; the serving Pods removed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["diff", "policy"] }, answers: { prunePrompt: "protect", healPrompt: "gitChange", hookPrompt: "replace" }, close: { how: "honest" } }) },
    ],
  };
}
