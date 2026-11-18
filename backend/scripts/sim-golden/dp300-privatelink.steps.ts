// REQ-335: golden paths for DP300/public-access-off-reporting-resolves-public-ip on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP300", slug: "public-access-off-reporting-resolves-public-ip" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "DNS, zone links, TCP, public access; link the zone; code and check; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "ns");
          run(c, "links");
          run(c, "tnc");
          run(c, "pna");
          run(c, "link");
          run(c, "policy");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "dns" });
        },
      },
      {
        id: "harm",
        title: "Re-enables public access for everyone",
        reasoning: "missed",
        drive: (c) => {
          run(c, "ns");
          run(c, "public");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "dns" });
        },
      },
      {
        id: "noop",
        title: "Adds a firewall rule",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ns");
          run(c, "fwrule");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "dns" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads DNS and links, links the zone, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ns");
          run(c, "links");
          run(c, "link");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "dns" });
        },
      },
      {
        id: "late",
        title: "Waits, links after 07:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ns");
          waitUntil(c, 70);
          run(c, "link");
          run(c, "verify");
          waitUntil(c, 78);
          close(c);
          c.act("document", { cause: "dns" });
        },
      },
      {
        id: "blind",
        title: "Links without looking and blames the firewall",
        reasoning: "missed",
        drive: (c) => {
          run(c, "link");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "firewall" });
        },
      },
    ],
  };
}
