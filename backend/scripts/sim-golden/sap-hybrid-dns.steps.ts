// REQ-335: golden paths for AWSSAP/onprem-cannot-resolve-private-zone on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSSAP", slug: "onprem-cannot-resolve-private-zone" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Lookups, endpoints, forwarders, zone; inbound endpoint; code and probes; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "digdc");
          run(c, "eps");
          run(c, "fwd");
          run(c, "phzassoc");
          run(c, "inbound");
          run(c, "code");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "noinbound" });
        },
      },
      {
        id: "harm",
        title: "Publishes the record in public DNS",
        reasoning: "missed",
        drive: (c) => {
          run(c, "digdc");
          run(c, "public");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "noinbound" });
        },
      },
      {
        id: "noop",
        title: "Associates another VPC",
        reasoning: "partial",
        drive: (c) => {
          run(c, "digdc");
          run(c, "assoc");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "noinbound" });
        },
      },
      {
        id: "fixOnly",
        title: "Compares lookups and endpoints, builds inbound, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "digdc");
          run(c, "eps");
          run(c, "inbound");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "noinbound" });
        },
      },
      {
        id: "late",
        title: "Waits, builds after 18:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "digdc");
          waitUntil(c, 50);
          run(c, "inbound");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "noinbound" });
        },
      },
      {
        id: "blind",
        title: "Builds without looking and blames the record",
        reasoning: "missed",
        drive: (c) => {
          run(c, "inbound");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "record" });
        },
      },
    ],
  };
}
