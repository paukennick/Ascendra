// REQ-320: golden paths for GCPNET/gke-pod-range-exhausted-before-promo on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPNET", slug: "gke-pod-range-exhausted-before-promo" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Pending Pods, the error, the cluster, the subnet, a new Pod range and pool, verified",
        reasoning: "met",
        drive: (c) => {
          run(c, "pending");
          run(c, "errors");
          run(c, "cluster");
          run(c, "subnet");
          run(c, "addRange");
          run(c, "nodePool");
          waitUntil(c, 25);
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "podrange" });
        },
      },
      {
        id: "rebuild",
        title: "Rebuilds the cluster with a /16 Pod range",
        reasoning: "missed",
        drive: (c) => {
          run(c, "errors");
          run(c, "recreate");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "podrange" });
        },
      },
      {
        id: "nodeRange",
        title: "Expands the node subnet and retries the old pool",
        reasoning: "missed",
        drive: (c) => {
          run(c, "pending");
          run(c, "expand");
          run(c, "tryMax");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "nodes" });
        },
      },
      {
        id: "expandThenFix",
        title: "Expands the node subnet first, then reads the error and adds a Pod range",
        reasoning: "partial",
        drive: (c) => {
          run(c, "errors");
          run(c, "cluster");
          run(c, "expand");
          run(c, "addRange");
          run(c, "nodePool");
          waitUntil(c, 25);
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "podrange" });
        },
      },
      {
        id: "late",
        title: "Tries the old pool and the node subnet, then fixes the Pod range after 11:50",
        reasoning: "partial",
        drive: (c) => {
          run(c, "tryMax");
          run(c, "expand");
          waitUntil(c, 45);
          run(c, "errors");
          run(c, "addRange");
          run(c, "nodePool");
          waitUntil(c, 56);
          run(c, "verify");
          close(c);
          c.act("document", { cause: "podrange" });
        },
      },
      {
        id: "blind",
        title: "Adds a range and a pool without reading anything or checking",
        reasoning: "missed",
        drive: (c) => {
          run(c, "addRange");
          run(c, "nodePool");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "quota" });
        },
      },
    ],
  };
}
