// REQ-335: golden paths for AZ700/expressroute-bgp-drops-over-prefix-limit on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ700", slug: "expressroute-bgp-drops-over-prefix-limit" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Route table, peering and edge log, prefix count, SKU; summaries; guards; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "arp");
          run(c, "stats");
          run(c, "count");
          run(c, "sku");
          run(c, "filter");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "prefixes" });
        },
      },
      {
        id: "harm",
        title: "Advertises a default route",
        reasoning: "missed",
        drive: (c) => {
          run(c, "arp");
          run(c, "default");
          run(c, "verify");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "prefixes" });
        },
      },
      {
        id: "noop",
        title: "Resets the peering",
        reasoning: "partial",
        drive: (c) => {
          run(c, "arp");
          run(c, "reset");
          run(c, "verify");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "prefixes" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads routes and the edge log, restores summaries, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "arp");
          run(c, "stats");
          run(c, "filter");
          run(c, "verify");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "prefixes" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 11:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "arp");
          waitUntil(c, 65);
          run(c, "filter");
          run(c, "verify");
          waitUntil(c, 73);
          close(c);
          c.act("document", { cause: "prefixes" });
        },
      },
      {
        id: "blind",
        title: "Restores summaries without looking and blames the circuit",
        reasoning: "missed",
        drive: (c) => {
          run(c, "filter");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "circuit" });
        },
      },
    ],
  };
}
