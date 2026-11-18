// REQ-335: golden paths for AZ700/snat-exhaustion-carrier-api-before-cutoff on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ700", slug: "snat-exhaustion-carrier-api-before-cutoff" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "SNAT metrics, connections, client, allowlist; NAT gateway; client fix; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "snat");
          run(c, "dest");
          run(c, "client");
          run(c, "ips");
          run(c, "natgw");
          run(c, "reuse");
          run(c, "verify");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "snat" });
        },
      },
      {
        id: "harm",
        title: "Gives each VM a public IP",
        reasoning: "missed",
        drive: (c) => {
          run(c, "snat");
          run(c, "pip");
          run(c, "verify");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "snat" });
        },
      },
      {
        id: "noop",
        title: "Restarts the VMs",
        reasoning: "partial",
        drive: (c) => {
          run(c, "snat");
          run(c, "restart");
          run(c, "verify");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "snat" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads SNAT and connections, attaches the NAT gateway, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "snat");
          run(c, "dest");
          run(c, "natgw");
          run(c, "verify");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "snat" });
        },
      },
      {
        id: "late",
        title: "Waits, attaches after 17:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "snat");
          waitUntil(c, 90);
          run(c, "natgw");
          run(c, "verify");
          waitUntil(c, 98);
          close(c);
          c.act("document", { cause: "snat" });
        },
      },
      {
        id: "blind",
        title: "Attaches without looking and blames the carrier",
        reasoning: "missed",
        drive: (c) => {
          run(c, "natgw");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "carrier" });
        },
      },
    ],
  };
}
