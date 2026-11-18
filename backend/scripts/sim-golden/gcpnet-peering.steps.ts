// REQ-335: golden paths for GCPNET/peered-vpc-no-route-to-onprem on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPNET", slug: "peered-vpc-no-route-to-onprem" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Routes, peering flags, advertisements, Connectivity Test; exchange and advertise; code; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "routes");
          run(c, "peer");
          run(c, "adv");
          run(c, "test");
          run(c, "exchange");
          run(c, "record");
          run(c, "verify");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "routes" });
        },
      },
      {
        id: "harm",
        title: "Exposes the ledger through public NAT",
        reasoning: "missed",
        drive: (c) => {
          run(c, "routes");
          run(c, "public");
          run(c, "verify");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "routes" });
        },
      },
      {
        id: "noop",
        title: "Adds an egress firewall rule",
        reasoning: "partial",
        drive: (c) => {
          run(c, "routes");
          run(c, "fw");
          run(c, "verify");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "routes" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads routes and flags, exchanges and advertises, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "routes");
          run(c, "peer");
          run(c, "exchange");
          run(c, "verify");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "routes" });
        },
      },
      {
        id: "late",
        title: "Waits, changes after 20:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "routes");
          waitUntil(c, 100);
          run(c, "exchange");
          run(c, "verify");
          waitUntil(c, 108);
          close(c);
          c.act("document", { cause: "routes" });
        },
      },
      {
        id: "blind",
        title: "Changes routing without looking and blames a firewall",
        reasoning: "missed",
        drive: (c) => {
          run(c, "exchange");
          waitUntil(c, 101);
          close(c);
          c.act("document", { cause: "firewall" });
        },
      },
    ],
  };
}
