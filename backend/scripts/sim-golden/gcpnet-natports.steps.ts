// REQ-335: golden paths for GCPNET/cloud-nat-port-exhaustion-payment-api on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPNET", slug: "cloud-nat-port-exhaustion-payment-api" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Drops, NAT config, connections, budget; allowlist and dynamic ports; alert; test",
        reasoning: "met",
        drive: (c) => {
          run(c, "drops");
          run(c, "config");
          run(c, "perpod");
          run(c, "budget");
          run(c, "dpa");
          run(c, "alert");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "ports" });
        },
      },
      {
        id: "harm",
        title: "Gives the nodes external IPs",
        reasoning: "missed",
        drive: (c) => {
          run(c, "drops");
          run(c, "extip");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "ports" });
        },
      },
      {
        id: "noop",
        title: "Raises the UDP idle timeout",
        reasoning: "partial",
        drive: (c) => {
          run(c, "drops");
          run(c, "udp");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "ports" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads drops and config, expands ports, tests",
        reasoning: "partial",
        drive: (c) => {
          run(c, "drops");
          run(c, "config");
          run(c, "dpa");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "ports" });
        },
      },
      {
        id: "late",
        title: "Waits, expands after 18:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "drops");
          waitUntil(c, 45);
          run(c, "dpa");
          run(c, "verify");
          waitUntil(c, 53);
          close(c);
          c.act("document", { cause: "ports" });
        },
      },
      {
        id: "blind",
        title: "Expands without looking and blames the provider",
        reasoning: "missed",
        drive: (c) => {
          run(c, "dpa");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "provider" });
        },
      },
    ],
  };
}
