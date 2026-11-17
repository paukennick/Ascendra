// REQ-320: golden paths for CCA/cluster-pool-exhausted-new-nodes on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "CCA", slug: "cluster-pool-exhausted-new-nodes" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Pending Pod, agent, CiliumNodes, config, address plan, new pool element, verified",
        reasoning: "met",
        drive: (c) => {
          run(c, "pending");
          run(c, "dbg");
          run(c, "ciliumNodes");
          run(c, "config");
          run(c, "plan");
          run(c, "append");
          waitUntil(c, 12);
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "pool" });
        },
      },
      {
        id: "editPool",
        title: "Replaces the existing pool with a /16",
        reasoning: "missed",
        drive: (c) => {
          run(c, "ciliumNodes");
          run(c, "changeCidr");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "pool" });
        },
      },
      {
        id: "restartAgents",
        title: "Restarts the agents and tries a smaller mask",
        reasoning: "missed",
        drive: (c) => {
          run(c, "pending");
          run(c, "restart");
          run(c, "mask");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "agent" });
        },
      },
      {
        id: "noPlan",
        title: "Reads the CiliumNodes, restarts the agents, then adds a range without checking the plan",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ciliumNodes");
          run(c, "restart");
          run(c, "append");
          waitUntil(c, 12);
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "pool" });
        },
      },
      {
        id: "late",
        title: "Restarts the agents and waits, then extends the pool after 09:58",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restart");
          waitUntil(c, 48);
          run(c, "ciliumNodes");
          run(c, "config");
          run(c, "append");
          waitUntil(c, 56);
          run(c, "verify");
          close(c);
          c.act("document", { cause: "pool" });
        },
      },
      {
        id: "blind",
        title: "Adds a range without reading anything or verifying",
        reasoning: "missed",
        drive: (c) => {
          run(c, "append");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "capacity" });
        },
      },
    ],
  };
}
