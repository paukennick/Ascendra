// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CKS/image-admission-unsigned-critical-cve
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CKS", slug: "image-admission-unsigned-critical-cve" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Scan and admission read; blocked and rebuilt minimal; signed images from the approved registry; SBOMs attached; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["scan", "adm"] }, answers: { cvePrompt: "rebuild", admitPrompt: "policy", sbomPrompt: "attach" }, close: { how: "honest" } }) },
      { id: "partialCve", title: "Partly right on the critical CVE, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["scan"] }, answers: { cvePrompt: "patchOnly", admitPrompt: "policy", sbomPrompt: "attach" }, close: { how: "honest" } }) },
      { id: "partialSbom", title: "Partly right on the SBOM, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { cvePrompt: "rebuild", admitPrompt: "policy", sbomPrompt: "adhoc" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { cvePrompt: "patchOnly", admitPrompt: "registryOnly", sbomPrompt: "adhoc" }, close: { how: "honest" } }) },
      { id: "badCve", title: "Shipped with a reachable, exploitable critical", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["scan", "adm"] }, answers: { cvePrompt: "ship", admitPrompt: "policy", sbomPrompt: "attach" }, close: { how: "honest" } }) },
      { id: "badAdmit", title: "Admission left open; a typo-squatted image runs", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["scan", "adm"] }, answers: { cvePrompt: "rebuild", admitPrompt: "open", sbomPrompt: "attach" }, close: { how: "honest" } }) },
      { id: "badSbom", title: "No SBOMs; three days to find affected images", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["scan", "adm"] }, answers: { cvePrompt: "rebuild", admitPrompt: "policy", sbomPrompt: "skip" }, close: { how: "honest" } }) },
    ],
  };
}
