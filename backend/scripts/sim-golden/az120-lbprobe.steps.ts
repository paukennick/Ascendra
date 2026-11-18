// REQ-335: golden paths for AZ120/hana-vip-unreachable-tcp-timestamps on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ120", slug: "hana-vip-unreachable-tcp-timestamps" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Cluster, probe metric, sysctl, listeners; timestamps off; saptune and alert; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "crm");
          run(c, "probe");
          run(c, "sysctl");
          run(c, "listen");
          run(c, "ts");
          run(c, "saptune");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "timestamps" });
        },
      },
      {
        id: "harm",
        title: "Fails HANA over to hana-db2",
        reasoning: "missed",
        drive: (c) => {
          run(c, "probe");
          run(c, "move");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "timestamps" });
        },
      },
      {
        id: "noop",
        title: "Restarts the azure-lb resource",
        reasoning: "partial",
        drive: (c) => {
          run(c, "probe");
          run(c, "restartnc");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "timestamps" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the probe and sysctl, turns timestamps off, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "probe");
          run(c, "sysctl");
          run(c, "ts");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "timestamps" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 08:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "probe");
          waitUntil(c, 80);
          run(c, "ts");
          run(c, "verify");
          waitUntil(c, 88);
          close(c);
          c.act("document", { cause: "timestamps" });
        },
      },
      {
        id: "blind",
        title: "Turns timestamps off without looking and blames the cluster",
        reasoning: "missed",
        drive: (c) => {
          run(c, "ts");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "cluster" });
        },
      },
    ],
  };
}
