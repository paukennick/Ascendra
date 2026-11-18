// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CCA/cluster-mesh-failover-overlapping-cidr
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CCA", slug: "cluster-mesh-failover-overlapping-cidr" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Settings and Services read; unique identities; a tested global service; local affinity; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["cfg", "svc"] }, answers: { idsPrompt: "rebuildWest", globalPrompt: "annotate", affPrompt: "local" }, close: { how: "honest" } }) },
      { id: "partialIds", title: "Partly right on the cluster identity, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["cfg"] }, answers: { idsPrompt: "namesOnly", globalPrompt: "annotate", affPrompt: "local" }, close: { how: "honest" } }) },
      { id: "partialAff", title: "Partly right on affinity, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { idsPrompt: "rebuildWest", globalPrompt: "annotate", affPrompt: "accept" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { idsPrompt: "namesOnly", globalPrompt: "oneSide", affPrompt: "accept" }, close: { how: "honest" } }) },
      { id: "badIds", title: "Connected with colliding cluster IDs", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["cfg", "svc"] }, answers: { idsPrompt: "forceConnect", globalPrompt: "annotate", affPrompt: "local" }, close: { how: "honest" } }) },
      { id: "badGlobal", title: "Failover left to a manual DNS switch; a 40-minute outage", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["cfg", "svc"] }, answers: { idsPrompt: "rebuildWest", globalPrompt: "dnsSwitch", affPrompt: "local" }, close: { how: "honest" } }) },
      { id: "badAff", title: "The global service removed in west; failover lost", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["cfg", "svc"] }, answers: { idsPrompt: "rebuildWest", globalPrompt: "annotate", affPrompt: "unshare" }, close: { how: "honest" } }) },
    ],
  };
}
